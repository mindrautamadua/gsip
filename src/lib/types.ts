// GSIP domain types — 5-layer strategic intelligence model.

export type Domain = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

export type Industry = { id: string; code: string; name: string; slug: string }; // GICS Sector
export type Sector = { id: string; industry_id: string; code: string; name: string; slug: string }; // GICS Industry Group
export type Subsector = { id: string; sector_id: string; code: string; name: string; slug: string }; // GICS Industry

export type EntityType = {
  id: string;
  code: string;
  label: string;
  category: string | null;
  icon: string | null;
};

export type Entity = {
  id: string;
  entity_type_id: string;
  domain_id: string | null;
  name: string;
  slug: string;
  subsector_id: string | null;
  country_code: string | null;
  description: string | null;
};

export type EventRow = {
  id: string;
  event_type_id: string;
  domain_id: string | null;
  title: string;
  summary: string | null;
  event_date: string | null;
  importance: number | null;
  confidence: number | null;
  status: string;
};

export type EventAnalysis = {
  id: string;
  event_id: string;
  what: string | null;
  who: string | null;
  when_text: string | null;
  where_text: string | null;
  why: string | null;
  how: string | null;
  impact: string | null;
  risk: string | null;
  opportunity: string | null;
  scenario: string | null;
  prediction: string | null;
  recommendation: string | null;
  impact_score: number | null;
  risk_score: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;
  analyst: string | null;
};

export type ActionRow = {
  id: string;
  event_id: string | null;
  action_type_id: string;
  title: string;
  owner: string | null;
  due_date: string | null;
  priority: number | null;
  status: string;
};
