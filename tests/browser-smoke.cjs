// Dependency-free Edge/Chrome smoke checks. Uses an isolated browser profile and synthetic records only.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../dist");
const browser = process.env.CONSUMER_TEST_BROWSER ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "consumer-strategy-qa-"));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((request, response) => {
  const name = new URL(request.url, "http://localhost").pathname.slice(1) || "index.html";
  if (!["index.html", "strategy-core.js", "strategy-data.js", "strategy-ui.js", "strategy.css",
    "product-core.js", "storage-guard.js", "product-ui.js", "product.css"].includes(name)) {
    response.writeHead(404); response.end(); return;
  }
  response.setHeader("Content-Type", name.endsWith(".js") ? "text/javascript" :
    name.endsWith(".css") ? "text/css" : "text/html; charset=utf-8");
  response.end(fs.readFileSync(path.join(root, name)));
});
const checks = [], errors = [];
let child, socket, nextId = 0;
const pending = new Map();
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
    pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); },
      reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ": " + JSON.stringify(result.exceptionDetails.exception));
  return result.result.value;
}
async function check(name, expression) {
  assert.equal(await evaluate(expression), true, name);
  checks.push(name); console.log("PASS " + name);
}
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error("Page did not become ready: " + expression);
}
async function screenshot(name) {
  if (!socket || socket.readyState !== 1) return;
  const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(artifacts, name), Buffer.from(result.data, "base64"));
}
async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port + "/";
  child = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", "--user-data-dir=" + path.join(artifacts, "profile"), "about:blank"],
    { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let browserError = "";
  child.stderr.on("data", data => { browserError += data; });
  child.on("error", error => { browserError += error.message; });
  const portFile = path.join(artifacts, "profile", "DevToolsActivePort");
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await pause(100);
  assert.ok(fs.existsSync(portFile), "Browser failed to launch: " + browserError.slice(-1800));
  const port = fs.readFileSync(portFile, "utf8").split(/\r?\n/)[0];
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const task = pending.get(data.id); pending.delete(data.id);
      if (data.error) task.reject(new Error(JSON.stringify(data.error))); else task.resolve(data.result);
    } else if (data.method === "Runtime.exceptionThrown") errors.push(data.params.exceptionDetails);
  };
  await command("Runtime.enable"); await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const fixtures = {
    case: { consumerName: "Synthetic Consumer", consumerAddress: "Test address, Delhi", consumerEmail: "test@example.invalid",
      consumerMobile: "9999999999", consumerState: "Delhi", oppositeName: "Test Seller Ltd",
      oppositeAddress: "Test registered office", product: "Test refrigerator", purchaseDate: "2025-01-15",
      amount: "25000", orderRef: "TEST-001", facts: "Warranty service refused in writing.", relief: "Refund or repair." },
    evidence: [{ id: "invoice", name: "test-invoice.txt", type: "text/plain", size: "100 B",
      status: "Extracted; confirm candidates", text: "Invoice TEST-001 INR 25000. Test warranty.",
      candidates: { amount: "25000" } }]
  };
  await command("Page.addScriptToEvaluateOnNewDocument", { source: `
    if (!localStorage.getItem("smoke-initialized")) {
      localStorage.setItem("cc-case-v2", JSON.stringify(${JSON.stringify(fixtures.case)}));
      localStorage.setItem("cc-file-index-v2", JSON.stringify(${JSON.stringify(fixtures.evidence)}));
      localStorage.setItem("cc-operations-v1", JSON.stringify({consents:{processing:true,external:false}}));
      localStorage.setItem("smoke-initialized", "true");
    }
    window.testDownloads = [];
    const blobUrls = new Map(), nativeUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = nativeUrl(blob); blobUrls.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && blobUrls.has(this.href)) {
        const blob = blobUrls.get(this.href);
        window.testDownloads.push({ name: this.download, blob });
      } else HTMLElement.prototype.click.call(this);
    };
    window.testSet = (selector, value) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error("No input: " + selector);
      if (input.type === "checkbox") input.checked = value;
      else if (input.multiple) [...input.options].forEach(o => o.selected = value.includes(o.value));
      else input.value = value;
      input.dispatchEvent(new Event(["checkbox","select-one","select-multiple"].includes(input.type) ? "change" : "input", { bubbles:true }));
    };
    window.testClick = selector => document.querySelector(selector).click();
  ` });
  await command("Page.navigate", { url });
  await until("!!window.ConsumerStrategyWorkspace");
  await check("new workspace loads without overwriting intake", `(() => {
    testClick('[data-view="team"]');
    return document.querySelector('#view-team').classList.contains('active') &&
      ConsumerStrategyWorkspace.getBrief().case.consumerName === 'Synthetic Consumer';
  })()`);
  await check("review checkbox alone cannot validate an attachment", `(() => {
    ConsumerStrategyWorkspace.openTab('evidence');
    testSet('[data-evidence-id="invoice"][data-evidence-field="reviewed"]', true);
    return ConsumerStrategyWorkspace.getBrief().assessment.reviewed === 0 &&
      !document.querySelector('[data-evidence-field="reviewed"]').checked;
  })()`);
  await check("location and explicit review validate the evidence record", `(() => {
    testSet('[data-evidence-id="invoice"][data-evidence-field="locator"]', 'Page 1, warranty paragraph');
    testSet('[data-evidence-id="invoice"][data-evidence-field="category"]', 'purchase');
    testSet('[data-evidence-id="invoice"][data-evidence-field="reviewed"]', true);
    return ConsumerStrategyWorkspace.getBrief().assessment.reviewed === 1;
  })()`);
  await check("an allegation connects a promise, failure, evidence and defence", `(() => {
    testClick('[data-strategy-action="add-allegation"]');
    for (const [field,value] of Object.entries({title:'Warranty breach',promise:'Repair within warranty',
      failure:'Repair rejected',defence:'Misuse alleged',response:'Inspect service report'}))
      testSet('[data-record="allegations"][data-record-field="'+field+'"]', value);
    testSet('[data-record="allegations"][data-record-field="evidenceIds"]', ['invoice']);
    return ConsumerStrategyWorkspace.getBrief().assessment.linkedClaims === 1;
  })()`);
  await check("relief totals use evidence and exclude alternatives", `(() => {
    testClick('[data-strategy-action="add-remedy"]');
    testSet('[data-record="remedies"][data-record-field="amount"]', '25000');
    testSet('[data-record="remedies"][data-record-field="basis"]', 'Paid invoice amount');
    testSet('[data-record="remedies"][data-record-field="evidenceIds"]', ['invoice']);
    const b = ConsumerStrategyWorkspace.getBrief();
    return b.assessment.requested === 25000 && b.assessment.evidenceSupported === 25000;
  })()`);
  await check("forum and limitation assessment accepts separate confirmed dates", `(() => {
    ConsumerStrategyWorkspace.openTab('assessment');
    for (const [field,value] of Object.entries({sector:'goods',purpose:'personal',causeDate:'2025-02-01',
      filingDate:'2026-10-11',causeState:'Delhi',causeDistrict:'New Delhi',
      territorialBasis:'Consumer residence / work',causeBasis:'Rejection email dated 1 February',
      respondentRole:'Seller promised warranty service'}))
      testSet('[data-strategy-field="'+field+'"]',value);
    const b=ConsumerStrategyWorkspace.getBrief();
    return b.assessment.forum.level==='District Commission' && !b.assessment.gaps.some(g=>g.id==='forum') &&
      b.assessment.limitation.anniversary==='2027-02-01';
  })()`);
  await check("case research distinguishes remands and filters actual outcomes", `(() => {
    ConsumerStrategyWorkspace.openTab('research');
    testSet('#strategy-case-outcome','remand');
    return document.querySelectorAll('.strategy-case').length===2;
  })()`);
  await check("authority cannot be selected without a pinpoint and explanation", `(() => {
    testSet('#strategy-case-outcome','');
    const input=document.querySelector('[data-case-field="approved"]');
    testSet('[data-case-id="'+input.dataset.caseId+'"][data-case-field="approved"]',true);
    return ConsumerStrategyWorkspace.getBrief().selectedAuthorities.length===0 && !input.checked;
  })()`);
  await check("user-reviewed authority appears with verification caveat", `(() => {
    const id=document.querySelector('[data-case-field="approved"]').dataset.caseId;
    testSet('[data-case-id="'+id+'"][data-case-field="locator"]','Paragraphs 22–26');
    testSet('[data-case-id="'+id+'"][data-case-field="relevance"]','Compare quality of evidence; facts differ');
    testSet('[data-case-id="'+id+'"][data-case-field="approved"]',true);
    const list=ConsumerStrategyWorkspace.getBrief().selectedAuthorities;
    return list.length===1 && list[0].verification.includes('User-attested');
  })()`);
  await check("saved snapshot preserves the earlier file after live edits", `(() => {
    ConsumerStrategyWorkspace.openTab('team');
    testClick('[data-strategy-action="snapshot"]');
    ConsumerStrategyWorkspace.openTab('evidence');
    testSet('[data-record="allegations"][data-record-field="promise"]','Edited promise');
    testClick('[data-strategy-action="snapshot"]');
    const snapshots=JSON.parse(localStorage.getItem('cc-strategy-v1')).snapshots;
    return snapshots[0].brief.profile.allegations[0].promise==='Repair within warranty' &&
      snapshots[1].brief.profile.allegations[0].promise==='Edited promise' &&
      snapshots[1].brief.profile.snapshots.length===0;
  })()`);
  await check("complaint draft uses the actual forum, cause date, evidence and relief", `(() => {
    const doc=ConsumerCaseDocuments.generate('complaint');
    return doc.includes('DISTRICT COMMISSION') && doc.includes('2025-02-01') &&
      doc.includes('Edited promise') && doc.includes('test-invoice.txt') &&
      doc.includes('Paid invoice amount') && doc.includes('Preparation notes');
  })()`);
  await check("brief export and bundle contain the live strategy", `(async () => {
    testClick('[data-strategy-action="download-brief"]');
    testClick('[data-download-doc="packet"]');
    const docs=await Promise.all(testDownloads.map(async d=>({name:d.name,text:await d.blob.text()})));
    const brief=docs.find(d=>d.name==='consumer-case-advocate-brief.doc');
    const bundle=JSON.parse(docs.find(d=>d.name.endsWith('bundle.json')).text);
    return brief.text.includes('Edited promise') && bundle.strategy.selectedAuthorities.length===1;
  })()`);
  await check("settlement and order compliance track actual money only", `(() => {
    ConsumerStrategyWorkspace.openTab('resolution');
    testSet('[data-strategy-field="settlementOffer"]','20000');
    testSet('[data-strategy-field="settlementFloor"]','22000');
    testSet('[data-strategy-field="complianceAmount"]','25000');
    testSet('[data-strategy-field="amountReceived"]','10000');
    return document.querySelector('#strategy-settlement').textContent.includes('Falls below') &&
      document.querySelector('#strategy-recovery').textContent.includes('15,000');
  })()`);
  await check("outcomes reject executable URLs and escape entered text", `(() => {
    testSet('#strategy-outcome-url','javascript:alert(1)');
    testSet('#strategy-outcome-reason','<img src=x onerror="window.injected=true">');
    testClick('[data-strategy-action="add-outcome"]');
    if(ConsumerStrategyWorkspace.getBrief().profile.outcomes.length!==0) return false;
    testSet('#strategy-outcome-url','https://api.sci.gov.in/example.pdf');
    testClick('[data-strategy-action="add-outcome"]');
    return !window.injected && document.querySelector('#strategy-outcomes img')===null &&
      document.querySelector('#strategy-outcomes').textContent.includes('review pending');
  })()`);
  await check("text upload extracts candidates but never silently changes confirmed payment", `(async () => {
    testClick('[data-view="intake"]');
    const transfer=new DataTransfer();
    transfer.items.add(new File(['Invoice TEST-002 INR 12345 Email: sample@example.invalid'], 'smoke-upload.txt',{type:'text/plain'}));
    const input=document.querySelector('#evidence-input'); input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,250));
    const list=JSON.parse(localStorage.getItem('cc-file-index-v2'));
    return list.length===2 && list[1].candidates.amount==='12345' &&
      JSON.parse(localStorage.getItem('cc-case-v2')).amount==='25000';
  })()`);
  await command("Page.reload");
  await until("!!window.ConsumerStrategyWorkspace");
  await check("workflow and evidence annotations survive browser reload", `(() => {
    testClick('[data-view="team"]');
    const b=ConsumerStrategyWorkspace.getBrief();
    return b.profile.allegations[0].promise==='Edited promise' && b.evidence.length===2 &&
      b.evidence[0].reviewed && b.profile.snapshots.length===0;
  })()`);
  await check("overview, documents and filing use real case data rather than sample progress", `(() => {
    ConsumerProductHub.show('overview'); ConsumerProductHub.refresh();
    const overview=document.querySelector('#view-overview').textContent;
    const docs=document.querySelector('#view-documents').textContent;
    const filing=document.querySelector('#view-filing').textContent;
    return !overview.includes('NovaCart') && !overview.includes('75%') && !docs.includes('nova-order') &&
      overview.includes('Test refrigerator') && filing.includes('2025-02-01') && filing.includes('25,000')===false &&
      filing.includes('25000') && filing.includes('No portal action is performed here');
  })()`);
  await check("review enquiries actually persist and are explicitly not sent", `(() => {
    testSet('#review-email','review@example.invalid');testSet('#review-note','Review limitation and proof');
    testClick('#submit-review');
    const saved=ConsumerStore.read('cc-review-request-v1',{});
    return saved.email==='review@example.invalid' && saved.status==='Local draft — not sent' &&
      document.querySelector('#review-status').textContent.includes('not sent');
  })()`);
  await check("manual portal record requires an observed status and traps keyboard focus", `(() => {
    ConsumerProductHub.show('filing');testClick('[data-care-action="submission"]');
    testSet('#portal-status','');testClick('#save-record');
    const modal=document.querySelector('#record-modal'),close=modal.querySelector('[data-close-modal]');
    close.focus();close.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
    return modal.classList.contains('open') && !ConsumerStore.read('cc-submission',null) &&
      document.activeElement.id==='save-record';
  })()`);
  await check("failed portal record storage never announces a saved outcome", `(() => {
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='cc-submission')throw Error('Synthetic quota exceeded');return original.call(this,key,value);};
    testSet('#portal-status','Acknowledgement received');testSet('#filing-date','2026-10-11');
    testClick('#save-record');Storage.prototype.setItem=original;
    return document.querySelector('#record-modal').classList.contains('open') &&
      !localStorage.getItem('cc-submission') && ConsumerStore.hasUnsaved() &&
      document.querySelector('#toast').textContent.includes('could not be saved');
  })()`);
  await check("manual status saves explicitly as user-reported and recovers after quota failure", `(() => {
    testClick('#save-record');
    return !document.querySelector('#record-modal').classList.contains('open') &&
      ConsumerStore.read('cc-submission',{}).label.includes('not independently verified') &&
      !ConsumerStore.hasUnsaved() && document.querySelector('#view-filing').textContent.includes('Acknowledgement received');
  })()`);
  await check("withdrawn processing consent prevents further uploads", `(async () => {
    ConsumerProductHub.show('care');ConsumerProductHub.openTab('privacy');
    testSet('[data-care-group="consents"][data-care-key="processing"]',false);
    const before=ConsumerCaseIntake.getFiles().length,transfer=new DataTransfer();
    transfer.items.add(new File(['Sample data'], 'blocked.txt',{type:'text/plain'}));
    const input=document.querySelector('#evidence-input');input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,100));
    testSet('[data-care-group="consents"][data-care-key="processing"]',true);
    return ConsumerCaseIntake.getFiles().length===before;
  })()`);
  await check("duplicate bytes, unsafe types and disguised PDFs do not create evidence records", `(async () => {
    const before=ConsumerCaseIntake.getFiles().length,transfer=new DataTransfer();
    transfer.items.add(new File(['Invoice TEST-002 INR 12345 Email: sample@example.invalid'], 'duplicate.txt',{type:'text/plain'}));
    transfer.items.add(new File(['<script>alert(1)</script>'], 'unsafe.html',{type:'text/html'}));
    transfer.items.add(new File(['Not a PDF'], 'fake.pdf',{type:'application/pdf'}));
    const input=document.querySelector('#evidence-input');input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));
    return ConsumerCaseIntake.getFiles().length===before;
  })()`);
  await check("Hindi guidance and Hindi OCR choice persist independently of legal drafts", `(() => {
    ConsumerProductHub.openTab('customer');testSet('#care-language','hi');testSet('#care-ocr','hin+eng');
    return document.querySelector('#care-journey').textContent.includes('सबूत') &&
      ConsumerProductHub.getOps().ocrLanguage==='hin+eng' && ConsumerCaseDocuments.generate('complaint').includes('DRAFT');
  })()`);
  await check("additional parties appear in the memo and require a joinder reason", `(() => {
    ConsumerProductHub.openTab('lawyer');testClick('[data-care-action="add-party"]');
    for(const [k,v]of Object.entries({name:'Test Manufacturer Ltd',address:'Test service office',reason:'Warranty undertaking'}))
      testSet('[data-care-record="parties"][data-care-key="'+k+'"]',v);
    const doc=ConsumerCaseDocuments.generate('parties');
    return doc.includes('Test Manufacturer Ltd') && doc.includes('Test service office') && doc.includes('Warranty undertaking');
  })()`);
  await check("represented matters flag missing engagement without blocking self-filing", `(() => {
    ConsumerProductHub.show('team');ConsumerStrategyWorkspace.openTab('assessment');
    testSet('[data-strategy-field="represented"]',true);
    return ConsumerStrategyWorkspace.getBrief().assessment.gaps.some(g=>g.id==='engagement');
  })()`);
  await check("complete advocate engagement remains user-attested rather than verified", `(() => {
    ConsumerProductHub.show('care');ConsumerProductHub.openTab('lawyer');
    for(const [k,v]of Object.entries({advocateName:'Test Advocate',enrollment:'Test Bar record',scope:'Draft review only',feeTerms:'Written scope fee'}))
      testSet('[data-care-group="engagement"][data-care-key="'+k+'"]',v);
    for(const k of ['conflictChecked','termsAccepted','advocateAccepted','sharingApproved'])
      testSet('[data-care-group="engagement"][data-care-key="'+k+'"]',true);
    return !ConsumerStrategyWorkspace.getBrief().assessment.gaps.some(g=>g.id==='engagement') &&
      document.querySelector('#care-engagement-state').textContent.includes('not independently verified');
  })()`);
  await check("cost transparency treats blank fees as unknown, then calculates entered totals", `(() => {
    ConsumerProductHub.openTab('customer');
    if(!document.querySelector('#care-cost-total').textContent.includes('unknown')) return false;
    for(const [k,v]of Object.entries({platform:'0',advocate:'500',government:'0',expenses:'100'}))
      testSet('[data-care-group="costs"][data-care-key="'+k+'"]',v);
    return document.querySelector('#care-cost-total').textContent.includes('₹600');
  })()`);
  await check("deadline calendar and support exports use recorded facts without sending reminders", `(async () => {
    ConsumerProductHub.openTab('deadlines');
    for(const [selector,value]of Object.entries({'#care-date-title':'Hearing','#care-date-date':'2026-12-31',
      '#care-date-source':'Order paragraph 3','#care-date-owner':'Test Advocate','#care-ticket-note':'Need a readable original'}))
      testSet(selector,value);
    testClick('[data-care-action="add-date"]');testClick('[data-care-action="calendar"]');
    testClick('[data-care-action="add-ticket"]');
    const calendar=testDownloads.find(d=>d.name==='consumer-case-reminders.ics');
    const text=await calendar.blob.text();
    return text.includes('DTSTART;VALUE=DATE:20261231') && text.includes('DTEND;VALUE=DATE:20270101') &&
      ConsumerProductHub.getOps().tickets.length===1 && document.querySelector('#care-tickets').textContent.includes('not sent');
  })()`);
  await check("founder worksheet flags capacity that cannot support break-even volume", `(() => {
    ConsumerProductHub.openTab('owner');
    const data={netRevenue:'2000',advocatePayout:'500',reviewMinutes:'60',supportMinutes:'30',hourlyCost:'400',
      ocrCost:'20',storageCost:'10',acquisitionCost:'200',refundReserve:'70',monthlyFixed:'60000',staffHours:'120'};
    for(const [k,v]of Object.entries(data))testSet('[data-care-group="owner"][data-care-key="'+k+'"]',v);
    ConsumerProductHub.openTab('owner');
    return document.querySelector('#care-economics').textContent.includes('cannot support') &&
      document.querySelector('#care-launch').textContent.includes('launch blocker');
  })()`);
  await check("affidavit draft is unsigned and contains review placeholders, not a legal certification", `(() => {
    const doc=ConsumerProductHub.extraDraft('affidavit');
    return doc.includes('Synthetic Consumer') && doc.includes('UNSIGNED DRAFT') && doc.includes('[confirm') &&
      doc.includes('not an executed affidavit');
  })()`);
  await check("encrypted browser backup excludes plaintext and includes operational case records", `(async () => {
    ConsumerProductHub.openTab('privacy');
    testSet('#care-backup-pass','A long browser test passphrase');testSet('#care-backup-confirm','A long browser test passphrase');
    testClick('[data-care-action="backup"]');
    for(let i=0;i<100&&!testDownloads.some(d=>d.name.endsWith('.ccbackup'));i++)await new Promise(r=>setTimeout(r,100));
    const exported=testDownloads.find(d=>d.name.endsWith('.ccbackup'));if(!exported)return false;
    window.testBackupText=await exported.blob.text();
    const data=await ConsumerProduct.decryptBackup(JSON.parse(testBackupText),'A long browser test passphrase');
    return !testBackupText.includes('Synthetic Consumer') && data.records['cc-operations-v1'].parties.length===1 &&
      !document.querySelector('#care-backup-pass').value;
  })()`);
  await check("backup inspection changes no records and unconfirmed restore is blocked", `(async () => {
    const transfer=new DataTransfer();transfer.items.add(new File([testBackupText],'test.ccbackup',{type:'application/json'}));
    document.querySelector('#care-restore-file').files=transfer.files;
    testSet('#care-restore-pass','A long browser test passphrase');
    const before=localStorage.getItem('cc-case-v2');testClick('[data-care-action="inspect-backup"]');
    for(let i=0;i<100&&!document.querySelector('#care-restore-preview').textContent;i++)await new Promise(r=>setTimeout(r,100));
    testClick('[data-care-action="restore"]');
    return document.querySelector('#care-restore-preview').textContent.includes('Preview only') &&
      localStorage.getItem('cc-case-v2')===before;
  })()`);
  await check("unconfirmed erasure leaves this case and unrelated storage intact", `(() => {
    localStorage.setItem('unrelated-user-data','Keep');
    const before=localStorage.getItem('cc-case-v2');testClick('[data-care-action="delete"]');
    return localStorage.getItem('cc-case-v2')===before && localStorage.getItem('unrelated-user-data')==='Keep';
  })()`);
  await check("wrong backup passphrase clears staged restore without replacing records", `(async () => {
    testSet('#care-restore-pass','A wrong browser passphrase');
    const before=localStorage.getItem('cc-case-v2');testClick('[data-care-action="inspect-backup"]');
    for(let i=0;i<100&&!document.querySelector('#toast').textContent.includes('could not be unlocked');i++)await new Promise(r=>setTimeout(r,100));
    testSet('#care-restore-confirm','RESTORE');testClick('[data-care-action="restore"]');
    return localStorage.getItem('cc-case-v2')===before &&
      !document.querySelector('#care-restore-preview').textContent &&
      document.querySelector('#toast').textContent.includes('Inspect and unlock');
  })()`);
  await check("stored submission values cannot render active HTML", `(() => {
    ConsumerStore.write('cc-submission',{status:'<img src=x onerror="window.injected=true">',ref:'Test',date:'2026-10-11',next:'Await scrutiny'});
    ConsumerProductHub.refresh();
    return !window.injected && document.querySelector('#view-filing img')===null &&
      document.querySelector('#view-filing').textContent.includes('<img src=x');
  })()`);
  // Test corruption and successful restore in the isolated browser, never in the user's profile.
  await evaluate("window.savedSmokeBackup = testBackupText; localStorage.setItem('cc-case-v2','{damaged');");
  await command("Page.reload");await until("!!window.ConsumerProductHub");
  await check("damaged browser records are preserved while the app remains usable", `(() => {
    return localStorage.getItem('cc-case-v2')==='{damaged' &&
      !document.querySelector('#care-storage-alert').hidden && !!ConsumerProductHub;
  })()`);
  // Rebuild a valid fixture backup from the in-memory test runner's known case and existing strategy.
  const restoreText=await evaluate(`(() => {
    const data=ConsumerStore.snapshot();
    data.records['cc-case-v2']=${JSON.stringify(fixtures.case)};
    return JSON.stringify(data);
  })()`);
  await evaluate(`(async () => {
    ConsumerProductHub.show('care');ConsumerProductHub.openTab('privacy');
    const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(restoreText)}],'recovery.json',{type:'application/json'}));
    document.querySelector('#care-restore-file').files=transfer.files;
    testClick('[data-care-action="inspect-backup"]');
    await new Promise(r=>setTimeout(r,100));
    testSet('#care-restore-confirm','RESTORE');
    setTimeout(()=>testClick('[data-care-action="restore"]'),0);
    return true;
  })()`);
  await pause(400);await until("!!window.ConsumerProductHub");
  await check("confirmed UI restore recovers the case and preserves unrelated storage", `(() => {
    return ConsumerCaseIntake.getCase().consumerName==='Synthetic Consumer' &&
      localStorage.getItem('unrelated-user-data')==='Keep' && ConsumerStore.issues().length===0;
  })()`);
  await check("care records, review enquiry and additional parties survive reload", `(() => {
    const o=ConsumerProductHub.getOps();
    return o.language==='hi' && o.parties[0].name==='Test Manufacturer Ltd' &&
      o.deadlines.length===1 && ConsumerStore.read('cc-review-request-v1',{}).email==='review@example.invalid';
  })()`);
  await evaluate("ConsumerProductHub.show('care');ConsumerProductHub.openTab('customer');");
  await pause(300);await screenshot("care-desktop.png");
  await evaluate("ConsumerProductHub.show('team');");
  await pause(300); // Allow the existing view entrance animation to finish before visual inspection.
  await screenshot("desktop.png");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await check("mobile strategy view avoids horizontal page overflow", `(() => {
    ConsumerStrategyWorkspace.openTab('assessment');
    return document.documentElement.scrollWidth <= window.innerWidth+1;
  })()`);
  await screenshot("mobile.png");
  await check("strategy tabs support keyboard navigation", `(() => {
    const tab=document.querySelector('#strategy-tab-assessment');
    tab.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    return document.querySelector('#strategy-tab-evidence').getAttribute('aria-selected')==='true';
  })()`);
  await check("workspace care supports keyboard tabs and fits mobile screens", `(() => {
    ConsumerProductHub.show('care');ConsumerProductHub.openTab('customer');
    document.querySelector('#care-tab-customer').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    return document.querySelector('#care-tab-lawyer').getAttribute('aria-selected')==='true' &&
      document.documentElement.scrollWidth<=window.innerWidth+1;
  })()`);
  await pause(300);await screenshot("care-mobile.png");
  await evaluate(`(() => {
    ConsumerProductHub.openTab('privacy');testSet('#care-delete-confirm','DELETE CASE');
    setTimeout(()=>testClick('[data-care-action="delete"]'),0);return true;
  })()`);
  await pause(400);await until("!!window.ConsumerProductHub");
  await check("confirmed UI erasure leaves a genuinely empty workspace and unrelated records", `(() => {
    const text=document.querySelector('#view-overview').textContent;
    return !localStorage.getItem('cc-case-v2') && !localStorage.getItem('cc-file-index-v2') &&
      localStorage.getItem('unrelated-user-data')==='Keep' && !text.includes('Synthetic Consumer') &&
      ConsumerCaseIntake.getFiles().length===0;
  })()`);
  assert.deepEqual(errors, [], "Uncaught browser errors");
  console.log(JSON.stringify({ passed: checks.length, errors: errors.length, artifacts }, null, 2));
}
main().catch(async error => {
  try { await screenshot("failure.png"); } catch (_) {}
  console.error(error.stack);
  console.error(JSON.stringify({ passed: checks.length, errors, artifacts }, null, 2));
  process.exitCode = 1;
}).finally(() => {
  if (socket) socket.close();
  for (const task of pending.values()) task.reject(new Error("Browser session closed"));
  if (child) child.kill();
  server.close();
});
