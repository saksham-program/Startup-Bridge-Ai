-- Block general_user from inserting connection requests.
-- Founder and investor select / insert / update permissions are unchanged.

drop policy if exists "conn_insert" on public.connections;
create policy "conn_insert" on public.connections for insert to authenticated with check (
  requester_id = auth.uid()
  and requester_id <> recipient_id
  and not public.is_blocked_between(requester_id, recipient_id)
  and (public.has_role(auth.uid(),'founder') or public.has_role(auth.uid(),'investor'))
  and not public.has_role(auth.uid(),'general_user')
);

-- Prevent general_user from messaging founders or investors as a workaround.
-- Accepted founder/investor conversations keep the existing insert rule.

drop policy if exists "msg_insert" on public.messages;
create policy "msg_insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.connections c
    where c.id = connection_id
      and c.status = 'accepted'
      and (c.requester_id = auth.uid() or c.recipient_id = auth.uid())
      and not public.is_blocked_between(c.requester_id, c.recipient_id)
  )
  and length(body) between 1 and 2000
  and not (
    public.has_role(auth.uid(), 'general_user')
    and exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (
          (c.requester_id = auth.uid() and (public.has_role(c.recipient_id, 'founder') or public.has_role(c.recipient_id, 'investor')))
          or (c.recipient_id = auth.uid() and (public.has_role(c.requester_id, 'founder') or public.has_role(c.requester_id, 'investor')))
        )
    )
  )
);
