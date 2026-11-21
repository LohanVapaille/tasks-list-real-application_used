-- LovaTasks — schéma complet.
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run.
-- L'ancienne table "notes" n'est pas supprimée : ses lignes sont copiées
-- dans "tasks" à la fin de ce script.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Profils (1 par compte) : plan Stripe + quota IA
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_until timestamptz,
  stripe_customer_id text unique,
  ai_used integer not null default 0,
  ai_period text not null default to_char(now(), 'YYYY-MM'),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes déjà existants.
insert into public.profiles (id, email, display_name)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Projets, membres, invitations
-- ─────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#0f7c74',
  icon text not null default '📁',
  columns jsonb not null default '[
    {"id":"todo","name":"À faire","kind":"todo"},
    {"id":"doing","name":"En cours","kind":"doing"},
    {"id":"done","name":"Terminé","kind":"done"}
  ]'::jsonb,
  position double precision not null default 0,
  archived boolean not null default false,
  public_token uuid unique,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invites (
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null,
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);

-- Le créateur devient automatiquement membre "owner".
create or replace function public.add_project_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.add_project_owner();

-- security definer : évite la récursion des règles RLS sur project_members.
create or replace function public.is_project_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects where id = pid and owner_id = auth.uid()
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- Tâches
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  status text not null default 'todo',
  priority smallint not null default 0 check (priority between 0 and 3),
  due_date date,
  labels text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  position double precision not null default 0,
  time_spent integer not null default 0,
  timer_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_user_idx on public.tasks (user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.tasks enable row level security;

-- Les co-membres voient seulement nom / e-mail / avatar via project_people().
drop policy if exists "profil lisible par soi et co-membres" on public.profiles;
drop policy if exists "profil lisible par soi" on public.profiles;
create policy "profil lisible par soi" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profil modifiable par soi" on public.profiles;
create policy "profil modifiable par soi" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "projets visibles par les membres" on public.projects;
create policy "projets visibles par les membres" on public.projects
  for select to authenticated using (public.is_project_member(id) or owner_id = (select auth.uid()));

drop policy if exists "projets créés par soi" on public.projects;
create policy "projets créés par soi" on public.projects
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "projets modifiés par les membres" on public.projects;
create policy "projets modifiés par les membres" on public.projects
  for update to authenticated using (public.is_project_member(id)) with check (public.is_project_member(id));

drop policy if exists "projets supprimés par le propriétaire" on public.projects;
create policy "projets supprimés par le propriétaire" on public.projects
  for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "membres visibles par les membres" on public.project_members;
create policy "membres visibles par les membres" on public.project_members
  for select to authenticated using (public.is_project_member(project_id));

drop policy if exists "membres retirés par le proprio ou soi-même" on public.project_members;
create policy "membres retirés par le proprio ou soi-même" on public.project_members
  for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid()) or public.is_project_owner(project_id)));

drop policy if exists "invitations gérées par les membres" on public.project_invites;
create policy "invitations gérées par les membres" on public.project_invites
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id) and invited_by = (select auth.uid()));

drop policy if exists "tâches visibles" on public.tasks;
create policy "tâches visibles" on public.tasks
  for all to authenticated
  using (
    (project_id is null and user_id = (select auth.uid()))
    or (project_id is not null and public.is_project_member(project_id))
  )
  with check (
    (project_id is null and user_id = (select auth.uid()))
    or (project_id is not null and public.is_project_member(project_id))
  );

-- Droits par colonne : l'utilisateur ne peut pas s'attribuer le plan Pro.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

revoke all on public.projects, public.project_members, public.project_invites, public.tasks from anon;
grant select, insert, delete on public.projects to authenticated;
grant update (name, color, icon, columns, position, archived) on public.projects to authenticated;
grant select, delete on public.project_members to authenticated;
grant select, insert, delete on public.project_invites to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC
-- ─────────────────────────────────────────────────────────────

-- Accepte les invitations en attente pour l'e-mail du compte connecté.
create or replace function public.accept_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare
  my_email text := lower(auth.jwt() ->> 'email');
  added integer;
begin
  if auth.uid() is null or my_email is null then return 0; end if;

  insert into public.project_members (project_id, user_id, role)
  select project_id, auth.uid(), 'member'
  from public.project_invites where lower(email) = my_email
  on conflict do nothing;
  get diagnostics added = row_count;

  delete from public.project_invites where lower(email) = my_email;
  return added;
end $$;

-- Liste des membres d'un projet avec leur profil.
create or replace function public.project_people(pid uuid)
returns table (user_id uuid, role text, email text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.role, p.email, p.display_name, p.avatar_url
  from public.project_members m
  join public.profiles p on p.id = m.user_id
  where m.project_id = pid and public.is_project_member(pid)
  order by m.created_at;
$$;

-- Portail client (Pro) : active ou coupe le lien public en lecture seule.
create or replace function public.set_public_share(pid uuid, enabled boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  token uuid;
begin
  if not public.is_project_owner(pid) then
    raise exception 'Seul le propriétaire du projet peut le partager publiquement.';
  end if;
  if enabled and not exists (
    select 1 from public.profiles
    where id = auth.uid() and plan = 'pro' and (plan_until is null or plan_until > now())
  ) then
    raise exception 'Le portail client est réservé au plan Pro.';
  end if;

  update public.projects
  set public_token = case when enabled then coalesce(public_token, gen_random_uuid()) else null end
  where id = pid
  returning public_token into token;
  return token;
end $$;

-- Lecture publique d'un tableau partagé (aucune connexion requise).
create or replace function public.get_public_board(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'project', json_build_object('name', p.name, 'color', p.color, 'icon', p.icon, 'columns', p.columns),
    'tasks', coalesce((
      select json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority,
        'due_date', t.due_date, 'labels', t.labels, 'checklist', t.checklist, 'position', t.position
      ) order by t.position)
      from public.tasks t where t.project_id = p.id
    ), '[]'::json)
  )
  from public.projects p
  where p.public_token = token and token is not null;
$$;

grant execute on function public.accept_invites() to authenticated;
grant execute on function public.project_people(uuid) to authenticated;
grant execute on function public.set_public_share(uuid, boolean) to authenticated;
grant execute on function public.get_public_board(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Temps réel
-- ─────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- Reprise des anciennes notes (table "notes" de la v1)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if to_regclass('public.notes') is not null then
    insert into public.tasks (user_id, title, status, due_date, labels, position, completed_at, created_at)
    select
      n.user_id,
      left(n.text, 300),
      case when n.completed then 'done' else 'todo' end,
      n.date,
      case when n.category = 'long' then array['long terme'] else array['rapide'] end,
      n.id::double precision,
      case when n.completed then now() end,
      to_timestamp(n.id / 1000.0)
    from public.notes n
    where not exists (
      select 1 from public.tasks t
      where t.user_id = n.user_id and t.title = left(n.text, 300) and t.project_id is null
    );
  end if;
end $$;
