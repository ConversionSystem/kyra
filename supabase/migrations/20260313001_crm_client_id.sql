-- Scope CRM contacts to specific agency clients (nullable for legacy/global contacts)

alter table crm_contacts
  add column if not exists client_id uuid references agency_clients(id) on delete set null;

create index if not exists idx_crm_contacts_client_id on crm_contacts(client_id);
create index if not exists idx_crm_contacts_agency_client_id on crm_contacts(agency_id, client_id);
