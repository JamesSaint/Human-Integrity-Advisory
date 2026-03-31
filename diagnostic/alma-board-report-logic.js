// ============================================================
// ALMA Executive Output Engine: Board Report Logic Layer
// Version 1.0, March 2026
// Human Integrity Advisory Ltd
//
// Consumes the S object from calcScores() and the REG object
// from calcRegulatoryRisk(). Produces deterministic executive
// narrative without LLM inference. All copy is UK English.
// ============================================================

// ── HELPERS (mirror existing codebase) ────────────────────────────────────────
function _rag(pct) { return pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red'; }
function _ragLabel(pct) { return pct >= 70 ? 'Robust' : pct >= 40 ? 'Fragile' : 'Critical'; }
function _ragBadge(pct, suffix) {
  const r = _rag(pct);
  return `<span class="rag rag-${r}">${_ragLabel(pct)}${suffix ? ' ' + suffix : ''}</span>`;
}
function _colour(pct) { return _rag(pct); }
function _countPaperGov(S) { return Object.values(S.dims).filter(d => d.paperGov).length; }
function _countActivePatterns(S) { return Object.values(S.patterns).filter(Boolean).length; }
function _maxAttBehGap(S) {
  return Math.max(...Object.values(S.dims).map(d => Math.abs(d.attPct - d.behPct)));
}
function _weakestConstruct(S) {
  const all = [
    ...Object.entries(S.dims).map(([k, d]) => ({ key: k, label: d.label, pct: d.comp, type: 'dimension' })),
    ...Object.entries(S.gaps).map(([k, g]) => ({ key: k, label: g.label, pct: g.pct, type: 'gap' }))
  ];
  return all.reduce((w, c) => c.pct < w.pct ? c : w, all[0]);
}
function _weakestGap(S) {
  return Object.entries(S.gaps).reduce((w, [k, g]) => g.pct < w.pct ? { key: k, ...g } : w,
    { key: Object.keys(S.gaps)[0], ...Object.values(S.gaps)[0] });
}
function _strongestDim(S) {
  return Object.entries(S.dims).reduce((s, [k, d]) => d.comp > s.comp ? { key: k, ...d } : s,
    { key: Object.keys(S.dims)[0], ...Object.values(S.dims)[0] });
}

// ── FAILURE PROFILE DEFINITIONS ───────────────────────────────────────────────
// Evaluated in priority order. First match = primary; subsequent matches = secondary.
const FAILURE_PROFILES = [
  {
    id: 'silentAutomation',
    name: 'Silent Automation',
    severity: 'critical',
    test: S => S.patterns.silentAutomation,
    meaning: 'People see problems with AI outputs but do not report them, and are not checking outputs systematically either.',
    scenario: 'A customer-facing AI model produces biased outputs for weeks. Frontline staff notice anomalies but assume someone else is monitoring. No report is filed. The error compounds until external exposure forces discovery.',
    boardConsequence: 'The board believes human oversight is operational because policy requires it. In reality, no human is in the loop. Incidents accumulate silently until external exposure forces disclosure under the worst possible conditions.',
    regConsequence: 'Directly undermines Art 14 (Human Oversight) and Art 73 (Serious Incident Reporting). The 15-day reporting timeline cannot be met when incidents are not surfaced internally. Penalty exposure: up to €15M or 3% of global turnover.',
    changeFirst: 'Establish protected reporting mechanisms for AI concerns and implement mandatory verification checkpoints, simultaneously. Neither alone resolves this pattern.'
  },
  {
    id: 'confidentBlindness',
    name: 'Confident Blindness',
    severity: 'critical',
    test: S => S.patterns.confidentBlindness,
    meaning: 'The organisation is enthusiastically adopting AI and developing capability, but nobody is verifying whether the AI systems are performing correctly.',
    scenario: 'A team deploys a new AI recommendation engine after extensive training. Adoption is high, confidence is strong. Nobody checks whether the recommendations are accurate. Six months later, an audit reveals systematic bias amplified by uncritical users.',
    boardConsequence: 'Enthusiasm masks risk. The board sees strong adoption metrics. What it does not see is that confidence has replaced verification. The faster AI is adopted without verification, the larger the undetected exposure.',
    regConsequence: 'Art 14 human oversight structurally compromised by automation bias. Art 9 risk management cannot function when risks are not being looked for. Confidence drives deployment while critical engagement provides no counterweight.',
    changeFirst: 'Introduce verification protocols that are mandatory regardless of confidence level. Tie verification to decision impact, not perceived AI accuracy.'
  },
  {
    id: 'interventionBreakdown',
    name: 'Intervention Breakdown',
    severity: 'critical',
    test: S => S.gaps.intervention.pct < 40 && (S.gaps.authority.pct < 40 || S.gaps.escalation.pct < 40),
    meaning: 'The organisation cannot stop, override, or reverse AI decisions when needed, and at least one supporting mechanism is also critically weak.',
    scenario: 'An AI lending model begins rejecting valid applications at an abnormal rate. The operations team identifies the issue but lacks the technical capability or authorised access to halt the model. By the time a decision-maker is reached, hundreds of applications have been wrongly rejected.',
    boardConsequence: 'The board has approved AI deployment on the assumption that human oversight includes the ability to intervene. That assumption is false. The time between "we need to stop this" and "it is stopped" is unacceptably long or undefined.',
    regConsequence: 'Art 14.4 specifically requires mechanisms enabling intervention or interruption through a stop button or similar procedure. Art 72 post-market monitoring requires the ability to act on detected issues. Both are non-functional.',
    changeFirst: 'Conduct an immediate technical audit of intervention capability for every deployed AI system. Establish and test maximum intervention latency.'
  },
  {
    id: 'diffusedAccountability',
    name: 'Diffused Accountability',
    severity: 'critical',
    test: S => S.dims.co.comp < 40 && S.gaps.accountability.pct < 40,
    meaning: 'Nobody owns AI outcomes. Accountability is either unassigned, unclear, or assigned to people without the authority or information to act.',
    scenario: 'An AI-assisted HR screening tool is challenged on fairness grounds. IT points to HR. HR points to the vendor. The vendor points to the contract. The regulator points to the deployer. Nobody can answer who is responsible.',
    boardConsequence: 'The board cannot answer: "Who is responsible for this AI system\'s outcomes?" Under the EU AI Act, deployer obligations require identifiable, competent individuals assigned to oversight roles. The absence of clear accountability is itself the violation.',
    regConsequence: 'Art 26 requires deployers to assign oversight to "natural persons who have the necessary competence, training and authority." Art 16 requires providers to maintain quality management. Without clear accountability, neither obligation can be demonstrated.',
    changeFirst: 'Map every deployed AI system to a named accountable individual with documented authority, access, and consequence mechanisms.'
  },
  {
    id: 'lonelyVigilance',
    name: 'Lonely Vigilance',
    severity: 'high',
    test: S => S.patterns.lonelyVigilance,
    meaning: 'A small number of individuals are actively checking AI outputs and raising concerns, but the environment punishes or ignores them for doing so.',
    scenario: 'A data analyst identifies that an AI model is producing outputs inconsistent with training data. They raise the issue repeatedly and are dismissed. After several months, they leave the organisation. The issue remains unaddressed.',
    boardConsequence: 'Human oversight is not an organisational capability. It depends on specific employees. The board is one resignation away from an oversight vacuum.',
    regConsequence: 'Art 14 human oversight depends on isolated individuals rather than systemic process. Art 73 incident reporting relies on personal courage. Both are structurally brittle.',
    changeFirst: 'Protect existing oversight individuals before they leave. Build systemic support structures before addressing the broader safety deficit.'
  },
  {
    id: 'behaviouralHollowing',
    name: 'Behavioural Hollowing',
    severity: 'high',
    test: S => _countPaperGov(S) >= 2,
    meaning: 'The organisation holds strong beliefs about AI governance but is not acting on them. Policy exists. Intention is present. Behaviour is absent.',
    scenario: 'A survey reveals that 85% of staff believe AI outputs should be verified. Behavioural data shows fewer than 20% actually verify. Governance exists only in documentation and intention.',
    boardConsequence: 'The board receives assurance based on attitude surveys which appear positive. The behavioural reality is different. Under regulatory scrutiny, what matters is what people do, not what they believe.',
    regConsequence: 'Art 26 deployer obligations require that human oversight is ensured, not merely intended. Regulators will test for evidence of actual practice, not declared belief. The attitude-behaviour gap creates vulnerability despite appearing compliant.',
    changeFirst: 'Identify and remove the structural barriers preventing people from acting on their stated governance beliefs: time, access, tooling, management signals.'
  },
  {
    id: 'frozenGovernance',
    name: 'Frozen Governance',
    severity: 'high',
    test: S => S.patterns.frozenGovernance,
    meaning: 'AI governance frameworks are rigid, outdated, and disconnected from actual AI usage. The organisation lacks the capability or willingness to update them.',
    scenario: 'An AI governance policy was written 18 months ago. The organisation has since adopted three new AI platforms. The framework has not been updated. Staff work around it or ignore it.',
    boardConsequence: 'The governance framework that the board approved and monitors is no longer relevant to the AI systems in use. Shadow AI proliferates. The board\'s oversight is based on an outdated map.',
    regConsequence: 'Art 9 requires a continuous, iterative risk management system. Art 72 requires adaptive post-market monitoring. Rigid governance violates the fundamental principle of ongoing risk management.',
    changeFirst: 'Audit the gap between the governance framework and actual AI systems in use. Implement event-driven governance updates tied to deployment, not calendar.'
  },
  {
    id: 'escalationCompromised',
    name: 'Escalation Compromised',
    severity: 'critical',
    test: S => S.gaps.escalation.pct < 40 && S.dims.ps.comp < 40,
    meaning: 'Bad news about AI systems cannot reach decision-makers. Escalation pathways are absent or blocked, and people fear the consequences of using them.',
    scenario: 'A compliance officer notices an AI system producing outputs that may violate requirements. Escalation requires reporting through a line manager who championed the system. The officer delays. The 15-day reporting window passes.',
    boardConsequence: 'The board cannot rely on receiving timely information about AI failures. Problems are filtered, delayed, or suppressed before reaching decision-making level.',
    regConsequence: 'Art 73 requires serious incident reporting within 15 days. Broken escalation makes this timeline impossible. Art 26 requires deployers to inform providers of risks. If risks cannot be escalated internally, they cannot be communicated externally.',
    changeFirst: 'Establish direct, protected escalation routes that bypass hierarchical filters. Separate AI incident reporting from line management.'
  },
  {
    id: 'illusionOfControl',
    name: 'Illusion of Control',
    severity: 'high',
    test: S => S.overall >= 40 && S.hoc < 40 && _countPaperGov(S) >= 1,
    meaning: 'Surface-level readiness scores appear adequate, but governance infrastructure is critically weak and at least one dimension shows paper governance.',
    scenario: 'An executive team presents strong readiness scores to the board. Attitudes are positive. But accountability is unclear, intervention is untested, and the attitudes that score well are not being translated into behaviour.',
    boardConsequence: 'The board is receiving false assurance. The metrics it monitors do not measure what matters. The gap between perceived control and actual capability is where risk concentrates.',
    regConsequence: 'Art 14 human oversight appears compliant on documentation review but fails under operational testing. Art 26 deployer obligations appear met but are not behaviourally embedded. Maximum exposure at audit.',
    changeFirst: 'Replace attitude-based governance metrics with operational tests of intervention, escalation, and accountability. Surface the gap between perception and capability.'
  },
  {
    id: 'oversightInNameOnly',
    name: 'Oversight in Name Only',
    severity: 'critical',
    test: S => S.hoc < 40 && _countActivePatterns(S) >= 2,
    meaning: 'Governance infrastructure is critically weak and multiple cross-dimensional risk patterns are active simultaneously. Human oversight exists as a label, not a function.',
    scenario: 'The organisation has a governance committee, a responsible AI policy, and named oversight roles. Accountability is diffuse, intervention is untested, escalation is blocked, and multiple structural risk patterns operate simultaneously.',
    boardConsequence: 'Under any form of scrutiny, the gap between governance structure and function will be exposed. This is a systemic governance failure, not a weakness in one area.',
    regConsequence: 'Multiple articles are simultaneously non-compliant. Regulatory exposure is not limited to a single obligation but spans Arts 14, 26, 9, 73 and others. Penalty exposure compounds because the failure is structural.',
    changeFirst: 'This requires a governance reset. Commission an independent assessment of governance infrastructure and design a replacement structure.'
  }
];

// ── EXECUTIVE STATUS RULES ────────────────────────────────────────────────────
// Evaluated in priority order. First match wins.
const EXEC_STATUS_RULES = [
  { label: 'Structurally Exposed', test: S => S.overall < 40 },
  { label: 'Intervention-Constrained', test: S => S.gaps.intervention.pct < 40 && S.gaps.authority.pct < 40 },
  { label: 'Oversight-Dependent on Individuals', test: S => S.patterns.lonelyVigilance },
  { label: 'Superficially Governed', test: S => S.overall >= 55 && _countPaperGov(S) >= 2 },
  { label: 'Behaviourally Misaligned', test: S => S.overall >= 40 && _maxAttBehGap(S) > 40 },
  { label: 'Operationally Fragile', test: S => S.overall >= 40 && S.overall < 55 && S.hoc < 50 },
  { label: 'Escalation-Compromised', test: S => S.gaps.escalation.pct < 40 },
  { label: 'Control Confidence Misaligned', test: S => S.overall >= 55 && S.hoc < 40 },
  { label: 'Governance-Capable with Active Risks', test: S => S.overall >= 55 && _countActivePatterns(S) >= 1 },
  { label: 'Robust: Monitoring Required', test: S => S.overall >= 70 && S.hoc >= 70 && _countActivePatterns(S) === 0 }
];

// ── RISK TRANSLATION TABLES ──────────────────────────────────────────────────
const RISK_TRANSLATIONS = {
  dims: {
    ps: {
      red: 'Personnel cannot safely report AI errors, challenge AI decisions, or acknowledge uncertainty. Oversight exists only as policy.',
      amber: 'Reporting and challenge functions work under normal conditions but are likely to fail under commercial or time pressure.'
    },
    go: {
      red: 'AI governance capability is stagnating. Competence concentrates in specialists. Senior leaders are not developing oversight fluency.',
      amber: 'Capability development is occurring but unevenly distributed. Governance competence may be adequate for current systems but insufficient for new deployments.'
    },
    af: {
      red: 'Governance frameworks cannot keep pace with AI adoption. Static rules create workarounds and shadow AI. Sunk cost fallacy drives continued use of flawed systems.',
      amber: 'Governance adapts but with delay. New AI deployments outpace framework updates. Emerging risks accumulate in the gap between policy and practice.'
    },
    co: {
      red: 'Nobody owns AI outcomes. Accountability is assigned on paper but not practised. The "algorithm decided" defence is culturally normalised.',
      amber: 'Accountability structures exist but diffuse under pressure. Edge cases and shared systems create ambiguity about who is responsible.'
    },
    ce: {
      red: 'AI outputs are not being verified before action. Automation bias is structurally embedded. Human oversight is nominal, not operational.',
      amber: 'Verification occurs for high-profile decisions but is inconsistent for routine operations. Subtle drift and bias go undetected.'
    }
  },
  gaps: {
    accountability: {
      red: 'Accountability for AI outcomes is undefined or assigned without corresponding authority. Consequences for oversight failure are absent.',
      amber: 'Accountability is documented but operationally unclear in shared-responsibility scenarios. Consequence mechanisms exist but are not tested.'
    },
    authority: {
      red: 'Override authority is absent, creates career risk, or requires approvals that eliminate its practical value.',
      amber: 'Authority to override exists but is rarely exercised. Cultural norms discourage its use. Authority may erode under commercial pressure.'
    },
    intervention: {
      red: 'The organisation cannot stop, modify, or reverse AI decisions within an acceptable timeframe. Intervention is untested.',
      amber: 'Intervention mechanisms exist but have not been stress-tested. The time between detection and intervention completion is unknown.'
    },
    escalation: {
      red: 'Bad news about AI systems cannot reliably reach decision-makers. Routes are unclear, undocumented, or blocked by hierarchy.',
      amber: 'Escalation routes exist for clear-cut incidents but fail for ambiguous cases. Speed to decision-makers is uncertain.'
    }
  }
};

// ── PRESSURE NARRATIVES ──────────────────────────────────────────────────────
// Used in "Where This Fails Under Pressure" block. Key = weakest construct key.
const PRESSURE_NARRATIVES = {
  ps: 'When timelines compress or stakes rise, the ability to speak up about AI problems will be the first capability to collapse. Errors will go unreported. Concerns will be suppressed.',
  go: 'When AI systems change or new systems are introduced, the organisation will lack the adaptive capability to govern them. Governance will be applied retrospectively, if at all.',
  af: 'When evidence suggests a change of course, the organisation will resist. Sunk costs, political investment, and rigid frameworks will prevent corrective action.',
  co: 'When AI outcomes are poor, no individual will own the failure. Accountability will diffuse across teams, vendors, and systems until corrective action becomes impossible.',
  ce: 'When AI systems produce subtly wrong outputs, nobody will notice. Verification effort is the first governance function to be cut when resources are scarce.',
  accountability: 'When a regulator asks who is responsible for an AI decision, the organisation will not have a clear answer.',
  authority: 'When someone needs to stop an AI system, they will not have the authority, access, or organisational support to do so.',
  intervention: 'When an AI system needs to be halted or reversed, the organisation does not know how long that will take or whether it is technically possible.',
  escalation: 'When a serious AI incident occurs, the information will not reach the right people in time. The 15-day reporting window will pass before the board is informed.'
};

// ── PATTERN METADATA ─────────────────────────────────────────────────────────
const PATTERN_META = {
  silentAutomation: {
    name: 'Silent Automation',
    trigger: 'Psychological Safety < 40% AND Critical Engagement < 40%',
    significance: 'Errors may be noticed but not reported. AI output is trusted without challenge.',
    vulnerability: 'Incidents accumulate silently. The organisation discovers failures through external exposure rather than internal detection.',
    regNote: 'Directly undermines Art 14 (Human Oversight) and Art 73 (Serious Incident Reporting).'
  },
  diffusedPassivity: {
    name: 'Diffused Passivity',
    trigger: 'Conscious Ownership < 40% AND Critical Engagement < 40%',
    significance: 'Nobody checks output; nobody owns the error. The "algorithm decided" defence becomes default.',
    vulnerability: 'Accountability vacuum means no corrective action is taken. The same failures recur indefinitely.',
    regNote: 'Contradicts Art 26 (Deployer Obligations) and Art 16 (Provider Obligations) accountability requirements.'
  },
  frozenGovernance: {
    name: 'Frozen Governance',
    trigger: 'Adaptive Flexibility < 40% AND Growth Orientation < 40%',
    significance: 'Static rules cannot keep pace with AI evolution. Shadow AI proliferates as workarounds.',
    vulnerability: 'Governance framework becomes irrelevant. Staff circumvent rather than comply. Policy-reality gap widens.',
    regNote: 'Violates Art 9 (continuous risk management) and Art 72 (adaptive post-market monitoring).'
  },
  lonelyVigilance: {
    name: 'Lonely Vigilance',
    trigger: 'Critical Engagement > 70% AND Psychological Safety < 40%',
    significance: 'Individuals spot errors but fear raising them. Burnout and attrition risk is high.',
    vulnerability: 'Oversight depends on individual heroism. One departure collapses the entire oversight function.',
    regNote: 'Art 14 oversight relies on personal courage, not systemic process. Art 73 reporting is structurally brittle.'
  },
  confidentBlindness: {
    name: 'Confident Blindness',
    trigger: 'Growth Orientation > 70% AND Critical Engagement < 40%',
    significance: 'High enthusiasm, low verification. Flawed tools reach production without scrutiny.',
    vulnerability: 'Automation bias accelerates. The better the system appears, the less anyone checks. Failure detection degrades over time.',
    regNote: 'Compromises Art 14 (human oversight) and Art 9 (risk management) through optimistic rather than rigorous assessment.'
  }
};

// ── 30-DAY CORRECTION ACTIONS ────────────────────────────────────────────────
const CORRECTION_ACTIONS = {
  ps: 'Implement anonymous AI concern reporting and guarantee non-retaliation for AI-related disclosures.',
  go: 'Launch a targeted AI governance competency programme for senior leaders and oversight-role holders.',
  af: 'Review and revise AI governance frameworks to align with current AI deployment reality.',
  co: 'Complete an accountability mapping exercise for all deployed AI systems.',
  ce: 'Introduce mandatory output verification protocols with documented evidence trails.',
  accountability: 'Assign named accountability for each AI system, with documented authority and consequence mechanisms.',
  authority: 'Review override authority structures. Ensure override does not require approvals that eliminate its practical value.',
  intervention: 'Conduct intervention readiness testing for each deployed high-risk AI system.',
  escalation: 'Establish and test AI-specific escalation routes. Publish pathway documentation to all relevant staff.'
};

// ── 90-DAY DESIGN OBJECTIVES ─────────────────────────────────────────────────
const DESIGN_OBJECTIVES = {
  silentAutomation: 'Build integrated reporting and verification systems that function as a single governance mechanism.',
  diffusedPassivity: 'Redesign accountability structures to eliminate shared-responsibility ambiguity for AI outcomes.',
  frozenGovernance: 'Implement event-driven governance review cycles triggered by AI deployment changes.',
  lonelyVigilance: 'Build team-level verification and challenge capabilities so oversight does not depend on individual courage.',
  confidentBlindness: 'Establish verification intensity scales linked to decision impact, independent of AI confidence metrics.'
};


// ============================================================
// DETECTION FUNCTIONS
// ============================================================

// Returns array of matched profiles. First = primary, rest = secondary.
function detectFailureProfiles(S) {
  return FAILURE_PROFILES.filter(p => p.test(S));
}

// Returns the top-level diagnostic status label.
function resolveExecutiveStatus(S) {
  const match = EXEC_STATUS_RULES.find(r => r.test(S));
  return match ? match.label : 'Under Assessment: Mixed Indicators';
}


// ============================================================
// NARRATIVE GENERATION
// ============================================================

// Generates the five advisory interpretation blocks.
function generateAdvisoryNarratives(S, REG, primaryProfile) {
  const pgCount = _countPaperGov(S);
  const patCount = _countActivePatterns(S);
  const weakest = _weakestConstruct(S);

  // Block 1: What This Means
  let whatThisMeans;
  if (S.overall < 40) {
    whatThisMeans = 'This organisation is critically under-prepared for responsible AI governance. Multiple dimensions are in failure range, and the structural foundations for human oversight are not in place.';
  } else if (S.overall < 55 && S.hoc < 40) {
    whatThisMeans = 'Surface-level readiness scores mask a serious infrastructure deficit. Psychological attitudes toward governance are developing, but the operational mechanisms to act on those attitudes are critically weak.';
  } else if (S.overall < 55) {
    whatThisMeans = 'The organisation is in a fragile transitional state. Basic governance orientation exists, but multiple dimensions require targeted strengthening before oversight can be considered reliable.';
  } else if (S.overall >= 55 && S.hoc < 40) {
    whatThisMeans = 'Readiness scores suggest moderate capability, but governance infrastructure is not keeping pace. The gap between psychological readiness and operational oversight creates a material vulnerability.';
  } else if (S.overall >= 55 && pgCount >= 2) {
    whatThisMeans = 'Stated beliefs about AI governance are strong. Behavioural evidence does not match. The organisation is governing in principle but not in practice.';
  } else if (S.overall >= 55 && S.hoc >= 55 && patCount > 0) {
    whatThisMeans = 'Overall capability is developing, but specific cross-dimensional risk patterns are active. These patterns create concentrated vulnerabilities that aggregate scores do not reveal.';
  } else if (S.overall >= 70 && S.hoc >= 70 && patCount === 0) {
    whatThisMeans = 'Readiness and governance infrastructure are both strong. The priority is sustaining these levels under evolving AI deployment conditions and monitoring for early degradation signals.';
  } else {
    whatThisMeans = 'The organisation shows mixed indicators across dimensions. Targeted attention to the weakest areas will improve overall governance posture.';
  }

  // Block 2: Where This Fails Under Pressure
  const pressureNarrative = PRESSURE_NARRATIVES[weakest.key] || PRESSURE_NARRATIVES.ce;
  const underPressure = `Under operational pressure, this organisation is most likely to fail at ${weakest.label}. ${pressureNarrative}`;

  // Block 3: Why Leadership Should Care
  let leadership;
  if (S.hoc < 40) {
    leadership = 'Human Oversight Capacity is critically low. The board\'s current governance posture assumes oversight mechanisms that do not function. This is a board-level risk, not an operational improvement opportunity.';
  } else if (S.hoc < 55 && REG && REG.overallRisk === 'high') {
    leadership = 'Governance infrastructure exists but is insufficient to meet the regulatory obligations it is designed to support. Multiple high-risk regulatory articles are triggered. This exposes the organisation to enforcement action and penalty.';
  } else if (S.hoc < 70 && patCount > 0) {
    leadership = 'Active risk patterns indicate structural weaknesses that standard governance metrics do not capture. These represent concentrated failure points that surface-level oversight cannot detect or prevent.';
  } else {
    leadership = 'Governance infrastructure is strong. Leadership attention should focus on maintaining behavioural consistency and monitoring for degradation under changing AI deployment conditions.';
  }

  // Block 4: What This Exposes the Organisation To
  let exposure = '';
  if (REG) {
    const h = REG.counts.high;
    const e = REG.counts.elevated;
    exposure = `Based on current scores, ${h} regulatory article${h !== 1 ? 's are' : ' is'} at high risk of non-compliance and ${e} ${e !== 1 ? 'are' : 'is'} at elevated risk. `;
    if (h >= 3) {
      exposure += 'Concentrated non-compliance with high-risk AI system requirements exposes the organisation to penalties of up to €15M or 3% of global annual turnover. ';
    } else if (h >= 1) {
      exposure += 'Non-compliance with specific high-risk requirements creates targeted penalty exposure of up to €15M or 3% of global annual turnover on the triggered articles. ';
    } else if (e > 0) {
      exposure += 'No immediate high-risk exposure, but elevated risk warrants monitoring as enforcement deadlines approach. ';
    }
    const now = new Date();
    const hrDeadline = new Date('2026-08-02');
    if (now < hrDeadline) {
      exposure += 'High-risk AI system requirements become enforceable on 2 August 2026. Current scores indicate the organisation is not on track to achieve compliance by that date.';
    } else {
      exposure += 'High-risk AI system requirements are now enforceable. Current scores indicate active non-compliance risk.';
    }
  } else {
    exposure = 'Regulatory exposure could not be calculated. Select a regulatory framework to enable compliance risk mapping.';
  }

  // Block 5: What Must Change First
  const changeFirst = primaryProfile ? primaryProfile.changeFirst : 'Focus on the lowest-scoring governance gap and address the structural barrier preventing improvement.';

  return { whatThisMeans, underPressure, leadership, exposure, changeFirst };
}

// Generates grouped recommendations tied to profiles, scores, and regulatory mapping.
function generateRecommendations(S, REG, profiles) {
  const primary = profiles[0] || null;
  const patCount = _countActivePatterns(S);
  const recs = { immediate: [], thirtyDay: [], ninetyDay: [], structural: [] };

  // Immediate: critical severity, HOC < 40, overall < 40, patterns >= 2, or reg high
  if (S.hoc < 40) {
    recs.immediate.push('Human oversight infrastructure is critically weak. The board cannot currently assure regulators or stakeholders that deployed AI systems have functional human oversight.');
  }
  if (S.overall < 40) {
    recs.immediate.push('Organisation-wide psychological readiness is in failure range. Governance capability is insufficient across multiple dimensions.');
  }
  if (patCount >= 2) {
    recs.immediate.push(`${patCount} structural risk patterns are operating simultaneously. These represent compounding failure modes, not isolated weaknesses.`);
  }
  if (REG && REG.overallRisk === 'high') {
    recs.immediate.push(`Non-compliance risk is concentrated across ${REG.counts.high} regulatory articles. Enforcement exposure is material.`);
  }
  if (primary && primary.severity === 'critical' && recs.immediate.length === 0) {
    recs.immediate.push(`Primary failure profile (${primary.name}) is severity-critical. Board-level attention is required.`);
  }

  // 30-day: one correction per construct scoring < 40
  Object.entries(S.dims).forEach(([k, d]) => {
    if (d.comp < 40 && CORRECTION_ACTIONS[k]) {
      const tags = REG ? _regTagsForConstruct(REG, 'dimension', k) : '';
      recs.thirtyDay.push(`<strong>${d.label}</strong> requires immediate corrective action. Current score: ${d.comp}%. ${CORRECTION_ACTIONS[k]}${tags}`);
    }
  });
  Object.entries(S.gaps).forEach(([k, g]) => {
    if (g.pct < 40 && CORRECTION_ACTIONS[k]) {
      const tags = REG ? _regTagsForConstruct(REG, 'gap', k) : '';
      recs.thirtyDay.push(`<strong>${g.label}</strong> requires immediate corrective action. Current score: ${g.pct}%. ${CORRECTION_ACTIONS[k]}${tags}`);
    }
  });

  // 90-day: active patterns and constructs scoring 40-55
  Object.entries(S.patterns).forEach(([k, active]) => {
    if (active && DESIGN_OBJECTIVES[k]) {
      recs.ninetyDay.push(`<strong>${PATTERN_META[k].name}</strong> pattern is active and requires design-level attention. 90-day target: ${DESIGN_OBJECTIVES[k]}`);
    }
  });
  Object.entries(S.dims).forEach(([k, d]) => {
    if (d.comp >= 40 && d.comp < 55) {
      recs.ninetyDay.push(`<strong>${d.label}</strong> is fragile (${d.comp}%) and trending toward critical. Design-level reinforcement is recommended before the next assessment cycle.`);
    }
  });

  // Structural: 3+ constructs in amber, or primary profile is critical
  const amberCount = Object.values(S.dims).filter(d => d.rag === 'amber').length + Object.values(S.gaps).filter(g => g.rag === 'amber').length;
  if (amberCount >= 3) {
    recs.structural.push('Governance maturity plateau. Scores indicate a governance framework that is present but not operational. The organisation requires a transition from policy-based governance to behaviour-based governance.');
  }
  if (S.hoc < 40 && S.overall >= 40) {
    recs.structural.push('Oversight infrastructure deficit. Psychological readiness exceeds governance capability. The organisation\'s people are more ready than its systems.');
  }
  if (patCount >= 2 && S.overall >= 40) {
    recs.structural.push('Compounding risk patterns. Multiple structural weaknesses interact to create failure modes that individual dimension scores do not predict. Intervention must address pattern triggers, not just individual scores.');
  }
  if (recs.structural.length === 0 && primary && primary.severity === 'critical') {
    recs.structural.push(`The ${primary.name} profile indicates a governance design issue that targeted corrections alone will not resolve. A structured remediation programme is recommended.`);
  }

  return recs;
}

// Returns inline reg-tag HTML for a given construct.
function _regTagsForConstruct(REG, type, key) {
  if (!REG || !REG.getInlineTags) return '';
  const tags = REG.getInlineTags(type, key);
  if (!tags || tags.length === 0) return '';
  return ' ' + tags.map(t =>
    `<span class="reg-tag"><span style="font-size:10px;opacity:0.7;">§</span> Art ${t.num}</span>`
  ).join(' ');
}


// ============================================================
// HTML BUILDERS
// ============================================================

// Builds the dimension cards HTML block.
function buildDimensionCardsHTML(S, REG) {
  const order = ['ps', 'go', 'af', 'co', 'ce'];
  return order.map(k => {
    const d = S.dims[k];
    const riskText = RISK_TRANSLATIONS.dims[k];
    const interpretation = d.rag === 'red' ? riskText.red : d.rag === 'amber' ? riskText.amber : 'This dimension is in robust range. Maintain current practices and monitor for degradation.';
    const regTags = REG ? _regTagsForConstruct(REG, 'dimension', k) : '';
    return `
    <div class="card" style="margin-bottom:2px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div>
          <div class="value-sm" style="color:var(--text);">${d.label}</div>
          <div class="label-xs" style="margin-top:2px;">Section ${d.sec} · 10 attitude items + 3 behavioural items</div>
        </div>
        ${_ragBadge(d.comp, '')}
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--text-muted);">Attitude</span><span style="color:var(--text);font-weight:600;">${d.attPct}%</span></div>
        <div class="bar-track"><div class="bar-fill fill-gold" style="width:${d.attPct}%;"></div></div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--text-muted);">Behaviour</span><span style="color:var(--text);font-weight:600;">${d.behPct}%</span></div>
        <div class="bar-track"><div class="bar-fill fill-gold-dim" style="width:${d.behPct}%;"></div></div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--text);font-weight:600;">Composite</span><span style="color:var(--text);font-weight:700;">${d.comp}%</span></div>
        <div class="bar-track" style="height:4px;"><div class="bar-fill fill-${d.rag}" style="width:${d.comp}%;"></div></div>
      </div>
      ${d.paperGov ? '<div class="flag-warn" style="margin-bottom:12px;">Paper governance detected: high attitude, low behaviour</div>' : ''}
      <div class="divider"></div>
      <div class="label-xs" style="margin-bottom:6px;">Executive Interpretation</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.7;">${interpretation}</p>
      ${regTags ? `<div class="reg-tags">${regTags}</div>` : ''}
    </div>`;
  }).join('');
}

// Builds the governance gap cards HTML block.
function buildGapCardsHTML(S, REG) {
  const order = ['accountability', 'authority', 'intervention', 'escalation'];
  return order.map(k => {
    const g = S.gaps[k];
    const riskText = RISK_TRANSLATIONS.gaps[k];
    const interpretation = g.rag === 'red' ? riskText.red : g.rag === 'amber' ? riskText.amber : 'This governance gap is in robust range. Infrastructure supports operational oversight.';
    const regTags = REG ? _regTagsForConstruct(REG, 'gap', k) : '';
    return `
    <div class="card-flush">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div>
          <div class="value-sm" style="color:var(--text);">${g.label}</div>
          <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">${g.desc}</div>
        </div>
        ${_ragBadge(g.pct, '')}
      </div>
      <div class="value-lg" style="color:var(--${_colour(g.pct)});margin-bottom:8px;">${g.pct}<span style="font-size:0.6em;opacity:0.6;">%</span></div>
      <div class="bar-track" style="height:3px;margin-bottom:14px;"><div class="bar-fill fill-${g.rag}" style="width:${g.pct}%;"></div></div>
      <div class="label-xs" style="margin-bottom:6px;">Executive Implication</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.7;margin-bottom:8px;">${interpretation}</p>
      ${regTags ? `<div class="reg-tags">${regTags}</div>` : ''}
    </div>`;
  }).join('');
}

// Builds the cross-pattern risk cards HTML block.
function buildPatternCardsHTML(S) {
  const keys = ['silentAutomation', 'diffusedPassivity', 'frozenGovernance', 'lonelyVigilance', 'confidentBlindness'];
  return keys.map(k => {
    const active = S.patterns[k];
    const m = PATTERN_META[k];
    if (!active) {
      return `<div class="card" style="margin-bottom:2px;opacity:0.4;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="width:8px;height:8px;background:var(--green);"></div>
          <div class="value-sm" style="color:var(--text-dim);">${m.name}</div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Not active. Trigger: ${m.trigger}</div>
      </div>`;
    }
    return `<div class="card" style="margin-bottom:2px;border-color:var(--red-border);background:var(--red-bg);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:8px;height:8px;background:var(--red);"></div>
          <div class="value-sm" style="color:var(--red);">${m.name}</div>
        </div>
        <span class="rag rag-red">Active</span>
      </div>
      <div class="label-xs" style="margin-bottom:4px;">Trigger</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.65;margin-bottom:10px;">${m.trigger}</p>
      <div class="label-xs" style="margin-bottom:4px;">Significance</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.65;margin-bottom:10px;">${m.significance}</p>
      <div class="label-xs" style="margin-bottom:4px;">Where It Creates Vulnerability</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.65;margin-bottom:10px;">${m.vulnerability}</p>
      <div class="label-xs" style="margin-bottom:4px;">Regulatory Touchpoint</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.65;">${m.regNote}</p>
    </div>`;
  }).join('');
}

// Builds the penalty exposure bar HTML.
function buildPenaltyExposureHTML(REG) {
  if (!REG || REG.overallRisk !== 'high') return '';
  return `<div style="margin-top:2px;margin-bottom:2px;padding:14px 18px;background:var(--red-bg);border:1px solid var(--red-border);font-size:0.82rem;color:var(--text-muted);line-height:1.75;">
    <strong style="color:var(--red);">Elevated Penalty Exposure:</strong> Multiple high-risk articles triggered. Under Art 99, non-compliance with high-risk requirements can result in fines up to <strong style="color:var(--red);">€15M or 3% of global annual turnover</strong>. Prohibited practice violations carry fines up to <strong style="color:var(--red);">€35M or 7%</strong>.
  </div>`;
}

// Builds the enforcement timeline HTML.
function buildEnforcementTimelineHTML(REG) {
  if (!REG || !REG.framework || !REG.framework.timeline) return '';
  const fw = REG.framework;
  if (fw.id !== 'eu-ai-act') return ''; // Timeline display for EU AI Act only
  const now = new Date();
  const items = [
    { label: 'Prohibited Practices', date: '2025-02-02', display: '2 Feb 2025' },
    { label: 'GPAI Obligations', date: '2025-08-02', display: '2 Aug 2025' },
    { label: 'High-Risk Requirements', date: '2026-08-02', display: '2 Aug 2026' },
    { label: 'Full Enforcement', date: '2027-08-02', display: '2 Aug 2027' }
  ];
  return `<div class="card" style="margin-bottom:2px;">
    <div class="label-xs" style="margin-bottom:12px;">Enforcement Timeline</div>
    <div class="grid-1px grid-4">
      ${items.map(i => {
        const past = now >= new Date(i.date);
        const colour = past ? 'var(--green)' : (i.label === 'Full Enforcement' ? 'var(--red)' : 'var(--amber)');
        return `<div class="card-flush" style="text-align:center;">
          <div class="label-xs" style="margin-bottom:4px;">${i.label}</div>
          <div style="font-weight:600;font-size:0.85rem;color:${colour};">${i.display}${past ? ' ✓' : ''}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// Builds the article risk cards HTML.
function buildArticleRiskCardsHTML(REG) {
  if (!REG || !REG.articleRiskList) return '';
  return `<div class="grid-1px grid-2" style="margin-top:2px;margin-bottom:2px;">
    ${REG.articleRiskList.map(art => `
    <div class="card-flush">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <div class="label-xs" style="color:var(--blue);">Article ${art.num}</div>
        <span class="rag rag-${art.riskLevel === 'high' ? 'red' : art.riskLevel === 'elevated' ? 'amber' : 'green'}">${art.riskLevel === 'high' ? 'High Risk' : art.riskLevel === 'elevated' ? 'Elevated' : 'Lower Risk'}</span>
      </div>
      <div class="value-sm" style="color:var(--text);margin-bottom:6px;font-size:0.85rem;">${art.title}</div>
      <p style="font-size:0.78rem;color:var(--text-dim);line-height:1.65;margin-bottom:6px;">${art.summary}</p>
      <div style="font-size:0.72rem;color:var(--text-dim);"><strong style="color:var(--text-muted);">Triggered by:</strong> ${art.sources.join(', ')}</div>
    </div>`).join('')}
  </div>`;
}

// Builds the pattern-specific regulatory implications HTML.
function buildPatternRegImplicationsHTML(REG) {
  if (!REG || !REG.activePatterns || REG.activePatterns.length === 0) return '';
  return `<div style="margin-top:2px;">
    <div class="label-xs" style="margin-bottom:10px;">Pattern-Specific Regulatory Implications</div>
    ${REG.activePatterns.map(p => `
    <div class="card" style="border-color:var(--red-border);margin-bottom:2px;">
      <div class="value-sm" style="color:var(--red);margin-bottom:8px;">${p.key.replace(/([A-Z])/g, ' $1').trim()}</div>
      <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.75;margin-bottom:8px;">${p.narrative}</p>
      <div class="reg-tags">${p.articles.map(artNum => {
        const art = REG.framework.articles[artNum];
        return art ? `<span class="reg-tag"><span style="font-size:10px;opacity:0.7;">§</span> Art ${artNum}: ${art.title}</span>` : '';
      }).join('')}</div>
    </div>`).join('')}
  </div>`;
}

// Builds the priority band list items.
function buildPriorityListHTML(items) {
  if (!items || items.length === 0) return '<p style="font-size:0.82rem;color:var(--text-dim);font-style:italic;">No items in this priority band based on current scores.</p>';
  return items.map((item, i) => `<p style="margin-bottom:${i < items.length - 1 ? '12px' : '0'};">${item}</p>`).join('');
}

// Builds secondary profiles HTML block.
function buildSecondaryProfilesHTML(profiles) {
  if (profiles.length <= 1) return '';
  return profiles.slice(1).map(p => `
  <div class="card" style="margin-top:2px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
      <div>
        <div class="label-xs" style="margin-bottom:4px;">Secondary Profile</div>
        <div class="value-sm" style="color:var(--text);">${p.name}</div>
      </div>
      <span class="rag rag-${p.severity === 'critical' ? 'red' : 'amber'}">${p.severity === 'critical' ? 'Critical' : 'High'}</span>
    </div>
    <p class="body-text" style="margin-bottom:10px;">${p.meaning}</p>
    <div class="label-xs" style="margin-bottom:6px;">How This Breaks in Reality</div>
    <p class="body-text">${p.scenario}</p>
  </div>`).join('');
}

// Builds the three board-level concerns.
function buildBoardConcernsHTML(S, REG, profiles) {
  const concerns = [];
  const primary = profiles[0];
  if (primary) concerns.push(`Primary failure profile is <strong>${primary.name}</strong> (${primary.severity}). ${primary.meaning}`);
  if (S.hoc < 40) concerns.push(`Human Oversight Capacity is critically low at ${S.hoc}%. Governance infrastructure is insufficient to support the oversight the board assumes is operational.`);
  else if (S.hoc < 55) concerns.push(`Human Oversight Capacity is fragile at ${S.hoc}%. Infrastructure may fail under pressure.`);
  const wg = _weakestGap(S);
  if (wg.pct < 40) concerns.push(`${wg.label} is the weakest governance gap at ${wg.pct}% (Critical). ${RISK_TRANSLATIONS.gaps[wg.key] ? RISK_TRANSLATIONS.gaps[wg.key].red : ''}`);
  if (REG && REG.overallRisk === 'high' && concerns.length < 3) concerns.push(`Regulatory exposure is high across ${REG.counts.high} articles. Material penalty risk is present.`);
  if (_countActivePatterns(S) >= 2 && concerns.length < 3) concerns.push(`${_countActivePatterns(S)} cross-dimensional risk patterns are active simultaneously, indicating compounding structural weaknesses.`);
  while (concerns.length < 3) concerns.push('Monitor leading indicators for early warning of degradation in currently stable areas.');
  return concerns.slice(0, 3).map((c, i) => `<p style="margin-bottom:${i < 2 ? '10px' : '0'};">${i + 1}. ${c}</p>`).join('');
}

// Builds the three intervention priorities.
function buildInterventionPrioritiesHTML(S, profiles, recs) {
  const priorities = [];
  const primary = profiles[0];
  if (primary) priorities.push(primary.changeFirst);
  if (recs.thirtyDay.length > 0) priorities.push(recs.thirtyDay[0].replace(/<[^>]+>/g, ''));
  if (recs.ninetyDay.length > 0 && priorities.length < 3) priorities.push(recs.ninetyDay[0].replace(/<[^>]+>/g, ''));
  const wg = _weakestGap(S);
  if (wg.pct < 40 && priorities.length < 3) priorities.push(CORRECTION_ACTIONS[wg.key] || 'Address the weakest governance gap as a priority.');
  while (priorities.length < 3) priorities.push('Sustain current governance practices and establish quarterly monitoring cadence.');
  return priorities.slice(0, 3).map((p, i) => `<p style="margin-bottom:${i < 2 ? '10px' : '0'};">${i + 1}. ${p}</p>`).join('');
}

// Builds the HOC regulatory tags.
function buildHocRegTags(REG) {
  if (!REG) return '';
  const mappings = typeof getMappingsForFramework === 'function'
    ? getMappingsForFramework(REG.framework.id)
    : null;
  if (!mappings || !mappings.hoc || !mappings.hoc.primary) return '';
  return mappings.hoc.primary.map(artNum => {
    const art = REG.framework.articles[artNum];
    return art ? `<span class="reg-tag"><span style="font-size:10px;opacity:0.7;">§</span> Art ${artNum}: ${art.title}</span>` : '';
  }).join(' ');
}


// ============================================================
// MASTER DATA ASSEMBLY
// ============================================================

// Builds the complete data map that replaces all {{placeholders}} in the template.
function buildReportData(S, REG, opts) {
  const profiles = detectFailureProfiles(S);
  const primary = profiles[0] || null;
  const status = resolveExecutiveStatus(S);
  const narratives = generateAdvisoryNarratives(S, REG, primary);
  const recs = generateRecommendations(S, REG, profiles);
  const wg = _weakestGap(S);
  const sd = _strongestDim(S);
  const pgCount = _countPaperGov(S);
  const patCount = _countActivePatterns(S);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const year = new Date().getFullYear();

  // Determine overall status colour
  let statusColour = 'red';
  if (S.overall >= 70 && S.hoc >= 70 && patCount === 0) statusColour = 'green';
  else if (S.overall >= 55 || status.includes('Robust')) statusColour = 'amber';

  const data = {
    // Header
    organisationName: opts.organisationName || S.context.A3 || 'Organisation',
    reportDate: opts.reportDate || today,
    reportSubtitle: opts.reportSubtitle || 'Diagnostic assessment of psychological readiness and governance infrastructure for responsible AI oversight.',
    respondentScope: opts.respondentScope || `Individual assessment · ${S.context.A1} · ${S.context.A2}`,
    selectedFramework: REG ? REG.framework.shortName : 'Not selected',
    reportYear: String(year),
    footerCollaboration: opts.collaboration || '',

    // Executive Summary
    overallStatus: status,
    overallStatusColour: statusColour,
    overallPct: String(S.overall),
    overallColour: _colour(S.overall),
    overallRagBadge: _ragBadge(S.overall, 'Capability'),
    overallRagBadgeSmall: _ragBadge(S.overall, ''),
    overallReadinessLabel: _ragLabel(S.overall) + ' readiness',
    primaryProfile: primary ? primary.name : 'No critical profile detected',
    primaryProfileSummary: primary ? primary.meaning : 'Scores do not trigger a named failure profile. Monitor leading indicators.',
    primaryProfileMeaning: primary ? primary.meaning : '',
    primaryProfileScenario: primary ? primary.scenario : '',
    primaryProfileBorderColour: primary ? (primary.severity === 'critical' ? 'red-border' : 'amber-border') : 'border',
    primarySeverityBadge: primary ? `<span class="rag rag-${primary.severity === 'critical' ? 'red' : 'amber'}">${primary.severity === 'critical' ? 'Critical' : 'High'}</span>` : '',
    primaryBoardConsequence: primary ? primary.boardConsequence : '',
    primaryRegConsequence: primary ? primary.regConsequence : '',
    hocPct: String(S.hoc),
    hocColour: _colour(S.hoc),
    hocRag: _rag(S.hoc),
    hocRagBadge: _ragBadge(S.hoc, 'Infrastructure'),
    hocStatusLabel: _ragLabel(S.hoc) + ' oversight infrastructure',

    // Exposure Snapshot
    weakestGapLabel: wg.label,
    weakestGapPct: String(wg.pct),
    weakestGapColour: _colour(wg.pct),
    strongestDimLabel: sd.label,
    strongestDimPct: String(sd.comp),
    strongestDimColour: _colour(sd.comp),
    paperGovCount: String(pgCount),
    paperGovCountColour: pgCount === 0 ? 'green' : 'amber',
    paperGovNote: pgCount === 0 ? 'None detected' : pgCount + ' dimension' + (pgCount > 1 ? 's' : '') + ' affected',
    patternCount: String(patCount),
    patternCountColour: patCount === 0 ? 'green' : patCount >= 2 ? 'red' : 'amber',
    delusionStatus: opts.delusionGap || 'Requires organisational data',
    delusionColour: opts.delusionColour || 'text-dim',
    delusionNote: opts.delusionNote || 'Multi-respondent analysis needed',
    regExposureBadge: REG ? `<span class="rag rag-${REG.overallRisk === 'high' ? 'red' : REG.overallRisk === 'elevated' ? 'amber' : 'green'}">${REG.overallRisk === 'high' ? 'High' : REG.overallRisk === 'elevated' ? 'Elevated' : 'Lower'}</span>` : '<span class="rag rag-blue">Not assessed</span>',
    regExposureNote: REG ? `${REG.counts.high} high-risk articles` : 'Select framework',

    // Regulatory
    regOverallBadge: REG ? `<span class="rag rag-${REG.overallRisk === 'high' ? 'red' : REG.overallRisk === 'elevated' ? 'amber' : 'green'}">${REG.overallRisk === 'high' ? 'High Exposure' : REG.overallRisk === 'elevated' ? 'Elevated' : 'Lower Exposure'}</span>` : '',
    regHighCount: REG ? String(REG.counts.high) : '0',
    regElevatedCount: REG ? String(REG.counts.elevated) : '0',
    regLowerCount: REG ? String(REG.counts.lower) : '0',
    regTotalCount: REG ? String(REG.counts.total) : '0',

    // HOC Section
    hocNarrative: REG ? REG.hoc.narrative : (S.hoc < 40
      ? 'Human Oversight Capacity is critically low. The combination of accountability gaps, insufficient authority, untested intervention, and broken escalation means the organisation cannot demonstrate operational human oversight.'
      : S.hoc < 70
        ? 'Human Oversight Capacity is fragile. Governance infrastructure exists but has not been stress-tested. Compliance is achievable under normal conditions but may fail during incidents.'
        : 'Human Oversight Capacity supports regulatory compliance. Accountability, authority, intervention, and escalation mechanisms provide operational infrastructure.'),
    hocInterventionAssessment: S.hoc < 40
      ? 'Based on current scores: No. The governance infrastructure required for timely intervention is not operational. The gap between detection and corrective action is unacceptably wide or undefined.'
      : S.hoc < 55
        ? 'Based on current scores: Uncertain. Intervention mechanisms exist but have not been tested under realistic conditions. The organisation cannot demonstrate that intervention will succeed when needed.'
        : S.hoc < 70
          ? 'Based on current scores: Probably, under normal conditions. Infrastructure supports intervention but has not been stress-tested. Performance under pressure is unknown.'
          : 'Based on current scores: Yes, under current operating conditions. Intervention infrastructure is robust. Maintain testing and drill cadence to sustain this capability.',
    hocRegNarrative: REG ? REG.hoc.narrative : '',
    hocRegTags: buildHocRegTags(REG),

    // Generated HTML blocks
    boardConcernsHTML: buildBoardConcernsHTML(S, REG, profiles),
    interventionPrioritiesHTML: buildInterventionPrioritiesHTML(S, profiles, recs),
    secondaryProfilesHTML: buildSecondaryProfilesHTML(profiles),
    dimensionCardsHTML: buildDimensionCardsHTML(S, REG),
    gapCardsHTML: buildGapCardsHTML(S, REG),
    patternCardsHTML: buildPatternCardsHTML(S),
    penaltyExposureHTML: buildPenaltyExposureHTML(REG),
    enforcementTimelineHTML: buildEnforcementTimelineHTML(REG),
    articleRiskCardsHTML: buildArticleRiskCardsHTML(REG),
    patternRegImplicationsHTML: buildPatternRegImplicationsHTML(REG),
    prioritiesImmediateHTML: buildPriorityListHTML(recs.immediate),
    priorities30HTML: buildPriorityListHTML(recs.thirtyDay),
    priorities90HTML: buildPriorityListHTML(recs.ninetyDay),
    prioritiesStructuralHTML: buildPriorityListHTML(recs.structural),

    // Advisory narratives
    advisoryWhatThisMeans: narratives.whatThisMeans,
    advisoryUnderPressure: narratives.underPressure,
    advisoryLeadership: narratives.leadership,
    advisoryExposure: narratives.exposure,
    advisoryChangeFirst: narratives.changeFirst
  };

  return data;
}


// ============================================================
// TEMPLATE POPULATION
// ============================================================

// Replaces all {{placeholder}} markers in the template HTML with generated data.
function populateTemplate(templateHTML, data) {
  let html = templateHTML;
  Object.entries(data).forEach(([key, value]) => {
    const pattern = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
    html = html.replace(pattern, value);
  });
  return html;
}


// ============================================================
// MAIN ENTRY POINTS
// ============================================================

// Generates the complete board report HTML from the ALMA scoring objects.
// S = output of calcScores(), REG = output of calcRegulatoryRisk(), opts = report options.
function generateBoardReport(S, REG, opts) {
  opts = opts || {};
  const data = buildReportData(S, REG, opts);

  // If a template HTML string is provided, populate and return it
  if (opts.templateHTML) {
    return populateTemplate(opts.templateHTML, data);
  }

  // Otherwise, fetch the template from the current document or a known path
  return data;
}

// Renders the board report into a target element or new window.
function renderBoardReport(S, REG, opts) {
  opts = opts || {};
  const data = buildReportData(S, REG, opts);

  if (opts.templateHTML) {
    const html = populateTemplate(opts.templateHTML, data);
    if (opts.targetElement) {
      opts.targetElement.innerHTML = html;
    } else {
      // Open in new window
      const w = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
      w.document.write(html);
      w.document.close();
    }
    return;
  }

  // If no template provided, try to fetch the report HTML file
  if (opts.templateUrl) {
    fetch(opts.templateUrl)
      .then(r => r.text())
      .then(templateHTML => {
        const html = populateTemplate(templateHTML, data);
        if (opts.targetElement) {
          opts.targetElement.innerHTML = html;
        } else {
          const w = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
          w.document.write(html);
          w.document.close();
        }
      })
      .catch(err => console.error('Failed to load board report template:', err));
    return;
  }

  console.warn('No template provided. Call with opts.templateHTML or opts.templateUrl.');
  return data;
}

// Prepares the page for print/PDF export and triggers the print dialog.
function exportBoardReportPDF() {
  window.print();
}

// Framework switcher: re-renders the report with a different regulatory framework.
function switchBoardReportFramework(S, frameworkId, opts) {
  if (typeof calcRegulatoryRisk !== 'function') {
    console.error('calcRegulatoryRisk() not available. Ensure the ALMA codebase is loaded.');
    return;
  }
  const REG = calcRegulatoryRisk(S, frameworkId);
  renderBoardReport(S, REG, opts);
}
