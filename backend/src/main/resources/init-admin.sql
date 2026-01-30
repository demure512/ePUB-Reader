-- Initialize Super Admin user
-- Password is: admin123 (BCrypt encoded)
-- This script should only be run once during initial setup

-- First, check if a super admin already exists
-- If not, either create one or upgrade an existing admin

-- Option 1: Create a new super admin user (if no users exist)
INSERT INTO users (username, password, email, role, created_at, updated_at)
SELECT 'superadmin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOzBXd.QSbVve', 'superadmin@example.com', 'ROLE_SUPER_ADMIN', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ROLE_SUPER_ADMIN');

-- Option 2: Upgrade an existing admin to super admin (uncomment if needed)
-- UPDATE users SET role = 'ROLE_SUPER_ADMIN' WHERE username = 'admin' AND role = 'ROLE_ADMIN';

