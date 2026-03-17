-- Add google_review_url to client_sites for the Reviews page
alter table client_sites
  add column if not exists google_review_url text;
