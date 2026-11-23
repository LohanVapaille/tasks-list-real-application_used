-- LovaTasks : horizon des tâches (court terme / long terme).
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run.
-- Ré-exécutable sans risque.

alter table public.tasks
  add column if not exists horizon text not null default 'short';

do $$ begin
  alter table public.tasks
    add constraint tasks_horizon_check check (horizon in ('short', 'long'));
exception when duplicate_object then null; end $$;

-- Les tâches importées de la v1 avec l'étiquette « long terme » deviennent long terme,
-- et les étiquettes techniques de la v1 sont retirées.
update public.tasks
set horizon = 'long'
where 'long terme' = any (labels) and horizon <> 'long';

update public.tasks
set labels = array_remove(array_remove(labels, 'long terme'), 'rapide')
where labels && array['long terme', 'rapide'];

create index if not exists tasks_horizon_idx on public.tasks (horizon);

-- Le tableau public expose aussi l'horizon.
create or replace function public.get_public_board(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'project', json_build_object('name', p.name, 'color', p.color, 'icon', p.icon, 'columns', p.columns),
    'tasks', coalesce((
      select json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'status', t.status, 'priority', t.priority, 'horizon', t.horizon,
        'due_date', t.due_date, 'labels', t.labels, 'checklist', t.checklist, 'position', t.position
      ) order by t.position)
      from public.tasks t where t.project_id = p.id
    ), '[]'::json)
  )
  from public.projects p
  where p.public_token = token and token is not null;
$$;
