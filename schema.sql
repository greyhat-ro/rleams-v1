-- RLEAMS v1 schema. Run in Supabase: SQL Editor > New query > Run.

create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  asset_tag   text not null unique,
  name        text not null,
  category    text not null default 'Other',
  location    text,
  status      text not null default 'Available'
              check (status in ('Available','CheckedOut','Maintenance','Retired')),
  assignee    text,
  due_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists activity (
  id         bigint generated always as identity primary key,
  asset_id   uuid references assets(id) on delete set null,
  asset_tag  text not null,
  action     text not null,
  person     text,
  at         timestamptz not null default now()
);

-- Demo-grade access: anyone with the anon key can read/write.
-- Fine for a portfolio demo with fake data. For real use, switch on
-- Supabase Auth and replace these with policies using auth.uid() (planned for v2).
alter table assets   enable row level security;
alter table activity enable row level security;
create policy "demo all assets"   on assets   for all using (true) with check (true);
create policy "demo all activity" on activity for all using (true) with check (true);

insert into assets (asset_tag, name, category, location, status, assignee, due_date) values
  ('RB-001','UR5e collaborative arm','Robot arm','Bench 1','Available',null,null),
  ('RB-002','TurtleBot 4 Lite','Mobile robot','Arena','CheckedOut','Aisha K.',current_date + 3),
  ('SN-014','Intel RealSense D435i','Sensor','Cabinet B','Available',null,null),
  ('SN-021','RPLidar A2','Sensor','Cabinet B','Maintenance',null,null),
  ('PR-003','Prusa MK4','3D printer','Print room','Available',null,null)
on conflict (asset_tag) do nothing;
