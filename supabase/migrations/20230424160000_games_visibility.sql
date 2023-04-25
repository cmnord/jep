CREATE TYPE game_visibility AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

ALTER TABLE "games"
ADD COLUMN visibility game_visibility not null DEFAULT 'UNLISTED';

alter table "public"."games"
add column "uploaded_by" uuid;

alter table "public"."games"
add constraint "games_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."games" validate constraint "games_uploaded_by_fkey";