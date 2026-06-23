-- CompTrack PostgreSQL schema
-- Requires PostgreSQL 15+.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE overtime_status AS ENUM (
	'draft',
	'submitted',
	'approved',
	'rejected',
	'cancelled'
);

CREATE TYPE compoff_status AS ENUM (
	'submitted',
	'approved',
	'rejected',
	'cancelled'
);

CREATE TYPE ledger_entry_type AS ENUM (
	'credit',
	'debit'
);

CREATE TYPE ledger_source_type AS ENUM (
	'overtime_approval',
	'compoff_approval',
	'manual_adjustment',
	'expiry'
);

CREATE TABLE app_user (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_subject TEXT NOT NULL UNIQUE,
	employee_code TEXT UNIQUE,
	email TEXT NOT NULL UNIQUE,
	full_name TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	department TEXT,
	team TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	last_login_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_role (
	id SMALLSERIAL PRIMARY KEY,
	role_code TEXT NOT NULL UNIQUE,
	role_name TEXT NOT NULL
);

INSERT INTO app_role (role_code, role_name)
VALUES
	('employee', 'Employee'),
	('manager', 'Manager'),
	('hr_admin', 'HR Admin'),
	('super_admin', 'Super Admin');

CREATE TABLE user_role (
	user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
	role_id SMALLINT NOT NULL REFERENCES app_role(id) ON DELETE RESTRICT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (user_id, role_id)
);

CREATE TABLE employee_manager_map (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	employee_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
	manager_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
	effective_from DATE NOT NULL,
	effective_to DATE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (employee_id <> manager_id),
	CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX ux_employee_manager_active
ON employee_manager_map (employee_id)
WHERE effective_to IS NULL;

CREATE TABLE policy_settings (
	id SMALLINT PRIMARY KEY DEFAULT 1,
	conversion_ratio NUMERIC(6,3) NOT NULL DEFAULT 1.000,
	min_unit_hours NUMERIC(4,2) NOT NULL DEFAULT 0.50,
	max_carry_forward_hours NUMERIC(8,2) NOT NULL DEFAULT 160.00,
	expiry_days INTEGER NOT NULL DEFAULT 180,
	allow_negative_balance BOOLEAN NOT NULL DEFAULT FALSE,
	timezone_name TEXT NOT NULL DEFAULT 'UTC',
	created_by UUID REFERENCES app_user(id),
	updated_by UUID REFERENCES app_user(id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (conversion_ratio > 0),
	CHECK (min_unit_hours > 0),
	CHECK (max_carry_forward_hours >= 0),
	CHECK (expiry_days > 0)
);

INSERT INTO policy_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE overtime_entries (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	employee_id UUID NOT NULL REFERENCES app_user(id),
	work_date DATE NOT NULL,
	start_time TIMESTAMPTZ,
	end_time TIMESTAMPTZ,
	overtime_hours NUMERIC(6,2) NOT NULL,
	reason TEXT NOT NULL,
	project_code TEXT,
	status overtime_status NOT NULL DEFAULT 'draft',
	submitted_at TIMESTAMPTZ,
	approved_at TIMESTAMPTZ,
	rejected_at TIMESTAMPTZ,
	cancelled_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (overtime_hours > 0),
	CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE INDEX ix_overtime_employee_status ON overtime_entries (employee_id, status);
CREATE INDEX ix_overtime_work_date ON overtime_entries (work_date);

CREATE TABLE overtime_approvals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	overtime_entry_id UUID NOT NULL UNIQUE REFERENCES overtime_entries(id) ON DELETE CASCADE,
	manager_id UUID NOT NULL REFERENCES app_user(id),
	action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
	comment TEXT,
	action_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compoff_requests (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	employee_id UUID NOT NULL REFERENCES app_user(id),
	request_date DATE NOT NULL,
	requested_hours NUMERIC(6,2) NOT NULL,
	reason TEXT NOT NULL,
	status compoff_status NOT NULL DEFAULT 'submitted',
	submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	approved_at TIMESTAMPTZ,
	rejected_at TIMESTAMPTZ,
	cancelled_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (requested_hours > 0)
);

CREATE INDEX ix_compoff_employee_status ON compoff_requests (employee_id, status);
CREATE INDEX ix_compoff_request_date ON compoff_requests (request_date);

CREATE TABLE compoff_approvals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	compoff_request_id UUID NOT NULL UNIQUE REFERENCES compoff_requests(id) ON DELETE CASCADE,
	manager_id UUID NOT NULL REFERENCES app_user(id),
	action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
	comment TEXT,
	action_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compoff_ledger (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	employee_id UUID NOT NULL REFERENCES app_user(id),
	entry_type ledger_entry_type NOT NULL,
	source_type ledger_source_type NOT NULL,
	source_id UUID,
	hours NUMERIC(8,2) NOT NULL,
	expires_at DATE,
	note TEXT,
	created_by UUID REFERENCES app_user(id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (hours > 0),
	CHECK (
		(entry_type = 'credit' AND source_type IN ('overtime_approval', 'manual_adjustment')) OR
		(entry_type = 'debit' AND source_type IN ('compoff_approval', 'expiry', 'manual_adjustment'))
	)
);

CREATE INDEX ix_ledger_employee_created ON compoff_ledger (employee_id, created_at DESC);
CREATE INDEX ix_ledger_expiry ON compoff_ledger (expires_at) WHERE entry_type = 'credit';

CREATE TABLE attachments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	overtime_entry_id UUID REFERENCES overtime_entries(id) ON DELETE CASCADE,
	compoff_request_id UUID REFERENCES compoff_requests(id) ON DELETE CASCADE,
	storage_path TEXT NOT NULL,
	original_filename TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
	uploaded_by UUID NOT NULL REFERENCES app_user(id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (
		(overtime_entry_id IS NOT NULL AND compoff_request_id IS NULL) OR
		(overtime_entry_id IS NULL AND compoff_request_id IS NOT NULL)
	)
);

CREATE TABLE audit_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	actor_user_id UUID REFERENCES app_user(id),
	actor_role TEXT,
	event_type TEXT NOT NULL,
	entity_name TEXT NOT NULL,
	entity_id UUID,
	event_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
	ip_address INET,
	user_agent TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_audit_entity ON audit_events (entity_name, entity_id);
CREATE INDEX ix_audit_created_at ON audit_events (created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_policy_settings_updated_at
BEFORE UPDATE ON policy_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_overtime_entries_updated_at
BEFORE UPDATE ON overtime_entries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_compoff_requests_updated_at
BEFORE UPDATE ON compoff_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION fn_available_balance(p_employee_id UUID, p_on_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
DECLARE
	v_credits NUMERIC := 0;
	v_debits NUMERIC := 0;
BEGIN
	SELECT COALESCE(SUM(hours), 0)
		INTO v_credits
	FROM compoff_ledger
	WHERE employee_id = p_employee_id
		AND entry_type = 'credit'
		AND (expires_at IS NULL OR expires_at >= p_on_date);

	SELECT COALESCE(SUM(hours), 0)
		INTO v_debits
	FROM compoff_ledger
	WHERE employee_id = p_employee_id
		AND entry_type = 'debit';

	RETURN v_credits - v_debits;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_prevent_overdraft()
RETURNS TRIGGER AS $$
DECLARE
	v_allow_negative BOOLEAN;
	v_balance NUMERIC;
BEGIN
	IF NEW.entry_type <> 'debit' THEN
		RETURN NEW;
	END IF;

	SELECT allow_negative_balance INTO v_allow_negative
	FROM policy_settings
	WHERE id = 1;

	IF v_allow_negative THEN
		RETURN NEW;
	END IF;

	v_balance := fn_available_balance(NEW.employee_id, CURRENT_DATE);

	IF v_balance < NEW.hours THEN
		RAISE EXCEPTION 'Insufficient comp-off balance. available=%, requested=%', v_balance, NEW.hours;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_prevent_overdraft
BEFORE INSERT ON compoff_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_overdraft();

CREATE VIEW v_user_balance AS
SELECT
	u.id AS user_id,
	u.full_name,
	fn_available_balance(u.id, CURRENT_DATE) AS available_hours
FROM app_user u
WHERE u.is_active = TRUE;
