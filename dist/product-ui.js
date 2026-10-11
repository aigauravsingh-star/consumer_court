(function () {
  "use strict";
  const Core = window.ConsumerProduct, Store = window.ConsumerStore, Strategy = window.ConsumerStrategyWorkspace;
  if (!Core || !Store || !Strategy) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rupees = n => n === null ? "Not confirmed" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const uid = () => "p-" + crypto.randomUUID();
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); };
  const defaults = () => ({ language: "en", ocrLanguage: "eng", consents: {}, engagement: {}, costs: {}, parties: [], deadlines: [], tickets: [], writtenInstructions: "", feeSource: "", feeCheckedOn: "", refundTerms: "" });
  let ops = Object.assign(defaults(), Store.read("cc-operations-v1", {})), stagedBackup = null, refreshTimer;
  const owner = Object.assign({}, Store.read("cc-owner-v1", {}));
  for (const name of ["parties", "deadlines", "tickets"]) if (!Array.isArray(ops[name])) ops[name] = [];
  const caseData = () => window.ConsumerCaseIntake?.getCase() || Store.read("cc-case-v2", {});
  const files = () => window.ConsumerCaseIntake?.getFiles() || Store.read("cc-file-index-v2", []);
  const getOps = () => JSON.parse(JSON.stringify(ops));
  const message = s => { const node = $("#toast"); node.textContent = s; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 4000); };
  const save = () => Store.write("cc-operations-v1", ops);
  const download = (name, content, type) => { const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
  function show(name) {
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
    $$(".nav button").forEach(v => v.classList.toggle("active", v.dataset.view === name));
    $("#crumb-title").textContent = { care: "Workspace care", overview: "Overview", filing: "e-Jagriti filing", activity: "Activity", documents: "Documents", services: "Review & support", team: "Legal team & strategy", intake: "Case intake" }[name] || name;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function log(action) {
    const events = Store.read("cc-events-v1", []);
    events.push({ id: uid(), action, at: new Date().toISOString() });
    Store.write("cc-events-v1", events.slice(-120));
  }
  const host = document.createElement("section"); host.className = "view"; host.id = "view-care";
  $(".content").appendChild(host);
  const nav = document.createElement("button"); nav.dataset.view = "care";
  nav.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="M8 12l3 3 5-6"/></svg>Workspace care';
  nav.addEventListener("click", () => { show("care"); refresh(); }); $(".nav").appendChild(nav);
  const tabNames = [["customer","Customer journey"],["lawyer","Advocate & firm"],["deadlines","Dates & support"],["privacy","Privacy & recovery"],["owner","Startup operations"]];
  const tabBar = '<div class="strategy-nav" role="tablist" aria-label="Workspace care">' + tabNames.map(([id,title],i) =>
    `<button id="care-tab-${id}" role="tab" aria-selected="${i===0}" aria-controls="care-pane-${id}" tabindex="${i===0?0:-1}" data-care-tab="${id}">${title}</button>`).join("") + "</div>";
  const field = (group, key, label, type = "text") => `<label>${h(label)}${type === "textarea" ? `<textarea data-care-group="${group}" data-care-key="${key}">${h(group === "owner" ? owner[key] : group === "ops" ? ops[key] : ops[group][key])}</textarea>` :
    `<input type="${type}" data-care-group="${group}" data-care-key="${key}" value="${h(group === "owner" ? owner[key] : group === "ops" ? ops[key] : ops[group][key])}" ${type==="number"?'min="0" step="0.01"':""} />`}</label>`;
  const check = (group,key,label) => `<label class="strategy-check"><input type="checkbox" data-care-group="${group}" data-care-key="${key}" ${ops[group][key]===true?"checked":""} />${h(label)}</label>`;
  host.innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">Trust, time and practical support</div><h1>Workspace care</h1><p class="lede">Prepare the file, understand the cost, protect your work and make the handoff explicit.</p></div><button class="btn soft" data-care-action="overview">Back to my case</button></div>${tabBar}
    <section id="care-pane-customer" role="tabpanel" aria-labelledby="care-tab-customer"><div class="card strategy-block"><h2>Your next steps, in plain language</h2><div class="strategy-fields"><label>Guidance language<select id="care-language"><option value="en">English</option><option value="hi">हिन्दी मार्गदर्शन</option></select></label><label>Image OCR language<select id="care-ocr"><option value="eng">English</option><option value="hin+eng">Hindi + English</option></select></label></div><div id="care-journey"></div><p class="strategy-note">Hindi guidance is not a legal translation of the entire app or its English drafts. Hindi OCR requires downloading language data; scanned PDFs still need image conversion or transcription.</p></div>
    <div class="card strategy-block"><h2>Know the total cost before instructing anyone</h2><div class="strategy-fields">${field("costs","platform","Platform preparation fee (₹)","number")}${field("costs","advocate","Advocate fee for agreed scope (₹)","number")}${field("costs","government","Official filing fee confirmed on portal (₹)","number")}${field("costs","expenses","Other expenses: notary, copies, service (₹)","number")}${field("ops","feeCheckedOn","Fee checked on","date")}${field("ops","feeSource","Portal receipt or fee source reference")}${field("ops","refundTerms","Cancellation, revisions, hearing exclusions and refund terms","textarea")}</div><div id="care-cost-total"></div><p class="strategy-note">Blank means unknown, not free. Record 0 only after confirmation. This is a planning record, not a quote, invoice or checkout. <a href="https://consumeraffairs.gov.in/public/upload/files/CDRC%20Amendment%20Rules%202023-1_1732707073.pdf" target="_blank" rel="noopener noreferrer">Official 2023 fee amendment</a>; check later amendments and the portal.</p></div></section>
    <section id="care-pane-lawyer" role="tabpanel" aria-labelledby="care-tab-lawyer" hidden><div class="card strategy-block"><h2>Before a real advocate takes the matter</h2><p class="muted tiny" style="margin:8px 0">Self-filing remains available. If represented, verify identity and agree scope, fees and authority. These entries are your records, not verification by this app.</p><div class="strategy-fields">${field("engagement","advocateName","Advocate / firm name")}${field("engagement","enrollment","Enrollment number and State Bar Council")}${field("engagement","scope","Written scope, hearing stage and exclusions","textarea")}${field("engagement","feeTerms","Fee, expenses, revisions and refund terms","textarea")}${field("ops","writtenInstructions","Client's final instructions / unresolved questions","textarea")}</div>${check("engagement","conflictChecked","Conflict check completed with the advocate")}${check("engagement","termsAccepted","Client accepted the written engagement")}${check("engagement","advocateAccepted","Advocate separately accepted the engagement")}${check("engagement","sharingApproved","Client approves sharing the case file with this identified reviewer")}<div id="care-engagement-state"></div><button class="btn soft" data-care-action="handoff">Download engagement and handoff record</button><p class="strategy-note">No lawyer is assigned or notified, and no file is shared from this page. A recorded engagement does not authenticate an advocate or create secure firm access. A real firm needs individual accounts, case permissions and audited sharing.</p></div>
    <div class="card strategy-block"><div class="strategy-row-actions"><h2>Additional parties and their roles</h2><button class="btn soft" data-care-action="add-party">Add party</button></div><p class="muted tiny" style="margin-top:8px">Keep the main complainant and main respondent in Case intake. Use this list for additional or proforma parties, with counsel's reasons for joining them.</p><div id="care-parties"></div></div></section>
    <section id="care-pane-deadlines" role="tabpanel" aria-labelledby="care-tab-deadlines" hidden><div class="card strategy-block"><div class="strategy-row-actions"><h2>Dates that need an owner</h2><button class="btn soft" data-care-action="calendar">Download calendar (.ics)</button></div><p class="muted tiny" style="margin-top:8px">Copy the actual date from a notice, order or counsel's instructions. Calendar export creates reminders only; no email, SMS or WhatsApp reminder is sent.</p><div class="strategy-fields"><label>Action or hearing<input id="care-date-title" /></label><label>Confirmed date<input id="care-date-date" type="date" /></label><label>Owner<input id="care-date-owner" /></label><label>Source / paragraph / notice<input id="care-date-source" /></label><label>Notes<input id="care-date-note" /></label></div><button class="btn primary" style="margin-top:14px" data-care-action="add-date">Save date</button><div id="care-dates"></div></div>
    <div class="card strategy-block"><h2>Support request and escalation record</h2><p class="muted tiny" style="margin-top:8px">Create a record you can download and send yourself. There is no connected support desk or promised response time.</p><div class="strategy-fields"><label>Type<select id="care-ticket-type"><option>Document or extraction problem</option><option>Fee or refund question</option><option>Missed update / reviewer escalation</option><option>Data correction or deletion request</option><option>Accessibility / language support</option></select></label><label>What happened?<textarea id="care-ticket-note"></textarea></label></div><button class="btn primary" style="margin-top:14px" data-care-action="add-ticket">Save local support record</button><button class="btn ghost" data-care-action="tickets">Download support records</button><div id="care-tickets"></div></div></section>
    <section id="care-pane-privacy" role="tabpanel" aria-labelledby="care-tab-privacy" hidden><div class="card strategy-block"><h2>Local processing notice</h2><p class="muted" style="font-size:13px;margin-top:10px">This prototype uses names, addresses, transaction facts, uploaded-document text and evidence metadata to prepare a case. They are stored unencrypted in this browser. Original files are not retained. There is no account login, secure lawyer portal or server-side malware scanning. Use synthetic documents only.</p>
    ${check("consents","processing","I understand the local storage limits and approve processing my test case data")}${check("consents","external","Allow externally downloaded PDF, DOCX and OCR libraries to run in this browser")}
    <p class="strategy-note">No marketing consent is requested, and data is not used here to train an AI model. No document-upload server is implemented. Third-party browser libraries execute locally and can access supplied data; production must review and self-host them. You can withdraw these choices at any time. Withdrawal stops future extraction; it does not erase existing records. Erasure is a separate action below. <a href="https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit" target="_blank" rel="noopener noreferrer">Official DPDP rules and enforcement timeline</a> — phased commencement needs legal review; this UI is not a compliance certification.</p></div>
    <div class="card strategy-block"><h2>Backup and restore your work</h2><p class="muted tiny" style="margin-top:8px">Backups include case facts, evidence text/metadata, strategy, submission notes, objections and workspace records. They do not include original files. Keep the originals separately. Downloaded plaintext drafts and diagnostic copies are not encrypted.</p><div class="strategy-fields"><label>Backup passphrase (12–256 characters)<input id="care-backup-pass" type="password" autocomplete="new-password" /></label><label>Confirm passphrase<input id="care-backup-confirm" type="password" autocomplete="new-password" /></label></div><button class="btn primary" style="margin-top:14px" data-care-action="backup">Download encrypted backup</button><button class="btn ghost" data-care-action="diagnostics">Download raw storage diagnostic copy</button><p class="strategy-note">AES-256-GCM protects the downloaded backup only, not this browser's storage. The passphrase is never saved; a lost passphrase cannot be recovered.</p><hr class="care-divider" /><div class="strategy-fields"><label>Backup file<input id="care-restore-file" type="file" accept=".json,.ccbackup" /></label><label>Backup passphrase<input id="care-restore-pass" type="password" autocomplete="off" /></label></div><button class="btn soft" style="margin-top:14px" data-care-action="inspect-backup">Inspect backup, without changing my case</button><div id="care-restore-preview"></div><label class="care-confirm">Type RESTORE to replace this browser's current case<input id="care-restore-confirm" autocomplete="off" /></label><button class="btn ghost" data-care-action="restore">Restore inspected backup</button><p class="strategy-note">This prototype keeps one active case. Export the current case before replacing it. Restore replaces the exact case keys, not unrelated browser storage. A law-firm multi-matter database is still a production requirement.</p></div>
    <div class="card strategy-block"><h2>Erase this browser's case records</h2><p class="muted tiny" style="margin-top:8px">This removes this app's local case records only. It cannot delete exports, originals on your device, records already sent to an advocate or anything filed on e-Jagriti.</p><label class="care-confirm">Type DELETE CASE to continue<input id="care-delete-confirm" autocomplete="off" /></label><button class="btn ghost" data-care-action="delete">Erase local case records</button></div></section>
    <section id="care-pane-owner" role="tabpanel" aria-labelledby="care-tab-owner" hidden><div class="card strategy-block"><h2>Founder operating-cost worksheet</h2><p class="muted tiny" style="margin-top:8px">Use observed costs or your explicitly chosen scenario. Blank inputs remain unknown. This is not accounting, tax advice or a valuation. Exclude taxes and government pass-through fees from net platform revenue.</p><div class="strategy-fields">${[
      ["netRevenue","Net platform revenue per matter (₹)"],["advocatePayout","Paid advocate / partner cost per matter (₹)"],
      ["reviewMinutes","Internal review time per matter (minutes)"],["supportMinutes","Support time per matter (minutes)"],
      ["hourlyCost","Loaded internal staff cost per hour (₹)"],["ocrCost","OCR / extraction cost per matter (₹)"],
      ["storageCost","Storage / infrastructure cost per matter (₹)"],["acquisitionCost","Acquisition cost per matter (₹)"],
      ["refundReserve","Refund / rework provision per matter (₹)"],["monthlyFixed","Fixed monthly operating cost (₹)"],
      ["staffHours","Available staff hours per month"]].map(([k,v])=>field("owner",k,v,"number")).join("")}</div><div id="care-economics"></div><button class="btn soft" data-care-action="owner-export">Export operating worksheet</button><p class="strategy-note">This view is not an access-control boundary. In this prototype, anyone with access to the browser can see it. Production must isolate operator data from client accounts.</p></div>
    <div class="card strategy-block"><h2>Production launch gates — still open</h2><div id="care-launch"></div><p class="strategy-note">More frontend features do not resolve these gates. Do not charge for live representation or accept sensitive client documents until the relevant operational, legal and security work is verified.</p></div></section>`;
  $("#care-language").value = ops.language; $("#care-ocr").value = ops.ocrLanguage;
  const alert = document.createElement("div"); alert.id = "care-storage-alert"; alert.className = "care-storage-alert"; alert.setAttribute("role","alert"); alert.hidden = true;
  $(".content").prepend(alert);
  const privacy = document.createElement("div"); privacy.className = "strategy-note"; privacy.id = "care-upload-notice";
  privacy.innerHTML = 'Before attaching files, review <button class="btn ghost" style="padding:0 4px" data-care-action="privacy">local processing and backup options</button>. Originals are not retained. Keep files under 10 MB. English / Hindi OCR is available for images.';
  $("#drop-zone").before(privacy);
  function openTab(name, focus = false) {
    tabNames.forEach(([id]) => { const button = $("#care-tab-"+id); button.setAttribute("aria-selected", String(id===name)); button.tabIndex=id===name?0:-1; if(id===name&&focus)button.focus(); $("#care-pane-"+id).hidden=id!==name; });
    refreshCare();
  }
  const assessment = () => Strategy.getBrief().assessment;
  function refreshOverview() {
    const c = caseData(), a = assessment(), d = ops.deadlines.filter(d=>!d.done).sort((l,r)=>l.date.localeCompare(r.date))[0];
    const submission = Store.read("cc-submission", {});
    const hasCase = !!(Core.text(c.consumerName) || Core.text(c.facts) || files().length);
    const hi = ops.language==="hi";
    $("#view-overview").innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">${hi?"आपका स्थानीय कार्यक्षेत्र":"Your browser-local workspace"}</div><h1>${hi?"अपना मामला, स्पष्ट अगले कदम के साथ":"Your case, with a clear next action."}</h1><p class="lede">${hi?"पहले जानकारी और सबूत जाँचें। वकील का समझौता और पोर्टल पर जमा करना अलग कदम हैं।":"Confirmed facts, preparation gaps and user-reported portal progress—not sample case data."}</p></div><button class="btn primary" data-care-action="intake">${hasCase?"Continue intake":"Start my case"} →</button></div>
      <div class="grid stats"><div class="card stat"><div class="stat-label">Case record</div><div class="stat-number">${hasCase?"1":"0"}</div><div class="stat-note">One case per browser workspace</div></div><div class="card stat"><div class="stat-label">Open preparation checks</div><div class="stat-number">${a.gaps.length}</div><div class="stat-note">${h(a.label)} · not a merits score</div></div><div class="card stat"><div class="stat-label">Evidence records</div><div class="stat-number">${files().length}</div><div class="stat-note">${a.reviewed} user-reviewed · originals not stored</div></div><div class="card stat"><div class="stat-label">Next recorded date</div><div class="stat-number" style="font-size:19px">${h(d?.date || "None recorded")}</div><div class="stat-note">${h(d?.title || "Record notice / hearing dates")}</div></div></div>
      <div class="strategy-columns"><div class="card strategy-block"><h2>${h(c.product || "Start with the transaction")}</h2><p class="muted" style="font-size:13px;margin-top:10px">${h(c.oppositeName || "No opposite party confirmed yet.")}</p><div class="mini-grid" style="margin-top:18px"><div><label>Paid consideration</label><strong>${rupees(Core.money(c.amount))}</strong></div><div><label>Indicative forum</label><strong>${h(a.forum.level || "Needs review")}</strong></div><div><label>Portal outcome</label><strong>${h(submission.status || "Not recorded")}</strong></div></div><p class="strategy-note">Portal progress is user-reported. A document, a saved task or an attachment count does not mean the complaint is submitted, registered or legally approved.</p><div class="strategy-actions"><button class="btn primary" data-care-action="team">Resolve case gaps</button><button class="btn ghost" data-care-action="documents">Prepare drafts</button></div></div><div class="card strategy-block"><h2>${hi?"अगला कदम":"Start here"}</h2><ol class="care-steps"><li>Confirm the parties, payment and transaction purpose.</li><li>Keep originals; review extracted fields and map evidence to allegations.</li><li>Resolve forum, limitation, relief and the applicable filing packet.</li><li>Agree any advocate scope and fees; complete e-Jagriti yourself.</li><li>Record notices, hearing dates, objections and actual recovery.</li></ol><button class="btn soft" data-care-action="privacy">Protect and back up my work</button><button class="btn ghost" data-care-action="customer">Costs and Hindi guidance</button></div></div>`;
  }
  function refreshDocs() {
    const view = $("#view-documents"), generated = $("#generated-docs-card");
    if (generated) generated.remove();
    view.innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">Actual case inventory</div><h1>Evidence and draft documents</h1><p class="lede">No sample files or pre-approved packet. Review the record and keep the original documents separately.</p></div><button class="btn primary" data-care-action="intake">Attach evidence</button></div><div class="card strategy-block"><h2>${files().length} evidence record${files().length===1?"":"s"}</h2><div class="care-inventory">${files().map(f=>`<div class="strategy-source"><div><strong>${h(f.name)}</strong><small>${h(f.status)} · ${h(f.size)}${f.sha256?" · SHA-256 fingerprint recorded":""}</small><small>Original not stored. ${f.error?h(f.error):""}</small></div><button class="btn ghost" data-care-action="remove-file" data-file-id="${h(f.id)}">Remove index entry</button></div>`).join("") || '<p class="strategy-empty">No files have been indexed.</p>'}</div><p class="strategy-note">SHA-256 detects identical uploaded bytes, not authenticity or admissibility. Removing an entry does not delete an original on your device. <button class="btn ghost" data-care-action="team">Review evidence locations →</button></p></div>`;
    if (generated) { $("#packet-version-panel",generated)?.remove(); view.appendChild(generated); }
    const card = document.createElement("div"); card.className="card strategy-block";
    card.innerHTML = `<h2>Additional preparation drafts</h2><p class="muted tiny" style="margin-top:8px">Synopsis and affidavit templates remain unsigned drafts. Complete the live official proforma separately. Get advice on applicability, affidavit paragraphs, notarisation and final PDF assembly.</p><div class="strategy-actions"><button class="btn soft" data-care-action="synopsis">Synopsis draft</button><button class="btn ghost" data-care-action="affidavit">Affidavit draft</button><button class="btn ghost" data-care-action="packet-snapshot">Save full briefing version</button></div>`;
    view.appendChild(card);
  }
  function refreshFiling() {
    const a = assessment(), c = caseData(), view = $("#view-filing"), record = Store.read("cc-submission", {});
    const additional = ops.parties.map(p=>p.role+": "+p.name+"; "+p.address).join("\n");
    view.innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">Assisted filing only</div><h1>Your e-Jagriti handoff</h1><p class="lede">Copy reviewed values, assemble the applicable documents and complete the official portal yourself.</p></div><a class="btn primary" href="https://e-jagriti.gov.in/" target="_blank" rel="noopener noreferrer">Open official portal ↗</a></div>
      <div class="card strategy-block"><h2>${a.gaps.length} preparation checks remain</h2><p class="strategy-note">No “submitted” or “ready” status is inferred from clicks. ${h(a.forum.text)} ${h(a.limitation.text)}</p><button class="btn soft" data-care-action="team">Review open checks</button></div>
      <div class="card strategy-block"><h2>Field-by-field worksheet</h2><div class="care-field-map">${[
        ["Complainant",c.consumerName],["Complainant address",c.consumerAddress],["Opposite party",c.oppositeName],["Opposite-party address",c.oppositeAddress],
        ["Consideration actually paid",c.amount],["Claim requested (cash, excluding alternatives)",String(a.requested)],
        ["Cause-of-action date",Strategy.getBrief().profile.causeDate],["Cause state and district",[Strategy.getBrief().profile.causeState,Strategy.getBrief().profile.causeDistrict].filter(Boolean).join(", ")],
        ["Case category / subcategory","Confirm the portal's live options; dispute sector is only a preparation cue"],
        ["Additional / proforma parties",additional || "Confirm none or record in Workspace care"]].map(([label,value])=>`<div><label>${h(label)}</label><span>${h(value || "[Needs confirmation]")}</span><button class="btn ghost" data-care-action="copy" data-copy-value="${h(value || "")}" aria-label="Copy ${h(label)}">Copy</button></div>`).join("")}</div>
      <p class="strategy-note">Review the cause date separately from the purchase date. Confirm the correct route, commission and declarations. <a href="${ConsumerStrategy.SOURCES.portal.url}" target="_blank" rel="noopener noreferrer">Official complaint filing guide</a>.</p></div>
      <div class="card strategy-block"><h2>What happens on the portal</h2><ol class="care-steps"><li>You register/sign in and complete authentication and CAPTCHA.</li><li>You confirm case details, parties and the required uploads.</li><li>You review commission selection, declarations and final preview.</li><li>You complete applicable payment and final submission and retain the acknowledgement.</li><li>You record the actual reference and later scrutiny notices here.</li></ol><p class="strategy-note">Never enter e-Jagriti credentials, OTPs or CAPTCHA answers in this app. No authorised submission integration is configured.</p></div>
      <div class="card strategy-block"><div class="strategy-row-actions"><h2>Recorded portal outcome</h2><button class="btn primary" data-care-action="submission">Add / update observed outcome</button></div><div id="submission-row">${record.status?`<p class="strategy-note">${h(record.status)} · ${h(record.ref || "Reference unconfirmed")} · ${h(record.date || "Date unconfirmed")}<br>${h(record.next)}<br>User-reported, not authenticated by this app.</p>`:'<p class="strategy-empty">No submission is recorded. No portal action is performed here.</p>'}</div></div>`;
  }
  function refreshActivity() {
    const events = Store.read("cc-events-v1", []), submissions = Store.read("cc-submission", {});
    const objections=Store.read("cc-objections-v1",[]);
    $("#view-activity").innerHTML = `<div class="page-head"><div><div class="eyebrow" style="color:var(--green)">Observed and recorded activity</div><h1>Your actual case timeline</h1><p class="lede">Local timestamps and user-reported dates. This is not an immutable server audit trail.</p></div><button class="btn soft" data-care-action="activity-export">Export timeline</button></div><div class="card strategy-block"><h2>Local actions</h2>${events.slice().reverse().map(e=>`<div class="strategy-log"><strong>${h(e.action)}</strong><div class="muted tiny">${h(e.at)}</div></div>`).join("")||'<p class="strategy-empty">No material actions logged by this version yet. Existing case data is preserved; historical activity is not invented.</p>'}<h2 style="margin-top:22px">Portal and scrutiny records</h2>${submissions.status?`<p>${h(submissions.status)} · ${h(submissions.date)} · User-reported</p>`:'<p class="strategy-empty">No portal outcome recorded.</p>'}${objections.map(o=>`<div class="strategy-log">${h(o.status)} · Due ${h(o.due || "unconfirmed")}<p>${h(o.text)}</p></div>`).join("")}</div>`;
  }
  function refreshCare() {
    const hindi=ops.language==="hi";
    $("#care-journey").innerHTML = `<ol class="care-steps" ${hindi?'lang="hi"':""}>${(hindi?[
      "बिल, भुगतान, विक्रेता का सही नाम और पूरा पता लिखें।","मूल दस्तावेज सुरक्षित रखें। निकाली गई तारीख, राशि और नाम स्वयं जाँचें।",
      "हर आरोप को उसके सबूत और दस्तावेज के पृष्ठ से जोड़ें।","वकील से समय-सीमा, सही आयोग और माँगी गई राहत की समीक्षा करवाएँ।",
      "वकील की फीस और काम का दायरा लिखित में तय करें।","e-Jagriti पर लॉगिन, CAPTCHA, भुगतान और अंतिम जमा आप स्वयं करें।",
      "स्वीकृति रसीद रखें और सुनवाई, आपत्ति और आदेश के बाद के कदम दर्ज करें।"]: [
      "Confirm the invoice, payment and each party's legal name and address.","Retain originals; verify every extracted name, amount and date.",
      "Link each allegation to proof and a source location.","Resolve limitation, forum and relief with appropriate legal review.",
      "Agree the advocate's written scope, fee and authority if represented.","Complete authentication, CAPTCHA, payment and final submission on e-Jagriti.",
      "Keep the acknowledgement; record notices, hearings and order compliance."]).map(t=>"<li>"+h(t)+"</li>").join("")}</ol>`;
    const c=Core.costs(ops.costs);
    $("#care-cost-total").innerHTML = `<div class="strategy-note"><strong>${c.total===null?"Known costs only: "+rupees(c.known):"Recorded total: "+rupees(c.total)}</strong>${c.missing.length?"<br>Still unknown: "+h(c.missing.join(", ")):""}${!ops.feeCheckedOn?"<br>Official fee check date is missing.":""}</div>`;
    const e=Core.engagement(ops.engagement);
    $("#care-engagement-state").innerHTML = `<div class="strategy-note"><strong>${h(e.label)}</strong>${e.gaps.length?"<br>Missing: "+h(e.gaps.join("; ")):"<br>All entries are user-attested; no firm or advocate identity is independently verified."}</div>`;
    $("#care-parties").innerHTML = ops.parties.map((p,i)=>`<details open><summary>Additional party ${i+1} • ${h(p.name)}</summary><div class="strategy-detail"><div class="strategy-fields">
      <label>Role<select data-care-record="parties" data-care-id="${p.id}" data-care-key="role">${["Additional complainant","Additional opposite party","Proforma complainant","Proforma opposite party"].map(r=>`<option ${p.role===r?"selected":""}>${r}</option>`).join("")}</select></label>${["name","address","email","mobile","reason"].map(k=>`<label>${h({name:"Full legal name",address:"Serviceable address",email:"Email (if known)",mobile:"Mobile (if known)",reason:"Why this party must be joined"}[k])}<input data-care-record="parties" data-care-id="${p.id}" data-care-key="${k}" value="${h(p[k])}" /></label>`).join("")}</div><button class="btn ghost" style="margin-top:12px" data-care-action="remove-party" data-care-id="${p.id}">Remove draft party</button></div></details>`).join("") || '<p class="strategy-empty">No additional parties recorded.</p>';
    $("#care-dates").innerHTML = ops.deadlines.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(d=>`<div class="strategy-log ${!d.done&&d.date<today()?"care-overdue":""}"><strong>${h(d.title)}</strong> • ${h(d.date)} ${!d.done&&d.date<today()?"• Recorded date passed":""}<p>${h(d.owner || "Owner unassigned")} • ${h(d.source)}<br>${h(d.note)}</p><label class="strategy-check"><input type="checkbox" data-care-record="deadlines" data-care-id="${d.id}" data-care-key="done" ${d.done?"checked":""} />I completed this action</label><button class="btn ghost" data-care-action="remove-date" data-care-id="${d.id}">Remove date</button></div>`).join("") || '<p class="strategy-empty">No dates recorded. Add the actual dates shown on notices or orders; do not infer them from app progress.</p>';
    $("#care-tickets").innerHTML = ops.tickets.map(t=>`<div class="strategy-log"><strong>${h(t.type)}</strong> • ${h(t.at)}<p>${h(t.note)}</p><small>Local record only — not sent to a support desk.</small></div>`).join("");
    const business=Core.economics(owner);
    $("#care-economics").innerHTML = !business.complete?'<p class="strategy-note">Enter every input, including confirmed zeroes, to calculate contribution, break-even and capacity.</p>':`<div class="strategy-note">Variable cost per matter: <strong>${rupees(business.variable)}</strong><br>Contribution per matter: <strong>${rupees(business.contribution)}</strong><br>Fixed-cost break-even: ${business.breakEven===null?"Not reachable at this non-positive contribution":business.breakEven+" matters/month"}<br>Time-based monthly capacity: ${business.capacity===null?"Cannot infer from zero work time":business.capacity+" matters"}${business.breakEven!==null&&business.capacity!==null&&business.breakEven>business.capacity?"<br><strong>Recorded staff time cannot support this break-even volume.</strong>":""}</div>`;
    $("#care-launch").innerHTML = [
      ["CTO / security","Authenticated accounts, per-case permissions, encrypted original-file storage, malware scanning, recovery and incident response"],
      ["Legal operations","Verified advocate network, conflicts, engagement documents, reviewed legal rules and filing quality assurance"],
      ["Customer operations","A working support desk, escalation owner, clear scope/fees/refunds, language and accessibility testing"],
      ["Data governance","Reviewed notices/consent, processor contracts, retention/erasure process and applicable DPDP commencement checks"],
      ["Founder","Measured preparation time, rework, acquisition cost, actual service capacity and validated demand"]].map(([owner,item])=>`<div class="strategy-source"><div><strong>${h(owner)}</strong><small>${h(item)}</small></div><span class="tag amber">Not verified / launch blocker</span></div>`).join("");
  }
  function renderStorageAlert() {
    const issues=Store.issues(); alert.hidden=issues.length===0;
    alert.innerHTML=issues.length?'<strong>Your browser data needs attention.</strong> '+h(issues[0].message)+' <button class="btn ghost" data-care-action="privacy">Backup / recovery</button>':"";
  }
  function refresh() { refreshOverview(); refreshDocs(); refreshFiling(); refreshActivity(); refreshCare(); renderStorageAlert(); }
  function queueRefresh() { clearTimeout(refreshTimer); refreshTimer=setTimeout(refresh,150); }
  function extraDraft(kind) {
    const c=caseData(), b=Strategy.getBrief();
    const html=kind==="synopsis"?`<h1>Synopsis — draft for review</h1><h2>Parties and transaction</h2><p>${h(c.consumerName)} v. ${h(c.oppositeName)}<br>${h(c.product)}<br>Consideration paid: ${h(c.amount)}</p><h2>Material facts</h2><p>${h(c.facts)}</p><h2>Cause, forum and limitation</h2><p>${h(b.profile.causeDate)} — ${h(b.profile.causeBasis)}<br>${h(b.assessment.forum.text)}</p><h2>Relief</h2><p>${h(c.relief)}</p>`:
      `<h1>Supporting affidavit — UNSIGNED DRAFT</h1><p>Before: [confirm Commission, case number and title]</p><p>I, ${h(c.consumerName || "[name]")}, aged [confirm], residing at ${h(c.consumerAddress || "[address]")}, solemnly affirm, subject to final legal review:</p><ol><li>I am the [confirm capacity] in the accompanying complaint and competent to depose to the facts identified below.</li><li>Paragraphs [identify] of the finally approved complaint are true to my personal knowledge. Paragraphs [identify] are based on information from [identify source] believed to be true.</li><li>The annexures identified as [confirm] are [confirm originals / accurate copies and source].</li></ol><h2>Verification to be settled before execution</h2><p>Verified at [place] on [date], with paragraph-specific knowledge/information distinctions confirmed.</p><p>Deponent signature: __________</p><p>Identification / attestation / notarial requirements: [confirm locally with authorised professional]</p>`;
    return '<!doctype html><html><head><meta charset="utf-8"><title>'+h(kind)+' draft</title><style>body{font:14px/1.6 Georgia;max-width:800px;margin:40px auto}p{white-space:pre-wrap}</style></head><body>'+html+'<p>DRAFT ONLY. Confirm every statement, placeholder, format, applicable requirement, signature and attestation. This file is not an executed affidavit, official proforma or filing confirmation.</p></body></html>';
  }
  function recordInput(target) {
    const value=target.type==="checkbox"?target.checked:target.value;
    if(target.dataset.careRecord) {
      const row=ops[target.dataset.careRecord].find(row=>row.id===target.dataset.careId);
      if(row)row[target.dataset.careKey]=value;
    } else if(target.dataset.careGroup==="owner") {
      owner[target.dataset.careKey]=value; Store.write("cc-owner-v1",owner);
      const b=Core.economics(owner); $("#care-economics").innerHTML=b.complete?`<p class="strategy-note">Contribution: ${rupees(b.contribution)} • Break-even: ${b.breakEven??"not reachable"} • Capacity: ${b.capacity??"unknown"}. Refresh the tab for the full comparison.</p>`:'<p class="strategy-note">Complete all inputs to calculate.</p>'; return;
    } else if(target.dataset.careGroup==="ops") ops[target.dataset.careKey]=value;
    else if(target.dataset.careGroup)ops[target.dataset.careGroup][target.dataset.careKey]=value;
    else return;
    save();
    // Update summaries without replacing the active form or interrupting typing.
    const c=Core.costs(ops.costs), e=Core.engagement(ops.engagement);
    $("#care-cost-total").textContent=(c.total===null?"Known costs only: "+rupees(c.known)+"; unknown: "+c.missing.join(", "):"Recorded total: "+rupees(c.total));
    $("#care-engagement-state").textContent=e.label+(e.gaps.length?"; missing: "+e.gaps.join("; "):" — user-attested, not independently verified");
  }
  host.addEventListener("input",event=>{ if(!["checkbox","select-one"].includes(event.target.type))recordInput(event.target); });
  host.addEventListener("change",event=>{
    if(event.target.id==="care-language"){ops.language=event.target.value;save();refreshOverview();refreshCare();return;}
    if(event.target.id==="care-ocr"){ops.ocrLanguage=event.target.value;save();return;}
    if(["checkbox","select-one"].includes(event.target.type))recordInput(event.target);
  });
  host.addEventListener("keydown",event=>{
    if(event.target.getAttribute("role")!=="tab"||!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const index=tabNames.findIndex(([id])=>id===event.target.dataset.careTab);
    const next=event.key==="Home"?0:event.key==="End"?tabNames.length-1:(index+(event.key==="ArrowRight"?1:-1)+tabNames.length)%tabNames.length;
    event.preventDefault();openTab(tabNames[next][0],true);
  });
  document.addEventListener("click",async event=>{
    const tab=event.target.closest("[data-care-tab]");if(tab){openTab(tab.dataset.careTab);return;}
    const button=event.target.closest("[data-care-action]");if(!button)return;
    const action=button.dataset.careAction;
    try {
      if(["overview","intake","documents","team","activity","filing"].includes(action)){show(action);if(action==="team")Strategy.refresh();return;}
      if(["privacy","customer","lawyer","deadlines","owner"].includes(action)){show("care");openTab(action);return;}
      if(action==="submission"){const record=Store.read("cc-submission",{});for(const [id,key]of [["portal-ref","ref"],["filing-date","date"],["portal-status","status"],["next-action","next"]])$("#"+id).value=record[key]||"";modalReturn=button;$("#submission-evidence").value="";$("#record-modal").classList.add("open");$("#portal-ref").focus();return;}
      if(action==="copy"){if(!button.dataset.copyValue){message("Nothing confirmed to copy.");return;}await navigator.clipboard.writeText(button.dataset.copyValue);message("Copied. Confirm the value before entering it on the portal.");return;}
      if(action==="remove-file"){if(!confirm("Remove this evidence index entry? The original on your device is not deleted. Linked claims will need review."))return;ConsumerCaseIntake.removeFile(button.dataset.fileId);log("Evidence index entry removed");Strategy.refresh();refresh();return;}
      if(action==="add-party")ops.parties.push({id:uid(),role:"Additional opposite party",name:"",address:"",email:"",mobile:"",reason:""});
      if(action==="remove-party")ops.parties=ops.parties.filter(p=>p.id!==button.dataset.careId);
      if(action==="add-date"){
        const title=$("#care-date-title").value.trim(),date=$("#care-date-date").value,source=$("#care-date-source").value.trim();
        if(!title||!Core.date(date)||!source)throw Error("Record the action, a valid date and the notice/order source.");
        ops.deadlines.push({id:uid(),title,date,source,owner:$("#care-date-owner").value.trim(),note:$("#care-date-note").value.trim(),done:false});log("User-recorded date added");
      }
      if(action==="remove-date")ops.deadlines=ops.deadlines.filter(d=>d.id!==button.dataset.careId);
      if(action==="calendar"){download("consumer-case-reminders.ics",Core.calendar(ops.deadlines),"text/calendar;charset=utf-8");return;}
      if(action==="add-ticket"){const note=$("#care-ticket-note").value.trim();if(!note)throw Error("Describe the issue first.");ops.tickets.push({id:uid(),type:$("#care-ticket-type").value,note,at:new Date().toISOString()});log("Local support record created");}
      if(action==="tickets"){download("consumer-case-support.json",JSON.stringify(ops.tickets,null,2),"application/json");return;}
      if(action==="handoff"){download("consumer-case-engagement-handoff.json",JSON.stringify({status:"User-recorded; not sent or legally verified",engagement:ops.engagement,review:Core.engagement(ops.engagement),instructions:ops.writtenInstructions,additionalParties:ops.parties,costs:ops.costs,scope:"Verify identity, conflicts, fees and advocate acceptance before representation"},null,2),"application/json");return;}
      if(action==="owner-export"){download("consumer-case-operating-worksheet.json",JSON.stringify({scenario:owner,calculation:Core.economics(owner),status:"Owner-entered scenario, not actual business performance"},null,2),"application/json");return;}
      if(action==="activity-export"){download("consumer-case-activity.json",JSON.stringify({localEvents:Store.read("cc-events-v1",[]),portal:Store.read("cc-submission",{}),objections:Store.read("cc-objections-v1",[])},null,2),"application/json");return;}
      if(["synopsis","affidavit"].includes(action)){download("consumer-case-"+action+"-draft.doc",extraDraft(action),"application/msword");log("Unsigned "+action+" draft exported");return;}
      if(action==="packet-snapshot"){show("team");Strategy.openTab("team");$('[data-strategy-action="snapshot"]').click();return;}
      if(action==="diagnostics"){if(!confirm("This download contains unencrypted raw case data, possibly damaged records. Keep it private. Continue?"))return;download("consumer-case-storage-diagnostics.json",JSON.stringify(Store.diagnostics(),null,2),"application/json");return;}
      if(action==="backup"){
        const pass=$("#care-backup-pass").value;if(pass!==$("#care-backup-confirm").value)throw Error("Passphrases do not match.");
        button.disabled=true;const result=await Core.encryptBackup(Store.snapshot(),pass);
        download("consumer-case-encrypted.ccbackup",JSON.stringify(result),"application/json");$("#care-backup-pass").value="";$("#care-backup-confirm").value="";
        log("Encrypted record backup exported");message("Encrypted backup downloaded. Keep the passphrase and original documents separately.");return;
      }
      if(action==="inspect-backup"){
        stagedBackup=null;$("#care-restore-preview").textContent="";const file=$("#care-restore-file").files[0];
        if(!file||file.size>Core.LIMITS.backup*2)throw Error("Select a supported backup under 16 MB.");
        const data=JSON.parse(await file.text());
        stagedBackup=data.format==="consumer-case-encrypted"?await Core.decryptBackup(data,$("#care-restore-pass").value):Core.validateBackup(data);
        $("#care-restore-pass").value="";
        $("#care-restore-preview").textContent="Preview only: "+(stagedBackup.records["cc-file-index-v2"]||[]).length+" evidence records; case: "+(stagedBackup.records["cc-case-v2"]?.product||"title unconfirmed")+". Original document bytes are not included. Current data is unchanged.";return;
      }
      if(action==="restore"){
        if(!stagedBackup)throw Error("Inspect and unlock the backup first.");
        Store.replace(stagedBackup.records,$("#care-restore-confirm").value);location.reload();return;
      }
      if(action==="delete"){Store.erase($("#care-delete-confirm").value);location.reload();return;}
      if(save()){refreshCare();message("Saved locally. No request, notification or case file was sent.");}
    } catch(error){message(error.message||"The action could not complete; current records were not intentionally replaced.");}
    finally{button.disabled=false;renderStorageAlert();}
  });
  document.addEventListener("consumer-store",event=>{
    renderStorageAlert();
    if(event.detail.type==="saved"&&["cc-case-v2","cc-file-index-v2","cc-submission","cc-objections-v1","cc-strategy-v1"].includes(event.detail.key))queueRefresh();
  });
  window.addEventListener("storage",event=>{
    if(Core.CASE_KEYS.includes(event.key))message("This case changed in another tab. Export unsaved work, then reload to avoid overwriting it.");
  });
  // Replace the no-op service enquiry handler; a local record is never presented as a sent request.
  const oldRequest=$("#submit-review");
  if(oldRequest){const button=oldRequest.cloneNode(true);oldRequest.replaceWith(button);button.textContent="Save local review enquiry";button.addEventListener("click",()=>{
    const email=$("#review-email").value.trim(),note=$("#review-note").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!note){message("Enter a valid contact email and review question.");return;}
    const value={email,note,priority:$("#review-priority").value,plan:$("#plan-selected").textContent,createdAt:new Date().toISOString(),status:"Local draft — not sent"};
    if(Store.write("cc-review-request-v1",value)){$("#review-status").textContent="Enquiry saved in this browser, not sent. No reviewer is assigned. Export the enquiry to contact your chosen advocate.";log("Local review enquiry saved");message("Local enquiry saved; no message was sent.");}
  });}
  const priorRequest=Store.read("cc-review-request-v1",{});
  if(priorRequest.email){$("#review-email").value=priorRequest.email;$("#review-note").value=priorRequest.note||"";$("#review-status").textContent="Saved local enquiry — not sent; no advocate assigned.";}
  $("#view-services .lede").textContent="Explore preparation scopes. These are not live service offers: there is no checkout, advocate assignment or connected support desk.";
  $$("#view-services .plan li").forEach(node=>{if(node.textContent==="Advocate assignment")node.textContent="Advocate engagement planning (not assignment)";});
  const enquiryExport=document.createElement("button");enquiryExport.className="btn ghost";enquiryExport.textContent="Export local enquiry";enquiryExport.style.marginLeft="8px";
  enquiryExport.addEventListener("click",()=>download("consumer-case-review-enquiry.json",JSON.stringify(Store.read("cc-review-request-v1",{}),null,2),"application/json"));
  $("#submit-review").after(enquiryExport);
  // Full strategy assessment replaces the legacy attachment-count readiness percentage.
  const oldScan=$("#run-scan");
  if(oldScan){const scan=oldScan.cloneNode(true);oldScan.replaceWith(scan);scan.addEventListener("click",()=>{
    const a=assessment();$("#scan-score").style.background="none";$("#scan-score").innerHTML="<strong>"+a.gaps.length+"</strong>";
    $("#scan-heading").textContent=a.label;$("#scan-summary").textContent=a.gaps.length+" recorded preparation gaps. No score predicts scrutiny or merits.";
    $("#scan-list").innerHTML=a.gaps.map(g=>`<div class="strategy-task ${g.severity}"><div><h3>${h(g.title)}</h3><p>${h(g.detail)}</p></div><span class="tag amber">${h(g.severity)}</span></div>`).join("");
  });scan.click();}
  document.addEventListener("click",event=>{if(event.target.closest("[data-view]")){const name=event.target.closest("[data-view]").dataset.view;if(["overview","documents","filing","activity"].includes(name))queueRefresh();}});
  let modalReturn=null;
  const recordModal=$("#record-modal");
  const closeRecord=()=>{recordModal.classList.remove("open");if(modalReturn?.isConnected)modalReturn.focus();};
  const oldRecord=$("#save-record");
  if(oldRecord){const button=oldRecord.cloneNode(true);oldRecord.replaceWith(button);button.addEventListener("click",()=>{
    try {
      const date=$("#filing-date").value,status=$("#portal-status").value.trim(),file=$("#submission-evidence").files[0];
      if(!status)throw Error("Describe the status you personally observed; no submission will be inferred.");
      if(date&&!Core.date(date))throw Error("Enter a valid date from the portal record, or leave it unconfirmed.");
      if(file){const issue=Core.uploadIssue(file,0,ops.consents.processing);if(issue)throw Error(issue);if(!/\.(pdf|jpg|jpeg|png)$/i.test(file.name))throw Error("Acknowledgement metadata accepts PDF, JPG or PNG only.");}
      const record={ref:$("#portal-ref").value.trim(),date,status,next:$("#next-action").value.trim(),
        evidence:file?{name:file.name,size:file.size,type:file.type,scope:"Metadata only; keep the original separately"}:null,label:"User-reported; not independently verified"};
      if(!Store.write("cc-submission",record)){message("The record could not be saved. It remains in memory; export a backup before leaving.");return;}
      log("Portal outcome recorded by user");closeRecord();refreshFiling();message("User-reported status saved locally. Any attachment stores metadata only, not the original.");
    }catch(error){message(error.message);}
  });}
  const attachmentNote=document.createElement("p");attachmentNote.className="strategy-note";
  attachmentNote.textContent="An optional acknowledgement stores its filename and metadata only. Keep the actual receipt or screenshot separately. No portal status is independently verified.";
  $("#record-modal .form-grid").after(attachmentNote);
  recordModal.addEventListener("click",event=>{if(event.target===recordModal||event.target.closest("[data-close-modal]"))closeRecord();});
  document.addEventListener("keydown",event=>{
    if(!recordModal.classList.contains("open"))return;
    if(event.key==="Escape"){event.preventDefault();closeRecord();return;}
    if(event.key!=="Tab")return;
    const controls=$$("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",recordModal);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  $("#toast").setAttribute("role","status");$("#toast").setAttribute("aria-live","polite");
  document.querySelector(".side-foot").innerHTML='<strong style="color:#e4f4ed">Assisted preparation</strong><p>Browser-local prototype. No secure cloud storage or automatic portal submission.</p>';
  const help=$(".help");if(help)help.addEventListener("click",()=>{show("care");openTab("customer");});
  $("#view-intake .eyebrow").textContent="Confirmed case intake";
  $("#view-documents #generated-docs-card .card-head p")?.setAttribute("title","Drafts are HTML with a .doc extension, not signed or assembled filing PDFs.");
  window.ConsumerProductHub={getOps,refresh,openTab,show,extraDraft};
  refresh();
})();
