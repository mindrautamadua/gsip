-- GSIP ingestion: token-gated SECURITY DEFINER RPC so the pipeline can write
-- through RLS without shipping the service-role key to the app.
-- The actual token row is inserted out-of-band (never committed).

create table if not exists public.ingest_tokens (
  token text primary key,
  label text,
  created_at timestamptz not null default now()
);

alter table public.ingest_tokens enable row level security;
-- no policies: rows are invisible to anon/authenticated; only service role
-- and SECURITY DEFINER functions can read them.
revoke all on public.ingest_tokens from anon, authenticated;

create or replace function public.gsip_ingest(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_type_id uuid;
  v_domain_id uuid;
  v_entity jsonb;
  v_entity_id uuid;
  v_entity_type_id uuid;
  v_ent_domain_id uuid;
  v_subsector_id uuid;
  v_edge jsonb;
  v_src uuid;
  v_tgt uuid;
  v_rel_id uuid;
  v_link jsonb;
  v_linked_event uuid;
  v_analysis jsonb;
  v_entities_created int := 0;
  v_entities_linked int := 0;
  v_edges_created int := 0;
  v_event_links int := 0;
begin
  if p_token is null or not exists (select 1 from ingest_tokens where token = p_token) then
    raise exception 'invalid ingest token' using errcode = '28000';
  end if;

  if nullif(p_payload->>'source_url', '') is not null and exists (
    select 1 from events where source_url = p_payload->>'source_url'
  ) then
    return jsonb_build_object('skipped', true, 'reason', 'duplicate source_url');
  end if;

  select id into v_event_type_id from event_types where code = p_payload->>'event_type_code';
  if v_event_type_id is null then
    raise exception 'unknown event_type_code: %', p_payload->>'event_type_code';
  end if;

  select id into v_domain_id from domains where code = p_payload->>'domain_code';

  insert into events (event_type_id, domain_id, title, summary, description,
                      event_date, importance, confidence, status, source_url)
  values (
    v_event_type_id,
    v_domain_id,
    p_payload->>'title',
    p_payload->>'summary',
    p_payload->>'description',
    nullif(p_payload->>'event_date', '')::date,
    least(5, greatest(1, coalesce(nullif(p_payload->>'importance','')::int, 3)))::smallint,
    least(1.0, greatest(0.0, coalesce(nullif(p_payload->>'confidence','')::numeric, 0.5))),
    coalesce(nullif(p_payload->>'status',''), 'active'),
    nullif(p_payload->>'source_url', '')
  ) returning id into v_event_id;

  for v_entity in select * from jsonb_array_elements(coalesce(p_payload->'entities', '[]'::jsonb))
  loop
    select id into v_entity_id from entities where slug = v_entity->>'slug';
    if v_entity_id is null then
      select id into v_entity_type_id from entity_types where code = v_entity->>'entity_type_code';
      if v_entity_type_id is null then
        continue; -- unknown type: skip the entity, keep the run alive
      end if;
      select id into v_ent_domain_id from domains where code = v_entity->>'domain_code';
      select id into v_subsector_id from subsectors where code = v_entity->>'gics_industry_code';
      insert into entities (entity_type_id, domain_id, name, slug, subsector_id, country_code, description)
      values (
        v_entity_type_id, v_ent_domain_id,
        v_entity->>'name', v_entity->>'slug',
        v_subsector_id,
        upper(nullif(v_entity->>'country_code', '')),
        v_entity->>'description'
      ) returning id into v_entity_id;
      v_entities_created := v_entities_created + 1;
    end if;

    if not exists (select 1 from event_entities where event_id = v_event_id and entity_id = v_entity_id) then
      insert into event_entities (event_id, entity_id, role)
      values (v_event_id, v_entity_id, coalesce(nullif(v_entity->>'role',''), 'involves'));
      v_entities_linked := v_entities_linked + 1;
    end if;
  end loop;

  for v_edge in select * from jsonb_array_elements(coalesce(p_payload->'entity_edges', '[]'::jsonb))
  loop
    select id into v_src from entities where slug = v_edge->>'source_slug';
    select id into v_tgt from entities where slug = v_edge->>'target_slug';
    select id into v_rel_id from relationship_types where code = v_edge->>'relationship_code';
    if v_src is null or v_tgt is null or v_rel_id is null or v_src = v_tgt then
      continue;
    end if;
    if exists (select 1 from entity_edges
               where source_entity_id = v_src and target_entity_id = v_tgt
                 and relationship_type_id = v_rel_id) then
      continue;
    end if;
    insert into entity_edges (source_entity_id, target_entity_id, relationship_type_id)
    values (v_src, v_tgt, v_rel_id);
    v_edges_created := v_edges_created + 1;
  end loop;

  v_analysis := p_payload->'analysis';
  if v_analysis is not null and jsonb_typeof(v_analysis) = 'object' then
    insert into event_analyses (event_id, what, who, when_text, where_text, why, how,
                                impact, risk, opportunity, scenario, prediction, recommendation,
                                impact_score, risk_score, opportunity_score, confidence_score, analyst)
    values (
      v_event_id,
      v_analysis->>'what', v_analysis->>'who', v_analysis->>'when_text', v_analysis->>'where_text',
      v_analysis->>'why', v_analysis->>'how',
      v_analysis->>'impact', v_analysis->>'risk', v_analysis->>'opportunity',
      v_analysis->>'scenario', v_analysis->>'prediction', v_analysis->>'recommendation',
      least(5, greatest(1, coalesce(nullif(v_analysis->>'impact_score','')::int, 3)))::smallint,
      least(5, greatest(1, coalesce(nullif(v_analysis->>'risk_score','')::int, 3)))::smallint,
      least(5, greatest(1, coalesce(nullif(v_analysis->>'opportunity_score','')::int, 3)))::smallint,
      least(1.0, greatest(0.0, coalesce(nullif(v_analysis->>'confidence_score','')::numeric, 0.5))),
      coalesce(nullif(v_analysis->>'analyst',''), 'gsip-ai-pipeline')
    );
  end if;

  for v_link in select * from jsonb_array_elements(coalesce(p_payload->'event_links', '[]'::jsonb))
  loop
    begin
      v_linked_event := (v_link->>'event_id')::uuid;
    exception when others then
      continue;
    end;
    if v_linked_event = v_event_id
       or not exists (select 1 from events where id = v_linked_event) then
      continue;
    end if;
    -- direction 'incoming' = the existing event triggers this new one
    insert into event_edges (source_event_id, target_event_id, relation)
    values (
      case when coalesce(v_link->>'direction', 'incoming') = 'incoming' then v_linked_event else v_event_id end,
      case when coalesce(v_link->>'direction', 'incoming') = 'incoming' then v_event_id else v_linked_event end,
      coalesce(nullif(v_link->>'relation',''), 'triggers')
    );
    v_event_links := v_event_links + 1;
  end loop;

  return jsonb_build_object(
    'skipped', false,
    'event_id', v_event_id,
    'entities_created', v_entities_created,
    'entities_linked', v_entities_linked,
    'entity_edges_created', v_edges_created,
    'event_links_created', v_event_links
  );
end;
$$;

revoke all on function public.gsip_ingest(text, jsonb) from public;
grant execute on function public.gsip_ingest(text, jsonb) to anon, authenticated, service_role;
