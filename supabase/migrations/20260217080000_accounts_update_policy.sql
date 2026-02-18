create policy "Users can update their own account"
on "public"."accounts"
as permissive
for update
to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));
