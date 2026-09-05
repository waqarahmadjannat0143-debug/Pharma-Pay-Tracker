-- Tenant-owned rows must always receive their organization from the API's
-- authenticated session. Never silently fall back to the legacy workspace.
ALTER TABLE public.customers ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.invoices ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.payments ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.payment_allocations ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.agencies ALTER COLUMN organization_id DROP DEFAULT;

-- MedPay uses its own authenticated backend. The mobile/web clients do not
-- access Supabase's public Data API, so public table privileges are unnecessary.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS app_users_organization_id_idx
  ON public.app_users (organization_id);
CREATE INDEX IF NOT EXISTS invoices_agency_id_idx
  ON public.invoices (agency_id);
CREATE INDEX IF NOT EXISTS payment_allocations_payment_id_idx
  ON public.payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx
  ON public.payments (customer_id);
