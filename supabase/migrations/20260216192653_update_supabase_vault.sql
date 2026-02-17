-- pgaudit conflict on local reset; vault 0.3.1 is already the default in Postgres 17
do $$ begin
  alter extension supabase_vault update to '0.3.1';
exception when others then null;
end $$;
