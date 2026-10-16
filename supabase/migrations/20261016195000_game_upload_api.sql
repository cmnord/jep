-- Only the trusted Jep server/operator can access upload credentials or invoke
-- these RPCs. Browser uploads also use create_game_atomic after session checks.
create table public.game_uploaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  enabled boolean not null default false
);
create table public.game_upload_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  uploader_id uuid not null references public.game_uploaders(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.game_upload_reservations (
  uploader_id uuid not null references public.game_uploaders(id),
  key text not null,
  primary key (uploader_id, key)
);
create table public.game_upload_receipts (
  uploader_id uuid not null references public.game_uploaders(id),
  key text not null,
  content jsonb not null,
  content_hash text not null,
  game_id uuid references public.games(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (uploader_id, key)
);

alter table public.game_uploaders enable row level security;
alter table public.game_upload_tokens enable row level security;
alter table public.game_upload_reservations enable row level security;
alter table public.game_upload_receipts enable row level security;
revoke all on public.game_uploaders, public.game_upload_tokens,
  public.game_upload_reservations, public.game_upload_receipts from anon, authenticated;
grant all on public.game_uploaders, public.game_upload_tokens,
  public.game_upload_reservations, public.game_upload_receipts to service_role;

create function public.create_game_atomic(
  p_game jsonb, p_visibility public.game_visibility, p_uploaded_by uuid default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  game_id uuid;
  category_id bigint;
  board jsonb;
  category jsonb;
  clue jsonb;
  round_index integer := 0;
begin
  insert into public.games(title, author, copyright, note, visibility, uploaded_by)
    values(p_game->>'title', p_game->>'author', p_game->>'copyright', p_game->>'note', p_visibility, p_uploaded_by)
    returning id into game_id;
  for board in select value from jsonb_array_elements(p_game->'boards') loop
    for category in select value from jsonb_array_elements(board->'categories') loop
      insert into public.categories(game_id, name, note, round)
        values(game_id, category->>'name', category->>'note', round_index)
        returning id into category_id;
      for clue in select value from jsonb_array_elements(category->'clues') loop
        insert into public.clues(category_id, clue, answer, value, wagerable, long_form, image_src)
          values(category_id, clue->>'clue', clue->>'answer', (clue->>'value')::bigint,
            coalesce((clue->>'wagerable')::boolean, false), coalesce((clue->>'longForm')::boolean, false), clue->>'imageSrc');
      end loop;
    end loop;
    round_index := round_index + 1;
  end loop;
  return game_id;
end;
$$;

create function public.upload_game(
  p_token_hash text, p_key text, p_game jsonb, p_content_hash text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  uploader uuid;
  receipt public.game_upload_receipts;
  new_id uuid;
begin
  select u.id into uploader from public.game_uploaders u
    join public.game_upload_tokens t on t.uploader_id = u.id
    where t.token_hash = p_token_hash and t.revoked_at is null and u.enabled
    for share of u, t;
  if uploader is null then return jsonb_build_object('error', 'unauthorized'); end if;
  -- Serialize a key, including the first request when there is no receipt row.
  perform pg_advisory_xact_lock(hashtextextended(uploader::text || ':' || p_key, 0));
  select * into receipt from public.game_upload_receipts where uploader_id = uploader and key = p_key;
  if found then
    if receipt.content <> p_game then return jsonb_build_object('error', 'idempotency_conflict'); end if;
    if receipt.game_id is null then return jsonb_build_object('error', 'game_deleted'); end if;
    return jsonb_build_object('result', 'replayed', 'gameId', receipt.game_id, 'contentHash', receipt.content_hash);
  end if;
  if exists(select 1 from public.game_upload_reservations where uploader_id = uploader and key = p_key) then
    return jsonb_build_object('error', 'reconciliation_required');
  end if;
  new_id := public.create_game_atomic(p_game, 'PUBLIC', null);
  insert into public.game_upload_receipts(uploader_id, key, content, content_hash, game_id)
    values(uploader, p_key, p_game, p_content_hash, new_id);
  return jsonb_build_object('result', 'created', 'gameId', new_id, 'contentHash', p_content_hash);
end;
$$;

-- Raw snapshot for operator reconciliation. No title-based lookup. Arrays use
-- insertion IDs; the operator compares legacy category/clue multisets per round.
create function public.game_upload_snapshot(p_game_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('title', g.title, 'author', g.author,
    'copyright', coalesce(g.copyright, ''), 'note', coalesce(g.note, ''),
    'boards', coalesce((select jsonb_agg(b.board order by b.round) from (
      select c.round, jsonb_build_object(
        'categoryNames', jsonb_agg(c.name order by c.id),
        'categories', jsonb_agg(jsonb_build_object('name', c.name, 'note', coalesce(c.note, ''),
          'clues', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'clue', l.clue, 'answer', l.answer, 'value', l.value,
            'wagerable', l.wagerable, 'longForm', l.long_form, 'imageSrc', l.image_src)) order by l.id)
            from public.clues l where l.category_id = c.id), '[]'::jsonb)) order by c.id)) as board
      from public.categories c where c.game_id = g.id group by c.round
    ) b), '[]'::jsonb)) from public.games g where g.id = p_game_id
    and (select min(round) = 0 and max(round) = count(distinct round) - 1
         from public.categories where game_id = g.id);
$$;

create function public.reconcile_game_upload(
  p_uploader uuid, p_key text, p_game_id uuid, p_expected_snapshot jsonb,
  p_game jsonb, p_content_hash text
) returns void language plpgsql set search_path = '' as $$
declare receipt public.game_upload_receipts;
begin
  -- Reconciliation is an infrequent operator action. Freeze all components
  -- during the verified snapshot check, including against legacy direct SQL.
  perform pg_advisory_xact_lock(hashtextextended(p_uploader::text || ':' || p_key, 0));
  lock table public.games, public.categories, public.clues in share row exclusive mode;
  if public.game_upload_snapshot(p_game_id) is distinct from p_expected_snapshot
     or p_expected_snapshot is null
     or not exists(select 1 from public.games where id = p_game_id and visibility = 'PUBLIC') then
    raise exception 'Existing game changed, is missing, or is not public';
  end if;
  select * into receipt from public.game_upload_receipts where uploader_id = p_uploader and key = p_key;
  if found then
    if receipt.content <> p_game or receipt.game_id is distinct from p_game_id then
      raise exception 'Existing receipt conflicts';
    end if;
  else
    insert into public.game_upload_receipts(uploader_id, key, content, content_hash, game_id)
      values(p_uploader, p_key, p_game, p_content_hash, p_game_id);
  end if;
  -- Keep the reservation as defense if the receipt is ever restored separately.
end;
$$;

revoke all on function public.create_game_atomic(jsonb, public.game_visibility, uuid),
  public.upload_game(text, text, jsonb, text), public.game_upload_snapshot(uuid),
  public.reconcile_game_upload(uuid, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_game_atomic(jsonb, public.game_visibility, uuid),
  public.upload_game(text, text, jsonb, text), public.game_upload_snapshot(uuid),
  public.reconcile_game_upload(uuid, text, uuid, jsonb, jsonb, text) to service_role;
