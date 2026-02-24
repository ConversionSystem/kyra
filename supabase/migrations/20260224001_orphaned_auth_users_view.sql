-- View: orphaned_auth_users
-- Users who created an auth account but never joined/created an agency

create or replace view public.orphaned_auth_users as
select
  u.id,
  u.email,
  u.created_at
from auth.users u
left join public.agency_members m
  on m.user_id = u.id
where m.user_id is null
order by u.created_at desc;

comment on view public.orphaned_auth_users is 'Auth users with no agency_membership — used to track abandoned signups.';
