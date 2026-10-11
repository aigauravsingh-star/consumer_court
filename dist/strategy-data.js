(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.ConsumerStrategyData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return {
    researchedOn: "11 October 2026",
    cases: [
      {
        id: "sgs-dolphin-2021", title: "SGS India Ltd. v. Dolphin International Ltd.", date: "6 October 2021",
        act: "Consumer Protection Act, 1986", outcomeType: "dismissal", outcome: "Complaint dismissed; award set aside",
        sectors: ["general", "goods"], tags: ["proof", "deficiency", "inspection", "testing", "defect", "evidence"],
        url: "https://api.sci.gov.in/supremecourt/2009/23411/23411_2009_11_1501_30614_Judgement_06-Oct-2021.pdf",
        locator: "C.A. 5759/2009 • paragraphs 22–26, PDF pp. 12–14",
        facts: "Groundnuts were inspected at the loading port, then spent two months at sea. The certification addressed quality at loading, with qualifications concerning later deterioration.",
        reason: "The complainant did not prove deficient inspection using relevant comparative sample results. The Supreme Court set aside the NCDRC award and dismissed the complaint.",
        distinguish: "Compare the precise inspection obligation, sampling method and condition at certification. Later deterioration is different from an inaccurate initial inspection.",
        lesson: "Connect each alleged breach to contemporaneous proof, testing and sample custody. Missing opponent records do not automatically establish your allegation."
      },
      {
        id: "lilavati-2019", title: "Lilavati Kirtilal Mehta Medical Trust v. Unique Shanti Developers", date: "14 November 2019",
        act: "Consumer Protection Act, 1986", outcomeType: "remand", outcome: "Maintainability restored; merits remanded",
        sectors: ["housing", "general"], tags: ["consumer status", "commercial purpose", "housing", "profit", "maintainability"],
        url: "https://api.sci.gov.in/supremecourt/2016/39297/39297_2016_14_1501_18237_Judgement_14-Nov-2019.pdf",
        locator: "Paragraphs 7–9, PDF pp. 16–21 • (2020) 2 SCC 265",
        facts: "A trust purchased 29 flats to provide rent-free accommodation for hospital nurses.",
        reason: "The accommodation purchase lacked a direct nexus with profit generation. The matter returned to NCDRC for evidence and merits; the Supreme Court did not award compensation.",
        distinguish: "An organisation's identity or transaction size is not the whole test. Compare actual use, rental income, beneficiaries and connection to profits.",
        lesson: "Record the transaction's actual purpose. Keep eligibility decisions separate from proof of defect and final relief."
      },
      {
        id: "harsolia-2023", title: "National Insurance Co. Ltd. v. Harsolia Motors", date: "13 April 2023",
        act: "Consumer Protection Act, 1986", outcomeType: "remand", outcome: "Insurer's appeals dismissed; merits pending",
        sectors: ["insurance"], tags: ["insurance", "commercial purpose", "consumer status", "indemnity", "maintainability"],
        url: "https://api.sci.gov.in/supremecourt/2005/5607/5607_2005_5_1501_43491_Judgement_13-Apr-2023.pdf",
        locator: "Paragraphs 42–49, PDF pp. 31–34 • (2023) 8 SCC 362",
        facts: "A dealership insured its showroom, garage and machinery against loss. Property was damaged during the 2002 riots.",
        reason: "Insurance to indemnify business property lacked the relevant direct link to generating profits. The State Commission was directed to decide the complaints on merits.",
        distinguish: "The ruling addresses this insurance service's purpose. It does not establish coverage, loss value or eligibility for all business transactions.",
        lesson: "Examine the particular service and policy. Prove coverage and quantum separately from consumer status."
      },
      {
        id: "kandimalla-2009", title: "Kandimalla Raghavaiah & Co. v. National Insurance Co.", date: "10 July 2009",
        act: "Consumer Protection Act, 1986", outcomeType: "dismissal", outcome: "Limitation dismissal upheld",
        sectors: ["insurance", "general"], tags: ["limitation", "delay", "insurance", "cause of action", "correspondence"],
        url: "https://api.sci.gov.in/jonew/judis/35035.pdf",
        locator: "Paragraphs 11–20, PDF pp. 7–14 • (2009) 7 SCC 768",
        facts: "A fire occurred in March 1988. Claim forms were first requested in November 1992; the complaint was filed in October 1997 without a delay-condonation application.",
        reason: "Later correspondence refusing forms did not extend the complaint period. The complainant's appeal was dismissed.",
        distinguish: "Prolonged claimant inactivity differs from an insurer delaying a promptly lodged claim. Accrual and any exceptions need fact-specific review.",
        lesson: "Record incident, claim and filing dates. Obtain legal review of a supported delay explanation; a new notice does not automatically restart time."
      },
      {
        id: "dlf-dhanda-2019", title: "DLF Homes Panchkula Pvt. Ltd. v. D.S. Dhanda", date: "10 May 2019",
        act: "Consumer Protection Act, 1986", outcomeType: "relief", outcome: "Buyer relief retained; compensation reduced",
        sectors: ["housing"], tags: ["housing", "compensation", "refund", "interest", "double recovery", "delay"],
        url: "https://api.sci.gov.in/supremecourt/2019/3495/3495_2019_Judgement_10-May-2019.pdf",
        locator: "Paragraphs 16–19 and 23–26, PDF pp. 10–15 • (2020) 16 SCC 318",
        facts: "Buyers claimed relief for delayed possession. The record included an accepted extension, a construction restraint and settlements in the project.",
        reason: "The Court modified compensation, rejected unsupported overlapping damages and reduced refund interest while retaining relief and litigation costs.",
        distinguish: "Check the remedy elected, accepted extensions, delay periods and existing compensation. The particular interest rate is not a universal entitlement.",
        lesson: "Explain every compensation head and calculation. Avoid double counting one loss under multiple labels."
      },
      {
        id: "arifur-2020", title: "Wg. Cdr. Arifur Rahman Khan v. DLF Southern Homes", date: "24 August 2020",
        act: "Consumer Protection Act, 1986", outcomeType: "relief", outcome: "Buyers' appeals partly allowed",
        sectors: ["housing"], tags: ["housing", "possession", "amenities", "compensation", "contract", "settlement"],
        url: "https://api.sci.gov.in/supremecourt/2019/27240/27240_2019_33_1501_23551_Judgement_24-Aug-2020.pdf",
        locator: "Paragraphs 55–57, PDF pp. 52–53 • (2020) 16 SCC 512",
        facts: "Buyers challenged delayed possession and unfulfilled amenity representations. Some claimants had specific settlements or had sold their rights.",
        reason: "The NCDRC dismissal was set aside and eligible buyers obtained additional delay compensation. Other challenges to charges failed.",
        distinguish: "Check agreements, representations, payment dates, possession and claimant-specific settlements. A later buyer is not automatically barred in every refund dispute.",
        lesson: "Preserve brochures and agreements alongside payment and possession records. Assess each alleged failure and each claimant's position separately."
      },
      {
        id: "khatema-2021", title: "Khatema Fibres Ltd. v. New India Assurance Co.", date: "28 September 2021",
        act: "Consumer Protection Act, 1986", outcomeType: "relief", outcome: "Enhanced recovery refused; limited award retained",
        sectors: ["insurance"], tags: ["insurance", "surveyor", "stock", "loss", "quantum", "contradictions"],
        url: "https://api.sci.gov.in/supremecourt/2018/28530/28530_2018_11_1502_30395_Judgement_28-Sep-2021.pdf",
        locator: "Paragraphs 18–23 and 32–39, PDF pp. 10–14 and 18–22 • (2023) 15 SCC 327",
        facts: "An insured claimed a substantially larger stock loss than the surveyor assessed. Stock records conflicted; the burnt and salvage areas differed.",
        reason: "The Court dismissed the request for enhanced recovery and retained the insurer-admitted limited award. Mere disagreement did not show deficiency in the reasoned assessment.",
        distinguish: "A survey report is not conclusive. Identify an actual methodological or professional shortcoming, with reconciled records, rather than relying on a different estimate alone.",
        lesson: "Reconcile inventory versions, quantity, unit value, photographs and salvage. Tie the requested amount to consistent evidence."
      }
    ],
    firms: [
      { name: "AZB & Partners", url: "https://www.azbpartners.com/practice-area/dispute-resolution/",
        practice: "Senior-partner oversight, contract knowledge and in-house forensics alongside legal research.",
        adaptation: "Add an evidence review and a clear senior-review deliverable to the consumer brief." },
      { name: "Cyril Amarchand Mangaldas", url: "https://www.cyrilshroff.com/practice/litigation/",
        practice: "Litigation solutions reflect client values and business goals; teams coordinate suitable local counsel.",
        adaptation: "Record the client's remedy, budget, communication preference and local forum questions." },
      { name: "Shardul Amarchand Mangaldas", url: "https://www.amsshardul.com/services/dispute-resolution/",
        practice: "Dispute avoidance, pre-litigation, risk assessment and enforcement; investigations include exculpatory evidence.",
        adaptation: "Capture adverse facts and likely defences as well as favourable evidence." },
      { name: "Khaitan & Co", url: "https://www.khaitanco.com/expertise/dispute-resolution",
        practice: "Pre-dispute advice, settlement discussions, representation and award enforcement or challenge.",
        adaptation: "Compare actual settlement terms and track compliance after the outcome." },
      { name: "RG Associates • consumer practice", url: "https://rgassociateshyd.com/services/consumer-protection/",
        practice: "Case analysis, drafting, representation, settlement or adjudication and consumer-order execution.",
        adaptation: "Give clients and advocates one structured brief spanning preparation through recovery." }
    ],
    roles: [
      { title: "Client operations coordinator", deliverable: "Instructions, document requests, communication and date log.", approval: "Client confirms facts; lead advocate confirms legal scope" },
      { title: "Lead consumer advocate", deliverable: "Maintainability, limitation, parties, forum and case strategy memo.", approval: "Advocate owns legal advice; client owns objectives and spend" },
      { title: "Evidence analyst", deliverable: "Indexed proof, chronology, source locations and contradictions.", approval: "Client confirms accuracy; advocate assesses sufficiency" },
      { title: "Research & drafting advocate", deliverable: "Verified authority analysis, allegation matrix and pleading draft.", approval: "Lead advocate approves law; client confirms factual assertions" },
      { title: "Senior advocate reviewer", deliverable: "Independent critique of strategy, adverse evidence and material drafts.", approval: "Reviewer records findings; lead advocate resolves them" },
      { title: "Settlement & execution advocate", deliverable: "Offer comparison, settlement terms and order-compliance plan.", approval: "Client approves settlement; advocate approves procedure" }
    ]
  };
});

