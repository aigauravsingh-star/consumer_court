# ConsumerCase India

Private prototype for an assisted consumer-complaint workspace.

The e-Jagriti workflow is intentionally user-assisted: the app prepares the packet, maps fields to official guidance, and lets the user record an outcome. The user completes portal authentication, CAPTCHA, payment, and final submission on e-Jagriti. No e-Jagriti password or OTP is collected or stored.

The local workflow now supports:

- guided intake for consumer, opposite-party, transaction, facts and relief details;
- PDF text extraction through a browser PDF adapter;
- DOCX extraction through Mammoth;
- image OCR through Tesseract.js when the browser has network access;
- candidate fact extraction for emails, phone numbers, amounts, dates and references;
- explicit user confirmation before extracted facts are used;
- Word-compatible complaint, index, memo-of-parties and list-of-dates drafts;
- a JSON case bundle with evidence metadata and official source registry;
- scrutiny-oriented checks based on e-Jagriti guidance, the Consumer Protection Act and NCDRC filing patterns.
- a scrutiny copilot with readiness scoring and review flags;
- objection intake with correction-list generation and objection history;
- case lifecycle tracking from draft through user-reported submission and scrutiny;
- packet version snapshots;
- a service layer for self-serve preparation, document review and managed case support;
- manual submission evidence metadata without collecting portal credentials.
- a researched **Legal team & strategy** workspace with six functional roles and explicit decision ownership;
- a case assessment using confirmed paid consideration, separate cause-of-action and filing dates, consumer purpose, sector, respondent role and territory;
- per-document classification, source locations, adverse-fact notes and explicit user review;
- repeatable allegations connecting promise, failure, reviewed evidence, likely defence and response;
- a sourced chronology and relief schedule separating cash requests from alternative and non-cash remedies;
- seven curated official Supreme Court judgments, with actual dispositions, pinpoint passages, decisive facts and distinguishing questions;
- authority selection gated on a passage and an application/distinction explanation, never auto-labelled legally verified;
- client instructions, budget, communication preference, local review tasks and full immutable briefing snapshots;
- actual settlement-offer comparison, order-compliance tracking and recovery balance;
- user-recorded outcome notes labelled review pending even if their URL uses an official host;
- editable advocate briefs and structured JSON exports;
- complaint and chronology drafts that consume the live case strategy, rather than a hard-coded commission or generic allegations.

The expert-team layer is deliberately a product workflow, not a claim that named law firms or advocates have endorsed the app. It is informed by publicly available consumer-litigation practice descriptions and official materials. It cannot predict or guarantee a win, replace an advocate, or turn unverified judgments into legal authority.

## Use locally

From this directory, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

Open http://localhost:4173/ and choose **Legal team & strategy**. The server serves `dist/index.html` and its strategy assets. No build or package installation is needed to use the page. Network access is needed for externally loaded PDF/DOCX/OCR libraries and official research links. Source files live in `dist/` in this buildless prototype.

Start with Case intake, upload synthetic documents and confirm extracted values. In Evidence & claims, classify each source and add a locator before marking it reviewed. Then record allegations, defences, a chronology and remedy calculations. Use Case assessment to resolve gaps, Real judgments to prepare research questions, and Client & advocate to save review tasks and export a brief. Tasks are local records: no advocate is contacted or assigned automatically.

## Research and safeguards

[RESEARCH.md](RESEARCH.md) records the practice sources, judgment sample, official rules and limits. The seven cases are a curated research library, not a representative outcome dataset or win-rate model. All arose under the 1986 Act; counsel must check applicability under the 2019 Act and later treatment.

Forum checks use consideration actually paid for an ordinary complaint: District up to ₹50 lakh; State above ₹50 lakh up to ₹2 crore; National above ₹2 crore under the 2021 jurisdiction rules. Unfair-contract, appeal and execution routes are not classified using this shortcut. The two-calendar-year limitation marker is only triage, not a legal deadline certification.

Drafts remain editable HTML documents with a `.doc` extension, not native DOCX, signed affidavits or assembled portal-ready PDFs. Complete applicable proformas, affidavits, attestation, Vakalatnama, annexures and pagination against the current e-Jagriti guide. Scrutiny acceptance and merits success cannot be guaranteed. Some older overview, filing and activity panels still contain illustrative demo data; the strategy workspace and generated case drafts use the recorded intake.

## Verification

With Node.js 22+:

```text
node --test tests/strategy.test.cjs
node tests/browser-smoke.cjs
```

The first command tests amounts, forum thresholds, limitation markers, evidence gating, relief totals, snapshot isolation and authority safeguards. The browser smoke test uses an isolated Edge profile, synthetic records and a temporary server. It verifies 18 upload, drafting, export, persistence, research, security, keyboard and mobile flows. Set `CONSUMER_TEST_BROWSER` to a local Chromium/Edge executable if the default Windows Edge path does not apply. Screenshots are written to a temporary directory printed by the test.

This remains a buildless static local app with localStorage as its development adapter. Do not upload real sensitive documents to this local demo. Before production use, replace localStorage with authenticated access controls, encrypted private object storage, malware scanning, a database, server-side document generation, audit logs, and reviewed legal-rule versions. Automated e-Jagriti submission is intentionally not implemented: users must complete authentication, CAPTCHA, payment and final submission on the official portal unless an authorised integration is separately verified.

