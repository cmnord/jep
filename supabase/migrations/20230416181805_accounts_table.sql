create table "public"."accounts" (
    "id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "email" character varying not null
);


alter table "public"."accounts" enable row level security;

CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id);

alter table "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "public"."accounts" add constraint "accounts_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."accounts" validate constraint "accounts_id_fkey";

create policy "User can only read their own profile"
on "public"."accounts"
as permissive
for select
to authenticated
using ((id = auth.uid()));