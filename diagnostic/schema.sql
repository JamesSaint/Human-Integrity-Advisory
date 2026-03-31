-- ============================================================
-- ALMA v3.0 — AI Literacy Mindset Assessment
-- PostgreSQL Database Schema
-- Developed by Mulya van Roon, AIGP
-- In collaboration with Dr. Joanna Michalska, Ethica Group Ltd
-- Version 3.0 — March 2026
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- TABLE: organisations
-- Optional parent table for multi-org deployments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE organisations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(50)  UNIQUE,          -- External deployment code
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: respondents
-- Demographic context (Section A) and session metadata
-- ─────────────────────────────────────────────────────────────
CREATE TABLE respondents (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id            UUID REFERENCES organisations(id) ON DELETE SET NULL,
  session_id                 VARCHAR(64) UNIQUE NOT NULL,  -- Browser session or survey token

  -- Section A demographic context items
  a1_role                    VARCHAR(60),   -- C-suite/Board | Senior leader | Middle manager | Technical specialist | AI/Data professional | Other
  a2_function                VARCHAR(60),   -- General management | IT/Technology | Risk/Compliance | Legal | Finance | Operations | HR | R&D | Other
  a3_industry                VARCHAR(60),   -- Financial services | Healthcare/Life sciences | Technology | Manufacturing | Professional services | Public sector | Energy/Utilities | Other
  a4_org_size                VARCHAR(20),   -- Under 500 | 500–2,000 | 2,001–10,000 | 10,001–50,000 | Over 50,000
  a5_ai_usage                VARCHAR(60),   -- Don't use | Occasional | Regular | Daily | Direct development/deployment
  a6_governance_framework    VARCHAR(50),   -- No framework | In development | Inconsistently applied | Actively used | Don't know
  a7_ai_frequency            VARCHAR(30),   -- Never | Monthly | Weekly | Daily | Multiple times per day

  -- Derived role tier for delusion gap analysis
  role_tier                  VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN a1_role IN ('C-suite/Board','Senior leader/Director') THEN 'leadership'
      WHEN a1_role IN ('Middle manager') THEN 'management'
      WHEN a1_role IN ('Technical specialist','AI/Data professional') THEN 'practitioner'
      ELSE 'other'
    END
  ) STORED,

  -- Completion metadata
  completed                  BOOLEAN     DEFAULT FALSE,
  completion_time_seconds    INTEGER,
  submitted_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_respondents_org  ON respondents(organisation_id);
CREATE INDEX idx_respondents_tier ON respondents(role_tier);
CREATE INDEX idx_respondents_date ON respondents(submitted_at);

-- ─────────────────────────────────────────────────────────────
-- TABLE: responses
-- Individual item-level responses for all sections B–K
-- ─────────────────────────────────────────────────────────────
CREATE TABLE responses (
  id              BIGSERIAL   PRIMARY KEY,
  respondent_id   UUID        NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  section         CHAR(1)     NOT NULL CHECK (section IN ('B','C','D','E','F','G','H','I','J','K')),
  item_id         VARCHAR(4)  NOT NULL,  -- e.g. B1, C10, K15
  item_type       VARCHAR(15) NOT NULL CHECK (item_type IN ('attitude','frequency')),
  notation        VARCHAR(3),            -- ●, ★, ◆, ▲ — null for unnotated items
  dimension       VARCHAR(2),            -- ps, go, af, co, ce — null for governance gap sections
  governance_gap  VARCHAR(15),           -- accountability, authority, intervention, escalation — null for dimensions
  score           SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_responses_respondent ON responses(respondent_id);
CREATE INDEX idx_responses_section    ON responses(section);
CREATE INDEX idx_responses_item       ON responses(item_id);
CREATE INDEX idx_responses_dimension  ON responses(dimension);
CREATE INDEX idx_responses_gap        ON responses(governance_gap);

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_dimensional_attitude_scores
-- Attitude sub-scores for each of the 5 core dimensions (B–F)
-- Excludes social desirability check items (▲) from totals
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_dimensional_attitude_scores AS
SELECT
  r.respondent_id,
  r.dimension,
  SUM(r.score)                                                  AS att_raw,
  COUNT(r.score)                                                AS att_count,
  ROUND(((SUM(r.score)::NUMERIC - 10) / 40) * 100, 1)          AS att_pct,
  -- Leading indicator scores (● items only)
  AVG(CASE WHEN r.notation = '●' THEN r.score END)              AS leading_indicator_avg,
  -- Validation item scores (★ items only)
  AVG(CASE WHEN r.notation = '★' THEN r.score END)              AS validation_avg
FROM responses r
WHERE
  r.item_type = 'attitude'
  AND r.dimension IS NOT NULL
  AND (r.notation IS NULL OR r.notation != '▲')  -- Exclude social desirability checks
GROUP BY r.respondent_id, r.dimension;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_behavioural_scores
-- Behavioural frequency sub-scores per dimension (Section K)
-- 3 items per dimension, 1–5 scale, max = 15, rescaled to %
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_behavioural_scores AS
SELECT
  r.respondent_id,
  r.dimension,
  SUM(r.score)                                                  AS beh_raw,
  COUNT(r.score)                                                AS beh_count,
  -- Rescale: (raw - 3) / 12 * 100 (min=3, max=15 for 3 items × 1-5)
  ROUND(((SUM(r.score)::NUMERIC - 3) / 12) * 100, 1)           AS beh_pct
FROM responses r
WHERE
  r.item_type = 'frequency'
  AND r.dimension IS NOT NULL
GROUP BY r.respondent_id, r.dimension;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_dimensional_composite_scores
-- 50/50 composite of attitude and behavioural frequency per dimension
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_dimensional_composite_scores AS
SELECT
  a.respondent_id,
  a.dimension,
  a.att_pct,
  COALESCE(b.beh_pct, 0)                                       AS beh_pct,
  ROUND((a.att_pct + COALESCE(b.beh_pct, 0)) / 2, 1)          AS composite_pct,
  -- RAG classification
  CASE
    WHEN ROUND((a.att_pct + COALESCE(b.beh_pct, 0)) / 2, 1) >= 70 THEN 'green'
    WHEN ROUND((a.att_pct + COALESCE(b.beh_pct, 0)) / 2, 1) >= 40 THEN 'amber'
    ELSE 'red'
  END                                                           AS rag_status,
  -- Paper governance flag: high attitude, low behaviour
  CASE
    WHEN a.att_pct > 75 AND COALESCE(b.beh_pct, 0) < 25 THEN TRUE
    ELSE FALSE
  END                                                           AS paper_governance_flag,
  a.leading_indicator_avg,
  a.validation_avg
FROM v_dimensional_attitude_scores a
LEFT JOIN v_behavioural_scores b
  ON a.respondent_id = b.respondent_id AND a.dimension = b.dimension;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_governance_gap_scores
-- Scores for Sections G–J (Accountability, Authority, Intervention, Escalation)
-- 5 items each, 1–5 scale, rescaled to %
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_governance_gap_scores AS
SELECT
  r.respondent_id,
  r.governance_gap,
  SUM(r.score)                                                  AS gap_raw,
  ROUND(((SUM(r.score)::NUMERIC - 5) / 20) * 100, 1)           AS gap_pct,
  CASE
    WHEN ROUND(((SUM(r.score)::NUMERIC - 5) / 20) * 100, 1) >= 70 THEN 'green'
    WHEN ROUND(((SUM(r.score)::NUMERIC - 5) / 20) * 100, 1) >= 40 THEN 'amber'
    ELSE 'red'
  END                                                           AS rag_status
FROM responses r
WHERE r.governance_gap IS NOT NULL
GROUP BY r.respondent_id, r.governance_gap;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_hoc_composite
-- Human Oversight Capacity composite score
-- Average of all 4 governance gap percentages
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_hoc_composite AS
SELECT
  respondent_id,
  ROUND(AVG(gap_pct), 1)                                        AS hoc_composite_pct,
  CASE
    WHEN ROUND(AVG(gap_pct), 1) >= 70 THEN 'green'
    WHEN ROUND(AVG(gap_pct), 1) >= 40 THEN 'amber'
    ELSE 'red'
  END                                                           AS rag_status,
  -- Individual gap components for breakdown
  MAX(CASE WHEN governance_gap = 'accountability' THEN gap_pct END)  AS accountability_pct,
  MAX(CASE WHEN governance_gap = 'authority'      THEN gap_pct END)  AS authority_pct,
  MAX(CASE WHEN governance_gap = 'intervention'   THEN gap_pct END)  AS intervention_pct,
  MAX(CASE WHEN governance_gap = 'escalation'     THEN gap_pct END)  AS escalation_pct
FROM v_governance_gap_scores
GROUP BY respondent_id;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_overall_readiness
-- Full respondent-level summary: all dimensions + HOC + overall
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_overall_readiness AS
SELECT
  res.id                  AS respondent_id,
  res.a1_role,
  res.a2_function,
  res.a3_industry,
  res.a4_org_size,
  res.a5_ai_usage,
  res.a6_governance_framework,
  res.role_tier,
  -- Dimensional composites (pivoted)
  MAX(CASE WHEN d.dimension = 'ps' THEN d.composite_pct END)    AS ps_pct,
  MAX(CASE WHEN d.dimension = 'go' THEN d.composite_pct END)    AS go_pct,
  MAX(CASE WHEN d.dimension = 'af' THEN d.composite_pct END)    AS af_pct,
  MAX(CASE WHEN d.dimension = 'co' THEN d.composite_pct END)    AS co_pct,
  MAX(CASE WHEN d.dimension = 'ce' THEN d.composite_pct END)    AS ce_pct,
  -- Paper governance flags
  MAX(CASE WHEN d.dimension = 'ps' AND d.paper_governance_flag THEN 'Y' ELSE 'N' END) AS ps_paper_gov,
  MAX(CASE WHEN d.dimension = 'go' AND d.paper_governance_flag THEN 'Y' ELSE 'N' END) AS go_paper_gov,
  MAX(CASE WHEN d.dimension = 'af' AND d.paper_governance_flag THEN 'Y' ELSE 'N' END) AS af_paper_gov,
  MAX(CASE WHEN d.dimension = 'co' AND d.paper_governance_flag THEN 'Y' ELSE 'N' END) AS co_paper_gov,
  MAX(CASE WHEN d.dimension = 'ce' AND d.paper_governance_flag THEN 'Y' ELSE 'N' END) AS ce_paper_gov,
  -- HOC
  h.hoc_composite_pct,
  h.accountability_pct,
  h.authority_pct,
  h.intervention_pct,
  h.escalation_pct,
  -- Overall psychological readiness composite (average of 5 dimensions)
  ROUND((
    MAX(CASE WHEN d.dimension = 'ps' THEN d.composite_pct END) +
    MAX(CASE WHEN d.dimension = 'go' THEN d.composite_pct END) +
    MAX(CASE WHEN d.dimension = 'af' THEN d.composite_pct END) +
    MAX(CASE WHEN d.dimension = 'co' THEN d.composite_pct END) +
    MAX(CASE WHEN d.dimension = 'ce' THEN d.composite_pct END)
  ) / 5, 1)                                                     AS overall_readiness_pct,
  res.submitted_at
FROM respondents res
JOIN v_dimensional_composite_scores d ON d.respondent_id = res.id
JOIN v_hoc_composite h                ON h.respondent_id = res.id
WHERE res.completed = TRUE
GROUP BY
  res.id, res.a1_role, res.a2_function, res.a3_industry, res.a4_org_size,
  res.a5_ai_usage, res.a6_governance_framework, res.role_tier,
  h.hoc_composite_pct, h.accountability_pct, h.authority_pct,
  h.intervention_pct, h.escalation_pct, res.submitted_at;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_cross_dimensional_risk_patterns
-- Detects which of the 5 ALMA risk patterns are active per respondent
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_cross_dimensional_risk_patterns AS
SELECT
  respondent_id,
  ps_pct, go_pct, af_pct, co_pct, ce_pct,
  -- Silent Automation: Low Psych Safety + Low Critical Engagement
  (ps_pct < 40 AND ce_pct < 40)     AS silent_automation,
  -- Diffused Passivity: Low Conscious Ownership + Low Critical Engagement
  (co_pct < 40 AND ce_pct < 40)     AS diffused_passivity,
  -- Frozen Governance: Low Adaptive Flexibility + Low Growth Orientation
  (af_pct < 40 AND go_pct < 40)     AS frozen_governance,
  -- Lonely Vigilance: High Critical Engagement + Low Psychological Safety
  (ce_pct > 70 AND ps_pct < 40)     AS lonely_vigilance,
  -- Confident Blindness: High Growth Orientation + Low Critical Engagement
  (go_pct > 70 AND ce_pct < 40)     AS confident_blindness,
  -- Count of active patterns (overall risk severity indicator)
  (
    CASE WHEN ps_pct < 40 AND ce_pct < 40 THEN 1 ELSE 0 END +
    CASE WHEN co_pct < 40 AND ce_pct < 40 THEN 1 ELSE 0 END +
    CASE WHEN af_pct < 40 AND go_pct < 40 THEN 1 ELSE 0 END +
    CASE WHEN ce_pct > 70 AND ps_pct < 40 THEN 1 ELSE 0 END +
    CASE WHEN go_pct > 70 AND ce_pct < 40 THEN 1 ELSE 0 END
  )                                  AS active_pattern_count
FROM v_overall_readiness;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_delusion_gap_analysis
-- Compares leadership vs practitioner scores on each dimension
-- A gap > 15% on Psychological Safety is a critical delusion gap signal
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_delusion_gap_analysis AS
WITH tier_averages AS (
  SELECT
    r.a3_industry,
    res.role_tier,
    d.dimension,
    ROUND(AVG(d.composite_pct), 1) AS avg_composite_pct
  FROM v_dimensional_composite_scores d
  JOIN respondents res ON res.id = d.respondent_id
  JOIN respondents r   ON r.id   = d.respondent_id
  WHERE res.completed = TRUE
  GROUP BY r.a3_industry, res.role_tier, d.dimension
)
SELECT
  l.a3_industry,
  l.dimension,
  l.avg_composite_pct                               AS leadership_avg,
  p.avg_composite_pct                               AS practitioner_avg,
  ROUND(l.avg_composite_pct - p.avg_composite_pct, 1) AS delusion_gap,
  CASE
    WHEN l.dimension = 'ps'
     AND ABS(l.avg_composite_pct - p.avg_composite_pct) > 15 THEN TRUE
    ELSE FALSE
  END                                               AS ps_delusion_gap_critical
FROM tier_averages l
JOIN tier_averages p
  ON l.a3_industry = p.a3_industry
 AND l.dimension   = p.dimension
 AND l.role_tier   = 'leadership'
 AND p.role_tier   = 'practitioner';

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_leading_indicator_flags
-- Monitors items B3, B5 (escalation collapse risk),
-- E2 (accountability diffusion), F1 (automation bias entrenchment)
-- at individual and aggregate levels
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_leading_indicator_flags AS
SELECT
  r.respondent_id,
  -- B3 + B5 average: < 3 = escalation collapse risk flag
  ROUND(
    (MAX(CASE WHEN r.item_id='B3' THEN r.score END)::NUMERIC +
     MAX(CASE WHEN r.item_id='B5' THEN r.score END)::NUMERIC) / 2, 1
  )                                                       AS b3_b5_avg,
  CASE WHEN
    (MAX(CASE WHEN r.item_id='B3' THEN r.score END) +
     MAX(CASE WHEN r.item_id='B5' THEN r.score END)) / 2.0 <= 2
  THEN TRUE ELSE FALSE END                                AS escalation_collapse_risk,
  -- E2: < 3 = accountability diffusion risk
  MAX(CASE WHEN r.item_id='E2' THEN r.score END)          AS e2_score,
  MAX(CASE WHEN r.item_id='E2' THEN r.score END) <= 2     AS accountability_diffusion_risk,
  -- F1: < 3 = automation bias entrenchment risk
  MAX(CASE WHEN r.item_id='F1' THEN r.score END)          AS f1_score,
  MAX(CASE WHEN r.item_id='F1' THEN r.score END) <= 2     AS automation_bias_risk
FROM responses r
WHERE r.item_id IN ('B3','B5','E2','F1')
GROUP BY r.respondent_id;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_paper_governance_detection
-- Flags dimensions where attitude > 75th percentile
-- but behavioural frequency < 25th percentile
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_paper_governance_detection AS
SELECT
  respondent_id,
  dimension,
  att_pct,
  beh_pct,
  composite_pct,
  paper_governance_flag,
  CASE
    WHEN paper_governance_flag THEN
      'Policy exists for ' || dimension || ' but behaviour does not follow'
    ELSE NULL
  END AS paper_governance_description
FROM v_dimensional_composite_scores
WHERE paper_governance_flag = TRUE;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_social_desirability_check
-- Identifies respondents who may have given unrealistically
-- positive responses on ▲ items (score ≥ 4 on 2+ validity checks)
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_social_desirability_check AS
SELECT
  respondent_id,
  COUNT(*)                                            AS validity_check_count,
  ROUND(AVG(score), 2)                               AS avg_validity_score,
  SUM(CASE WHEN score >= 4 THEN 1 ELSE 0 END)         AS high_validity_responses,
  CASE
    WHEN SUM(CASE WHEN score >= 4 THEN 1 ELSE 0 END) >= 2
    THEN TRUE ELSE FALSE
  END                                                 AS social_desirability_flag
FROM responses
WHERE notation = '▲'
GROUP BY respondent_id;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_aggregate_dashboard
-- Organisation-level summary for risk committee reporting
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_aggregate_dashboard AS
SELECT
  org.name                          AS organisation_name,
  COUNT(DISTINCT res.id)            AS total_respondents,
  ROUND(AVG(o.overall_readiness_pct), 1) AS avg_overall_readiness,
  ROUND(AVG(o.ps_pct), 1)          AS avg_ps,
  ROUND(AVG(o.go_pct), 1)          AS avg_go,
  ROUND(AVG(o.af_pct), 1)          AS avg_af,
  ROUND(AVG(o.co_pct), 1)          AS avg_co,
  ROUND(AVG(o.ce_pct), 1)          AS avg_ce,
  ROUND(AVG(o.hoc_composite_pct), 1) AS avg_hoc,
  -- RAG distribution for overall readiness
  COUNT(CASE WHEN o.overall_readiness_pct >= 70 THEN 1 END) AS green_count,
  COUNT(CASE WHEN o.overall_readiness_pct >= 40 AND o.overall_readiness_pct < 70 THEN 1 END) AS amber_count,
  COUNT(CASE WHEN o.overall_readiness_pct < 40 THEN 1 END)  AS red_count,
  -- Active risk patterns
  COUNT(CASE WHEN p.silent_automation    THEN 1 END) AS silent_automation_count,
  COUNT(CASE WHEN p.diffused_passivity   THEN 1 END) AS diffused_passivity_count,
  COUNT(CASE WHEN p.frozen_governance    THEN 1 END) AS frozen_governance_count,
  COUNT(CASE WHEN p.lonely_vigilance     THEN 1 END) AS lonely_vigilance_count,
  COUNT(CASE WHEN p.confident_blindness  THEN 1 END) AS confident_blindness_count,
  -- Paper governance
  COUNT(CASE WHEN pg.respondent_id IS NOT NULL THEN 1 END) AS paper_governance_respondents
FROM organisations org
JOIN respondents res              ON res.organisation_id = org.id AND res.completed = TRUE
JOIN v_overall_readiness o        ON o.respondent_id = res.id
JOIN v_cross_dimensional_risk_patterns p ON p.respondent_id = res.id
LEFT JOIN (
  SELECT DISTINCT respondent_id FROM v_paper_governance_detection
) pg ON pg.respondent_id = res.id
GROUP BY org.name;

-- ─────────────────────────────────────────────────────────────
-- SAMPLE INSERT PROCEDURE
-- Demonstrates how to insert a completed survey response
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO respondents (session_id, a1_role, a2_function, a3_industry, a4_org_size, a5_ai_usage, a6_governance_framework, a7_ai_frequency, completed, submitted_at)
-- VALUES ('sess_abc123', 'Senior leader/Director', 'Risk/Compliance', 'Financial services', '2,001–10,000', 'Daily use integrated into work', 'Actively used', 'Daily', TRUE, NOW());
--
-- INSERT INTO responses (respondent_id, section, item_id, item_type, notation, dimension, score)
-- VALUES
--   (<respondent_id>, 'B', 'B1', 'attitude', NULL,  'ps', 4),
--   (<respondent_id>, 'B', 'B2', 'attitude', NULL,  'ps', 3),
--   (<respondent_id>, 'B', 'B3', 'attitude', '●',   'ps', 4),
--   ...
--   (<respondent_id>, 'K', 'K1', 'frequency', NULL, 'ps', 3),
--   ...
--   (<respondent_id>, 'G', 'G1', 'attitude', NULL, NULL, 3),
--   ...;

-- ─────────────────────────────────────────────────────────────
-- ITEM REFERENCE TABLE (static data)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE item_reference (
  item_id        VARCHAR(4)  PRIMARY KEY,
  section        CHAR(1)     NOT NULL,
  item_type      VARCHAR(15) NOT NULL,
  dimension      VARCHAR(2),
  governance_gap VARCHAR(15),
  notation       VARCHAR(3),
  item_text      TEXT        NOT NULL
);

INSERT INTO item_reference VALUES
('B1','B','attitude','ps',NULL,NULL,'If I made an error while using an AI system, it is safe for me to report it.'),
('B2','B','attitude','ps',NULL,NULL,'I can challenge AI-driven decisions without fear of impact on my performance evaluation.'),
('B3','B','attitude','ps',NULL,'●','In discussions about AI, people who question recommendations are heard, not dismissed.'),
('B4','B','attitude','ps',NULL,NULL,'I can tell a senior leader an AI decision seems wrong, even if I''m not an AI expert.'),
('B5','B','attitude','ps',NULL,'●','In my team, people can say "I don''t understand this AI system" without losing credibility.'),
('B6','B','attitude','ps',NULL,NULL,'Leaders admit when they don''t fully understand AI systems or their limitations.'),
('B7','B','attitude','ps',NULL,'★','I have witnessed someone challenge an AI decision without negative consequences.'),
('B8','B','attitude','ps',NULL,'★','Non-technical people contribute to AI governance without being dismissed.'),
('B9','B','attitude','ps',NULL,'◆','When AI produces unexpected results, people speak up immediately.'),
('B10','B','attitude','ps',NULL,'◆','Junior staff challenge AI decisions as often as senior staff do.'),
('C1','C','attitude','go',NULL,NULL,'I can significantly improve my ability to work effectively with AI through effort and practice.'),
('C2','C','attitude','go',NULL,NULL,'When I struggle with AI tools, I see it as a learning opportunity, not a personal limitation.'),
('C3','C','attitude','go',NULL,NULL,'I actively seek feedback on how I use AI in my work.'),
('C4','C','attitude','go',NULL,NULL,'AI competence is a skill anyone can develop with proper support, not an innate talent.'),
('C5','C','attitude','go',NULL,NULL,'I am willing to invest significant time in developing AI governance capability.'),
('C6','C','attitude','go',NULL,NULL,'Age, seniority, technical background, or "digital native" status should not determine AI governance capability.'),
('C7','C','attitude','go',NULL,NULL,'People who struggle with AI need development support, not removal from AI-related work.'),
('C8','C','attitude','go',NULL,'★','Senior leaders in my organisation actively learn about AI rather than delegating to specialists.'),
('C9','C','attitude','go',NULL,'◆','AI governance capability is distributed across roles, not concentrated in specialists.'),
('C10','C','attitude','go',NULL,'◆','When AI governance frameworks need updating, non-technical leaders actively participate.'),
('D1','D','attitude','af',NULL,NULL,'I am comfortable making decisions about AI without complete information.'),
('D2','D','attitude','af',NULL,NULL,'I can adapt quickly when AI tools or policies change.'),
('D3','D','attitude','af',NULL,NULL,'I accept that some AI outcomes are inherently uncertain.'),
('D4','D','attitude','af',NULL,NULL,'I am willing to abandon an AI approach that isn''t working, even if we''ve invested significantly.'),
('D5','D','attitude','af',NULL,NULL,'I prefer to iterate and learn rather than wait for a perfect AI solution.'),
('D6','D','attitude','af',NULL,NULL,'When evidence suggests a better path, I can let go of original plans without defensiveness.'),
('D7','D','attitude','af',NULL,'★','My organisation has abandoned AI projects when evidence showed they weren''t working.'),
('D8','D','attitude','af',NULL,'★','Sunk costs do not prevent us from stopping flawed AI systems.'),
('D9','D','attitude','af',NULL,'◆','Our AI governance framework evolves as quickly as our AI technology does.'),
('D10','D','attitude','af',NULL,'◆','People can raise concerns about governance being too rigid without pushback.'),
('E1','E','attitude','co',NULL,NULL,'I take personal responsibility for decisions I make using AI.'),
('E2','E','attitude','co',NULL,'●','AI governance is my responsibility, not just specialists''.'),
('E3','E','attitude','co',NULL,NULL,'I would not blame an AI system for a poor outcome if I chose to rely on it.'),
('E4','E','attitude','co',NULL,NULL,'I actively monitor the AI tools I use for appropriate performance.'),
('E5','E','attitude','co',NULL,NULL,'I take initiative to understand AI systems that affect my work.'),
('E6','E','attitude','co',NULL,NULL,'I would speak up about AI risks even if not strictly my job.'),
('E7','E','attitude','co',NULL,'★','In my organisation, accountability for AI outcomes is clearly documented and assigned.'),
('E8','E','attitude','co',NULL,'★','People cannot hide behind "the algorithm decided" when things go wrong.'),
('E9','E','attitude','co',NULL,'◆','Accountability for AI decisions is as clear as accountability for non-AI decisions.'),
('E10','E','attitude','co',NULL,'◆','People accountable for AI oversight have the information and access needed to fulfil that role.'),
('F1','F','attitude','ce',NULL,'●','I routinely verify AI-generated outputs before acting on them.'),
('F2','F','attitude','ce',NULL,NULL,'I question the assumptions and data behind AI recommendations.'),
('F3','F','attitude','ce',NULL,NULL,'I am sceptical of AI outputs that seem too good to be true.'),
('F4','F','attitude','ce',NULL,NULL,'I consider potential biases when interpreting AI results.'),
('F5','F','attitude','ce',NULL,NULL,'I maintain my own judgement even when AI expresses high confidence.'),
('F6','F','attitude','ce',NULL,NULL,'I would push back on decisions based solely on AI without human review.'),
('F7','F','attitude','ce',NULL,'★','In my organisation, overriding AI recommendations is normal and accepted, not viewed as obstructionist.'),
('F8','F','attitude','ce',NULL,'★','As AI systems become more reliable, verification effort increases rather than decreases.'),
('F9','F','attitude','ce',NULL,'◆','Human verification of AI outputs is expected, not optional, regardless of AI confidence levels.'),
('F10','F','attitude','ce',NULL,'◆','People have the time and resources to actually verify AI outputs, not just policies requiring it.'),
('G1','G','attitude',NULL,'accountability',NULL,'I know who has final accountability for each AI system I use and what they''re accountable for.'),
('G2','G','attitude',NULL,'accountability',NULL,'Accountability for AI is documented, and accountable people have the authority and tools to act.'),
('G3','G','attitude',NULL,'accountability',NULL,'When AI failures occur, there is no confusion about who is responsible.'),
('G4','G','attitude',NULL,'accountability',NULL,'Nobody is held accountable for AI outcomes they cannot meaningfully influence.'),
('G5','G','attitude',NULL,'accountability',NULL,'Accountability comes with real consequences when oversight fails.'),
('H1','H','attitude',NULL,'authority',NULL,'People with oversight authority can override AI decisions without requiring multiple approvals.'),
('H2','H','attitude',NULL,'authority',NULL,'Exercising override authority does NOT create political or career risk.'),
('H3','H','attitude',NULL,'authority',NULL,'Technical expertise and governance authority work in partnership with mutual respect.'),
('H4','H','attitude',NULL,'authority',NULL,'When someone overrides an AI decision, they are supported rather than questioned.'),
('H5','H','attitude',NULL,'authority',NULL,'Authority to intervene cannot be eroded by pressure to "just let the AI work."'),
('I1','I','attitude',NULL,'intervention',NULL,'I know exactly how to intervene if I need to override an AI decision right now.'),
('I2','I','attitude',NULL,'intervention',NULL,'Intervention capability is tested regularly through drills, simulations, or practice.'),
('I3','I','attitude',NULL,'intervention',NULL,'The time lag between "I need to intervene" and "intervention is complete" is acceptably short.'),
('I4','I','attitude',NULL,'intervention',NULL,'When intervening on an AI decision, technical support is available if needed.'),
('I5','I','attitude',NULL,'intervention',NULL,'We learn systematically from both successful and failed intervention attempts.'),
('J1','J','attitude',NULL,'escalation',NULL,'If I discover a serious AI error right now, I know exactly who to contact.'),
('J2','J','attitude',NULL,'escalation',NULL,'Escalation pathways are documented, communicated, and have no gaps.'),
('J3','J','attitude',NULL,'escalation',NULL,'Escalation has been used successfully in the past year and resulted in action.'),
('J4','J','attitude',NULL,'escalation',NULL,'Escalated concerns reach decision-makers quickly enough to matter.'),
('J5','J','attitude',NULL,'escalation',NULL,'People who escalate concerns are thanked and protected, not viewed as troublemakers.'),
('K1','K','frequency','ps',NULL,NULL,'Reported an AI error, near-miss, or concern'),
('K2','K','frequency','ps',NULL,NULL,'Challenged an AI-driven decision or recommendation'),
('K3','K','frequency','ps',NULL,NULL,'Witnessed someone else challenge AI without negative consequences'),
('K4','K','frequency','go',NULL,NULL,'Sought training or learning resources about AI governance'),
('K5','K','frequency','go',NULL,NULL,'Observed senior leaders actively learning about AI'),
('K6','K','frequency','go',NULL,NULL,'Participated in updating AI governance frameworks'),
('K7','K','frequency','af',NULL,NULL,'Changed your AI approach based on new information'),
('K8','K','frequency','af',NULL,NULL,'Advocated for stopping or modifying an AI project that wasn''t working'),
('K9','K','frequency','af',NULL,NULL,'Adapted quickly to a significant change in AI tools or policies'),
('K10','K','frequency','co',NULL,NULL,'Checked the performance or accuracy of an AI system you use'),
('K11','K','frequency','co',NULL,NULL,'Took action to address an AI governance gap'),
('K12','K','frequency','co',NULL,NULL,'Accepted responsibility for an AI-related outcome'),
('K13','K','frequency','ce',NULL,NULL,'Verified or fact-checked an AI output before acting on it'),
('K14','K','frequency','ce',NULL,NULL,'Rejected, modified, or overrode an AI recommendation'),
('K15','K','frequency','ce',NULL,NULL,'Investigated why an AI system produced an unexpected result');

-- ─────────────────────────────────────────────────────────────
-- COMMENTS / DOCUMENTATION
-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE respondents IS 'One row per survey completion. Section A demographic data stored as discrete columns for segmentation queries.';
COMMENT ON TABLE responses IS 'One row per item response. All 92 rated items (sections B–K) stored here. Section A context stored on respondents table.';
COMMENT ON VIEW v_dimensional_composite_scores IS '50/50 composite of attitude (Sections B–F) and behavioural frequency (Section K) per dimension. Core scoring output.';
COMMENT ON VIEW v_hoc_composite IS 'Human Oversight Capacity: average of 4 governance gap section scores (G–J). Tests H1: governance gaps predict oversight effectiveness independent of psychological readiness.';
COMMENT ON VIEW v_delusion_gap_analysis IS 'Compares leadership vs practitioner scores. Gap >15% on Psychological Safety = critical delusion gap flag. Tests H2.';
COMMENT ON VIEW v_cross_dimensional_risk_patterns IS 'Detects 5 ALMA risk patterns. Tests H4: cross-dimensional patterns predict specific failure modes.';
COMMENT ON VIEW v_paper_governance_detection IS 'High attitude + low behaviour per dimension. Tests H3: paper governance predicts policy-practice gap.';
COMMENT ON VIEW v_social_desirability_check IS 'Flags respondents scoring ≥4 on multiple ▲ validity check items. Used to identify potentially inflated responses.';
