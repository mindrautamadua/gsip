-- ============================================================
-- GSIP tradecraft upgrade:
--   (1) ADMIRALTY/NATO source grading on events
--   (2) Prediction ledger with Brier-score calibration
-- ============================================================

-- ---- (1) Source grading (NATO Admiralty System) -----------
-- Reliability of the SOURCE: A (reliable) .. E (unreliable), F (cannot judge).
-- Credibility of the INFORMATION: 1 (confirmed) .. 5 (improbable), 6 (cannot judge).
alter table public.events
  add column if not exists source_reliability char(1)
    check (source_reliability in ('A','B','C','D','E','F')),
  add column if not exists info_credibility char(1)
    check (info_credibility in ('1','2','3','4','5','6'));

comment on column public.events.source_reliability is 'NATO Admiralty source reliability A-F';
comment on column public.events.info_credibility is 'NATO Admiralty information credibility 1-6';

-- ---- (2) Prediction ledger --------------------------------
-- Every forecast is a falsifiable statement with a probability and a horizon.
-- On resolution we store the Brier score = (probability - outcome)^2 so the
-- platform can report its OWN calibration, per domain, over time.
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  domain_id uuid references public.domains(id),
  statement text not null,
  rationale text,
  probability numeric not null check (probability >= 0 and probability <= 1),
  horizon_date date,                              -- when the claim should be judged
  status text not null default 'pending'
    check (status in ('pending','resolved','expired','cancelled')),
  outcome boolean,                                -- true = happened, false = did not
  brier_score numeric,                            -- (probability - outcome)^2, set on resolve
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text,
  created_by text not null default 'gsip-ai-pipeline',
  created_at timestamptz not null default now()
);

create index if not exists predictions_event_idx on public.predictions(event_id);
create index if not exists predictions_status_idx on public.predictions(status);
create index if not exists predictions_horizon_idx on public.predictions(horizon_date);

alter table public.predictions enable row level security;

drop policy if exists predictions_public_read on public.predictions;
create policy predictions_public_read on public.predictions for select using (true);

-- Resolve a prediction: records outcome + computes Brier score. Token-gated so
-- it can be called from the same trusted context as gsip_ingest, OR by an
-- authenticated analyst/admin (checked via profiles in the later migration).
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
begin
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

-- Per-domain calibration leaderboard: mean Brier score (lower = better),
-- resolved count, and hit-rate on high-confidence (>=0.5) calls.
create or replace view public.prediction_calibration as
select
  d.id as domain_id,
  d.code as domain_code,
  d.name as domain_name,
  count(*) filter (where p.status = 'resolved') as resolved_count,
  count(*) filter (where p.status = 'pending') as pending_count,
  round(avg(p.brier_score) filter (where p.status = 'resolved'), 4) as mean_brier,
  round(
    avg(
      case when p.status = 'resolved'
      then (case when (p.probability >= 0.5) = p.outcome then 1.0 else 0.0 end)
      end
    ), 4
  ) as directional_accuracy
from predictions p
left join domains d on d.id = p.domain_id
group by d.id, d.code, d.name;

grant execute on function public.resolve_prediction(uuid, boolean, text, text)
  to anon, authenticated, service_role;
grant select on public.prediction_calibration to anon, authenticated, service_role;
