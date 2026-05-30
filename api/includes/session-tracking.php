<?php
declare(strict_types=1);

require_once __DIR__ . '/notifications.php';

function rtbo_ensure_login_session_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS user_login_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            user_email VARCHAR(190) NULL,
            user_name VARCHAR(190) NULL,
            session_token_hash CHAR(64) NULL,
            login_at DATETIME NOT NULL,
            logout_at DATETIME NULL,
            duration_seconds INT NULL,
            ip_address VARCHAR(80) NULL,
            user_agent VARCHAR(500) NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'active',
            metadata JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            INDEX idx_login_sessions_user (user_id),
            INDEX idx_login_sessions_status (status),
            INDEX idx_login_sessions_login (login_at)
        )"
    );
}

function rtbo_login_session_name(array $user): string
{
    $name = trim((string) ($user['name'] ?? ''));
    if ($name !== '') {
        return $name;
    }

    $name = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
    return $name !== '' ? $name : (string) ($user['email'] ?? 'User');
}

function rtbo_login_session_start(array $user): void
{
    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        return;
    }

    try {
        rtbo_ensure_login_session_tables();
        $loginAt = date('Y-m-d H:i:s');
        $tokenHash = session_id() !== '' ? hash('sha256', session_id()) : null;
        $stmt = db()->prepare(
            "INSERT INTO user_login_sessions(
                user_id, user_email, user_name, session_token_hash, login_at, ip_address, user_agent, status, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)"
        );
        $stmt->execute([
            $userId,
            strtolower(trim((string) ($user['email'] ?? ''))),
            rtbo_login_session_name($user),
            $tokenHash,
            $loginAt,
            substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 80),
            substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
            json_encode(['role' => (string) ($user['role'] ?? '')], JSON_UNESCAPED_SLASHES),
        ]);

        $_SESSION['rtbo_login_session_id'] = (int) db()->lastInsertId();
        $_SESSION['rtbo_login_at'] = $loginAt;

        $name = rtbo_login_session_name($user);
        rtbo_notify_admins([
            'type' => 'user_logged_in',
            'title' => 'User logged in',
            'body' => "{$name} logged in at {$loginAt}.",
            'related_type' => 'user_login_session',
            'related_id' => (int) $_SESSION['rtbo_login_session_id'],
            'metadata' => [
                'user_id' => $userId,
                'email' => (string) ($user['email'] ?? ''),
                'login_at' => $loginAt,
                'ip_address' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
            ],
            'actor' => $user,
        ]);
    } catch (Throwable $error) {
        error_log('RTBO login session tracking failed: ' . $error->getMessage());
    }
}

function rtbo_login_session_finish(?array $user = null): void
{
    $user ??= is_array($_SESSION['user'] ?? null) ? $_SESSION['user'] : null;
    if (!$user) {
        return;
    }

    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        return;
    }

    try {
        rtbo_ensure_login_session_tables();
        $sessionId = (int) ($_SESSION['rtbo_login_session_id'] ?? 0);
        $loginAtRaw = (string) ($_SESSION['rtbo_login_at'] ?? '');
        if ($loginAtRaw === '' && $sessionId > 0) {
            $lookup = db()->prepare('SELECT login_at FROM user_login_sessions WHERE id = ? AND user_id = ? LIMIT 1');
            $lookup->execute([$sessionId, $userId]);
            $loginAtRaw = (string) ($lookup->fetchColumn() ?: '');
        }

        $logoutAt = date('Y-m-d H:i:s');
        $loginAtTime = strtotime($loginAtRaw) ?: time();
        $duration = max(0, time() - $loginAtTime);

        if ($sessionId > 0) {
            $stmt = db()->prepare(
                "UPDATE user_login_sessions
                 SET logout_at = ?, duration_seconds = ?, status = 'ended', updated_at = NOW()
                 WHERE id = ? AND user_id = ? AND logout_at IS NULL"
            );
            $stmt->execute([$logoutAt, $duration, $sessionId, $userId]);
            if ($stmt->rowCount() === 0) {
                return;
            }
        }

        $name = rtbo_login_session_name($user);
        $durationMinutes = number_format($duration / 60, 1);
        rtbo_notify_admins([
            'type' => 'user_logged_out',
            'title' => 'User logged out',
            'body' => "{$name} logged out at {$logoutAt}. Session duration: {$durationMinutes} minutes.",
            'related_type' => 'user_login_session',
            'related_id' => $sessionId,
            'metadata' => [
                'user_id' => $userId,
                'email' => (string) ($user['email'] ?? ''),
                'login_at' => $loginAtRaw,
                'logout_at' => $logoutAt,
                'duration_seconds' => $duration,
                'duration_minutes' => $durationMinutes,
            ],
            'actor' => $user,
        ]);
    } catch (Throwable $error) {
        error_log('RTBO logout session tracking failed: ' . $error->getMessage());
    }
}
