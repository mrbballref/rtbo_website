<?php
declare(strict_types=1);

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/email.php';

function admin_member_roles(): array
{
    return [
        'official' => 'Official',
        'coach' => 'Coach',
        'assistant_coach' => 'Assistant Coach',
        'athletic_director' => 'Athletic Director',
        'assistant_athletic_director' => 'Assistant Athletic Director',
        'sports_information_director' => 'Sports Information Director',
        'conference_commissioner' => 'Conference Commissioner',
        'game_day_admin' => 'Game Day Admin',
        'assignor' => 'Assignor',
        'observer' => 'Observer',
        'evaluator' => 'Evaluator',
        'admin' => 'Admin',
        'super_admin' => 'Super Admin',
    ];
}

function admin_member_assignable_roles(): array
{
    $roles = admin_member_roles();
    unset($roles['super_admin']);
    return $roles;
}

function admin_member_coach_assignments(): array
{
    return [
        'Head Coach Var Boys',
        'Head Coach Var Girls',
        'Head Coach Jr. Var Boys',
        'Head Coach Jr. Var Girls',
        'Head Coach (Men)',
        'Head Coach (Women)',
        'Head Coach (JV Men)',
        'Head Coach (JV Women)',
        'Head Coach (Boys Varsity)',
        'Head Coach (Girls Varsity)',
        'Head Coach (JV Boys)',
        'Head Coach (JV Girls)',
        'Head Coach (Jr. High Boys)',
        'Head Coach (Jr. Girls)',
        'Head Coach 9th Boys',
        'Head Coach 9th Girls',
        'Head Coach 8th Boys',
        'Head Coach 8th Girls',
        'AAU Boys',
        'AAU Girls',
        'Showcase Boys',
        'Showcase Girls',
    ];
}

function admin_member_official_classifications(): array
{
    return [
        'High School',
        'NJCAA',
        'NAIA',
        'NCAA DIII',
        'NCAA DII',
        'NCAA DI',
        'Pro-Am',
    ];
}

function admin_member_storage_path(): string
{
    return STORAGE_DIR . '/admin-members.json';
}

function admin_member_role_label(string $role): string
{
    return admin_member_roles()[$role] ?? ucwords(str_replace('_', ' ', $role));
}

function admin_member_clean_role(string $role, bool $allowSuperAdmin = false): string
{
    $role = strtolower(trim($role));
    $roles = $allowSuperAdmin ? admin_member_roles() : admin_member_assignable_roles();
    return array_key_exists($role, $roles) ? $role : 'official';
}

function admin_member_normalize(array $member): array
{
    $role = admin_member_clean_role((string) ($member['role'] ?? 'official'), true);
    $firstName = trim((string) ($member['first_name'] ?? $member['firstName'] ?? ''));
    $lastName = trim((string) ($member['last_name'] ?? $member['lastName'] ?? ''));
    $name = trim($firstName . ' ' . $lastName);
    $photo = (string) ($member['profile_photo'] ?? $member['photo'] ?? '');
    if ($photo !== '' && !str_starts_with($photo, 'http') && !str_starts_with($photo, '/api/')) {
        $photo = '/api/profile-photo.php?id=' . (int) ($member['id'] ?? 0);
    }

    return [
        'id' => (int) ($member['id'] ?? 0),
        'first_name' => $firstName,
        'last_name' => $lastName,
        'name' => $name,
        'role' => $role,
        'role_label' => admin_member_role_label($role),
        'member_title' => trim((string) ($member['member_title'] ?? $member['memberTitle'] ?? '')),
        'email' => strtolower(trim((string) ($member['email'] ?? ''))),
        'phone' => rtbo_format_phone_number((string) ($member['phone'] ?? '')),
        'sex' => (string) ($member['sex'] ?? $member['gender'] ?? ''),
        'race' => (string) ($member['race'] ?? ''),
        'organization' => (string) ($member['organization'] ?? ''),
        'school_id' => (int) ($member['school_id'] ?? $member['schoolId'] ?? 0),
        'address_line1' => (string) ($member['address_line1'] ?? $member['addressLine1'] ?? ''),
        'address_line2' => (string) ($member['address_line2'] ?? $member['addressLine2'] ?? ''),
        'city' => (string) ($member['city'] ?? ''),
        'state' => (string) ($member['state'] ?? ''),
        'zip' => (string) ($member['zip'] ?? ''),
        'conferences' => (string) ($member['conferences'] ?? ''),
        'experience' => (string) ($member['experience'] ?? ''),
        'official_classification' => trim((string) ($member['official_classification'] ?? $member['officialClassification'] ?? '')),
        'official_rank' => isset($member['official_rank']) && $member['official_rank'] !== '' ? max(1, min(100, (int) $member['official_rank'])) : null,
        'photo' => $photo,
        'status' => (string) ($member['status'] ?? 'active'),
        'created_at' => (string) ($member['created_at'] ?? ''),
    ];
}

function admin_member_read_file(): array
{
    $path = admin_member_storage_path();
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function admin_member_write_file(array $members): void
{
    ensure_dir(dirname(admin_member_storage_path()));
    file_put_contents(
        admin_member_storage_path(),
        json_encode(array_values($members), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
}

function admin_members_db_available(): bool
{
    try {
        ensure_users_table();
        return true;
    } catch (Throwable $error) {
        error_log('RTBO members database unavailable: ' . $error->getMessage());
        return false;
    }
}

function admin_members_list(): array
{
    if (!admin_members_db_available()) {
        return array_map('admin_member_normalize', admin_member_read_file());
    }

    $stmt = db()->query(
        "SELECT *
         FROM users
         WHERE status <> 'deleted'
         ORDER BY FIELD(role, 'super_admin', 'admin', 'assignor', 'evaluator', 'observer', 'official', 'coach', 'assistant_coach', 'athletic_director', 'assistant_athletic_director', 'sports_information_director', 'conference_commissioner', 'game_day_admin'), last_name, first_name"
    );
    return array_map('admin_member_normalize', $stmt->fetchAll());
}

function admin_member_require_valid(array $member, bool $creating): array
{
    $normalized = admin_member_normalize($member);

    if ($normalized['first_name'] === '' || $normalized['last_name'] === '') {
        throw new RuntimeException('First name and last name are required.');
    }

    if ($normalized['email'] === '' || !filter_var($normalized['email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('A valid email address is required.');
    }

    if ($creating && trim((string) ($member['password'] ?? '')) === '') {
        throw new RuntimeException('A temporary password is required for a new member.');
    }

    if (isset($member['password']) && trim((string) $member['password']) !== '' && strlen((string) $member['password']) < 8) {
        throw new RuntimeException('Temporary passwords must be at least 8 characters.');
    }

    $normalized['role'] = admin_member_clean_role($normalized['role']);
    $normalized['status'] = in_array($normalized['status'], ['active', 'inactive'], true) ? $normalized['status'] : 'active';
    if ($normalized['role'] === 'coach') {
        if ($normalized['member_title'] === '') {
            throw new RuntimeException('Coach assignment is required.');
        }
        if (!in_array($normalized['member_title'], admin_member_coach_assignments(), true)) {
            throw new RuntimeException('Please select a valid coach assignment.');
        }
    }
    if ($normalized['role'] !== 'coach') {
        $normalized['member_title'] = '';
    }
    if ($normalized['role'] === 'official') {
        if ($normalized['official_classification'] === '') {
            throw new RuntimeException('Official classification is required.');
        }
        if (!in_array($normalized['official_classification'], admin_member_official_classifications(), true)) {
            throw new RuntimeException('Please select a valid official classification.');
        }
    } else {
        $normalized['official_classification'] = '';
    }
    if ($normalized['role'] !== 'official' || $normalized['status'] !== 'active') {
        $normalized['official_rank'] = null;
    }
    if ($normalized['school_id'] > 0 && $normalized['organization'] === '') {
        try {
            require_once __DIR__ . '/admin-schools.php';
            $schools = admin_schools_list();
            foreach ($schools as $school) {
                if ((int) $school['id'] === $normalized['school_id']) {
                    $normalized['organization'] = $school['name'];
                    break;
                }
            }
        } catch (Throwable $error) {
            error_log('RTBO member school lookup failed: ' . $error->getMessage());
        }
    }
    return $normalized;
}

function admin_member_create(array $member): array
{
    $normalized = admin_member_require_valid($member, true);
    $normalized['status'] = 'inactive';
    $password = (string) ($member['password'] ?? '');

    if (!admin_members_db_available()) {
        $members = admin_member_read_file();
        foreach ($members as $existing) {
            if (strtolower((string) ($existing['email'] ?? '')) === $normalized['email']) {
                throw new RuntimeException('A member with that email already exists.');
            }
        }
        $normalized['id'] = (int) (max(array_map(static fn ($row) => (int) ($row['id'] ?? 0), $members ?: [['id' => 0]])) + 1);
        $normalized['created_at'] = date('c');
        $normalized['registered_at'] = date('c');
        $stored = $normalized;
        $stored['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
        $stored['password_is_temporary'] = true;
        $stored['temporary_password_created_at'] = date('c');
        $members[] = $stored;
        admin_member_write_file($members);
        try {
            send_member_invitation_email($normalized, $password);
        } catch (Throwable $error) {
            error_log('RTBO member invitation email failed: ' . $error->getMessage());
        }
        return $normalized;
    }

    $stmt = db()->prepare(
        "INSERT INTO users(role, member_title, first_name, last_name, email, phone, sex, race, organization, school_id, address_line1, address_line2, city, state, zip, conferences, experience, official_rank, official_classification, password_hash, password_is_temporary, temporary_password_created_at, status, registered_at, updated_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?, NOW(), NOW())"
    );
    $stmt->execute([
        $normalized['role'],
        $normalized['member_title'],
        $normalized['first_name'],
        $normalized['last_name'],
        $normalized['email'],
        $normalized['phone'],
        $normalized['sex'],
        $normalized['race'],
        $normalized['organization'],
        $normalized['school_id'] > 0 ? $normalized['school_id'] : null,
        $normalized['address_line1'],
        $normalized['address_line2'],
        $normalized['city'],
        $normalized['state'],
        $normalized['zip'],
        $normalized['conferences'],
        $normalized['experience'],
        $normalized['official_rank'],
        $normalized['official_classification'],
        password_hash($password, PASSWORD_DEFAULT),
        $normalized['status'],
    ]);

    $newId = (int) db()->lastInsertId();
    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute([$newId]);
    $created = admin_member_normalize($fresh->fetch() ?: []);
    try {
        if (send_member_invitation_email($created, $password)) {
            db()->prepare('UPDATE users SET registration_confirmation_sent_at = NOW(), updated_at = NOW() WHERE id = ?')->execute([$newId]);
        }
    } catch (Throwable $error) {
        error_log('RTBO member invitation email failed: ' . $error->getMessage());
    }
    return $created;
}

function admin_member_update(int $id, array $member): array
{
    if ($id <= 0) {
        throw new RuntimeException('A valid member id is required.');
    }
    $normalized = admin_member_require_valid(['id' => $id, ...$member], false);

    if (!admin_members_db_available()) {
        $members = admin_member_read_file();
        foreach ($members as $index => $existing) {
            if ((int) ($existing['id'] ?? 0) === $id) {
                $members[$index] = [...$existing, ...$normalized, 'id' => $id];
                if (trim((string) ($member['password'] ?? '')) !== '') {
                    $members[$index]['password_hash'] = password_hash((string) $member['password'], PASSWORD_DEFAULT);
                    $members[$index]['password_is_temporary'] = true;
                    $members[$index]['temporary_password_created_at'] = date('c');
                    $members[$index]['password_changed_at'] = '';
                }
                admin_member_write_file($members);
                return admin_member_normalize($members[$index]);
            }
        }
        throw new RuntimeException('Member not found.');
    }

    $existingStmt = db()->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $existingStmt->execute([$id]);
    $existingRole = (string) ($existingStmt->fetchColumn() ?: '');
    if ($existingRole === 'super_admin') {
        $normalized['role'] = 'super_admin';
        $normalized['status'] = 'active';
    }

    $params = [
        $normalized['role'],
        $normalized['member_title'],
        $normalized['first_name'],
        $normalized['last_name'],
        $normalized['email'],
        $normalized['phone'],
        $normalized['sex'],
        $normalized['race'],
        $normalized['organization'],
        $normalized['school_id'] > 0 ? $normalized['school_id'] : null,
        $normalized['address_line1'],
        $normalized['address_line2'],
        $normalized['city'],
        $normalized['state'],
        $normalized['zip'],
        $normalized['conferences'],
        $normalized['experience'],
        $normalized['official_rank'],
        $normalized['official_classification'],
        $normalized['status'],
    ];
    $passwordSql = '';
    if (trim((string) ($member['password'] ?? '')) !== '') {
        $passwordSql = ', password_hash = ?, password_is_temporary = 1, temporary_password_created_at = NOW(), password_changed_at = NULL';
        $params[] = password_hash((string) $member['password'], PASSWORD_DEFAULT);
    }
    $params[] = $id;

    $stmt = db()->prepare(
        "UPDATE users
         SET role = ?, member_title = ?, first_name = ?, last_name = ?, email = ?, phone = ?, sex = ?, race = ?, organization = ?, school_id = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip = ?, conferences = ?, experience = ?, official_rank = ?, official_classification = ?, status = ?, updated_at = NOW(){$passwordSql}
         WHERE id = ?"
    );
    $stmt->execute($params);

    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute([$id]);
    $freshMember = $fresh->fetch();
    if (!$freshMember) {
        throw new RuntimeException('Member not found.');
    }
    return admin_member_normalize($freshMember);
}

function admin_member_delete(int $id): void
{
    if ($id <= 0) {
        throw new RuntimeException('A valid member id is required.');
    }

    if (!admin_members_db_available()) {
        admin_member_write_file(array_values(array_filter(
            admin_member_read_file(),
            static fn ($member) => (int) ($member['id'] ?? 0) !== $id
        )));
        return;
    }

    $stmt = db()->prepare("UPDATE users SET status = 'deleted' WHERE id = ? AND role <> 'super_admin'");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        throw new RuntimeException('Member could not be removed. Super Admin accounts are protected.');
    }
}
