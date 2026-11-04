-- Copia del esquema ya instalado; requiere la base de Campo Educa.
create table public.infantil_sales_metrics (
 day date not null,
 course_id text not null references public.courses(id),
 channel text not null check (channel in ('WhatsApp directo','Instagram','Facebook','Recomendación','Otro')),
 qualified_contacts integer not null default 0 check (qualified_contacts>=0),
 buyers integer not null default 0 check (buyers>=0),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(day,course_id,channel),
 check(course_id like 'infantil-%')
);
alter table public.infantil_sales_metrics enable row level security;
revoke all on public.infantil_sales_metrics from anon,authenticated;
grant select,insert,update on public.infantil_sales_metrics to authenticated;
create policy infantil_metrics_admin_read on public.infantil_sales_metrics for select to authenticated using (public.is_course_admin());
create policy infantil_metrics_admin_insert on public.infantil_sales_metrics for insert to authenticated with check (public.is_course_admin() and recorded_by=(select auth.uid()));
create policy infantil_metrics_admin_update on public.infantil_sales_metrics for update to authenticated using (public.is_course_admin()) with check (public.is_course_admin() and recorded_by=(select auth.uid()));
