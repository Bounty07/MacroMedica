create table if not exists public.signes_vitaux (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  cabinet_id uuid not null references public.cabinets(id) on delete cascade,
  poids numeric(6,2),
  taille numeric(6,2),
  imc numeric(5,2),
  tension_systolique integer,
  tension_diastolique integer,
  frequence_cardiaque integer,
  temperature numeric(4,1),
  saturation integer,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint signes_vitaux_tension_check
    check (
      (tension_systolique is null and tension_diastolique is null)
      or (tension_systolique is not null and tension_diastolique is not null)
    )
);

create index if not exists idx_signes_vitaux_patient_measured_at
  on public.signes_vitaux(patient_id, measured_at desc);

alter table public.signes_vitaux enable row level security;

drop policy if exists "signes_vitaux_select_same_cabinet" on public.signes_vitaux;
create policy "signes_vitaux_select_same_cabinet"
on public.signes_vitaux
for select
using (
  cabinet_id = (
    select cabinet_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "signes_vitaux_insert_same_cabinet" on public.signes_vitaux;
create policy "signes_vitaux_insert_same_cabinet"
on public.signes_vitaux
for insert
with check (
  cabinet_id = (
    select cabinet_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "signes_vitaux_update_same_cabinet" on public.signes_vitaux;
create policy "signes_vitaux_update_same_cabinet"
on public.signes_vitaux
for update
using (
  cabinet_id = (
    select cabinet_id
    from public.profiles
    where profiles.id = auth.uid()
  )
)
with check (
  cabinet_id = (
    select cabinet_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

drop policy if exists "signes_vitaux_delete_same_cabinet" on public.signes_vitaux;
create policy "signes_vitaux_delete_same_cabinet"
on public.signes_vitaux
for delete
using (
  cabinet_id = (
    select cabinet_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);
