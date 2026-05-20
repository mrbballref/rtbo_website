<?php
declare(strict_types=1);

function ensure_contact_tables(): void
{
    db()->exec(
        "CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            full_name VARCHAR(200) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    );
}

function save_contact_message(array $message): void
{
    ensure_contact_tables();

    $stmt = db()->prepare(
        "INSERT INTO contact_messages (first_name, last_name, full_name, email, phone, message, status)
         VALUES (:first_name, :last_name, :full_name, :email, :phone, :message, 'new')"
    );
    $stmt->execute([
        ':first_name' => $message['first_name'],
        ':last_name' => $message['last_name'],
        ':full_name' => $message['full_name'],
        ':email' => $message['email'],
        ':phone' => $message['phone'],
        ':message' => $message['message'],
    ]);
}

function recent_contact_messages(int $limit = 50): array
{
    ensure_contact_tables();
    $stmt = db()->prepare("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
