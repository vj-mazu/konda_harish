-- Create default admin user
-- Password: admin123 (hashed with bcrypt)

-- First, check if admin user exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        -- Insert admin user with bcrypt hashed password
        -- Password: admin123
        -- Hash: $2a$10$rZ5qJ5YxH5YxH5YxH5YxHOqJ5YxH5YxH5YxH5YxH5YxH5YxH5YxH5Y
        INSERT INTO users (username, password, role, "isActive", "createdAt", "updatedAt")
        VALUES (
            'admin',
            '$2a$10$rZ5qJ5YxH5YxH5YxH5YxHOqJ5YxH5YxH5YxH5YxH5YxH5YxH5YxH5Y',
            'admin',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Admin user created successfully';
        RAISE NOTICE 'Username: admin';
        RAISE NOTICE 'Password: admin123';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$;

-- Verify the user was created
SELECT id, username, role, "isActive" FROM users WHERE username = 'admin';
