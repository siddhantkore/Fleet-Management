#!/bin/bash
# Initialize database and user for Fleet Management system

set -e

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    SELECT 'CREATE DATABASE fleet_management'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fleet_management')
    \gexec
EOSQL

# Set privileges on the database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "fleet_management" <<-EOSQL
    GRANT ALL PRIVILEGES ON SCHEMA public TO fleet_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fleet_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fleet_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO fleet_user;
EOSQL

echo "Database initialization complete"
