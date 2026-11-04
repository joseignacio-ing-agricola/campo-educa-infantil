-- Esquema de la tabla añadida en CAMPO EDUCA. Requiere el esquema original.
-- Copia de referencia; ya está instalado. No ejecutar para recrear el proyecto original.
create table public.campo_infantil_materials (
 course_id text primary key references public.courses(id),
 content jsonb not null check (jsonb_typeof(content) = 'object'),
 updated_at timestamptz not null default now(),
 check (course_id like 'infantil-%')
);
alter table public.campo_infantil_materials enable row level security;
revoke all on public.campo_infantil_materials from anon, authenticated;
grant select on public.campo_infantil_materials to authenticated;
create policy infant_material_enrolled_read on public.campo_infantil_materials
for select to authenticated using (
 exists (select 1 from public.courses c where c.id=course_id and c.active)
);
