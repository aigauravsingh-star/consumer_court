(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ConsumerStrategy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "2026-10-11.1";
  const SOURCES = {
    act: { title: "Consumer Protection Act, 2019", url: "https://consumeraffairs.gov.in/public/upload/files/CP%20Act%202019_1732700731.pdf", locator: "Sections 2, 34, 38, 39, 69, 71" },
    jurisdiction: { title: "Commission Jurisdiction Rules, 2021", url: "https://consumeraffairs.gov.in/public/upload/files/232278_1732705181.pdf", locator: "Rules 3–5, G.S.R. 912(E), 30 December 2021" },
    portal: { title: "e-Jagriti Consumer Complaint filing guide", url: "https://e-jagriti.gov.in/static/media/CC_Filing.34e0fc5dd03b1d864cab.pdf", locator: "Steps 4, 8–13; March 2025" },
    mediation: { title: "Consumer Protection (Mediation) Rules, 2020", url: "https://consumeraffairs.gov.in/public/upload/files/Mediation%20Rules_1732703912.pdf", locator: "Rule 4: excluded matters" },
    nch: { title: "National Consumer Helpline", url: "https://consumerhelpline.gov.in/public/index.php/about", locator: "Pre-litigation process" },
    registry: { title: "Department of Consumer Affairs rules register", url: "https://consumeraffairs.gov.in/pages/consumer-protection-acts", locator: "Check subsequent amendments and commencement dates" }
  };
  const SECTORS = {
    general: { label: "Other goods / services", needs: ["purchase", "payment", "promise", "failure", "communication", "loss"] },
    goods: { label: "Product / warranty", needs: ["purchase", "payment", "promise", "failure", "service", "communication"], expert: "A disputed technical defect may need a service report or appropriate testing." },
    ecommerce: { label: "E-commerce / delivery", needs: ["purchase", "payment", "promise", "delivery", "failure", "communication"], tip: "Separate the seller, marketplace, courier and manufacturer. Record each entity's role." },
    insurance: { label: "Insurance", needs: ["policy", "payment", "claim", "repudiation", "survey", "communication"], tip: "Read the policy, exclusion relied on, claim history and surveyor's assessment together." },
    housing: { label: "Housing / builder", needs: ["agreement", "payment", "promise", "possession", "communication", "loss"], tip: "Compare the promised possession date, paid instalments, actual handover and parallel RERA proceedings." },
    banking: { label: "Banking / payments", needs: ["statement", "terms", "transaction", "communication", "failure", "loss"], tip: "Identify authorisation, complaint timestamps and the provider's actual contractual duty." },
    travel: { label: "Travel / airline", needs: ["booking", "payment", "terms", "failure", "communication", "loss"] },
    medical: { label: "Healthcare", needs: ["medical", "payment", "consent", "failure", "expert", "loss"], expert: "Record the alleged breach, causation and medical records; specialist review is required." },
    education: { label: "Education / coaching", needs: ["agreement", "payment", "promise", "failure", "communication"], tip: "Education/coaching maintainability is fact-dependent. Obtain specialist advice before choosing a consumer forum." },
    legal: { label: "Advocate / legal services", needs: ["agreement", "payment", "communication"], tip: "Consumer-forum maintainability requires specific review of current Supreme Court law on advocate services." }
  };
  const CATEGORIES = {
    purchase: "Invoice / purchase", payment: "Payment proof", promise: "Promise / warranty / advertisement",
    failure: "Defect / service failure", communication: "Complaint / response", loss: "Loss / expense proof",
    service: "Service / repair report", delivery: "Delivery / tracking", policy: "Policy / disclosure",
    claim: "Insurance claim", repudiation: "Claim rejection", survey: "Surveyor report",
    agreement: "Agreement", possession: "Possession / occupancy", statement: "Account statement",
    terms: "Terms / exclusions", transaction: "Transaction log", booking: "Booking / ticket",
    medical: "Medical record", consent: "Consent record", expert: "Expert opinion", other: "Other"
  };
  const trim = value => String(value == null ? "" : value).trim();
  function amount(value) {
    const text = trim(value).replace(/[,₹\s]/g, "").replace(/^(?:INR|Rs\.?)/i, "");
    return /^\d+(?:\.\d{1,2})?$/.test(text) && Number.isFinite(Number(text)) && Number(text) <= Number.MAX_SAFE_INTEGER / 100 ? Number(text) : null;
  }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trim(value))) return null;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }
  function anniversary(value) {
    const date = parseDate(value);
    if (!date) return "";
    const year = date.getUTCFullYear() + 2, month = date.getUTCMonth(), day = date.getUTCDate();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
  }
  function limitation(profile) {
    if ((profile.route || "ordinary") !== "ordinary") return { status: "specialist", text: "This route has different limitation rules. Ask counsel to set the deadline.", anniversary: "", days: null };
    const cause = parseDate(profile.causeDate), filing = parseDate(profile.filingDate);
    if (!cause || !filing) return { status: "unknown", text: "Confirm the cause-of-action date and proposed filing date.", anniversary: "", days: null };
    if (cause > filing) return { status: "invalid", text: "The cause-of-action date is after the proposed filing date.", anniversary: "", days: null };
    const marker = anniversary(profile.causeDate);
    const days = Math.round((parseDate(marker) - filing) / 86400000);
    return { status: days < 0 ? "overdue" : days <= 60 ? "urgent" : "review",
      text: days < 0 ? "The proposed filing falls after the two-year marker. Ask counsel about delay condonation."
        : days <= 60 ? "The proposed filing is close to the two-year marker. Arrange urgent limitation review."
        : "Proposed filing is before the two-year marker; counsel must confirm accrual and exceptions.",
      anniversary: marker, days };
  }
  function jurisdiction(paid, route) {
    if ((route || "ordinary") !== "ordinary") return { level: "", status: "specialist", text: "Unfair-contract, appeal and execution routes require separate forum analysis." };
    const value = amount(paid);
    if (value === null || value <= 0) return { level: "", status: "unknown", text: "Confirm the total consideration actually paid." };
    const level = value <= 5000000 ? "District Commission" : value <= 20000000 ? "State Commission" : "National Commission";
    return { level, status: "indicative", text: level + " under the 2021 ordinary-complaint thresholds, subject to current-rule and territorial review." };
  }
  function safeUrl(value) {
    try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; } catch (_) { return ""; }
  }
  function sourceKind(value) {
    const safe = safeUrl(value);
    if (!safe) return "Invalid source";
    const host = new URL(safe).hostname.toLowerCase();
    if (host.endsWith(".gov.in") || host.endsWith(".nic.in") || host === "sci.gov.in") return "Official host • review pending";
    return "External source • review pending";
  }
  function evidenceFor(files, profile) {
    const annotations = profile.evidence || {};
    return files.map(file => ({ ...file, annotation: annotations[file.id] || {}, reviewed: annotations[file.id]?.reviewed === true && !!trim(annotations[file.id]?.locator) }));
  }
  function evaluate(caseData, profile, files) {
    const gaps = [], supported = [], add = (id, severity, title, detail, owner, source) => gaps.push({ id, severity, title, detail, owner, source });
    const evidence = evidenceFor(files, profile), reviewed = evidence.filter(f => f.reviewed);
    const lim = limitation(profile), forum = jurisdiction(caseData.amount, profile.route);
    const sector = SECTORS[profile.sector] || SECTORS.general;
    if (!trim(caseData.consumerName) || !trim(caseData.oppositeName) || !trim(caseData.oppositeAddress) || !trim(caseData.consumerAddress))
      add("parties", "high", "Complete the parties and addresses", "Confirm the legal entity on the invoice or agreement and a serviceable address.", "Intake lead", "portal");
    else supported.push("Party names and addresses recorded");
    if (!trim(profile.respondentRole))
      add("respondent", "high", "Explain why this respondent is liable", "Record each seller, platform, manufacturer or provider's promise and role.", "Case strategist", "act");
    if (!profile.purpose || profile.purpose === "unknown")
      add("consumer", "high", "Explain the transaction's purpose", "Record personal use, self-employment or business use and supporting facts.", "Case strategist", "act");
    else if (["commercial", "self-employment"].includes(profile.purpose))
      add("purpose", "high", "Review consumer status with counsel", "Business use and self-employment require fact-specific analysis; neither is automatically accepted or rejected here.", "Case strategist", "act");
    else supported.push("Personal-use purpose declared by consumer");
    if (["unknown", "invalid", "overdue", "urgent", "specialist"].includes(lim.status))
      add("limitation", ["overdue", "urgent", "invalid"].includes(lim.status) ? "urgent" : "high", "Resolve limitation", lim.text, "Case strategist", "act");
    if (!trim(profile.causeBasis))
      add("accrual", "high", "Support the cause-of-action date", "Link the date to the alleged breach or refusal. Repeated support emails do not automatically extend time.", "Evidence lead", "act");
    if (!forum.level || !trim(profile.territorialBasis) || !trim(profile.causeDistrict) || !trim(profile.causeState))
      add("forum", "high", "Confirm the forum and territory", "Record paid consideration, the appropriate route, cause state/district and the territorial basis.", "Case strategist", "jurisdiction");
    else supported.push("Forum inputs supplied for review");
    if (profile.sector === "education" || profile.sector === "legal")
      add("sector-maintainability", "high", "Obtain sector maintainability advice", sector.tip, "Sector specialist", "act");
    if (sector.expert && !reviewed.some(f => ["expert", "service", "survey"].includes(f.annotation.category)))
      add("expert", "review", "Assess the need for technical or expert evidence", sector.expert, "Sector specialist", "act");
    const categories = new Set(reviewed.map(f => f.annotation.category));
    sector.needs.forEach(category => { if (!categories.has(category)) add("evidence-" + category, "review", "Review " + CATEGORIES[category].toLowerCase(), "Supply a readable source, classify it and add its page or message location.", "Evidence lead", "portal"); });
    if (!profile.originalsRetained)
      add("originals", "high", "Keep the originals and a secure backup", "This prototype stores extracted text and metadata. It does not preserve the original uploaded files after reload.", "Evidence lead", "portal");
    const allegations = Array.isArray(profile.allegations) ? profile.allegations : [];
    if (!allegations.length) add("allegations", "high", "Create the first allegation", "State the promise, the specific failure, proof and likely defence.", "Drafting advocate", "act");
    allegations.forEach((claim, index) => {
      const linked = reviewed.filter(f => (claim.evidenceIds || []).includes(f.id));
      if (!trim(claim.promise) || !trim(claim.failure) || !linked.length)
        add("claim-" + claim.id, "high", "Substantiate allegation " + (index + 1), "A specific duty, breach and reviewed evidence must connect. An attachment count cannot establish merit.", "Drafting advocate", "act");
      else supported.push("Allegation " + (index + 1) + " linked to reviewed evidence");
      if (!trim(claim.defence) || !trim(claim.response))
        add("defence-" + claim.id, "review", "Prepare for the defence to allegation " + (index + 1), "Capture contrary facts, exclusions, misuse, delay or performance and a truthful evidence-backed response.", "Case strategist", "act");
    });
    const remedies = Array.isArray(profile.remedies) ? profile.remedies : [];
    const remedyLines = remedies.map((line, index) => {
      const value = amount(line.amount), linked = reviewed.filter(f => (line.evidenceIds || []).includes(f.id));
      const nonCash = line.type === "Replacement / repair";
      if ((!nonCash && value === null) || !trim(line.basis) || !linked.length)
        add("relief-" + line.id, "high", "Support relief line " + (index + 1), "Record a monetary amount when applicable, a calculation or reason and its evidence. The tribunal decides what is awarded.", "Resolution lead", "act");
      return { ...line, parsedAmount: nonCash ? null : value, evidenceNames: linked.map(f => f.name), supported: (nonCash || value !== null) && !!trim(line.basis) && linked.length > 0 };
    });
    if (!remedies.length) add("relief", "high", "Build a relief schedule", "Separate refund, proved expenses, compensation and costs. Record alternative remedies to avoid double recovery.", "Resolution lead", "act");
    const requested = Math.round(remedyLines.filter(l => l.parsedAmount !== null && l.mode !== "alternative").reduce((n, l) => n + l.parsedAmount, 0) * 100) / 100;
    const evidenceSupported = Math.round(remedyLines.filter(l => l.supported && l.parsedAmount !== null && l.mode !== "alternative").reduce((n, l) => n + l.parsedAmount, 0) * 100) / 100;
    const refund = remedyLines.filter(l => l.type === "Refund" && l.mode !== "alternative" && l.parsedAmount !== null).reduce((n, l) => n + l.parsedAmount, 0);
    const paid = amount(caseData.amount);
    if (paid !== null && refund > paid) add("refund-total", "high", "Reconcile the refund with consideration paid", "The cumulative refund exceeds recorded payment; explain it or correct the schedule.", "Resolution lead", "act");
    if (parseDate(caseData.purchaseDate) && parseDate(profile.causeDate) && caseData.purchaseDate > profile.causeDate)
      add("date-order", "review", "Reconcile the transaction chronology", "The alleged cause precedes the purchase date. Explain the chronology or correct the confirmed dates.", "Evidence lead", "portal");
    const differingAmounts = files.filter(f => amount(f.candidates?.amount) !== null && paid !== null && amount(f.candidates.amount) !== paid);
    if (differingAmounts.length) add("amount-conflict", "review", "Review different amounts in document extracts", differingAmounts.map(f => f.name).join(", ") + ": extracted amounts differ from paid consideration. They may be instalments or other amounts; confirm their meaning.", "Evidence lead", "portal");
    const checklist = profile.packet || {};
    ["index", "proforma", "synopsis", "parties", "complaint", "affidavit", "annexures", "pagination"].forEach(key => {
      if (checklist[key] !== true) add("packet-" + key, "review", "Confirm packet: " + key, "Complete and review this applicable filing item against the official portal's current requirements.", "Filing lead", "portal");
    });
    if (profile.represented && checklist.vakalatnama !== true)
      add("packet-vakalatnama", "review", "Confirm the advocate's authority document", "Obtain a reviewed, properly executed Vakalatnama when filing through an advocate.", "Filing lead", "portal");
    const priority = { urgent: 0, high: 1, review: 2 };
    gaps.sort((a, b) => priority[a.severity] - priority[b.severity]);
    return { gaps, supported, limitation: lim, forum, remedies: remedyLines, requested, evidenceSupported, reviewed: reviewed.length,
      totalEvidence: files.length, linkedClaims: allegations.filter(c => trim(c.promise) && trim(c.failure) && reviewed.some(f => (c.evidenceIds || []).includes(f.id))).length,
      allClaims: allegations.length, label: gaps.some(g => g.severity === "urgent") ? "Urgent legal review" : gaps.some(g => g.severity === "high") ? "Resolve key gaps" : "Ready to brief an advocate",
      rulesVersion: VERSION };
  }
  function relatedCases(cases, profile, caseData) {
    const text = (trim(caseData.facts) + " " + trim(caseData.product) + " " + trim(profile.researchQuery)).toLowerCase();
    const tokens = text.match(/[a-z]{4,}/g) || [];
    return cases.map(item => ({ ...item, matches: [...new Set([...(item.sectors.includes(profile.sector) ? ["Same sector"] : []),
      ...item.tags.filter(t => tokens.some(token => t.toLowerCase().includes(token)) || text.includes(t.toLowerCase()))])] }))
      .sort((a, b) => b.matches.length - a.matches.length);
  }
  function brief(caseData, profile, files, cases, now) {
    const report = evaluate(caseData, profile, files);
    const approvedCases = cases.filter(c => profile.caseReview?.[c.id]?.approved === true && trim(profile.caseReview[c.id].relevance) && trim(profile.caseReview[c.id].locator));
    const result = { title: "Consumer case advocate briefing pack", status: "Draft for human review", generatedAt: now || new Date().toISOString(),
      rulesVersion: VERSION, case: { ...caseData }, profile: { ...profile, snapshots: [] }, evidence: evidenceFor(files, profile).map(f => ({ id: f.id, name: f.name, status: f.status, annotation: f.annotation, reviewed: f.reviewed })),
      assessment: report, selectedAuthorities: approvedCases.map(c => ({ id: c.id, title: c.title, date: c.date, outcome: c.outcome, source: c.url,
        originalAct: c.act, locator: profile.caseReview[c.id].locator, relevance: profile.caseReview[c.id].relevance, verification: "User-attested review; advocate must re-check authority and later treatment" })),
      referenceSources: SOURCES, reviewScope: "The checks assess the recorded file. They do not estimate win probability or certify legal merit." };
    return JSON.parse(JSON.stringify(result));
  }
  return { VERSION, SOURCES, SECTORS, CATEGORIES, trim, amount, parseDate, anniversary, limitation, jurisdiction, safeUrl, sourceKind, evidenceFor, evaluate, relatedCases, brief };
});

