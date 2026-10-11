const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../dist/product-core.js");
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) };
}
const empty = () => Product.createStore(memory()).snapshot();
test("damaged JSON is preserved and cannot be silently overwritten", () => {
  const storage=memory({"cc-case-v2":"{damaged"}), store=Product.createStore(storage);
  assert.deepEqual(store.read("cc-case-v2",{}),{});
  assert.equal(store.write("cc-case-v2",{consumerName:"New draft"}),false);
  assert.equal(storage.getItem("cc-case-v2"),"{damaged");
  assert.equal(store.diagnostics()["cc-case-v2"],"{damaged");
  assert.equal(store.snapshot().records["cc-case-v2"].consumerName,"New draft");
  assert.equal(store.issues()[0].type,"read");
});
test("incorrect record shapes do not crash array consumers", () => {
  const store=Product.createStore(memory({"cc-file-index-v2":"{}", "cc-strategy-v1":'{"allegations":[null]}'}));
  assert.deepEqual(store.read("cc-file-index-v2",[]),[]);
  assert.deepEqual(store.read("cc-strategy-v1",{}),{});
  assert.equal(store.issues().length,2);
});
test("quota failure is reported and the unsaved case remains exportable", () => {
  const storage=memory();storage.setItem=()=>{throw Error("Quota");};
  const events=[],store=Product.createStore(storage,e=>events.push(e));
  assert.equal(store.write("cc-case-v2",{facts:"Do not lose this"}),false);
  assert.equal(store.hasUnsaved(),true);
  assert.equal(store.snapshot().records["cc-case-v2"].facts,"Do not lose this");
  assert.equal(events[0].type,"error");
});
test("a later successful retry clears the unsaved warning", () => {
  const storage=memory(),save=storage.setItem;storage.setItem=()=>{throw Error("Quota");};
  const store=Product.createStore(storage);store.write("cc-case-v2",{facts:"Draft"});
  storage.setItem=save;assert.equal(store.write("cc-case-v2",{facts:"Draft"}),true);
  assert.equal(store.hasUnsaved(),false);assert.equal(store.issues().length,0);
});
test("case snapshots are deep copies of all allowlisted records", () => {
  const store=Product.createStore(memory());const data={consumerName:"Sample"};
  store.write("cc-case-v2",data);const snapshot=store.snapshot();data.consumerName="Changed";
  assert.equal(snapshot.records["cc-case-v2"].consumerName,"Sample");
  assert.ok(Object.hasOwn(snapshot.records,"cc-operations-v1"));
  assert.ok(!Object.hasOwn(snapshot.records,"cc-owner-v1"));
});
test("restore requires explicit confirmation and never touches unrelated storage", () => {
  const storage=memory({unrelated:"Keep","cc-case-v2":'{"facts":"Old"}'}),store=Product.createStore(storage);
  const data=empty();data.records["cc-case-v2"]={facts:"Restored"};
  assert.throws(()=>store.replace(data.records,""),/RESTORE/);
  assert.equal(storage.getItem("cc-case-v2"),'{"facts":"Old"}');
  store.replace(data.records,"RESTORE");
  assert.equal(store.read("cc-case-v2",{}).facts,"Restored");assert.equal(storage.getItem("unrelated"),"Keep");
});
test("a partial restore failure rolls back the previous browser records", () => {
  const storage=memory({"cc-case-v2":'{"facts":"Original"}',"cc-file-index-v2":"[]"}),original=storage.setItem;
  let failed=false;storage.setItem=(key,value)=>{if(key==="cc-strategy-v1"&&!failed){failed=true;throw Error("Quota");}original(key,value);};
  const store=Product.createStore(storage),data=empty();data.records["cc-case-v2"]={facts:"Incoming"};
  assert.throws(()=>store.replace(data.records,"RESTORE"),/previous browser records were restored/);
  assert.equal(storage.getItem("cc-case-v2"),'{"facts":"Original"}');
});
test("case erasure is exact-key, explicitly confirmed and not a browser-wide clear", () => {
  const storage=memory({unrelated:"Keep","cc-owner-v1":"{}","cc-case-v2":"{}"}),store=Product.createStore(storage);
  assert.throws(()=>store.erase("DELETE"),/DELETE CASE/);store.erase("DELETE CASE");
  assert.equal(storage.getItem("cc-case-v2"),null);assert.equal(storage.getItem("unrelated"),"Keep");
  assert.equal(storage.getItem("cc-owner-v1"),"{}");
});
test("backup import rejects unknown keys, incomplete envelopes and prototype poisoning", () => {
  assert.throws(()=>Product.validateBackup({format:"consumer-case-records",version:1,records:{}}),/missing/);
  const unknown=empty();unknown.records.portalPassword="x";assert.throws(()=>Product.validateBackup(unknown),/Unsupported/);
  const poisoned=JSON.parse('{"format":"consumer-case-records","version":1,"records":{"cc-case-v2":{"__proto__":{"polluted":true}},"cc-file-index-v2":[]}}');
  assert.throws(()=>Product.validateBackup(poisoned),/invalid/);assert.equal({}.polluted,undefined);
});
test("evidence and additional party identifiers cannot inject attributes", () => {
  assert.equal(Product.validateRecord("cc-file-index-v2",[{id:'" onclick="x',name:"x"}]),false);
  assert.equal(Product.validateRecord("cc-operations-v1",{parties:[{id:'" onclick="x',name:"x"}]}),false);
  assert.equal(Product.validateRecord("cc-file-index-v2",[{id:"same",name:"a"},{id:"same",name:"b"}]),false);
});
test("upload limits require consent and exclude unsafe or oversized files", () => {
  const f={name:"invoice.txt",size:100};
  assert.match(Product.uploadIssue(f,0,false),/notice/);
  assert.match(Product.uploadIssue({...f,name:"script.html"},0,true),/not accepted/);
  assert.match(Product.uploadIssue({...f,name:"invoice.pdf.exe"},0,true),/not accepted/);
  assert.match(Product.uploadIssue({...f,size:11*1024*1024},0,true),/10 MB/);
  assert.match(Product.uploadIssue(f,30,true),/30/);
  assert.match(Product.uploadIssue({...f,size:0},0,true),/empty/);
  assert.equal(Product.uploadIssue({...f,name:"thread.eml"},0,true),"");
});
test("engagement flags never independently authenticate the advocate", () => {
  assert.equal(Product.engagement({}).gaps.length,8);
  const e={advocateName:"Sample",enrollment:"Test",scope:"Review",feeTerms:"Written",
    conflictChecked:true,termsAccepted:true,advocateAccepted:true,sharingApproved:true};
  assert.equal(Product.engagement(e).gaps.length,0);assert.equal(Product.engagement(e).verified,false);
});
test("self-filing is not blocked by an absent advocate engagement", () => {
  assert.equal(Product.operationalGaps({},false).length,0);
  assert.equal(Product.operationalGaps({},true)[0].id,"engagement");
});
test("additional parties require a legal name, service address and joinder reason", () => {
  assert.equal(Product.operationalGaps({parties:[{id:"test",name:"Seller"}]},false).length,1);
  assert.equal(Product.operationalGaps({parties:[{id:"test",name:"Seller",address:"Test",reason:"Warranty duty"}]},false).length,0);
});
test("unknown costs are not advertised as free or a complete total", () => {
  const c=Product.costs({platform:"0",advocate:"500",government:"",expenses:"100"});
  assert.equal(c.total,null);assert.equal(c.known,600);assert.equal(c.missing.length,1);
  assert.equal(Product.costs({platform:"0",advocate:"500",government:"0",expenses:"100"}).total,600);
});
test("money input rejects negative and unsafe values", () => {
  assert.equal(Product.money("Rs. 1,234.50"),1234.5);
  for(const x of ["","-1","100x","1e6","9007199254740992","1.123"])assert.equal(Product.money(x),null);
});
test("unit economics use entered costs and actual available staff time", () => {
  const data={netRevenue:"2000",advocatePayout:"500",reviewMinutes:"60",supportMinutes:"30",hourlyCost:"400",
    ocrCost:"20",storageCost:"10",acquisitionCost:"200",refundReserve:"70",monthlyFixed:"60000",staffHours:"120"};
  const c=Product.economics(data);assert.equal(c.variable,1400);assert.equal(c.contribution,600);
  assert.equal(c.breakEven,100);assert.equal(c.capacity,80);
  assert.equal(Product.economics({...data,netRevenue:"0"}).breakEven,null);
  assert.equal(Product.economics({...data,netRevenue:""}).complete,false);
});
test("calendar export uses all-day dates, excludes done entries and escapes injection", () => {
  const ics=Product.calendar([{id:"date-1",title:"Hearing\nBEGIN:VEVENT",date:"2026-12-31",source:"Order para 3",note:"A,b;c"},
    {id:"date-2",title:"Completed",date:"2026-12-31",source:"Order",done:true}],"2026-10-11T00:00:00Z");
  assert.match(ics,/DTSTART;VALUE=DATE:20261231/);assert.match(ics,/DTEND;VALUE=DATE:20270101/);
  assert.equal(ics.split("BEGIN:VEVENT").length,3); // One real VEVENT and one escaped literal in SUMMARY.
  assert.match(ics,/Hearing\\nBEGIN:VEVENT/);assert.ok(!ics.includes("SUMMARY:Completed"));
  assert.match(ics,/A\\,b\\;c/);assert.ok(ics.endsWith("\r\n"));
});
test("calendar lines fold UTF-8 text without splitting characters", () => {
  const ics=Product.calendar([{id:"date",title:"सुनवाई ".repeat(30),date:"2026-11-11",source:"Order"}]);
  for(const line of ics.split("\r\n"))assert.ok(Buffer.byteLength(line,"utf8")<=73);
  assert.equal(ics.includes("\ufffd"),false);
});
test("encrypted backups round-trip and use random salt and nonce", async () => {
  const data=empty();data.records["cc-case-v2"]={facts:"Synthetic confidential facts"};
  const a=await Product.encryptBackup(data,"A long test passphrase"),b=await Product.encryptBackup(data,"A long test passphrase");
  assert.equal(a.iterations,600000);assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);
  assert.ok(!JSON.stringify(a).includes("confidential"));
  assert.deepEqual(await Product.decryptBackup(a,"A long test passphrase"),data);
});
test("wrong passphrases and modified ciphertext cannot restore records", async () => {
  const data=empty(),encrypted=await Product.encryptBackup(data,"A long test passphrase");
  await assert.rejects(Product.decryptBackup(encrypted,"Wrong long passphrase"),/Cannot unlock/);
  const changed={...encrypted,ciphertext:(encrypted.ciphertext[0]==="A"?"B":"A")+encrypted.ciphertext.slice(1)};
  await assert.rejects(Product.decryptBackup(changed,"A long test passphrase"),/Cannot unlock/);
  await assert.rejects(Product.decryptBackup({...encrypted,iterations:90000000},"pass"),/Unsupported/);
  await assert.rejects(Product.encryptBackup(data,"short"),/12–256/);
});
