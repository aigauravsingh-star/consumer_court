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
- a scrutiny copilot reporting concrete preparation gaps, without a misleading readiness percentage;
- objection intake with correction-list generation and objection history;
- case lifecycle tracking from draft through user-reported submission and scrutiny;
- packet version snapshots;
- preparation-scope comparison and persisted local review enquiries, explicitly not sent or assigned;
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
- real overview, evidence, portal field-map and activity panels without sample case progress;
- a **Workspace care** area with English/Hindi journey guidance and a separate Hindi + English image OCR setting;
- explicit local-processing and external-library choices, withdrawal, type/size/count limits and duplicate-file fingerprints;
- separate platform, advocate, government and incidental costs, with unknown fees left unknown;
- advocate engagement records covering identity, enrollment, conflicts, scope, fees, both acceptances and sharing permission;
- additional/proforma parties with addresses and joinder reasons included in party drafts;
- user-recorded deadlines with notice/order sources and downloadable calendar events;
- persistent local support records and export, without fake notifications or response promises;
- AES-256-GCM encrypted backup exports, preview-first restore, exact-key erasure and damaged-storage diagnostics;
- guarded storage writes preserving recoverable damaged records and exposing unsaved quota failures;
- unsigned synopsis/affidavit preparation templates, not executed legal documents;
- a founder cost worksheet covering review/support time, acquisition, refunds, contribution and capacity constraints.

The expert-team layer is deliberately a product workflow, not a claim that named law firms or advocates have endorsed the app. It is informed by publicly available consumer-litigation practice descriptions and official materials. It cannot predict or guarantee a win, replace an advocate, or turn unverified judgments into legal authority.

## Use locally

From this directory, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

Open http://localhost:4173/. The server serves `dist/index.html` and its allowlisted strategy/product assets. No build or package installation is needed to use the page. Network access and explicit external-library permission are needed for PDF/DOCX/OCR adapters; plain TXT/CSV/EML intake works without those libraries. Source files live in `dist/` in this buildless prototype. Use localhost rather than opening the HTML as a file so browser cryptography and module resources work reliably.

Restart an older running server after changes to its asset list. If another instance is already using the default port, run the same command with `-Port 4174` and open http://localhost:4174/. Browser-local data is separate for each port: use a backup/restore to move a test case deliberately; it is not silently migrated.

Start with Workspace care → Privacy & recovery and approve processing of synthetic test data. Then use Case intake and confirm extracted values. In Legal team & strategy → Evidence & claims, classify each source and add a locator before marking it reviewed. Record allegations, defences, a chronology and remedies. Resolve assessment gaps and use judgments as research questions. Before a represented filing, record engagement scope and fees in Workspace care → Advocate & firm. Tasks, enquiries and support tickets are local records: no advocate is contacted or assigned automatically.

Keep original documents separately. File limits are 10 MB each and 30 evidence records, with extracted text capped at 120,000 characters and PDF extraction capped at 100 pages. Scanned PDFs need conversion/transcription; automatic PDF OCR is not implemented. Duplicate fingerprints help avoid repeated indexing but are not proof of authenticity or a forensic chain of custody.

Download an encrypted record backup before replacing or clearing a case. It includes allowlisted case text/metadata, strategy and operational records, not original file bytes or the founder worksheet. It protects the downloaded backup only; browser storage and ordinary draft exports remain unencrypted. A restore requires inspection and typed RESTORE; erasure requires typed DELETE CASE. Neither action touches unrelated browser records. The app keeps one active case, not a law-firm multi-matter database.

## Research and safeguards

[RESEARCH.md](RESEARCH.md) records the practice sources, judgment sample, official rules and limits. [REVIEW.md](REVIEW.md) contains the customer, founder/investor, CTO, user, advocate and law-firm review, shipped fixes, verification and launch gates. This is a desk/source review, not interviews with clients or a retained legal team. The seven cases are a curated research library, not a representative outcome dataset or win-rate model. All arose under the 1986 Act; counsel must check applicability under the 2019 Act and later treatment.

Forum checks use consideration actually paid for an ordinary complaint: District up to ₹50 lakh; State above ₹50 lakh up to ₹2 crore; National above ₹2 crore under the 2021 jurisdiction rules. Unfair-contract, appeal and execution routes are not classified using this shortcut. The two-calendar-year limitation marker is only triage, not a legal deadline certification.

Drafts remain editable HTML documents with a `.doc` extension, not native DOCX, signed affidavits or assembled portal-ready PDFs. Complete applicable proformas, affidavits, attestation, Vakalatnama, annexures and pagination against the current e-Jagriti guide. Scrutiny acceptance and merits success cannot be guaranteed. Overview, filing, document inventory and activity now use the recorded case; empty cases do not claim filing progress.

## Verification

With Node.js 22+:

```text
node --test tests/strategy.test.cjs tests/product.test.cjs
node tests/browser-smoke.cjs
```

The first command runs 36 unit checks for legal triage, evidence, backups, storage recovery, import validation, engagement, costs and calendar safety. The browser smoke test uses an isolated Edge profile, synthetic records and a temporary server. It verifies 43 upload, drafting, export, persistence, research, recovery, security, keyboard and mobile flows, including actual UI restore and erase. Set `CONSUMER_TEST_BROWSER` to a local Chromium/Edge executable if the default Windows Edge path does not apply. Screenshots are written to a temporary directory printed by the test. These checks do not independently validate live OCR accuracy, every external adapter, actual portal submission or production security.

This remains a buildless static local app with localStorage as its development adapter. Do not upload real sensitive documents to this local demo. Before production use, replace localStorage with authenticated access controls, encrypted private object storage, malware scanning, a database, server-side document generation, audit logs, and reviewed legal-rule versions. Automated e-Jagriti submission is intentionally not implemented: users must complete authentication, CAPTCHA, payment and final submission on the official portal unless an authorised integration is separately verified.
