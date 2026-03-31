-- ============================================================
-- ALMA v3.0 — Regulatory Compliance Risk Mapping Extension
-- PostgreSQL Schema Extension
-- Maps ALMA constructs to regulatory framework obligations
-- Version 1.0 — March 2026
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLE: regulatory_frameworks
-- Stores supported regulatory frameworks (EU AI Act, UK, NIST etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE regulatory_frameworks (
  id              VARCHAR(30)  PRIMARY KEY,        -- e.g. 'eu-ai-act', 'uk-ai', 'us-nist'
  name            VARCHAR(200) NOT NULL,
  short_name      VARCHAR(50)  NOT NULL,
  citation        VARCHAR(200) NOT NULL,           -- Official citation
  base_url        VARCHAR(500),                    -- URL to article explorer
  jurisdiction    VARCHAR(50)  NOT NULL,           -- 'EU', 'UK', 'US', 'global'
  active          BOOLEAN      DEFAULT TRUE,
  version         VARCHAR(30),                     -- e.g. 'Official Journal 2024/1689'
  last_updated    DATE,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO regulatory_frameworks VALUES
('eu-ai-act', 'EU Artificial Intelligence Act', 'EU AI Act', 'Regulation (EU) 2024/1689', 'https://artificialintelligenceact.eu/article/', 'EU', TRUE, 'Official Journal 13 June 2024', '2024-06-13', NOW()),
('uk-ai',     'UK AI Regulation Framework',     'UK Framework', 'DSIT Pro-Innovation AI Regulation', 'https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/', 'UK', FALSE, 'March 2024 Update', '2024-03-01', NOW()),
('us-nist',   'NIST AI Risk Management Framework', 'NIST AI RMF', 'NIST AI 100-1', 'https://www.nist.gov/artificial-intelligence/', 'US', FALSE, 'January 2023', '2023-01-26', NOW());

-- ─────────────────────────────────────────────────────────────
-- TABLE: regulatory_articles
-- Individual articles/provisions within each framework
-- ─────────────────────────────────────────────────────────────
CREATE TABLE regulatory_articles (
  id              SERIAL       PRIMARY KEY,
  framework_id    VARCHAR(30)  NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,
  article_num     VARCHAR(10)  NOT NULL,           -- e.g. '14', '26', '99'
  title           VARCHAR(300) NOT NULL,
  summary         TEXT         NOT NULL,
  url_path        VARCHAR(100),                    -- Appended to framework base_url
  penalty_tier    VARCHAR(20),                     -- 'prohibited', 'highRisk', 'other'
  enforcement_date DATE,                           -- When this article becomes enforceable
  chapter         VARCHAR(100),                    -- Grouping within the Act
  active          BOOLEAN      DEFAULT TRUE,
  last_verified   DATE,                            -- Date content was last checked against source
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(framework_id, article_num)
);

CREATE INDEX idx_reg_articles_framework ON regulatory_articles(framework_id);
CREATE INDEX idx_reg_articles_penalty   ON regulatory_articles(penalty_tier);

-- Insert EU AI Act articles referenced by ALMA mappings
INSERT INTO regulatory_articles (framework_id, article_num, title, summary, url_path, penalty_tier, enforcement_date, chapter) VALUES
('eu-ai-act', '4',  'AI Literacy', 'Providers and deployers must ensure sufficient AI literacy among staff, considering technical knowledge, experience, education, context of use, and affected persons.', '4/', 'other', '2025-02-02', 'Title I: General Provisions'),
('eu-ai-act', '5',  'Prohibited AI Practices', 'Prohibits AI systems deploying subliminal manipulation, exploitation of vulnerabilities, social scoring, and real-time remote biometric identification in public spaces.', '5/', 'prohibited', '2025-02-02', 'Title II: Prohibited AI Practices'),
('eu-ai-act', '6',  'Classification Rules for High-Risk AI Systems', 'Defines criteria for classifying AI systems as high-risk, including safety components and Annex III use cases across critical sectors.', '6/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '9',  'Risk Management System', 'Requires a continuous, iterative risk management system throughout the AI system lifecycle, including risk identification, estimation, evaluation, and treatment.', '9/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '10', 'Data and Data Governance', 'Training, validation, and testing data sets must be subject to appropriate data governance, including bias examination and gap identification.', '10/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '13', 'Transparency and Provision of Information', 'High-risk AI systems must be designed to enable deployers to interpret outputs and use them appropriately.', '13/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '14', 'Human Oversight', 'High-risk AI systems must allow effective human oversight, including ability to interpret outputs, decide not to use the system, override or reverse outputs, and intervene or halt operation.', '14/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '16', 'Obligations of Providers of High-Risk AI Systems', 'Providers must ensure compliance, establish quality management systems, keep documentation, maintain logs, take corrective action, and cooperate with authorities.', '16/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '20', 'Corrective Actions and Duty of Information', 'Providers must take necessary corrective actions including withdrawal or recall of non-conforming AI systems, and inform deployers and authorities.', '20/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '22', 'Obligations of Authorised Representatives', 'Authorised representatives must verify compliance, keep documentation available, provide information to authorities, and cooperate with competent authorities.', '22/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '25', 'Responsibilities Along the AI Value Chain', 'Distributors, importers, deployers, or third parties may be considered providers if they substantially modify a high-risk AI system or put their name on it.', '25/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '26', 'Obligations of Deployers of High-Risk AI Systems', 'Deployers must use systems per instructions, ensure human oversight by competent individuals, monitor operation, keep logs, conduct FRIA, and inform providers of risks.', '26/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '27', 'Fundamental Rights Impact Assessment', 'Deployers of high-risk AI systems that are public bodies or private entities providing public services must perform an impact assessment before deployment.', '27/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '43', 'Conformity Assessment', 'Providers of high-risk AI systems must undergo conformity assessment procedures before placing systems on the market.', '43/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '49', 'Registration', 'Providers and deployers must register high-risk AI systems in the EU database before placing on market or putting into service.', '49/', 'highRisk', '2026-08-02', 'Title III: High-Risk AI Systems'),
('eu-ai-act', '50', 'Transparency Obligations for Certain AI Systems', 'Providers must ensure AI systems interacting with persons disclose AI nature. Deepfakes and AI-generated content must be labelled.', '50/', 'other', '2026-08-02', 'Title IV: Transparency'),
('eu-ai-act', '72', 'Post-Market Monitoring', 'Providers must establish and document a post-market monitoring system proportionate to the nature and risks of the AI system.', '72/', 'highRisk', '2026-08-02', 'Title VIII: Post-Market Monitoring'),
('eu-ai-act', '73', 'Reporting of Serious Incidents', 'Providers must report serious incidents to market surveillance authorities without undue delay, and no later than 15 days after becoming aware.', '73/', 'highRisk', '2026-08-02', 'Title VIII: Post-Market Monitoring'),
('eu-ai-act', '86', 'Right to Explanation', 'Affected persons have the right to clear and meaningful explanations of the role of high-risk AI systems in decision-making procedures.', '86/', 'highRisk', '2026-08-02', 'Title VIII: Post-Market Monitoring'),
('eu-ai-act', '99', 'Penalties', 'Penalty framework: up to 35M/7% for prohibited practices, 15M/3% for high-risk non-compliance, 7.5M/1% for other violations.', '99/', 'prohibited', '2027-08-02', 'Title XII: Penalties');

-- ─────────────────────────────────────────────────────────────
-- TABLE: alma_regulatory_mappings
-- Maps ALMA constructs (dimensions, gaps, patterns) to regulatory articles
-- This is the core IP table — the intellectual contribution of ALMA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE alma_regulatory_mappings (
  id                SERIAL       PRIMARY KEY,
  framework_id      VARCHAR(30)  NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,
  alma_construct    VARCHAR(30)  NOT NULL,         -- 'dimension', 'gap', 'pattern', 'hoc'
  alma_key          VARCHAR(30)  NOT NULL,         -- 'ps', 'go', 'af', 'co', 'ce', 'accountability', 'silentAutomation', etc.
  article_num       VARCHAR(10)  NOT NULL,
  mapping_priority  VARCHAR(10)  NOT NULL CHECK (mapping_priority IN ('primary', 'secondary')),
  risk_narrative_critical TEXT,                     -- Narrative when ALMA score < 40%
  risk_narrative_fragile  TEXT,                     -- Narrative when ALMA score 40–70%
  risk_narrative_robust   TEXT,                     -- Narrative when ALMA score > 70%
  rationale         TEXT,                           -- Why this mapping exists (for audit trail)
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_alma_reg_map_framework  ON alma_regulatory_mappings(framework_id);
CREATE INDEX idx_alma_reg_map_construct  ON alma_regulatory_mappings(alma_construct, alma_key);
CREATE INDEX idx_alma_reg_map_article    ON alma_regulatory_mappings(article_num);

-- ── DIMENSION MAPPINGS ──

-- Psychological Safety → Arts 14, 26, 73, 86
INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'dimension', 'ps', '14', 'primary',   'Art 14 human oversight requires people to speak up about AI issues. Low psych safety = silent oversight failure.'),
('eu-ai-act', 'dimension', 'ps', '26', 'primary',   'Art 26 deployer obligations require competent oversight individuals. Fear-based culture prevents effective deployment of these roles.'),
('eu-ai-act', 'dimension', 'ps', '73', 'primary',   'Art 73 serious incident reporting requires timely disclosure. Low psych safety delays or prevents incident reports.'),
('eu-ai-act', 'dimension', 'ps', '86', 'secondary', 'Art 86 right to explanation depends on transparent decision-making culture.');

-- Growth Orientation → Arts 4, 26, 9
INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'dimension', 'go', '4',  'primary',   'Art 4 AI Literacy obligation requires continuous capability development. Low growth orientation = stagnating literacy.'),
('eu-ai-act', 'dimension', 'go', '26', 'primary',   'Art 26 requires deployers ensure oversight by persons with necessary competence. Capability stagnation undermines this.'),
('eu-ai-act', 'dimension', 'go', '9',  'secondary', 'Art 9 risk management requires evolving understanding of AI risks.');

-- Adaptive Flexibility → Arts 9, 72, 43, 20
INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'dimension', 'af', '9',  'primary',   'Art 9 requires continuous, iterative risk management. Governance rigidity prevents the adaptive cycle.'),
('eu-ai-act', 'dimension', 'af', '72', 'primary',   'Art 72 post-market monitoring requires responsive governance. Frozen governance detects but cannot act.'),
('eu-ai-act', 'dimension', 'af', '43', 'secondary', 'Art 43 conformity assessment becomes a point-in-time snapshot without adaptive follow-through.'),
('eu-ai-act', 'dimension', 'af', '20', 'secondary', 'Art 20 corrective actions require organisational agility to implement.');

-- Conscious Ownership → Arts 26, 16, 99, 25, 49
INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'dimension', 'co', '26', 'primary',   'Art 26 deployer obligations require clear ownership. Accountability diffusion = unfulfilled obligations.'),
('eu-ai-act', 'dimension', 'co', '16', 'primary',   'Art 16 provider obligations require documented accountability. Low ownership makes this structural.'),
('eu-ai-act', 'dimension', 'co', '99', 'primary',   'Art 99 penalties apply when obligations are unmet. No ownership = invisible non-compliance until enforcement.'),
('eu-ai-act', 'dimension', 'co', '25', 'secondary', 'Art 25 value chain responsibilities require active tracking of accountability across parties.'),
('eu-ai-act', 'dimension', 'co', '49', 'secondary', 'Art 49 registration requires someone to own the registration and compliance maintenance.');

-- Critical Engagement → Arts 14, 13, 26, 10, 72
INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'dimension', 'ce', '14', 'primary',   'Art 14 human oversight is directly undermined by automation bias. Low critical engagement = rubber-stamping AI outputs.'),
('eu-ai-act', 'dimension', 'ce', '13', 'primary',   'Art 13 transparency provisions are meaningless if outputs are not critically evaluated by deployers.'),
('eu-ai-act', 'dimension', 'ce', '26', 'primary',   'Art 26.5 requires deployers to monitor AI operation. Low engagement means monitoring obligation is unfulfilled.'),
('eu-ai-act', 'dimension', 'ce', '10', 'secondary', 'Art 10 data governance depends on critical evaluation of training data quality and bias.'),
('eu-ai-act', 'dimension', 'ce', '72', 'secondary', 'Art 72 post-market monitoring requires active attention to system performance degradation.');

-- ── GOVERNANCE GAP MAPPINGS ──

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'gap', 'accountability', '26', 'primary', 'Art 26 requires deployers to assign oversight to persons with necessary competence, training, and authority.'),
('eu-ai-act', 'gap', 'accountability', '16', 'primary', 'Art 16 provider obligations require documented compliance systems. Unclear accountability = undocumented systems.'),
('eu-ai-act', 'gap', 'accountability', '99', 'primary', 'Art 99 penalties fall on identifiable responsible parties. Accountability gaps create enforcement confusion.'),
('eu-ai-act', 'gap', 'accountability', '49', 'secondary', 'Art 49 registration requires a designated responsible entity.'),
('eu-ai-act', 'gap', 'accountability', '27', 'secondary', 'Art 27 FRIA requires accountable parties to conduct and document assessment.');

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'gap', 'authority', '14', 'primary', 'Art 14.3-14.4 specifically require ability to override, reverse, or halt AI systems. Authority gap = unmet requirement.'),
('eu-ai-act', 'gap', 'authority', '9',  'primary', 'Art 9 risk management requires authorised decision-making on risk treatment measures.'),
('eu-ai-act', 'gap', 'authority', '26', 'secondary', 'Art 26 deployer obligations cannot be fulfilled without genuine authority to act.'),
('eu-ai-act', 'gap', 'authority', '20', 'secondary', 'Art 20 corrective actions require authority to withdraw, recall, or modify systems.');

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'gap', 'intervention', '14', 'primary', 'Art 14.4 requires "stop" capability and override mechanisms commensurate with risk level.'),
('eu-ai-act', 'gap', 'intervention', '72', 'primary', 'Art 72 post-market monitoring requires responsive intervention capability when issues detected.'),
('eu-ai-act', 'gap', 'intervention', '20', 'primary', 'Art 20 corrective actions must be taken when non-conformity identified. Slow intervention = delayed correction.'),
('eu-ai-act', 'gap', 'intervention', '73', 'secondary', 'Art 73 serious incident reporting implies capability to contain and address incidents.'),
('eu-ai-act', 'gap', 'intervention', '9',  'secondary', 'Art 9 risk management includes residual risk treatment requiring intervention capability.');

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'gap', 'escalation', '73', 'primary', 'Art 73 requires serious incident reporting within 15 days. Broken escalation = missed deadlines.'),
('eu-ai-act', 'gap', 'escalation', '26', 'primary', 'Art 26 requires deployers to inform providers of risks. Escalation gaps break this communication chain.'),
('eu-ai-act', 'gap', 'escalation', '86', 'secondary', 'Art 86 right to explanation requires accessible escalation for affected persons.'),
('eu-ai-act', 'gap', 'escalation', '20', 'secondary', 'Art 20 corrective action duty requires information flow from detection to decision-maker.');

-- ── RISK PATTERN MAPPINGS ──

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'pattern', 'silentAutomation',   '14', 'primary', 'Silent Automation: oversight exists on paper but people cannot speak up + do not verify = Art 14 structurally unmet.'),
('eu-ai-act', 'pattern', 'silentAutomation',   '13', 'primary', 'Transparency (Art 13) is meaningless when errors are noticed but not reported.'),
('eu-ai-act', 'pattern', 'silentAutomation',   '73', 'primary', 'Serious incidents (Art 73) go unreported in silence.'),
('eu-ai-act', 'pattern', 'diffusedPassivity',  '26', 'primary', 'Diffused Passivity: nobody checks, nobody owns = Art 26 deployer obligations unfulfilled.'),
('eu-ai-act', 'pattern', 'diffusedPassivity',  '16', 'primary', 'Provider obligations (Art 16) similarly unmet when ownership is diffuse.'),
('eu-ai-act', 'pattern', 'diffusedPassivity',  '99', 'primary', 'Penalty exposure (Art 99) increases when accountability is unclear.'),
('eu-ai-act', 'pattern', 'frozenGovernance',   '9',  'primary', 'Frozen Governance: continuous iterative risk management (Art 9) impossible when governance is static.'),
('eu-ai-act', 'pattern', 'frozenGovernance',   '72', 'primary', 'Post-market monitoring (Art 72) detects issues but correction stalls.'),
('eu-ai-act', 'pattern', 'frozenGovernance',   '43', 'primary', 'Conformity (Art 43) becomes point-in-time rather than continuous.'),
('eu-ai-act', 'pattern', 'lonelyVigilance',    '14', 'primary', 'Lonely Vigilance: oversight depends on isolated individuals rather than systems = brittle Art 14 compliance.'),
('eu-ai-act', 'pattern', 'lonelyVigilance',    '73', 'primary', 'Incident reporting (Art 73) relies on personal courage rather than process.'),
('eu-ai-act', 'pattern', 'lonelyVigilance',    '86', 'primary', 'Explanation capability (Art 86) centralised in few individuals who may leave.'),
('eu-ai-act', 'pattern', 'confidentBlindness', '14', 'primary', 'Confident Blindness: enthusiasm without verification = oversight is optimistic rather than rigorous.'),
('eu-ai-act', 'pattern', 'confidentBlindness', '9',  'primary', 'Risk management (Art 9) is optimistic rather than rigorous under confident blindness.'),
('eu-ai-act', 'pattern', 'confidentBlindness', '10', 'primary', 'Data governance (Art 10) is presumed rather than verified.');

-- ── HOC COMPOSITE MAPPING ──

INSERT INTO alma_regulatory_mappings (framework_id, alma_construct, alma_key, article_num, mapping_priority, rationale) VALUES
('eu-ai-act', 'hoc', 'composite', '14', 'primary', 'HOC composite directly measures operational capability for Art 14 human oversight requirements.'),
('eu-ai-act', 'hoc', 'composite', '26', 'primary', 'HOC composite reflects whether deployer obligations (Art 26) can be operationally fulfilled.'),
('eu-ai-act', 'hoc', 'composite', '9',  'primary', 'HOC composite indicates whether risk management (Art 9) has the governance infrastructure to function.');

-- ─────────────────────────────────────────────────────────────
-- TABLE: regulatory_enforcement_timeline
-- Tracks key enforcement dates for each framework
-- ─────────────────────────────────────────────────────────────
CREATE TABLE regulatory_enforcement_timeline (
  id              SERIAL       PRIMARY KEY,
  framework_id    VARCHAR(30)  NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,
  milestone       VARCHAR(100) NOT NULL,
  enforcement_date DATE        NOT NULL,
  description     TEXT,
  status          VARCHAR(20)  DEFAULT 'upcoming' CHECK (status IN ('past', 'current', 'upcoming')),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO regulatory_enforcement_timeline (framework_id, milestone, enforcement_date, description, status) VALUES
('eu-ai-act', 'AI Act enters into force',      '2024-08-01', 'Regulation (EU) 2024/1689 published in Official Journal and entered into force.', 'past'),
('eu-ai-act', 'Prohibited practices apply',     '2025-02-02', 'Article 5 prohibited AI practices become enforceable. Fines up to 35M/7%.', 'past'),
('eu-ai-act', 'GPAI obligations apply',         '2025-08-02', 'Chapter V general-purpose AI model obligations become enforceable.', 'past'),
('eu-ai-act', 'High-risk requirements apply',   '2026-08-02', 'Title III high-risk AI system requirements enforceable. Arts 9-14, 26 etc.', 'upcoming'),
('eu-ai-act', 'Full enforcement',               '2027-08-02', 'All provisions enforceable. Complete penalty framework operational.', 'upcoming');

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_regulatory_risk_per_respondent
-- Produces a regulatory risk profile per respondent by joining
-- ALMA composite scores against regulatory mappings
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_regulatory_risk_per_respondent AS
WITH respondent_scores AS (
  SELECT
    respondent_id,
    -- Dimensional composites
    MAX(CASE WHEN dimension = 'ps' THEN composite_pct END) AS ps_pct,
    MAX(CASE WHEN dimension = 'go' THEN composite_pct END) AS go_pct,
    MAX(CASE WHEN dimension = 'af' THEN composite_pct END) AS af_pct,
    MAX(CASE WHEN dimension = 'co' THEN composite_pct END) AS co_pct,
    MAX(CASE WHEN dimension = 'ce' THEN composite_pct END) AS ce_pct
  FROM v_dimensional_composite_scores
  GROUP BY respondent_id
),
respondent_gaps AS (
  SELECT
    respondent_id,
    MAX(CASE WHEN governance_gap = 'accountability' THEN gap_pct END) AS accountability_pct,
    MAX(CASE WHEN governance_gap = 'authority'      THEN gap_pct END) AS authority_pct,
    MAX(CASE WHEN governance_gap = 'intervention'   THEN gap_pct END) AS intervention_pct,
    MAX(CASE WHEN governance_gap = 'escalation'     THEN gap_pct END) AS escalation_pct
  FROM v_governance_gap_scores
  GROUP BY respondent_id
),
all_scores AS (
  SELECT
    s.respondent_id,
    m.article_num,
    m.alma_construct,
    m.alma_key,
    m.mapping_priority,
    -- Get the relevant ALMA score for this mapping
    CASE
      WHEN m.alma_construct = 'dimension' AND m.alma_key = 'ps' THEN s.ps_pct
      WHEN m.alma_construct = 'dimension' AND m.alma_key = 'go' THEN s.go_pct
      WHEN m.alma_construct = 'dimension' AND m.alma_key = 'af' THEN s.af_pct
      WHEN m.alma_construct = 'dimension' AND m.alma_key = 'co' THEN s.co_pct
      WHEN m.alma_construct = 'dimension' AND m.alma_key = 'ce' THEN s.ce_pct
      WHEN m.alma_construct = 'gap' AND m.alma_key = 'accountability' THEN g.accountability_pct
      WHEN m.alma_construct = 'gap' AND m.alma_key = 'authority'      THEN g.authority_pct
      WHEN m.alma_construct = 'gap' AND m.alma_key = 'intervention'   THEN g.intervention_pct
      WHEN m.alma_construct = 'gap' AND m.alma_key = 'escalation'     THEN g.escalation_pct
    END AS alma_score
  FROM respondent_scores s
  JOIN respondent_gaps g ON g.respondent_id = s.respondent_id
  CROSS JOIN alma_regulatory_mappings m
  WHERE m.framework_id = 'eu-ai-act'
    AND m.mapping_priority = 'primary'
    AND m.alma_construct IN ('dimension', 'gap')
)
SELECT
  a.respondent_id,
  a.article_num,
  ra.title AS article_title,
  ra.penalty_tier,
  -- Worst risk level across all ALMA constructs triggering this article
  CASE
    WHEN MIN(a.alma_score) < 40 THEN 'high'
    WHEN MIN(a.alma_score) < 70 THEN 'elevated'
    ELSE 'lower'
  END AS risk_level,
  MIN(a.alma_score) AS worst_trigger_score,
  STRING_AGG(DISTINCT a.alma_key, ', ' ORDER BY a.alma_key) AS triggered_by,
  COUNT(DISTINCT a.alma_key) AS trigger_count
FROM all_scores a
JOIN regulatory_articles ra
  ON ra.framework_id = 'eu-ai-act'
 AND ra.article_num = a.article_num
WHERE a.alma_score IS NOT NULL
GROUP BY a.respondent_id, a.article_num, ra.title, ra.penalty_tier;

-- ─────────────────────────────────────────────────────────────
-- VIEW: v_regulatory_risk_summary
-- Organisation-level regulatory risk summary
-- ─────────────────────────────────────────────────────────────
CREATE VIEW v_regulatory_risk_summary AS
SELECT
  org.name AS organisation_name,
  rr.article_num,
  rr.article_title,
  rr.penalty_tier,
  COUNT(CASE WHEN rr.risk_level = 'high'     THEN 1 END) AS high_risk_respondents,
  COUNT(CASE WHEN rr.risk_level = 'elevated' THEN 1 END) AS elevated_risk_respondents,
  COUNT(CASE WHEN rr.risk_level = 'lower'    THEN 1 END) AS lower_risk_respondents,
  COUNT(*)                                                AS total_respondents,
  ROUND(
    COUNT(CASE WHEN rr.risk_level = 'high' THEN 1 END)::NUMERIC / COUNT(*) * 100, 1
  ) AS pct_high_risk
FROM v_regulatory_risk_per_respondent rr
JOIN respondents res ON res.id = rr.respondent_id
JOIN organisations org ON org.id = res.organisation_id
WHERE res.completed = TRUE
GROUP BY org.name, rr.article_num, rr.article_title, rr.penalty_tier
ORDER BY pct_high_risk DESC;

-- ─────────────────────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE regulatory_frameworks IS 'Supported regulatory frameworks. EU AI Act primary; UK and NIST extensible.';
COMMENT ON TABLE regulatory_articles IS 'Individual articles/provisions within each framework, with enforcement dates and penalty tiers.';
COMMENT ON TABLE alma_regulatory_mappings IS 'Core IP: maps ALMA constructs (dimensions, gaps, patterns, HOC) to specific regulatory articles with risk narratives.';
COMMENT ON TABLE regulatory_enforcement_timeline IS 'Key enforcement milestones per framework for timeline display.';
COMMENT ON VIEW v_regulatory_risk_per_respondent IS 'Per-respondent regulatory risk profile: which articles are at risk based on individual ALMA scores.';
COMMENT ON VIEW v_regulatory_risk_summary IS 'Organisation-level regulatory risk summary for board reporting.';
