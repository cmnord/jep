alter table "public"."categories" drop constraint "categories_game_id_fkey";
alter table "public"."categories" add constraint "categories_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;
alter table "public"."categories" validate constraint "categories_game_id_fkey";

alter table "public"."clues" drop constraint "clues_category_id_fkey";
alter table "public"."clues" add constraint "clues_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE not valid;
alter table "public"."clues" validate constraint "clues_category_id_fkey";

alter table "public"."room_events" drop constraint "room_events_room_id_fkey";
alter table "public"."room_events" add constraint "room_events_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE not valid;
alter table "public"."room_events" validate constraint "room_events_room_id_fkey";

alter table "public"."rooms" drop constraint "rooms_game_id_fkey";
alter table "public"."rooms" add constraint "rooms_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;
alter table "public"."rooms" validate constraint "rooms_game_id_fkey";

drop policy "Enable read access for all users" on "public"."games";

create policy "Can only select public games"
on "public"."games"
as permissive
for select
to anon
using ((visibility = 'PUBLIC'::game_visibility));


create policy "Can select public games and games they uploaded"
on "public"."games"
as permissive
for select
to authenticated
using (((visibility = 'PUBLIC'::game_visibility) OR (uploaded_by = auth.uid())));

create policy "Users can delete their own games"
on "public"."games"
as permissive
for delete
to authenticated
using ((auth.uid() = uploaded_by));


create policy "Users can update their own games"
on "public"."games"
as permissive
for update
to authenticated
using ((auth.uid() = uploaded_by))
with check ((auth.uid() = uploaded_by));


