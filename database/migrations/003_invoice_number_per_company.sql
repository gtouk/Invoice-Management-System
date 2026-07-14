-- Scope invoice numbers per company (idempotent-ish)
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Drop legacy global unique on invoice_number if present
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'invoices'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%invoice_number%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%company_id%'
  LOOP
    EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'invoices'
      AND con.conname = 'invoices_company_id_invoice_number_key'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_company_id_invoice_number_key
      UNIQUE (company_id, invoice_number);
  END IF;
END $$;
