alter table "public"."accounts" drop constraint "accounts_id_fkey";

alter table "public"."accounts" add constraint "accounts_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_id_fkey";


