-- SaaS schema sync + security/audit hardening (idempotent)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (if missing on fresh installs)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  company_email VARCHAR(150),
  company_phone VARCHAR(50),
  company_address TEXT,
  website VARCHAR(255),
  company_logo_url TEXT,
  business_number VARCHAR(100),
  gst_hst_number VARCHAR(100),
  qst_number VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Roles required for SaaS
INSERT INTO roles (name, description)
VALUES
  ('super_admin', 'Administrateur plateforme SaaS'),
  ('company_admin', 'Administrateur d''une entreprise inscrite')
ON CONFLICT (name) DO NOTHING;

-- users.company_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Core tenant columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Bank transaction enriched columns
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30);
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS withdrawal_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS balance_after DECIMAL(12,2);
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50);
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reconciliation_difference DECIMAL(12,2);
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  company_logo_url TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(150),
  company_address TEXT,
  business_number VARCHAR(100),
  gst_hst_number VARCHAR(100),
  qst_number VARCHAR(100),
  invoice_footer_note TEXT,
  bank_name VARCHAR(150),
  bank_account_name VARCHAR(150),
  bank_account VARCHAR(150),
  bank_routing_number VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Reminder settings / logs
CREATE TABLE IF NOT EXISTS invoice_reminder_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  start_after_due_days INT NOT NULL DEFAULT 1,
  frequency_days INT NOT NULL DEFAULT 7,
  max_reminders INT,
  send_time VARCHAR(10) DEFAULT '09:00',
  email_subject TEXT,
  email_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  sent_to VARCHAR(255),
  subject TEXT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255),
  subject TEXT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (extend existing or create)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  ip_address VARCHAR(100),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_company_id ON bank_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_id ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminder_logs_company_id ON invoice_reminder_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_company_id ON invoice_email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
