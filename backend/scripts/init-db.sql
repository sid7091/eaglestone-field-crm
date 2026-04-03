-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create regions enum type for multi-tenant partitioning
DO $$ BEGIN
    CREATE TYPE region_code AS ENUM (
        'AP', 'AR', 'AS', 'BR', 'CG', 'GA', 'GJ', 'HR', 'HP', 'JH',
        'KA', 'KL', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB',
        'RJ', 'SK', 'TN', 'TG', 'TR', 'UP', 'UK', 'WB', 'DL', 'JK'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sync queue status type
DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
        'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'DEAD_LETTER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
