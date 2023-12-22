-- Index all foreign keys, on all tables

create index "categories_game_id_fkey_idx" on "public"."categories" (game_id);
create index "clues_category_id_fkey_idx" on "public"."clues" (category_id);
create index "games_uploaded_by_fkey_idx" on "public"."games" (uploaded_by);
create index "reports_created_by_fkey_idx" on "public"."reports" (created_by);
create index "reports_game_id_fkey_idx" on "public"."reports" (game_id);
create index "room_events_room_id_fkey_idx" on "public"."room_events" (room_id);
create index "rooms_game_id_fkey_idx" on "public"."rooms" (game_id);
create index "solves_game_id_fkey_idx" on "public"."solves" (game_id);
create index "solves_room_id_fkey_idx" on "public"."solves" (room_id);
create index "solves_user_id_fkey_idx" on "public"."solves" (user_id);