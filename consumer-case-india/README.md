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
- a virtual expert team view with strategist, evidence, scrutiny and resolution/execution roles;
- case-theory mapping from promise or duty to failure, proof and remedy;
- client-goal and settlement-posture decision logging;
- issue-specific support and failure signals instead of a fabricated win probability;
- verified outcome-learning notes that require a source URL before being recorded;
- an authority ledger linking the workflow to e-Jagriti, India Code, NCDRC, Bar Council and data-protection sources;
- conflict-check and written-engagement reminders before any real advocate relationship is represented.

The expert-team layer is deliberately a product workflow, not a claim that named law firms or advocates have endorsed the app. It is informed by publicly available consumer-litigation practice descriptions and official materials. It cannot predict or guarantee a win, replace an advocate, or turn unverified judgments into legal authority.

This remains a buildless static local app with localStorage as its development adapter. Do not upload real sensitive documents to this local demo. Before production use, replace localStorage with authenticated access controls, encrypted private object storage, malware scanning, a database, server-side document generation, audit logs, and reviewed legal-rule versions. Automated e-Jagriti submission is intentionally not implemented: users must complete authentication, CAPTCHA, payment and final submission on the official portal unless an authorised integration is separately verified.

