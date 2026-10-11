const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../dist/strategy-core.js");
const Library = require("../dist/strategy-data.js");

const facts = () => ({
  consumerName: "Sample Consumer", consumerAddress: "Sample address",
  oppositeName: "Sample Seller Ltd", oppositeAddress: "Sample registered address",
  amount: "25000", purchaseDate: "2025-01-15", facts: "Warranty repair refused."
});
const profile = () => ({
  sector: "goods", purpose: "personal", route: "ordinary",
  causeDate: "2025-02-01", filingDate: "2026-10-11",
  causeBasis: "Written rejection, email of 1 February", causeState: "Delhi",
  causeDistrict: "New Delhi", territorialBasis: "Consumer residence",
  respondentRole: "Seller promised warranty service", originalsRetained: true,
  evidence: { invoice: { reviewed: true, locator: "Page 1", category: "purchase" } },
  allegations: [{ id: "a1", promise: "One-year warranty", failure: "Repair refused",
    evidenceIds: ["invoice"], defence: "Misuse alleged", response: "Service report disputed" }],
  remedies: [{ id: "r1", type: "Refund", amount: "25000", mode: "additional",
    basis: "Invoice paid", evidenceIds: ["invoice"] }], packet: {}
});
const files = () => [{ id: "invoice", name: "sample-invoice.pdf", status: "Extracted", candidates: { amount: "25000" } }];

test("amount parsing rejects guesses, negatives, malformed and unsafe amounts", () => {
  for (const input of ["", null, "-2", "1e6", "12x", "NaN", "1.234", "99999999999999999999"])
    assert.equal(Core.amount(input), null);
  assert.equal(Core.amount("₹ 50,00,000.00"), 5000000);
  assert.equal(Core.amount("INR 1,234.50"), 1234.5);
  assert.equal(Core.amount("Rs. 500"), 500);
});
test("ordinary jurisdiction uses paid consideration at every threshold boundary", () => {
  assert.equal(Core.jurisdiction("5000000").level, "District Commission");
  assert.equal(Core.jurisdiction("5000000.01").level, "State Commission");
  assert.equal(Core.jurisdiction("20000000").level, "State Commission");
  assert.equal(Core.jurisdiction("20000000.01").level, "National Commission");
  assert.equal(Core.jurisdiction("0").status, "unknown");
  assert.equal(Core.jurisdiction("").status, "unknown");
  assert.equal(Core.jurisdiction("25000", "execution").status, "specialist");
});
test("dates are strict and leap-day anniversary is a review marker", () => {
  assert.equal(Core.parseDate("2025-02-29"), null);
  assert.equal(Core.parseDate("01/02/2025"), null);
  assert.equal(Core.anniversary("2024-02-29"), "2026-02-28");
  assert.equal(Core.limitation({ causeDate: "2024-10-11", filingDate: "2026-10-11" }).status, "urgent");
  assert.equal(Core.limitation({ causeDate: "2024-10-11", filingDate: "2026-10-12" }).status, "overdue");
  assert.equal(Core.limitation({ causeDate: "2027-01-01", filingDate: "2026-10-11" }).status, "invalid");
  assert.equal(Core.limitation({ route: "appeal" }).status, "specialist");
});
test("purchase date never silently substitutes for cause-of-action date", () => {
  const p = profile(); p.causeDate = "";
  assert.equal(Core.evaluate(facts(), p, files()).limitation.status, "unknown");
});
test("uploads and a checkbox without a source location do not prove an allegation", () => {
  const p = profile(); p.evidence.invoice.locator = "";
  const result = Core.evaluate(facts(), p, files());
  assert.equal(result.reviewed, 0);
  assert.equal(result.linkedClaims, 0);
  assert.equal(result.evidenceSupported, 0);
  assert.ok(result.gaps.some(g => g.id === "claim-a1"));
});
test("reviewed proof supports the mapped allegation, not a win probability", () => {
  const result = Core.evaluate(facts(), profile(), files());
  assert.equal(result.linkedClaims, 1);
  assert.equal(result.reviewed, 1);
  assert.equal(result.evidenceSupported, 25000);
  assert.equal(Object.hasOwn(result, "winProbability"), false);
  assert.ok(result.gaps.some(g => g.id === "packet-affidavit"));
});
test("unsupported relief and overlapping refunds remain explicit review gaps", () => {
  const p = profile();
  p.remedies.push({ id: "r2", type: "Refund", amount: "100", mode: "additional", basis: "", evidenceIds: [] });
  const result = Core.evaluate(facts(), p, files());
  assert.equal(result.requested, 25100);
  assert.equal(result.evidenceSupported, 25000);
  assert.ok(result.gaps.some(g => g.id === "refund-total"));
  assert.ok(result.gaps.some(g => g.id === "relief-r2"));
});
test("non-cash repair and alternative remedies are not added to the cash total", () => {
  const p = profile();
  p.remedies.push({ id: "r2", type: "Replacement / repair", amount: "",
    basis: "Repair under warranty instead of refund", evidenceIds: ["invoice"], mode: "alternative" });
  p.remedies.push({ id: "r3", type: "Refund", amount: "100",
    basis: "Alternative payment", evidenceIds: ["invoice"], mode: "alternative" });
  const result = Core.evaluate(facts(), p, files());
  assert.equal(result.requested, 25000);
  assert.equal(result.evidenceSupported, 25000);
  assert.ok(!result.gaps.some(g => g.id === "relief-r2"));
});
test("money totals round to paisa, rather than exposing binary float noise", () => {
  const p = profile();
  p.remedies = ["0.10", "0.20"].map((amount, i) => ({ id: String(i), type: "Expenses", amount,
    basis: "Receipt", evidenceIds: ["invoice"] }));
  assert.equal(Core.evaluate(facts(), p, files()).requested, 0.30);
});
test("commercial and regulated-sector matters trigger specialist checks", () => {
  const p = profile(); p.purpose = "commercial"; p.sector = "legal";
  const result = Core.evaluate(facts(), p, files());
  assert.ok(result.gaps.some(g => g.id === "purpose"));
  assert.ok(result.gaps.some(g => g.id === "sector-maintainability"));
});
test("authority selection requires explicit review, pinpoint and relevance", () => {
  const p = profile(), c = Library.cases[0];
  p.caseReview = { [c.id]: { approved: true, locator: "", relevance: "" } };
  assert.equal(Core.brief(facts(), p, files(), Library.cases).selectedAuthorities.length, 0);
  p.caseReview[c.id] = { approved: true, locator: c.locator, relevance: "Compare proof of defect" };
  const selected = Core.brief(facts(), p, files(), Library.cases).selectedAuthorities;
  assert.equal(selected.length, 1);
  assert.match(selected[0].verification, /User-attested/);
});
test("saved briefing snapshots are detached and cannot recursively include older snapshots", () => {
  const p = profile();
  p.snapshots = [{ huge: "older export" }];
  const pack = Core.brief(facts(), p, files(), Library.cases, "2026-10-11T00:00:00Z");
  p.allegations[0].promise = "Changed";
  p.evidence.invoice.locator = "Changed";
  assert.equal(pack.profile.allegations[0].promise, "One-year warranty");
  assert.equal(pack.evidence[0].annotation.locator, "Page 1");
  assert.deepEqual(pack.profile.snapshots, []);
});
test("untrusted source URLs cannot become executable links or verified judgments", () => {
  assert.equal(Core.safeUrl("javascript:alert(1)"), "");
  assert.equal(Core.safeUrl("data:text/html,x"), "");
  assert.match(Core.sourceKind("https://api.sci.gov.in/example.pdf"), /review pending/);
  assert.match(Core.sourceKind("https://fake-gov.in/example"), /^External/);
});
test("extract conflicts prompt review without declaring the lower or higher amount correct", () => {
  const evidence = files(); evidence[0].candidates.amount = "10000";
  const result = Core.evaluate(facts(), profile(), evidence);
  assert.ok(result.gaps.some(g => g.id === "amount-conflict"));
  assert.equal(result.forum.level, "District Commission");
});
test("curated case records distinguish procedural decisions from merits relief", () => {
  assert.equal(Library.cases.length, 7);
  for (const item of Library.cases) {
    assert.ok(item.locator && item.reason && item.distinguish && item.lesson);
    assert.equal(new URL(item.url).hostname, "api.sci.gov.in");
    assert.match(item.act, /1986/);
    assert.ok(["dismissal", "relief", "remand"].includes(item.outcomeType));
  }
  assert.ok(Library.cases.filter(c => c.outcomeType === "remand").every(c => /merits|remand|maintainability/i.test(c.outcome)));
});

