(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ConsumerProduct = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "2026-10-11.2";
  const CASE_KEYS = ["cc-case-v2", "cc-file-index-v2", "cc-strategy-v1", "cc-submission",
    "cc-objections-v1", "cc-packet-versions-v1", "cc-team-review-v1", "cc-outcome-learning-v1",
    "cc-review-request-v1", "cc-operations-v1", "cc-events-v1"];
  const ARRAY_KEYS = new Set(["cc-file-index-v2", "cc-objections-v1", "cc-packet-versions-v1",
    "cc-outcome-learning-v1", "cc-events-v1"]);
  const LIMITS = { file: 10 * 1024 * 1024, files: 30, extracted: 120000, backup: 8 * 1024 * 1024 };
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const text = value => String(value ?? "").trim();
  const money = value => {
    const s = text(value).replace(/[₹,\s]/g, "").replace(/^(?:INR|Rs\.?)/i, "");
    return /^\d+(?:\.\d{1,2})?$/.test(s) && Number(s) <= Number.MAX_SAFE_INTEGER / 100 ? Number(s) : null;
  };
  const sum = values => Math.round(values.reduce((n, v) => n + v, 0) * 100) / 100;
  function unsafeKeys(value) {
    if (!value || typeof value !== "object") return false;
    return Object.keys(value).some(key => ["__proto__", "constructor", "prototype"].includes(key) || unsafeKeys(value[key]));
  }
  function validateRecord(key, value) {
    if (unsafeKeys(value)) return false;
    if (value === null) return true;
    if (ARRAY_KEYS.has(key) ? !Array.isArray(value) : !object(value)) return false;
    if (key === "cc-file-index-v2") return value.length <= LIMITS.files && new Set(value.map(f=>f?.id)).size === value.length && value.every(f =>
      object(f) && /^[a-zA-Z0-9][a-zA-Z0-9-]{0,100}$/.test(f.id) && typeof f.name === "string" && (!f.text || typeof f.text === "string") &&
      (!f.candidates || object(f.candidates)));
    if (key === "cc-case-v2") return Object.values(value).every(v => typeof v === "string");
    if (key === "cc-strategy-v1") {
      for (const name of ["allegations", "remedies", "chronology", "reviewRequests", "outcomes", "snapshots"]) {
        if (value[name] !== undefined && (!Array.isArray(value[name]) || value[name].some(v => !object(v)))) return false;
      }
      for (const name of ["evidence", "caseReview", "packet"]) if (value[name] !== undefined && !object(value[name])) return false;
      if (value.snapshots?.some(s => !object(s.brief) || !object(s.brief.assessment) ||
        !Array.isArray(s.brief.assessment.gaps) || !Array.isArray(s.brief.evidence))) return false;
      for (const item of [...(value.allegations || []), ...(value.remedies || [])])
        if (item.evidenceIds !== undefined && !Array.isArray(item.evidenceIds)) return false;
    }
    if (key === "cc-operations-v1") {
      for (const name of ["parties", "deadlines", "tickets"]) if (value[name] !== undefined &&
        (!Array.isArray(value[name]) || value[name].some(v => !object(v)))) return false;
      for (const name of ["engagement", "costs", "consents"]) if (value[name] !== undefined && !object(value[name])) return false;
      for (const row of [...(value.parties || []), ...(value.deadlines || []), ...(value.tickets || [])])
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,100}$/.test(row.id) ||
          Object.entries(row).some(([k,v]) => k !== "done" && typeof v !== "string")) return false;
      if (value.deadlines?.some(d => !date(d.date) || !text(d.title) || !text(d.source))) return false;
    }
    if (key === "cc-objections-v1" && value.some(v => typeof v.text !== "string")) return false;
    if (ARRAY_KEYS.has(key) && value.some(v => !object(v))) return false;
    return true;
  }
  function createStore(storage, onChange) {
    const issues = new Map(), unsaved = new Map();
    const signal = (type, key) => { if (onChange) onChange({ type, key, issues: Array.from(issues.values()) }); };
    function read(key, fallback) {
      if (unsaved.has(key)) return unsaved.get(key);
      try {
        const raw = storage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        if (!validateRecord(key, parsed) || parsed === null) throw new Error("Invalid record shape");
        return parsed;
      } catch (_) {
        issues.set(key, { key, type: "read", message: "Saved data could not be read. It has been preserved; export a diagnostic copy before restoring." });
        return fallback;
      }
    }
    function write(key, value) {
      if (!validateRecord(key, value)) throw new Error("Invalid record: " + key);
      unsaved.set(key, value);
      if (issues.get(key)?.type === "read") { signal("error", key); return false; }
      try { storage.setItem(key, JSON.stringify(value)); unsaved.delete(key); issues.delete(key); signal("saved", key); return true; }
      catch (_) { issues.set(key, { key, type: "write", message: "A change is only in memory: browser saving failed. Export a backup before closing this page." }); signal("error", key); return false; }
    }
    function snapshot() {
      const records = {};
      for (const key of CASE_KEYS) {
        const fallback = ARRAY_KEYS.has(key) ? [] : {};
        records[key] = read(key, fallback);
      }
      return { format: "consumer-case-records", version: 1, exportedAt: new Date().toISOString(),
        scope: "Case text and metadata only; no original document bytes. Do not enter portal credentials in any case field.",
        records: JSON.parse(JSON.stringify(records)) };
    }
    function replace(records, confirmation) {
      if (confirmation !== "RESTORE") throw new Error("Type RESTORE to replace this case.");
      validateBackup({ format: "consumer-case-records", version: 1, records });
      const previous = new Map(CASE_KEYS.map(key => [key, storage.getItem(key)]));
      try {
        for (const key of CASE_KEYS) records[key] == null ? storage.removeItem(key) : storage.setItem(key, JSON.stringify(records[key]));
      } catch (_) {
        let restored = true;
        for (const [key, value] of previous) {
          try { value === null ? storage.removeItem(key) : storage.setItem(key, value); } catch (_) { restored = false; }
        }
        throw new Error(restored ? "Restore failed; previous browser records were restored." :
          "Restore and rollback failed. Do not close this page; keep both backup files and repair browser storage.");
      }
      issues.clear(); unsaved.clear(); signal("restored", "");
      return true;
    }
    function erase(confirmation) {
      if (confirmation !== "DELETE CASE") throw new Error("Type DELETE CASE to erase this browser's case records.");
      for (const key of CASE_KEYS) storage.removeItem(key);
      issues.clear(); unsaved.clear(); signal("deleted", "");
    }
    function diagnostics() { return Object.fromEntries(CASE_KEYS.map(key => [key, storage.getItem(key)])); }
    return { read, write, snapshot, replace, erase, diagnostics, issues: () => Array.from(issues.values()),
      hasUnsaved: () => unsaved.size > 0 };
  }
  function validateBackup(data) {
    if (!object(data) || data.format !== "consumer-case-records" || data.version !== 1 || !object(data.records))
      throw new Error("This is not a supported ConsumerCase backup.");
    if (!Object.hasOwn(data.records,"cc-case-v2") || !Object.hasOwn(data.records,"cc-file-index-v2"))
      throw new Error("Backup is missing the case or evidence records.");
    for (const [key, value] of Object.entries(data.records)) {
      if (!CASE_KEYS.includes(key) || !validateRecord(key, value)) throw new Error("Unsupported or invalid backup record: " + key);
    }
    if (new TextEncoder().encode(JSON.stringify(data)).length > LIMITS.backup) throw new Error("Backup exceeds the 8 MB limit.");
    return data;
  }
  function uploadIssue(file, count, consent) {
    if (!consent) return "Accept the local processing notice before attaching a document.";
    if (count >= LIMITS.files) return "Keep at most 30 evidence records in this prototype.";
    if (!file.size) return "This file is empty.";
    if (file.size > LIMITS.file) return "Each file must be 10 MB or smaller.";
    if (!/\.(pdf|docx|jpg|jpeg|png|txt|csv|eml)$/i.test(file.name)) return "Supported: PDF, DOCX, JPG, PNG, TXT, CSV and EML. Executables, HTML and archives are not accepted.";
    return "";
  }
  function engagement(e) {
    const required = { advocateName: "Advocate's name", enrollment: "Enrollment / Bar Council details",
      scope: "Written scope and exclusions", feeTerms: "Written fee and expense terms" };
    const gaps = Object.entries(required).filter(([key]) => !text(e?.[key])).map(([, label]) => label);
    const checks = { conflictChecked: "Conflict check", termsAccepted: "Client acceptance of engagement",
      advocateAccepted: "Advocate acceptance", sharingApproved: "Client approval to share the case file" };
    Object.entries(checks).forEach(([key, label]) => { if (e?.[key] !== true) gaps.push(label); });
    return { gaps, label: gaps.length ? "Engagement incomplete" : "Engagement recorded — independently verify", verified: false };
  }
  function costs(c) {
    const categories = { platform: "Platform preparation", advocate: "Advocate review / representation",
      government: "Official filing fee", expenses: "Notary, copies, service and other expenses" };
    const lines = Object.entries(categories).map(([key, label]) => ({ key, label, amount: money(c?.[key]) }));
    return { lines, total: lines.every(l => l.amount !== null) ? sum(lines.map(l => l.amount)) : null,
      known: sum(lines.filter(l => l.amount !== null).map(l => l.amount)), missing: lines.filter(l => l.amount === null).map(l => l.label) };
  }
  function economics(p) {
    const keys = ["netRevenue", "advocatePayout", "reviewMinutes", "supportMinutes", "hourlyCost",
      "ocrCost", "storageCost", "acquisitionCost", "refundReserve", "monthlyFixed", "staffHours"];
    const v = Object.fromEntries(keys.map(k => [k, money(p?.[k])]));
    if (keys.some(k => v[k] === null)) return { complete: false, missing: keys.filter(k => v[k] === null) };
    const labour = (v.reviewMinutes + v.supportMinutes) / 60 * v.hourlyCost;
    const variable = sum([v.advocatePayout, labour, v.ocrCost, v.storageCost, v.acquisitionCost, v.refundReserve]);
    const contribution = Math.round((v.netRevenue - variable) * 100) / 100;
    return { complete: true, variable, contribution,
      breakEven: contribution > 0 ? Math.ceil(v.monthlyFixed / contribution) : null,
      capacity: v.reviewMinutes + v.supportMinutes > 0 ? Math.floor(v.staffHours * 60 / (v.reviewMinutes + v.supportMinutes)) : null };
  }
  function operationalGaps(ops, represented) {
    const gaps = [];
    if (represented && engagement(ops.engagement || {}).gaps.length) gaps.push({ id:"engagement",severity:"high",
      title:"Confirm the advocate's engagement",detail:"Record and independently verify identity, conflicts, scope, fees, client approval and advocate acceptance. A local enquiry is not representation.",owner:"Client operations",source:"portal" });
    for (const p of ops.parties || []) if (!text(p.name) || !text(p.address) || !text(p.reason)) gaps.push({
      id:"additional-party-"+p.id,severity:"high",title:"Complete the additional party",
      detail:"Confirm the full legal name, serviceable address and why this party is joined; counsel must review the role.",owner:"Lead advocate",source:"portal" });
    return gaps;
  }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return null;
    const d = new Date(value + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? d : null;
  }
  function calendar(deadlines, stamp) {
    const escape = s => String(s ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
    const compact = s => s.replace(/-/g, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ConsumerCase India//Local reminders//EN", "CALSCALE:GREGORIAN"];
    for (const item of deadlines.filter(item => !item.done && date(item.date) && text(item.title))) {
      const end = new Date(date(item.date).getTime() + 86400000).toISOString().slice(0, 10);
      const uid = text(item.id).replace(/[^a-zA-Z0-9-]/g, "") || compact(item.date);
      lines.push("BEGIN:VEVENT", "UID:" + uid + "@consumercase.local", "DTSTAMP:" + (stamp || new Date().toISOString()).replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"),
        "DTSTART;VALUE=DATE:" + compact(item.date), "DTEND;VALUE=DATE:" + compact(end),
        "SUMMARY:" + escape(item.title), "DESCRIPTION:" + escape((item.source || "Source needs confirmation") + " | " + (item.note || "") +
          " | User-recorded reminder, not a legally certified deadline."), "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const encoder = new TextEncoder(), folded = [];
    for (const line of lines) {
      let part = "", bytes = 0;
      for (const char of line) {
        const size = encoder.encode(char).length;
        if (bytes + size > 73) { folded.push(part); part = " "; bytes = 1; }
        part += char; bytes += size;
      }
      folded.push(part);
    }
    return folded.join("\r\n") + "\r\n";
  }
  function bytesToBase64(bytes) {
    let s = ""; for (const byte of bytes) s += String.fromCharCode(byte);
    return btoa(s);
  }
  function base64ToBytes(s) {
    if (typeof s !== "string" || s.length > LIMITS.backup * 2 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error("Invalid encrypted data.");
    return Uint8Array.from(atob(s), char => char.charCodeAt(0));
  }
  async function keyFrom(password, salt, iterations, crypto) {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptBackup(data, password, crypto = globalThis.crypto) {
    validateBackup(data);
    if (text(password).length < 12 || password.length > 256) throw new Error("Use a passphrase of 12–256 characters. It cannot be recovered if lost.");
    if (!crypto?.subtle) throw new Error("Encryption needs a secure browser context. Open the app through localhost.");
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iterations = 600000;
    const key = await keyFrom(password, salt, iterations, crypto);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("ConsumerCase Backup v1") },
      key, new TextEncoder().encode(JSON.stringify(data)));
    return { format: "consumer-case-encrypted", version: 1, cipher: "AES-256-GCM", kdf: "PBKDF2-SHA256",
      iterations, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
  }
  async function decryptBackup(data, password, crypto = globalThis.crypto) {
    if (!object(data) || data.format !== "consumer-case-encrypted" || data.version !== 1 ||
      data.cipher !== "AES-256-GCM" || data.kdf !== "PBKDF2-SHA256" || !Number.isInteger(data.iterations) ||
      data.iterations < 600000 || data.iterations > 1000000) throw new Error("Unsupported encrypted backup.");
    if (!crypto?.subtle) throw new Error("Decryption needs a secure browser context.");
    if (typeof password !== "string" || password.length > 256) throw new Error("Invalid passphrase.");
    const salt = base64ToBytes(data.salt), iv = base64ToBytes(data.iv), ciphertext = base64ToBytes(data.ciphertext);
    if (salt.length !== 16 || iv.length !== 12) throw new Error("Invalid encrypted backup parameters.");
    try {
      const key = await keyFrom(password, salt, data.iterations, crypto);
      const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode("ConsumerCase Backup v1") }, key, ciphertext);
      return validateBackup(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (_) { throw new Error("Cannot unlock this backup. Check the passphrase and file; no records have been changed."); }
  }
  return { VERSION, CASE_KEYS, LIMITS, object, text, money, sum, date, validateRecord, createStore,
    validateBackup, uploadIssue, engagement, costs, economics, operationalGaps, calendar, encryptBackup, decryptBackup };
});
