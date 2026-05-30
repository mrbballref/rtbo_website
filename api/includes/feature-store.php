<?php
declare(strict_types=1);

function rtbo_feature_store_table(string $table): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        throw new InvalidArgumentException('Invalid feature store table.');
    }

    return rtbo_database_identifier($table);
}

function rtbo_feature_store_ensure(string $table): void
{
    db()->exec(
        'CREATE TABLE IF NOT EXISTS ' . rtbo_feature_store_table($table) . ' (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            payload LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL
        )'
    );
}

function rtbo_feature_store_load(string $table): ?array
{
    rtbo_feature_store_ensure($table);
    $stmt = db()->prepare('SELECT payload FROM ' . rtbo_feature_store_table($table) . ' WHERE id = 1 LIMIT 1');
    $stmt->execute();
    $payload = $stmt->fetchColumn();
    if (!is_string($payload) || trim($payload) === '') {
        return null;
    }

    $decoded = json_decode($payload, true);

    return is_array($decoded) ? $decoded : null;
}

function rtbo_feature_store_save(string $table, array $payload): void
{
    rtbo_feature_store_ensure($table);
    $stmt = db()->prepare(
        'INSERT INTO ' . rtbo_feature_store_table($table) . ' (id, payload, updated_at)
         VALUES (1, ?, NOW())
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = NOW()'
    );
    $stmt->execute([json_encode($payload, JSON_UNESCAPED_SLASHES)]);
}
