-- Ensure SaaS / Super Admin roles exist (idempotent)
INSERT INTO roles (name, description)
SELECT 'super_admin', 'Administrateur plateforme SaaS'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'super_admin'
);

INSERT INTO roles (name, description)
SELECT 'company_admin', 'Administrateur d''une entreprise inscrite'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'company_admin'
);
