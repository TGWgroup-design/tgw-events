-- Registers the first staff login (created manually via the Supabase
-- dashboard's Authentication -> Users) so they can use admin.html/scan.html.
insert into staff_users (user_id)
values ('45235358-2f65-4b97-b60b-0827342f9a8c')
on conflict (user_id) do nothing;
