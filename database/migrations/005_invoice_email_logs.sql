-- Invoice email logs hardening (idempotent)

CREATE TABLE IF NOT EXISTS invoice_email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  sender_email VARCHAR(150),
  sender_name VARCHAR(150),
  recipient_email VARCHAR(150) NOT NULL,
  cc_email TEXT,
  bcc_email TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  attachment_url TEXT,
  attachment_path TEXT,
  attachment_name VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS sender_email VARCHAR(150);
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150);
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(150);
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS cc_email TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS bcc_email TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE invoice_email_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_company_id ON invoice_email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_invoice_id ON invoice_email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_sent_by ON invoice_email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_status ON invoice_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_created_at ON invoice_email_logs(created_at DESC);
