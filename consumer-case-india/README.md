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

This remains a buildless static local app with localStorage as its development adapter. Do not upload real sensitive documents to this local demo. Before production use, replace localStorage with authenticated access controls, encrypted private object storage, malware scanning, a database, server-side document generation, audit logs, and reviewed legal-rule versions. Automated e-Jagriti submission is intentionally not implemented: users must complete authentication, CAPTCHA, payment and final submission on the official portal unless an authorised integration is separately verified.

