(function () {
  "use strict";
  const Core = window.ConsumerStrategy, Library = window.ConsumerStrategyData;
  if (!Core || !Library) return;
  const key = "cc-strategy-v1";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const h = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = value => "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"); };
  const uid = () => "s-" + (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  let storageError = "";
  function read(storageKey, fallback) {
    try { return window.ConsumerStore ? ConsumerStore.read(storageKey, fallback) : JSON.parse(localStorage.getItem(storageKey) || "null") ?? fallback; }
    catch (_) { storageError = "A saved record could not be read. Export accessible records before repairing browser storage."; return fallback; }
  }
  const defaults = () => ({ sector: "general", purpose: "unknown", route: "ordinary", causeDate: "", filingDate: today(), causeBasis: "", causeState: "",
    causeDistrict: "", territorialBasis: "", respondentRole: "", priorProceedings: "", originalsRetained: false, represented: false,
    clientGoal: "", clientBudget: "", settlementFloor: "", settlementOffer: "", settlementCosts: "", settlementTerms: "", communicationPreference: "Email",
    evidence: {}, allegations: [], remedies: [], chronology: [], packet: {}, caseReview: {}, tasks: {}, reviewRequests: [], outcomes: [], snapshots: [],
    operationNote: "", nextActionDate: "", complianceDate: "", complianceAmount: "", amountReceived: "", orderReference: "", updatedAt: "" });
  const raw = read(key, {});
  const state = Object.assign(defaults(), raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
  ["allegations", "remedies", "chronology", "reviewRequests", "outcomes", "snapshots"].forEach(name => { if (!Array.isArray(state[name])) state[name] = []; });
  ["evidence", "packet", "caseReview", "tasks"].forEach(name => { if (!state[name] || typeof state[name] !== "object" || Array.isArray(state[name])) state[name] = {}; });
  const caseData = () => { const value=window.ConsumerCaseIntake?.getCase() || read("cc-case-v2", {}); return value && typeof value==="object" && !Array.isArray(value) ? value : {}; };
  const files = () => { const list = window.ConsumerCaseIntake?.getFiles() || read("cc-file-index-v2", []); return Array.isArray(list) ? list : []; };
  const report = () => {
    const r = Core.evaluate(caseData(), state, files());
    if (window.ConsumerProduct && window.ConsumerStore) {
      const ops = window.ConsumerProductHub?.getOps() || ConsumerStore.read("cc-operations-v1", {});
      const extra = ConsumerProduct.operationalGaps(ops, state.represented);
      r.gaps.push(...extra);
      if (extra.length && r.label === "Ready to brief an advocate") r.label = "Resolve key gaps";
    }
    return r;
  };
  function message(text) { const toast = $("#toast"); if (toast) { toast.textContent = text; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); } }
  function save() {
    state.updatedAt = new Date().toISOString();
    try { if (window.ConsumerStore && !ConsumerStore.write(key, state)) throw new Error("Save failed"); if (!window.ConsumerStore) localStorage.setItem(key, JSON.stringify(state)); storageError = ""; return true; }
    catch (_) { storageError = "The browser could not save this change. Download the briefing pack to keep your work."; const status = $("#strategy-save-status"); if (status) status.textContent = storageError; message(storageError); return false; }
  }
  const field = (name, label, type = "text", options = null, wide = false) => `<label class="${wide ? "wide" : ""}">${h(label)}${options
    ? `<select data-strategy-field="${name}">${options.map(o => `<option value="${h(Array.isArray(o) ? o[0] : o)}" ${state[name] === (Array.isArray(o) ? o[0] : o) ? "selected" : ""}>${h(Array.isArray(o) ? o[1] : o)}</option>`).join("")}</select>`
    : type === "textarea" ? `<textarea data-strategy-field="${name}">${h(state[name])}</textarea>`
      : `<input type="${type}" data-strategy-field="${name}" value="${h(state[name])}" ${type === "number" ? 'min="0" step="0.01"' : ""} />`}</label>`;
  const check = (name, label) => `<label class="strategy-check"><input type="checkbox" data-strategy-field="${name}" ${state[name] ? "checked" : ""} />${h(label)}</label>`;
  const sourceLink = source => Core.SOURCES[source] ? `<a href="${Core.SOURCES[source].url}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : "";
  const optionsEvidence = selected => files().map(f => `<option value="${h(f.id)}" ${(selected || []).includes(f.id) ? "selected" : ""}>${h(f.name)}</option>`).join("");
  const host = $("#view-team");
  if (!host) return;
  host.classList.add("strategy-shell");
  const nav = $('[data-view="team"]');
  if (nav) { nav.setAttribute("aria-label", "Legal team and case strategy"); nav.lastChild.textContent = "Legal team & strategy"; nav.addEventListener("click", () => { const crumb = $("#crumb-title"); if (crumb) crumb.textContent = "Legal team & strategy"; }); }
  host.innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">Your case, prepared for review</div><h1>Legal team & case strategy</h1><p class="lede">Turn your story into a brief an advocate can work with: identify the gaps, connect each allegation to proof, and learn from actual judgments.</p></div><button class="btn primary" data-strategy-action="download-brief">Download advocate brief ↓</button></div>
    <div class="strategy-nav" role="tablist" aria-label="Case strategy workspace">
      ${[["assessment", "Case assessment"], ["evidence", "Evidence & claims"], ["research", "Real judgments"], ["team", "Client & advocate"], ["resolution", "Resolution & recovery"]].map(([id, title], i) => `<button id="strategy-tab-${id}" role="tab" aria-controls="strategy-pane-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-strategy-tab="${id}">${title}</button>`).join("")}
    </div>
    <section class="strategy-pane" id="strategy-pane-assessment" role="tabpanel" aria-labelledby="strategy-tab-assessment">
      <div id="strategy-assessment"></div>
      <div class="strategy-columns"><div><div class="card strategy-block"><h2>The legal starting point</h2><p class="muted tiny" style="margin-top:5px">Your confirmed intake supplies parties, purchase date and consideration. Record the additional facts needed for legal analysis.</p>
      <div class="strategy-fields">
        ${field("sector", "Dispute sector", "text", Object.entries(Core.SECTORS).map(([k, v]) => [k, v.label]))}
        ${field("purpose", "Purpose of purchase / service", "text", [["unknown", "Needs confirmation"], ["personal", "Personal / household use"], ["self-employment", "Livelihood through self-employment"], ["commercial", "Business / resale / investment"]])}
        ${field("route", "Proposed proceeding", "text", [["ordinary", "Ordinary consumer complaint"], ["unfair-contract", "Unfair-contract challenge"], ["appeal", "Appeal / revision"], ["execution", "Execution / compliance"]])}
        ${field("filingDate", "Proposed filing date", "date")}
        ${field("causeDate", "Date the cause of action arose", "date")}
        ${field("causeState", "State of cause of action")}
        ${field("causeDistrict", "District of cause of action")}
        ${field("territorialBasis", "Territorial basis", "text", [["", "Select and explain to counsel"], ["Consumer residence / work", "Consumer residence / work"], ["Cause arose here", "Cause arose here"], ["Opposite party location", "Opposite party location"], ["Other / requires permission", "Other / requires permission"]])}
        ${field("causeBasis", "Why this is the cause-of-action date — source and page", "textarea", null, true)}
        ${field("respondentRole", "Why each named opposite party is responsible", "textarea", null, true)}
        ${field("priorProceedings", "Prior complaint, settlement, RERA, ombudsman or court proceedings", "textarea", null, true)}
      </div><div id="strategy-date-forum"></div><div class="strategy-actions"><button class="btn soft" data-strategy-action="assess">Refresh assessment</button><button class="btn ghost" data-strategy-action="intake">Go to confirmed intake</button></div></div>
      <div class="card strategy-block"><h2>Filing packet review</h2><p class="muted tiny" style="margin-top:5px">Confirm completed work against the live portal requirements. Ticking a box records your review.</p><div id="strategy-packet"></div>
      ${check("represented", "I am filing through an advocate")}<div id="strategy-vakalatnama"></div>
      <p class="strategy-note">Official guide: index, proforma, synopsis, memo, complaint/affidavit and applicable Vakalatnama or applications. Confirm applicability, signing, notarisation and final pagination on e-Jagriti.</p>
      ${sourceLink("portal")}</div></div><div class="card strategy-block"><div class="strategy-row-actions"><h2>Next actions</h2><span class="tag amber" id="strategy-gap-count"></span></div><div id="strategy-gaps"></div></div></div>
    </section>
    <section class="strategy-pane" id="strategy-pane-evidence" role="tabpanel" aria-labelledby="strategy-tab-evidence" hidden>
      <div class="card strategy-block"><div class="strategy-row-actions"><div><h2>Review the actual evidence</h2><p class="muted tiny" style="margin-top:5px">Classify each attachment and record its page, message or timestamp before marking it reviewed.</p></div><button class="btn soft" data-strategy-action="intake">Upload evidence</button></div>
        ${check("originalsRetained", "I retain the original documents and a secure backup")}
        <div id="strategy-evidence"></div><div class="strategy-note">The local prototype retains extracted text and metadata. Keep original PDFs, emails, bills and images yourself; reattach an original if you need to inspect it again.</div>
      </div>
      <div class="card strategy-block"><div class="strategy-row-actions"><div><h2>Allegations and likely defences</h2><p class="muted tiny" style="margin-top:5px">Be specific about what was promised, what failed, the proof and the opposing explanation.</p></div><button class="btn primary" data-strategy-action="add-allegation">＋ Add allegation</button></div><div id="strategy-allegations"></div></div>
      <div class="card strategy-block"><div class="strategy-row-actions"><h2>Chronology with source locations</h2><button class="btn soft" data-strategy-action="add-event">＋ Add event</button></div><div id="strategy-chronology"></div></div>
      <div class="card strategy-block"><div class="strategy-row-actions"><div><h2>Requested relief, with a calculation</h2><p class="muted tiny" style="margin-top:5px">Separate refund, expenses, compensation, interest and costs. Record replacements or repairs as alternatives to a refund.</p></div><button class="btn primary" data-strategy-action="add-remedy">＋ Add relief</button></div><div id="strategy-relief-totals"></div><div id="strategy-remedies"></div></div>
    </section>
    <section class="strategy-pane" id="strategy-pane-research" role="tabpanel" aria-labelledby="strategy-tab-research" hidden>
      <div class="card strategy-block"><h2>What the courts actually decided</h2><p class="muted" style="font-size:12px;margin-top:8px">A curated set of ${Library.cases.length} Supreme Court judgments includes complaints that failed, relief that survived, and procedural decisions that sent matters back for hearing. Issue matches help research; they do not predict your result.</p>
        <div class="strategy-toolbar"><label>Search issue, fact or case name<input id="strategy-case-query" type="search" placeholder="limitation, insurance, housing, defect…" /></label><label>Outcome<select id="strategy-case-outcome"><option value="">All outcomes</option><option value="relief">Relief upheld / modified</option><option value="dismissal">Complaint dismissed / relief set aside</option><option value="remand">Remand / maintainability decision</option></select></label></div>
        <div id="strategy-cases"></div><div class="strategy-note">The library is a small research sample, not a dataset of all consumer outcomes. Decisions under the 1986 Act need a current-law and later-treatment check before use in a 2019 Act case.</div>
      </div><div class="card strategy-block"><h2>Rules and official guides</h2><div id="strategy-sources"></div></div>
    </section>
    <section class="strategy-pane" id="strategy-pane-team" role="tabpanel" aria-labelledby="strategy-tab-team" hidden>
      <div class="card strategy-block"><h2>Client instructions</h2><div class="strategy-fields">
        ${field("clientGoal", "Your preferred result and acceptable alternatives", "textarea", null, true)}
        ${field("clientBudget", "Budget available for the next stage (₹)", "number")}
        ${field("communicationPreference", "Preferred update method", "text", ["Email", "Phone", "WhatsApp", "In-person"])}
      </div><div class="strategy-needs"><div><strong>What the client needs</strong>Understand the options, the cost, the next action, weaknesses in the case and who makes each decision.</div><div><strong>What the advocate needs</strong>Confirmed parties, adverse facts, source locations, chronology, a remedy calculation, relevant authorities and clear instructions.</div></div></div>
      <div class="card strategy-block"><h2>The team and its deliverables</h2><p class="muted tiny" style="margin-top:5px">Functional roles for your matter. No law firm or advocate has been retained by this app.</p><div class="team-grid" id="strategy-team-roles" style="margin-top:16px"></div></div>
      <div class="card strategy-block"><div class="strategy-row-actions"><h2>Review work queue</h2><button class="btn soft" data-strategy-action="download-json">Export structured brief</button></div><div class="strategy-fields"><label>Reviewer / advocate's name<input id="strategy-reviewer" placeholder="Leave blank until you know who will review" /></label><label>Scope of request<select id="strategy-review-scope"><option>Forum and limitation</option><option>Evidence and allegations</option><option>Draft complaint and filing packet</option><option>Settlement and order compliance</option><option>Full matter assessment</option></select></label><label>Due date<input type="date" id="strategy-review-due" /></label><label>Question to resolve<input id="strategy-review-question" placeholder="What decision do you need?" /></label></div><button class="btn primary" data-strategy-action="add-review" style="margin-top:14px">Save review task</button><div id="strategy-review-queue"></div></div>
      <div class="card strategy-block"><h2>What informed this workflow</h2><p class="muted tiny" style="margin-top:5px">Public descriptions from established Indian dispute practices. Most serve corporate clients; the consumer workflow is our adaptation of their stated practices.</p><div id="strategy-firms"></div></div>
      <div class="card strategy-block"><div class="strategy-row-actions"><h2>Briefing versions</h2><button class="btn soft" data-strategy-action="snapshot">Save briefing snapshot</button></div><div id="strategy-snapshots"></div></div>
    </section>
    <section class="strategy-pane" id="strategy-pane-resolution" role="tabpanel" aria-labelledby="strategy-tab-resolution" hidden>
      <div class="strategy-columns"><div><div class="card strategy-block"><h2>Compare an actual settlement offer</h2><div class="strategy-fields">
        ${field("settlementOffer", "Offer received (₹)", "number")}${field("settlementFloor", "Your minimum acceptable cash amount (₹)", "number")}
        ${field("settlementCosts", "Known cost of the next stage (₹)", "number")}${field("settlementTerms", "Payment date, return logistics, release and other terms", "textarea", null, true)}
      </div><div id="strategy-settlement"></div><div class="strategy-note">For a suitable pre-litigation grievance, you can consider <a href="${Core.SOURCES.nch.url}" target="_blank" rel="noopener noreferrer">National Consumer Helpline</a>. Check limitation before spending further time on escalation. Court mediation has exclusions and requires applicable consent and referral.</div></div>
      <div class="card strategy-block"><h2>After the order: track actual recovery</h2><div class="strategy-fields">
        ${field("orderReference", "Order / case reference")}${field("complianceDate", "Compliance date stated in the order", "date")}
        ${field("complianceAmount", "Cash amount directed by the order (₹)", "number")}${field("amountReceived", "Cash actually received (₹)", "number")}
        ${field("operationNote", "Compliance evidence, stay, appeal or next action", "textarea", null, true)}
        ${field("nextActionDate", "Next advocate follow-up date", "date")}
      </div><div id="strategy-recovery"></div></div></div><div class="card strategy-block"><h2>Learn from a recorded outcome</h2><p class="muted tiny" style="margin-top:5px">Record the reason and source. Saving a URL does not verify a judgment.</p><div class="strategy-fields">
        <label>Outcome<select id="strategy-outcome-type"><option>Allowed</option><option>Partly allowed</option><option>Dismissed</option><option>Remanded / restored</option><option>Settled</option><option>Withdrawn</option></select></label><label>Decision date<input id="strategy-outcome-date" type="date" /></label>
        <label class="wide">Source URL<input type="url" id="strategy-outcome-url" /></label><label class="wide">Decisive reason and paragraph / page<textarea id="strategy-outcome-reason"></textarea></label>
      </div><button class="btn soft" data-strategy-action="add-outcome" style="margin-top:14px">Save source for review</button><div id="strategy-outcomes"></div></div></div>
    </section><p class="saved-status" id="strategy-save-status" aria-live="polite"></p>`;

  function renderAssessment() {
    const r = report();
    $("#strategy-assessment").innerHTML = `<div class="strategy-hero"><div><div class="eyebrow">Current file assessment</div><h2>${h(r.label)}</h2><p>Strengthen the record before deciding how to proceed. The assessment reflects supplied facts and reviewed evidence; it cannot guarantee a win.</p><button class="btn" data-strategy-tab="evidence">Work on evidence →</button></div><div class="strategy-metrics"><div class="strategy-metric"><strong>${r.linkedClaims}/${r.allClaims}</strong><small>Allegations linked to reviewed proof</small></div><div class="strategy-metric"><strong>${r.reviewed}/${r.totalEvidence}</strong><small>Attachments reviewed with locations</small></div><div class="strategy-metric"><strong>${r.gaps.filter(g => g.severity !== "review").length}</strong><small>Key legal or factual gaps</small></div><div class="strategy-metric"><strong>${money(r.requested)}</strong><small>Requested monetary relief</small></div></div></div>`;
    $("#strategy-date-forum").innerHTML = `<div class="strategy-note ${r.limitation.status === "overdue" || r.limitation.status === "urgent" ? "urgent" : ""}"><strong>Limitation review:</strong> ${h(r.limitation.text)}${r.limitation.anniversary ? "<br>Two-year calendar marker: " + h(r.limitation.anniversary) + " • This marker is for triage; accrual, computation and exceptions require legal review." : ""} ${sourceLink("act")}</div><div class="strategy-note"><strong>Indicative commission:</strong> ${h(r.forum.text)} ${sourceLink("jurisdiction")}</div>${Core.SECTORS[state.sector]?.tip ? `<div class="strategy-note">${h(Core.SECTORS[state.sector].tip)}</div>` : ""}`;
    $("#strategy-gap-count").textContent = r.gaps.length + " open checks";
    $("#strategy-gaps").innerHTML = r.gaps.length ? r.gaps.map(g => `<div class="strategy-task ${g.severity}"><i></i><div><h3>${h(g.title)}</h3><p>${h(g.detail)}</p><div class="meta"><span>${h(g.owner)}</span><span>• ${h(g.severity)}</span>${sourceLink(g.source)}</div></div></div>`).join("") : '<p class="strategy-empty">Recorded checks are complete. Obtain final factual and legal review.</p>';
    const packetLabels = { index: "Index", proforma: "Applicable complaint proforma", synopsis: "Synopsis / list of dates", parties: "Memo of parties", complaint: "Complaint", affidavit: "Applicable signed / notarised affidavit", annexures: "Readable, titled annexures", pagination: "Matching page numbers" };
    $("#strategy-packet").innerHTML = Object.entries(packetLabels).map(([name, label]) => `<label class="strategy-check"><input type="checkbox" data-strategy-packet="${name}" ${state.packet[name] ? "checked" : ""} />${h(label)}</label>`).join("");
    $("#strategy-vakalatnama").innerHTML = state.represented ? `<label class="strategy-check"><input type="checkbox" data-strategy-packet="vakalatnama" ${state.packet.vakalatnama ? "checked" : ""} />Applicable executed Vakalatnama</label>` : "";
    $("#strategy-relief-totals").innerHTML = `<div class="strategy-total"><div><small>Recorded consideration paid</small><strong>${Core.amount(caseData().amount) === null ? "Unconfirmed" : money(Core.amount(caseData().amount))}</strong></div><div><small>Requested cash • excluding alternatives</small><strong>${money(r.requested)}</strong></div><div><small>Cash linked to reviewed evidence</small><strong>${money(r.evidenceSupported)}</strong></div></div><p class="muted tiny">Evidence linkage supports review; it does not establish entitlement. Alternative relief is excluded from totals.</p>`;
  }
  function renderEvidence() {
    const list = Core.evidenceFor(files(), state);
    $("#strategy-evidence").innerHTML = list.length ? list.map(f => `<details><summary><span>${h(f.name)}</span><span class="tag ${f.reviewed ? "green" : "amber"}">${f.reviewed ? "Reviewed source" : "Review needed"}</span></summary><div class="strategy-detail"><div class="strategy-fields">
      <label>Document role<select data-evidence-id="${h(f.id)}" data-evidence-field="category"><option value="">Unclassified</option>${Object.entries(Core.CATEGORIES).map(([k, label]) => `<option value="${k}" ${f.annotation.category === k ? "selected" : ""}>${h(label)}</option>`).join("")}</select></label>
      <label>Page, message or timestamp<input data-evidence-id="${h(f.id)}" data-evidence-field="locator" value="${h(f.annotation.locator)}" placeholder="Page 2, email dated…, 00:12…" /></label>
      <label class="wide">What does this prove? Include any contrary fact<textarea data-evidence-id="${h(f.id)}" data-evidence-field="note">${h(f.annotation.note)}</textarea></label></div>
      <label class="strategy-check"><input type="checkbox" data-evidence-id="${h(f.id)}" data-evidence-field="reviewed" ${f.annotation.reviewed ? "checked" : ""} />I checked this against the original</label>
      ${f.text ? `<details style="margin-top:12px"><summary>Inspect extracted text</summary><pre class="strategy-file-text">${h(f.text.slice(0, 12000))}${f.text.length > 12000 ? "\n…preview truncated" : ""}</pre></details>` : '<p class="strategy-note">No extracted text is available. Inspect your original before marking this source reviewed.</p>'}
      </div></details>`).join("") : '<p class="strategy-empty">Upload bills, emails, screenshots or agreements through Case intake, then review them here.</p>';
  }
  function renderAllegations() {
    $("#strategy-allegations").innerHTML = state.allegations.length ? state.allegations.map((a, i) => `<details open><summary><span>Allegation ${i + 1} • ${h(a.title || "Describe the failure")}</span></summary><div class="strategy-detail"><div class="strategy-fields">
      ${["title", "promise", "failure", "defence", "response"].map(name => `<label class="${["failure", "response"].includes(name) ? "wide" : ""}">${({title:"Short title",promise:"Promise / duty and its source",failure:"Specific breach or deficiency",defence:"Likely defence / contrary fact",response:"Truthful response, proof and remaining uncertainty"})[name]}<textarea data-record="allegations" data-record-id="${h(a.id)}" data-record-field="${name}">${h(a[name])}</textarea></label>`).join("")}
      <label class="wide">Link supporting attachments • Ctrl/Cmd selects multiple<select multiple data-record="allegations" data-record-id="${h(a.id)}" data-record-field="evidenceIds">${optionsEvidence(a.evidenceIds)}</select></label></div>
      <div class="strategy-actions"><button class="btn ghost" data-strategy-action="remove-allegation" data-record-id="${h(a.id)}">Remove this draft allegation</button></div></div></details>`).join("") : '<p class="strategy-empty">Add an allegation to start the promise → failure → proof → response chain.</p>';
  }
  function renderChronology() {
    $("#strategy-chronology").innerHTML = state.chronology.map((e, i) => `<details open><summary>Event ${i + 1}</summary><div class="strategy-detail"><div class="strategy-fields">
      <label>Date<input type="date" data-record="chronology" data-record-id="${h(e.id)}" data-record-field="date" value="${h(e.date)}" /></label>
      <label>Source / page<input data-record="chronology" data-record-id="${h(e.id)}" data-record-field="source" value="${h(e.source)}" /></label>
      <label class="wide">What happened?<textarea data-record="chronology" data-record-id="${h(e.id)}" data-record-field="event">${h(e.event)}</textarea></label></div>
      <button class="btn ghost" data-strategy-action="remove-event" data-record-id="${h(e.id)}" style="margin-top:12px">Remove draft event</button></div></details>`).join("") || '<p class="strategy-empty">Add purchase, breach, complaint, reply and loss events with their sources.</p>';
  }
  function renderRemedies() {
    $("#strategy-remedies").innerHTML = state.remedies.map((r, i) => `<details open><summary>Relief ${i + 1} • ${h(r.type)}</summary><div class="strategy-detail"><div class="strategy-fields">
      <label>Remedy<select data-record="remedies" data-record-id="${h(r.id)}" data-record-field="type">${["Refund","Expenses","Compensation","Costs","Interest","Replacement / repair"].map(t => `<option ${r.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label>Amount requested (₹)<input type="number" min="0" step="0.01" data-record="remedies" data-record-id="${h(r.id)}" data-record-field="amount" value="${h(r.amount)}" /></label>
      <label>Relationship to other relief<select data-record="remedies" data-record-id="${h(r.id)}" data-record-field="mode"><option value="additional" ${r.mode !== "alternative" ? "selected" : ""}>Additional cash request</option><option value="alternative" ${r.mode === "alternative" ? "selected" : ""}>Alternative • excluded from total</option></select></label>
      <label>Calculation / basis<textarea data-record="remedies" data-record-id="${h(r.id)}" data-record-field="basis">${h(r.basis)}</textarea></label>
      <label class="wide">Evidence for amount / remedy<select multiple data-record="remedies" data-record-id="${h(r.id)}" data-record-field="evidenceIds">${optionsEvidence(r.evidenceIds)}</select></label></div>
      <button class="btn ghost" data-strategy-action="remove-remedy" data-record-id="${h(r.id)}" style="margin-top:12px">Remove draft relief</button></div></details>`).join("") || '<p class="strategy-empty">Add the refund, documented expenses or other relief you seek. No amount is assumed.</p>';
  }
  function renderCases() {
    const query = ($("#strategy-case-query")?.value || "").toLowerCase(), outcome = $("#strategy-case-outcome")?.value;
    const list = Core.relatedCases(Library.cases, { ...state, researchQuery: query }, caseData())
      .filter(c => (!outcome || c.outcomeType === outcome) && (!query || (c.title + " " + c.tags.join(" ") + " " + c.reason + " " + c.facts).toLowerCase().includes(query)));
    $("#strategy-cases").innerHTML = list.map(c => { const review = state.caseReview[c.id] || {}; return `<article class="strategy-case"><h3>${h(c.title)}</h3><div class="case-meta"><span>${h(c.date)}</span><span>• Supreme Court</span><span>• ${h(c.act)}</span><span class="tag ${c.outcomeType === "dismissal" ? "amber" : "blue"}">${h(c.outcome)}</span></div>
      ${c.matches.length ? `<span class="rule-pill">Research cues: ${h(c.matches.join(", "))}</span>` : ""}
      <p><strong>Facts:</strong> ${h(c.facts)}</p><div class="case-rule"><strong>Reason for the result:</strong> ${h(c.reason)}</div>
      <div class="case-rule distinguish"><strong>What must be compared:</strong> ${h(c.distinguish)}</div><p><strong>File preparation lesson:</strong> ${h(c.lesson)}</p>
      <p><a href="${Core.safeUrl(c.url)}" target="_blank" rel="noopener noreferrer">Read official judgment ↗</a> • ${h(c.locator)} • Source checked ${h(Library.researchedOn)}; later treatment needs review.</p>
      <details style="margin-top:12px"><summary>Review for the advocate brief</summary><div class="strategy-detail"><div class="strategy-fields"><label>Paragraph / page checked<input data-case-id="${h(c.id)}" data-case-field="locator" value="${h(review.locator)}" placeholder="Paragraph 12…" /></label>
      <label>Why does it apply, and what differs?<textarea data-case-id="${h(c.id)}" data-case-field="relevance">${h(review.relevance)}</textarea></label></div>
      <label class="strategy-check"><input type="checkbox" data-case-id="${h(c.id)}" data-case-field="approved" ${review.approved ? "checked" : ""} />I read the cited passage and want counsel to assess it</label>
      <p class="muted tiny" style="margin-top:9px">Only selections with both a locator and an explanation enter the briefing authorities. This records your review, not counsel's approval.</p></div></details></article>`; }).join("") || '<p class="strategy-empty">No judgment matches this filter. Try another issue or open the official e-Jagriti judgment search.</p>';
  }
  function renderTeam() {
    $("#strategy-team-roles").innerHTML = Library.roles.map((r, i) => `<div class="card team-card"><div class="team-icon">${String(i + 1).padStart(2, "0")}</div><strong>${h(r.title)}</strong><p>${h(r.deliverable)}</p><small>Decision owner: ${h(r.approval)}</small></div>`).join("");
    $("#strategy-firms").innerHTML = Library.firms.map(f => `<div class="strategy-source"><div><strong>${h(f.name)}</strong><small>Stated practice: ${h(f.practice)}</small><small>Product adaptation: ${h(f.adaptation)}</small></div><a href="${Core.safeUrl(f.url)}" target="_blank" rel="noopener noreferrer">Public source ↗</a></div>`).join("");
    $("#strategy-review-queue").innerHTML = state.reviewRequests.map(r => `<div class="strategy-log"><strong>${h(r.scope)}</strong> • ${h(r.reviewer || "Reviewer unassigned")}<div class="muted" style="margin-top:4px">Due ${h(r.due || "not set")} • ${h(r.question)}</div><label class="strategy-check"><input type="checkbox" data-record="reviewRequests" data-record-id="${h(r.id)}" data-record-field="completed" ${r.completed ? "checked" : ""} />Task marked complete by me</label></div>`).join("") || '<p class="strategy-empty">Save a task when a review question is ready. No request is sent or assigned automatically.</p>';
    $("#strategy-snapshots").innerHTML = state.snapshots.map((s, i) => `<div class="strategy-log"><div class="strategy-row-actions"><div><strong>Brief ${i + 1}</strong> • ${h(s.createdAt)}<div class="muted">${s.brief.assessment.gaps.length} checks • ${s.brief.evidence.length} evidence records</div></div><button class="btn ghost" data-strategy-action="download-snapshot" data-record-id="${h(s.id)}">Download</button></div></div>`).join("") || '<p class="strategy-empty">A snapshot preserves the facts, evidence annotations, assessment and selected authorities at that point in time.</p>';
  }
  function renderResolution() {
    const offer = Core.amount(state.settlementOffer), floor = Core.amount(state.settlementFloor), cost = Core.amount(state.settlementCosts);
    $("#strategy-settlement").innerHTML = offer === null ? '<p class="strategy-note">Enter an offer to compare it with your client instructions and known next-stage costs.</p>' : `<div class="strategy-note"><strong>Offer: ${money(offer)}</strong>${floor !== null ? "<br>" + (offer >= floor ? "Meets" : "Falls below") + " your recorded cash minimum by " + money(Math.abs(offer - floor)) + "." : ""}${cost !== null ? "<br>Known next-stage cost: " + money(cost) + "." : ""}<br>Compare timing, certainty of payment and non-cash terms with counsel. No expected litigation recovery is assumed.</div>`;
    const ordered = Core.amount(state.complianceAmount), received = Core.amount(state.amountReceived), date = Core.parseDate(state.complianceDate);
    $("#strategy-recovery").innerHTML = `<div class="strategy-note ${date && state.complianceDate < today() && ordered !== null && ordered > (received || 0) ? "urgent" : ""}">${ordered !== null ? "<strong>Outstanding cash: " + money(Math.max(0, ordered - (received || 0))) + "</strong>" : "Record the order amount and compliance date."}${date && state.complianceDate < today() ? "<br>The recorded compliance date has passed; check payment, any appeal or stay and discuss execution with counsel." : ""}<br>Cash is only one part of compliance. Confirm any repair, possession, document or other direction too. ${sourceLink("act")}</div>`;
    $("#strategy-outcomes").innerHTML = state.outcomes.map(o => `<div class="strategy-outcome" style="margin-top:12px"><strong>${h(o.result)}</strong> • ${h(o.date || "Date unconfirmed")}<p>${h(o.reason)}</p><p><a href="${Core.safeUrl(o.url)}" target="_blank" rel="noopener noreferrer">Read source ↗</a> • ${h(Core.sourceKind(o.url))}</p></div>`).join("");
  }
  function refresh() {
    renderAssessment(); renderEvidence(); renderAllegations(); renderChronology(); renderRemedies(); renderCases(); renderTeam(); renderResolution();
    $("#strategy-sources").innerHTML = Object.values(Core.SOURCES).map(s => `<div class="strategy-source"><div><strong>${h(s.title)}</strong><small>${h(s.locator)}</small></div><a href="${s.url}" target="_blank" rel="noopener noreferrer">Official source ↗</a></div>`).join("");
    $("#strategy-save-status").textContent = storageError || (state.updatedAt ? "Last saved in this browser: " + new Date(state.updatedAt).toLocaleString("en-IN") : "Your changes save in this browser. Download the brief to retain a copy.");
  }
  function openTab(name, focus) {
    $$("[data-strategy-tab]", host).filter(b => b.getAttribute("role") === "tab").forEach(b => { const selected = b.dataset.strategyTab === name; b.setAttribute("aria-selected", String(selected)); b.tabIndex = selected ? 0 : -1; if (selected && focus) b.focus(); });
    $$(".strategy-pane", host).forEach(p => { p.hidden = p.id !== "strategy-pane-" + name; });
    refresh();
  }
  function getBrief() {
    const b = Core.brief(caseData(), state, files(), Library.cases);
    b.assessment = report();
    if (window.ConsumerProductHub) b.operations = ConsumerProductHub.getOps();
    return b;
  }
  function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  function briefHtml(b) {
    const section = (title, content) => "<h2>" + h(title) + "</h2>" + content;
    const paragraph = content => "<p>" + h(content || "[Needs confirmation]") + "</p>";
    const list = items => "<ol>" + items.map(x => "<li>" + h(x) + "</li>").join("") + "</ol>";
    return '<!doctype html><html><head><meta charset="utf-8"><title>Advocate briefing pack</title><style>body{font:14px/1.6 Georgia,serif;max-width:850px;margin:40px auto}h1{font-size:25px}h2{font-size:18px;border-bottom:1px solid #bbb;padding-bottom:5px;margin-top:28px}p,li{white-space:pre-wrap}small{font:11px Arial,sans-serif}td,th{border:1px solid #ccc;padding:7px;text-align:left}table{border-collapse:collapse;width:100%}</style></head><body><h1>Consumer case advocate briefing pack</h1><small>DRAFT FOR HUMAN REVIEW • ' + h(b.generatedAt) + " • Rules " + h(b.rulesVersion) + "</small>"
      + section("Client instructions", paragraph(b.profile.clientGoal) + paragraph("Budget: " + (Core.amount(b.profile.clientBudget) === null ? "unconfirmed" : money(Core.amount(b.profile.clientBudget))) + " • Preferred update: " + b.profile.communicationPreference))
      + (b.operations ? section("Engagement and additional client instructions", paragraph("User-recorded engagement, not authenticated or independently verified.\nAdvocate: " + (b.operations.engagement.advocateName || "[not appointed]") + "\nEnrollment details: " + (b.operations.engagement.enrollment || "[confirm]") + "\nScope: " + (b.operations.engagement.scope || "[confirm]") + "\nFee terms: " + (b.operations.engagement.feeTerms || "[confirm]")) + paragraph(b.operations.writtenInstructions) + list((b.operations.parties || []).map(p => p.role + ": " + (p.name || "[confirm]") + "\nAddress: " + p.address + "\nJoinder reason: " + p.reason)) + paragraph("Separate costs (blank means unknown): " + Object.entries(b.operations.costs || {}).map(([key,value]) => key + ": " + (value || "[not confirmed]")).join("; ") + "\nOfficial fee source: " + (b.operations.feeSource || "[confirm current official fee]") + "\nScope / refund terms: " + (b.operations.refundTerms || "[confirm]"))) : "")
      + section("Parties and transaction", paragraph("Consumer: " + (b.case.consumerName || "[confirm]") + "\n" + (b.case.consumerAddress || "")) + paragraph("Opposite party: " + (b.case.oppositeName || "[confirm]") + "\n" + (b.case.oppositeAddress || "")) + paragraph("Product / service: " + (b.case.product || "[confirm]") + " • Purchase date: " + (b.case.purchaseDate || "[confirm]") + " • Consideration paid: " + (b.case.amount || "[confirm]")))
      + section("Consumer status, forum and limitation", paragraph("Purpose: " + b.profile.purpose + "\nRespondent role: " + b.profile.respondentRole) + paragraph(b.assessment.forum.text) + paragraph("Territory: " + b.profile.territorialBasis + " • " + b.profile.causeDistrict + ", " + b.profile.causeState) + paragraph("Cause-of-action date: " + (b.profile.causeDate || "[confirm]") + "\nBasis: " + b.profile.causeBasis + "\n" + b.assessment.limitation.text))
      + section("Confirmed intake facts", paragraph(b.case.facts)) + section("Chronology", list(b.profile.chronology.slice().sort((a, c) => String(a.date).localeCompare(String(c.date))).map(e => e.date + " • " + e.event + " • " + e.source)))
      + section("Allegations and anticipated defences", b.profile.allegations.map((a, i) => "<h3>" + (i + 1) + ". " + h(a.title) + "</h3>" + paragraph("Promise: " + a.promise + "\nFailure: " + a.failure + "\nEvidence: " + b.evidence.filter(e => (a.evidenceIds || []).includes(e.id)).map(e => e.name + " (" + (e.annotation.locator || "locator missing") + ")").join(", ") + "\nLikely defence: " + a.defence + "\nResponse / uncertainty: " + a.response)).join(""))
      + section("Evidence inventory", list(b.evidence.map(e => e.name + " • " + (Core.CATEGORIES[e.annotation.category] || "unclassified") + " • " + (e.annotation.locator || "locator missing") + " • " + (e.reviewed ? "user-reviewed" : "review pending") + "\n" + (e.annotation.note || ""))))
      + section("Relief schedule", list(b.assessment.remedies.map(r => r.type + " • " + (r.type === "Replacement / repair" ? "non-cash relief" : r.parsedAmount === null ? "amount unconfirmed" : money(r.parsedAmount)) + " • " + (r.mode === "alternative" ? "alternative" : "additional") + "\nBasis: " + r.basis + "\nEvidence: " + r.evidenceNames.join(", "))) + paragraph("Requested cash excluding alternatives: " + money(b.assessment.requested) + ". Evidence-linked cash: " + money(b.assessment.evidenceSupported) + ". Neither is an estimate of the award."))
      + section("Open questions for counsel", list(b.assessment.gaps.map(g => g.severity.toUpperCase() + ": " + g.title + " — " + g.detail + " • " + g.owner)))
      + section("Selected authorities for counsel to verify", b.selectedAuthorities.length ? b.selectedAuthorities.map(a => "<h3>" + h(a.title) + "</h3>" + paragraph(a.date + " • " + a.originalAct + " • " + a.outcome + "\nPassage: " + a.locator + "\nApplication / distinction: " + a.relevance) + '<p><a href="' + h(Core.safeUrl(a.source)) + '">' + h(a.source) + "</a></p>" + paragraph(a.verification)).join("") : paragraph("No authority has been selected with a passage and relevance explanation."))
      + section("Prior proceedings and recovery plan", paragraph(b.profile.priorProceedings) + paragraph("Settlement terms: " + b.profile.settlementTerms + "\nOrder: " + b.profile.orderReference + "\nCompliance date: " + b.profile.complianceDate + "\nNext follow-up: " + b.profile.nextActionDate + "\n" + b.profile.operationNote))
      + section("Official filing references", Object.values(Core.SOURCES).map(s => '<p><a href="' + s.url + '">' + h(s.title) + "</a> • " + h(s.locator) + "</p>").join("")) + paragraph(b.reviewScope) + "</body></html>";
  }
  function mutateInput(target) {
    const value = target.type === "checkbox" ? target.checked : target.multiple ? Array.from(target.selectedOptions).map(o => o.value) : target.value;
    if (target.dataset.strategyField) state[target.dataset.strategyField] = value;
    else if (target.dataset.strategyPacket) state.packet[target.dataset.strategyPacket] = value;
    else if (target.dataset.evidenceId) {
      const id = target.dataset.evidenceId; state.evidence[id] ||= {};
      if (target.dataset.evidenceField === "reviewed" && value && !Core.trim(state.evidence[id].locator)) { target.checked = false; message("Record a page or message location before marking the document reviewed."); return; }
      state.evidence[id][target.dataset.evidenceField] = value;
    } else if (target.dataset.record) {
      const record = state[target.dataset.record]?.find(r => r.id === target.dataset.recordId);
      if (record) record[target.dataset.recordField] = value;
    } else if (target.dataset.caseId) {
      const id = target.dataset.caseId; state.caseReview[id] ||= {};
      if (target.dataset.caseField === "approved" && value && (!Core.trim(state.caseReview[id].locator) || !Core.trim(state.caseReview[id].relevance))) { target.checked = false; message("Add the passage and relevance explanation before selecting this authority."); return; }
      state.caseReview[id][target.dataset.caseField] = value;
    } else return;
    save();
    renderAssessment(); renderResolution();
    $("#strategy-save-status").textContent = storageError || "Saved in this browser • " + new Date().toLocaleTimeString("en-IN");
  }
  host.addEventListener("input", event => { if (event.target.id === "strategy-case-query") renderCases(); else if (!["checkbox", "select-one", "select-multiple"].includes(event.target.type)) mutateInput(event.target); });
  host.addEventListener("change", event => {
    if (event.target.id === "strategy-case-outcome") { renderCases(); return; }
    if (["checkbox", "select-one", "select-multiple"].includes(event.target.type)) mutateInput(event.target);
  });
  host.addEventListener("keydown", event => {
    if (event.target.getAttribute("role") !== "tab" || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = $$('.strategy-nav [role="tab"]', host), index = tabs.indexOf(event.target);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault(); openTab(tabs[next].dataset.strategyTab, true);
  });
  host.addEventListener("click", event => {
    const tab = event.target.closest("[data-strategy-tab]"); if (tab) { openTab(tab.dataset.strategyTab, false); return; }
    const button = event.target.closest("[data-strategy-action]"); if (!button) return;
    const action = button.dataset.strategyAction;
    if (action === "intake") { $('[data-view="intake"]')?.click(); return; }
    if (action === "assess") { refresh(); message("Assessment refreshed from your current intake and evidence."); return; }
    if (action === "add-allegation") state.allegations.push({ id: uid(), title: "", promise: "", failure: "", defence: "", response: "", evidenceIds: [] });
    if (action === "add-remedy") state.remedies.push({ id: uid(), type: "Refund", amount: "", basis: "", mode: "additional", evidenceIds: [] });
    if (action === "add-event") state.chronology.push({ id: uid(), date: "", event: "", source: "" });
    const removals = { "remove-allegation": "allegations", "remove-remedy": "remedies", "remove-event": "chronology" };
    if (removals[action]) state[removals[action]] = state[removals[action]].filter(r => r.id !== button.dataset.recordId);
    if (action === "add-review") {
      const question = $("#strategy-review-question").value.trim();
      if (!question) { message("Add the question you want the reviewer to resolve."); return; }
      state.reviewRequests.push({ id: uid(), reviewer: $("#strategy-reviewer").value.trim(), scope: $("#strategy-review-scope").value, due: $("#strategy-review-due").value, question, completed: false });
    }
    if (action === "snapshot") {
      const snapshot = getBrief(); snapshot.profile = { ...snapshot.profile, snapshots: [] };
      state.snapshots.push({ id: uid(), createdAt: new Date().toLocaleString("en-IN"), brief: snapshot });
    }
    if (action === "add-outcome") {
      const url = Core.safeUrl($("#strategy-outcome-url").value), reason = $("#strategy-outcome-reason").value.trim();
      if (!url || !reason) { message("Add an HTTP(S) source and the decisive reason with its location."); return; }
      state.outcomes.push({ id: uid(), result: $("#strategy-outcome-type").value, date: $("#strategy-outcome-date").value, url, reason, verification: "Review pending" });
    }
    if (action === "download-brief") { download("consumer-case-advocate-brief.doc", briefHtml(getBrief()), "application/msword"); message("Editable advocate briefing draft downloaded."); return; }
    if (action === "download-json") { download("consumer-case-strategy.json", JSON.stringify(getBrief(), null, 2), "application/json"); return; }
    if (action === "download-snapshot") { const saved = state.snapshots.find(s => s.id === button.dataset.recordId); if (saved) download("consumer-case-brief-snapshot.json", JSON.stringify(saved.brief, null, 2), "application/json"); return; }
    if (save()) { refresh(); if (action === "snapshot") message("Full briefing snapshot saved."); if (action === "add-review") message("Review task saved locally; no message was sent."); if (action === "add-outcome") message("Outcome recorded for source review."); }
  });
  document.addEventListener("click", event => { if (event.target.closest('[data-view="team"]')) refresh(); });
  window.addEventListener("storage", event => { if (["cc-case-v2", "cc-file-index-v2"].includes(event.key)) refresh(); });
  window.ConsumerStrategyWorkspace = { refresh, getBrief, briefHtml, openTab };
  refresh();
})();
