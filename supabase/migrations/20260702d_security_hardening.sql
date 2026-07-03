-- ============================================================
-- Security hardening from Supabase advisors:
--  - calibration view runs as invoker (respects caller RLS)
--  - trigger functions are not REST-exposed
--  - resolve_prediction enforces analyst/admin inside the function
-- ============================================================

-- View should honor the querying user's RLS, not the owner's.
alter view public.prediction_calibration set (security_invoker = on);

-- Trigger-only functions must not be callable via /rest/v1/rpc.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_signin() from public, anon, authenticated;

-- Role helper: only signed-in users need it (anon has no uid anyway).
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- resolve_prediction: enforce role INSIDE the function so it cannot be abused
-- by a low-privilege authenticated user calling the RPC directly.
create or replace function public.resolve_prediction(
  p_id uuid,
  p_outcome boolean,
  p_note text default null,
  p_resolver text default 'analyst'
) returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.predictions;
  v_prob numeric;
  v_role text;
begin
  v_role := public.current_user_role();
  if v_role is null or v_role not in ('analyst','admin') then
    raise exception 'akses ditolak: butuh role analyst/admin' using errcode = '42501';
  end if;

  select probability into v_prob from predictions where id = p_id;
  if v_prob is null then
    raise exception 'prediction % not found', p_id;
  end if;

  update predictions set
    status = 'resolved',
    outcome = p_outcome,
    brier_score = power(v_prob - (case when p_outcome then 1 else 0 end), 2),
    resolved_at = now(),
    resolved_by = p_resolver,
    resolution_note = p_note
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.resolve_prediction(uuid, boolean, text, text) from public, anon;
grant execute on function public.resolve_prediction(uuid, boolean, text, text) to authenticated, service_role;
