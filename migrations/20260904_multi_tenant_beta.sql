BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id serial PRIMARY KEY,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free_beta',
  beta_ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO organizations (id, name, plan, beta_ends_at)
VALUES (1, 'MedPay Legacy Workspace', 'free_beta', now() + interval '180 days')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('organizations', 'id'), GREATEST((SELECT max(id) FROM organizations), 1));

CREATE TABLE IF NOT EXISTS app_users (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  username text NOT NULL,
  normalized_username text NOT NULL,
  email text NOT NULL,
  normalized_email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_normalized_username_unique ON app_users(normalized_username);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_normalized_email_unique ON app_users(normalized_email);

-- Temporary default keeps the currently deployed single-workspace API working
-- while the tenant-aware API is rolled out immediately after this migration.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id integer DEFAULT 1;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS organization_id integer DEFAULT 1;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id integer DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id integer DEFAULT 1;
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS organization_id integer DEFAULT 1;

UPDATE customers SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE agencies SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE invoices i SET organization_id = c.organization_id FROM customers c WHERE i.customer_id = c.id AND i.organization_id IS NULL;
UPDATE payments p SET organization_id = c.organization_id FROM customers c WHERE p.customer_id = c.id AND p.organization_id IS NULL;
UPDATE payment_allocations pa SET organization_id = p.organization_id FROM payments p WHERE pa.payment_id = p.id AND pa.organization_id IS NULL;

ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE agencies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payment_allocations ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE customers ADD CONSTRAINT customers_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agencies ADD CONSTRAINT agencies_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT invoices_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS agencies_normalized_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS agencies_organization_normalized_name_unique ON agencies(organization_id, normalized_name);
CREATE INDEX IF NOT EXISTS customers_organization_id_idx ON customers(organization_id);
CREATE INDEX IF NOT EXISTS invoices_organization_id_idx ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS payments_organization_id_idx ON payments(organization_id);
CREATE INDEX IF NOT EXISTS payment_allocations_organization_id_idx ON payment_allocations(organization_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

COMMIT;
