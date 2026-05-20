<?php
declare(strict_types=1);

function rtbo_calendar_share_column_exists(string $column): bool
{
    try {
        $stmt = db()->prepare(
            "SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'official_calendar_shares'
               AND COLUMN_NAME = ?"
        );
        $stmt->execute([$column]);
        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable $error) {
        error_log('RTBO calendar share column lookup failed: ' . $error->getMessage());
        return false;
    }
}

function rtbo_ensure_calendar_sharing_table(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS official_calendar_shares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            official_id INT NOT NULL,
            share_kind VARCHAR(40) NOT NULL DEFAULT 'platform',
            target_name VARCHAR(190) NULL,
            target_url VARCHAR(255) NULL,
            token CHAR(64) NOT NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 0,
            consented_at DATETIME NULL,
            revoked_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uq_official_calendar_share_kind (official_id, share_kind),
            UNIQUE KEY uq_official_calendar_share_token (token),
            INDEX idx_official_calendar_share_official (official_id),
            INDEX idx_official_calendar_share_enabled (enabled)
        )"
    );

    foreach ([
        'official_id' => "ALTER TABLE official_calendar_shares ADD COLUMN official_id INT NOT NULL AFTER id",
        'share_kind' => "ALTER TABLE official_calendar_shares ADD COLUMN share_kind VARCHAR(40) NOT NULL DEFAULT 'platform' AFTER official_id",
        'target_name' => "ALTER TABLE official_calendar_shares ADD COLUMN target_name VARCHAR(190) NULL AFTER share_kind",
        'target_url' => "ALTER TABLE official_calendar_shares ADD COLUMN target_url VARCHAR(255) NULL AFTER target_name",
        'token' => "ALTER TABLE official_calendar_shares ADD COLUMN token CHAR(64) NOT NULL AFTER target_url",
        'enabled' => "ALTER TABLE official_calendar_shares ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER token",
        'consented_at' => "ALTER TABLE official_calendar_shares ADD COLUMN consented_at DATETIME NULL AFTER enabled",
        'revoked_at' => "ALTER TABLE official_calendar_shares ADD COLUMN revoked_at DATETIME NULL AFTER consented_at",
        'created_at' => "ALTER TABLE official_calendar_shares ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        'updated_at' => "ALTER TABLE official_calendar_shares ADD COLUMN updated_at DATETIME NULL",
    ] as $column => $sql) {
        if (!rtbo_calendar_share_column_exists($column)) {
            db()->exec($sql);
        }
    }
}

function rtbo_calendar_share_token(): string
{
    return bin2hex(random_bytes(32));
}

function rtbo_calendar_share_row(int $officialId, string $shareKind): ?array
{
    rtbo_ensure_calendar_sharing_table();
    $stmt = db()->prepare(
        "SELECT *
         FROM official_calendar_shares
         WHERE official_id = ? AND share_kind = ?
         LIMIT 1"
    );
    $stmt->execute([$officialId, $shareKind]);
    $row = $stmt->fetch();

    return is_array($row) ? $row : null;
}

function rtbo_upsert_calendar_share(int $officialId, string $shareKind, bool $enabled, string $targetName = '', string $targetUrl = ''): array
{
    rtbo_ensure_calendar_sharing_table();
    $existing = rtbo_calendar_share_row($officialId, $shareKind);
    $token = (string) ($existing['token'] ?? '');
    if ($token === '') {
        $token = rtbo_calendar_share_token();
    }

    if ($existing) {
        $stmt = db()->prepare(
            "UPDATE official_calendar_shares
             SET target_name = ?,
                 target_url = ?,
                 token = ?,
                 enabled = ?,
                 consented_at = CASE WHEN ? = 1 THEN COALESCE(consented_at, NOW()) ELSE consented_at END,
                 revoked_at = CASE WHEN ? = 1 THEN NULL ELSE NOW() END,
                 updated_at = NOW()
             WHERE id = ? AND official_id = ?"
        );
        $stmt->execute([
            $targetName,
            $targetUrl,
            $token,
            $enabled ? 1 : 0,
            $enabled ? 1 : 0,
            $enabled ? 1 : 0,
            (int) $existing['id'],
            $officialId,
        ]);
    } else {
        $stmt = db()->prepare(
            "INSERT INTO official_calendar_shares
                (official_id, share_kind, target_name, target_url, token, enabled, consented_at, revoked_at, updated_at)
             VALUES
                (?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN NOW() ELSE NULL END, CASE WHEN ? = 1 THEN NULL ELSE NOW() END, NOW())"
        );
        $stmt->execute([
            $officialId,
            $shareKind,
            $targetName,
            $targetUrl,
            $token,
            $enabled ? 1 : 0,
            $enabled ? 1 : 0,
            $enabled ? 1 : 0,
        ]);
    }

    return rtbo_calendar_share_row($officialId, $shareKind) ?? [];
}

function rtbo_calendar_share_public(array $row): array
{
    $token = (string) ($row['token'] ?? '');
    return [
        'id' => (int) ($row['id'] ?? 0),
        'share_kind' => (string) ($row['share_kind'] ?? ''),
        'target_name' => (string) ($row['target_name'] ?? ''),
        'target_url' => (string) ($row['target_url'] ?? ''),
        'enabled' => (bool) ((int) ($row['enabled'] ?? 0)),
        'feed_path' => $token !== '' ? '/calendar-feed.php?token=' . rawurlencode($token) : '',
        'consented_at' => (string) ($row['consented_at'] ?? ''),
        'revoked_at' => (string) ($row['revoked_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function rtbo_calendar_sharing_payload(int $officialId): array
{
    rtbo_ensure_calendar_sharing_table();
    $platform = rtbo_calendar_share_row($officialId, 'platform');
    $external = rtbo_calendar_share_row($officialId, 'external');

    return [
        'platform_share_enabled' => $platform ? (bool) ((int) ($platform['enabled'] ?? 0)) : false,
        'external_share_enabled' => $external ? (bool) ((int) ($external['enabled'] ?? 0)) : false,
        'platform_share' => $platform ? rtbo_calendar_share_public($platform) : null,
        'external_share' => $external ? rtbo_calendar_share_public($external) : null,
    ];
}

function rtbo_calendar_share_by_token(string $token): ?array
{
    rtbo_ensure_calendar_sharing_table();
    $stmt = db()->prepare(
        "SELECT *
         FROM official_calendar_shares
         WHERE token = ? AND enabled = 1
         LIMIT 1"
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    return is_array($row) ? $row : null;
}
