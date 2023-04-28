drop policy "Enable insert for all users" on "public"."categories";
drop policy "Enable read access for all users" on "public"."categories";
drop policy "Enable insert for all users" on "public"."clues";
drop policy "Enable read access for all users" on "public"."clues";

create policy "Can insert categories if they can insert game" on "public"."categories" as permissive for
insert to public with check (
      (
         EXISTS (
            SELECT 1
            FROM games
            WHERE (games.id = categories.game_id)
         )
      )
   );

create policy "Can view categories for games they can view" on "public"."categories" as permissive for
select to public using (
      (
         EXISTS (
            SELECT 1
            FROM games
            WHERE (games.id = categories.game_id)
         )
      )
   );

create policy "Can insert clues if they can insert category" on "public"."clues" as permissive for
insert to public with check (
      (
         EXISTS (
            SELECT 1
            FROM categories
            WHERE (categories.id = clues.category_id)
         )
      )
   );

create policy "Can read clues for categories they can read" on "public"."clues" as permissive for
select to public using (
      (
         EXISTS (
            SELECT 1
            FROM categories
            WHERE (categories.id = clues.category_id)
         )
      )
   );