-- Room events are inserted only by the server, with the service role, after
-- each route checks who is asking. The browser key can no longer insert them.
alter policy "Enable insert for all users" on public.room_events
  with check (false);
