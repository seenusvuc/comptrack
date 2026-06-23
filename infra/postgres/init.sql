CREATE DATABASE comptrack;

DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'comptrack_user') THEN
      CREATE ROLE comptrack_user LOGIN PASSWORD 'comptrack_pass';
   END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE comptrack TO comptrack_user;

\connect comptrack
\i /docker-entrypoint-initdb.d/schema.sql

GRANT USAGE ON SCHEMA public TO comptrack_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO comptrack_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO comptrack_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO comptrack_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO comptrack_user;
