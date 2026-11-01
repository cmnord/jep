-- Production builds call this to refuse deploying app code before the
-- migrations it depends on are applied. See scripts/check-migrations.ts.
create function public.applied_migrations() returns setof text
language sql stable security definer set search_path = '' as $$
  select version from supabase_migrations.schema_migrations;
$$;

revoke all on function public.applied_migrations() from public, anon, authenticated;
grant execute on function public.applied_migrations() to service_role;
