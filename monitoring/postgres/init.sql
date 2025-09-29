-- Initialize PostgreSQL for monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitoring user
CREATE USER monitoring_user WITH PASSWORD 'monitoring_password';
GRANT SELECT ON pg_stat_database TO monitoring_user;
GRANT SELECT ON pg_stat_user_tables TO monitoring_user;
GRANT SELECT ON pg_stat_user_indexes TO monitoring_user;
GRANT SELECT ON pg_statio_user_tables TO monitoring_user;
GRANT SELECT ON pg_stat_activity TO monitoring_user;

-- Create application database if it doesn't exist
CREATE DATABASE IF NOT EXISTS credential_platform;

-- Create backup user
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;