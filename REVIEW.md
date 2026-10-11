# ConsumerCase India: product and launch review

Reviewed 11–12 October 2026. This is an evidence-backed desk review and implementation pass, not customer interviews, a security audit or advice from an appointed team of law-firm partners.

## Outcome

The app is a more honest and recoverable assisted-preparation prototype. Its customer journey, advocate handoff and operating-cost controls are implemented and tested. It is **not ready for real sensitive client files or a paid managed legal service**. More screens cannot substitute for secure infrastructure, a real advocate engagement or a staffed service.

## Review by perspective

| Perspective | Problem found | Implemented in this pass | Still needed for live operation |
| --- | --- | --- | --- |
| Indian consumer | Legal complexity, unknown total cost and confusion about who files | Plain English/Hindi journey guidance, separate cost categories, fee-source/date records, scope/refund notes, live portal field mapping | Interview consumers across languages and literacy levels; test comprehension of scope, price and portal responsibility |
| Everyday user | Sample progress looked like actual work; lost work and false save confirmations were possible | Real overview/documents/activity, consent gates, persisted enquiries/support records, quota warnings, backups and confirmed restore/erase | Authenticated cross-device continuity, human support and usability testing with assistive technologies |
| Founder investing time | No way to see whether delivery time and support would consume the fee | Observed/scenario cost worksheet, contribution, break-even and staffing-capacity warnings | Run a narrow pilot; measure actual paid conversion, review minutes, rework, support, refunds and net contribution |
| Investor evaluating capital | Feature count could obscure delivery risk and weak unit economics | Explicit launch-blocker register; costs are unknown until entered and projections are not presented as performance | Validated demand, real operating metrics, governance, incident readiness and reliable reviewer supply |
| CTO | Corrupt local JSON could break consumers; unsafe values, imports and unlimited uploads increased risk | Central storage guard, exact-key rollback restore, import shape/ID validation, HTML escaping, encrypted backup exports, limits/signature checks and duplicate fingerprints | Accounts, MFA where appropriate, case-level RBAC, secure originals, malware scanning, durable database, access logs, monitoring, recovery drills and dependency governance |
| Consumer advocate | No explicit engagement, incomplete party/service details and weak instructions | Enrollment/identity/conflicts/scope/fees/acceptance/sharing records, additional parties with joinder reasons, written instructions in advocate briefs, unsigned preparation templates | Independent advocate verification, real conflicts search, professionally settled engagement/authority documents and final filing review |
| Law firm | No reliable matter handoff, missed dates or ownership clarity | Exportable engagement handoff, source-backed user deadlines and calendars, local escalation records and full brief versions | Firm multi-matter database, secure reviewer assignments, version approval, staffed escalation, service-proof tracking and authenticated client communications |

No checkboxes authenticate an advocate, execute an engagement or verify an order. No calendar download sends an automatic reminder. No enquiry or support record is sent to a person. These distinctions appear in the interface and exports.

## Important implementation details

- `product-core.js` owns bounded imports, storage transactions, file policy, engagement/cost/operations calculations, calendar export and backup cryptography.
- `storage-guard.js` loads before the original inline adapters. Damaged data is preserved, not overwritten with empty defaults. Failed writes remain available in memory and are flagged before leaving.
- `product-ui.js` adds Workspace care and replaces illustrative case panels with actual recorded data. Processing and external-library consent default to off.
- Backup exports use Web Crypto AES-256-GCM with random salt/IV and PBKDF2-HMAC-SHA256 at 600,000 iterations. This encrypts exports only, not localStorage, diagnostic copies or editable drafts. Passphrases are never persisted.
- Restore first validates/decrypts and previews without changing the case. Typed RESTORE replaces only allowlisted case records and rolls back previous values if a write fails. If damaged records exist, export the raw diagnostic copy before restoring: ordinary snapshots use safe readable values, not damaged original bytes.
- Case erasure requires typed DELETE CASE and removes exact case keys only. It cannot erase downloaded files, original documents, shared copies or official portal records. Founder worksheet and unrelated browser records are untouched.
- Intake accepts bounded TXT/CSV/EML, PDF, DOCX and image files. It requires consent, checks basic signatures and skips identical bytes. This is not malware scanning, authenticity verification or robust content disarm.
- Hindi guidance is not a legal translation of the full product. Hindi image OCR requires external language data. Scanned-PDF OCR, complete legal localisation and accurate live-adapter behaviour are not certified.
- Complaint, party memo, chronology, index, synopsis and affidavit templates remain preparation drafts. HTML saved with `.doc` is not native DOCX, notarisation or assembled filing-ready PDF.
- Manual portal status requires an observed description. It is labelled user-reported; an optional attachment retains metadata only. Failed saving never claims a successful save.
- There is one active browser-local case. Concurrent tabs warn about changes but do not provide transactional collaborative editing. No case information is submitted automatically.

## Source-based decisions

The [official e-Jagriti complaint guide](https://e-jagriti.gov.in/static/media/CC_Filing.34e0fc5dd03b1d864cab.pdf) separately asks for cause-of-action date, paid consideration, claim amount and cause location in Step 4. Steps 6–7 cover additional/proforma parties; Step 8 covers the applicable document uploads. This informed the live field map, additional-party capture and explicit remaining-document warnings. The guide is a workflow reference, not a guarantee against scrutiny defects. Payment, authentication, CAPTCHA and final submission remain on the official portal.

The [Department of Consumer Affairs rules register](https://consumeraffairs.gov.in/pages/consumer-protection-acts) lists amendments including fee rules. Rather than inventing a fee from claim size or silently using an old table, the app records a user-confirmed current official fee, source and check date. No official-fee calculation is certified by this release.

The [MeitY final DPDP Rules, 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), G.S.R. 846(E), 13 November 2025, have phased commencement: Rules 1, 2 and 17–21 immediately; Rule 4 after one year; Rules 3, 5–16 and 22–23 after eighteen months. Notice and safeguard requirements were used as design inputs. As of this review, all provisions must not be treated as already operative. Applicability, commencement and any later notifications need legal review; this interface does not certify DPDP compliance.

[OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) informs the PBKDF2-HMAC-SHA256 work factor. It does not make this prototype a FIPS-certified product or replace an independent security assessment.

[RESEARCH.md](RESEARCH.md) contains the existing official judgments and public firm-practice review. The curated case library is not a statistical dataset; maintainability/remand decisions are not counted as merits wins.

## Capital-conscious launch sequence

1. Validate one narrow, repeatable consumer-dispute segment with interviews and synthetic or appropriately authorised, securely handled files. Establish whether assisted preparation actually saves review time.
2. Settle real scope, exclusions, prices, cancellation/refund terms and responsibility for portal filing with participating advocates. Do not advertise a real managed service until supply and support exist.
3. Build the secure multi-matter backend and original-document pipeline before accepting sensitive evidence. Server-side access enforcement, not a front-end “owner” tab, is the security boundary.
4. Produce and professionally review complete PDF filing packets, including applicability, official proforma, paragraph-specific affidavit verification, annexures, service addresses and pagination. Keep rule versions and test fixtures.
5. Operate a supervised pilot, measuring completion, preparation defects, correction time, missed updates, actual refunds and contribution. Track merits outcomes separately from procedural acceptance.
6. Enable checkout, reviewer assignment and notifications only after those connected services actually work. Evaluate automated e-Jagriti submission only with independently confirmed authorised access; never bypass portal safeguards.

These are ordered operating gates, not fabricated deadlines or revenue forecasts. External advocate recruitment, pricing approval, production infrastructure and legal sign-off require owner decisions and real participants.

## Verified and not verified

Verified locally: **36 unit tests and 43 isolated Edge browser checks**, with no uncaught browser errors. Tests cover legal triage, storage corruption/quota, backup cryptography and rollback, unsafe imports, upload consent/duplicates, drafts, engagement, cost unknowns, calendars, persistent records, actual UI restore/erase, keyboard focus and mobile page overflow. Desktop and 390-pixel mobile screens were visually inspected.

Not verified: actual end-user interviews, bar-enrollment checks, lawyer acceptance, live external OCR/PDF/DOCX accuracy, every commission's local practice, original-document custody, all production security properties, portal status or submission, customer payment/support delivery, accessibility certification and production privacy compliance.

The default local address is http://localhost:4173/. An older server kept the pre-update asset list, and the environment rejected the restart action, so this review uses a separate updated instance at http://localhost:4174/ without stopping the old process. Browser storage is separate for each port; no old case is silently moved. Sites publication remains blocked by the Windows policy rejection of the installed Git runtime dependency; no live hosted release is claimed or safeguard bypass attempted.
