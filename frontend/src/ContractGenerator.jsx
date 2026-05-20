import React, { useEffect, useState } from 'react';
import './contract-generator.css';

const STORAGE_KEY = 'rtbo-basketball-assigning-contracts';

const stateOptions = [
  ['', 'Select state'],
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
];

const categories = [
  'High School', 'Middle School', 'College / University', 'Junior College', 'NAIA Event', 'NCAA Event',
  'Community Center', 'Boys & Girls Club', 'Recreation League', 'Event Center', 'Showcase Tournament',
  'Travel Basketball Tournament', 'AAU / Grassroots Event', 'Nike Event', 'Adidas Event', 'Under Armour Event',
  'New Balance Event', 'Reebok Event', 'Private Sporting Event', 'League Contract', 'Camp / Clinic',
  'One-Day Event', 'Multi-Day Event', 'Other Sporting Event'
];

const organizationTypes = [
  'School District', 'High School', 'College / University', 'Athletic Conference', 'Tournament Company',
  'Event Center', 'Community Center', 'Boys & Girls Club', 'Shoe Company / Brand Event',
  'Recreation Department', 'Private Organization', 'Nonprofit Organization', 'Other'
];

const eventTypes = [
  'Regular Season Games', 'Tournament', 'Showcase', 'Camp', 'League Play', 'Playoffs', 'Championship Event',
  'Scrimmage', 'Jamboree', 'All-Star Event', 'Brand-Sponsored Event', 'Other'
];

const ruleSets = [
  'NFHS Rules', 'NJCAA Women Rules', 'NJCAA Men Rules', 'NAIA Women Rules', 'NAIA Men Rules',
  'NCAA Women Rules', 'NCAA Men Rules', 'WNBA-Style Rules', 'NBA-Style Rules',
  'Tournament-Specific Rules', 'Modified Rules', 'House Rules'
];

const tabs = [
  'Contract Details', 'Client & Event', 'Officials & Rules', 'Fees & Payment',
  'Safety & Conduct', 'Brand & Media', 'Legal Terms', 'Signatures'
];

const templates = [
  ['high-school', 'High School Assigning Contract', 'High School', 'High School', 'Regular Season Games', 'NFHS Rules', 'Varsity', 'School, district, and athletic department assigning agreement.'],
  ['college-university', 'College / University Contract', 'College / University', 'College / University', 'Regular Season Games', 'NCAA Men Rules', 'NCAA', 'College basketball game and event assigning agreement.'],
  ['tournament', 'Tournament Contract', 'Showcase Tournament', 'Tournament Company', 'Tournament', 'Tournament-Specific Rules', 'Mixed Levels', 'Single-site or multi-site tournament assigning agreement.'],
  ['brand-showcase', 'Brand / Showcase Contract', 'AAU / Grassroots Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Brand, media, livestream, and elite showcase event agreement.'],
  ['league-season', 'League / Season Contract', 'League Contract', 'Athletic Conference', 'League Play', 'NFHS Rules', 'Mixed Levels', 'Recurring league, conference, or season-long assigning agreement.'],
  ['camp-clinic', 'Camp / Clinic Contract', 'Camp / Clinic', 'Private Organization', 'Camp', 'Modified Rules', 'Youth / Grassroots', 'Camp, clinic, and instructional event agreement.']
].map(([id, title, category, organizationType, eventType, ruleSet, levelOfPlay, description]) => ({
  id, title, category, organizationType, eventType, ruleSet, levelOfPlay, description
}));

const fields = {
  'Contract Details': [
    ['Contract Category', 'contractCategory', 'select', categories], ['Agreement Number', 'agreementNumber'],
    ['Date Prepared', 'datePrepared', 'date'], ['Effective Date', 'effectiveDate', 'date'], ['Expiration Date', 'expirationDate', 'date'],
    ['Renewal Option', 'renewalOption', 'select', ['No Renewal', 'Automatic Renewal', 'Renewal by Written Agreement', 'Seasonal Renewal', 'Event-by-Event Renewal']],
    ['Contract Status', 'contractStatus', 'select', ['Draft', 'Pending Review', 'Sent for Signature', 'Signed', 'Active', 'Expired', 'Terminated']],
    ['RTBO Representative', 'rtboRepresentative'], ['RTBO Representative Title', 'rtboTitle'],
    ['RTBO Email', 'rtboEmail', 'email'], ['RTBO Phone', 'rtboPhone', 'tel'], ['RTBO Website', 'rtboWebsite', 'url'],
    ['RTBO Mailing Address', 'rtboAddress', 'textarea', null, true]
  ],
  'Client & Event': [
    ['Client / Organization Name', 'clientName'], ['Organization Type', 'organizationType', 'select', organizationTypes],
    ['Primary Contact', 'primaryContact'], ['Primary Contact Title', 'contactTitle'], ['Email Address', 'contactEmail', 'email'],
    ['Phone Number', 'contactPhone', 'tel'], ['Billing Address', 'billingAddress', 'textarea', null, true],
    ['Event / Venue Address', 'venueAddress', 'textarea', null, true], ['Event Name', 'eventName'],
    ['Event Type', 'eventType', 'select', eventTypes], ['Event Start Date', 'startDate', 'date'], ['Event End Date', 'endDate', 'date'],
    ['Event Start Time', 'startTime', 'time'], ['Event End Time', 'endTime', 'time'], ['Number of Courts', 'numberOfCourts', 'number'],
    ['Number of Gyms / Facilities', 'numberOfGyms', 'number'], ['Estimated Number of Games', 'estimatedGames', 'number'],
    ['Expected Level of Play', 'levelOfPlay', 'select', ['Middle School', 'Junior High', '9th Grade', 'Junior Varsity', 'Varsity', 'Postseason', 'NJCAA', 'NAIA', 'NCAA', 'Semi-Pro', 'Professional', 'Youth / Grassroots', 'Elite Showcase', 'Mixed Levels']]
  ],
  'Officials & Rules': [
    ['Officials System', 'officialsSystem', 'select', ['2-Person Crew', '3-Person Crew', '4-Person Crew', 'Shot Clock Operator Needed', 'Table Crew Needed', 'Observer / Evaluator Needed', 'Site Supervisor Needed', 'Assigning Supervisor Needed']],
    ['Officials Needed Per Game', 'officialsPerGame', 'number'], ['Total Officials Needed Per Day', 'totalOfficialsPerDay', 'number'],
    ['Total Officials Needed for Event', 'totalOfficialsEvent', 'number'], ['Applicable Rule Set', 'ruleSet', 'select', ruleSets],
    ['Modified / House Rules Description', 'modifiedRules', 'textarea', null, true]
  ],
  'Fees & Payment': [
    ['Assigning Fee Amount', 'assigningFee', 'number'], ['Assigning Fee Type', 'assigningFeeType', 'select', ['Per Game', 'Per Day', 'Per Event', 'Per Tournament', 'Per Season', 'Flat Rate', 'Percentage-Based', 'Other']],
    ['Middle School Fee Per Official', 'middleSchoolFee', 'number'], ['Junior Varsity Fee Per Official', 'juniorVarsityFee', 'number'],
    ['Varsity Fee Per Official', 'varsityFee', 'number'], ['Showcase Fee Per Official', 'showcaseFee', 'number'],
    ['College Fee Per Official', 'collegeFee', 'number'], ['Tournament Fee Per Official', 'tournamentFee', 'number'],
    ['Travel Fee', 'travelFee', 'number'], ['Mileage Rate', 'mileageRate', 'number'], ['Hotel Reimbursement Policy', 'hotelPolicy'],
    ['Meal Per Diem', 'mealPerDiem', 'number'], ['Late Schedule Change Fee', 'lateScheduleFee', 'number'],
    ['Cancellation Fee', 'cancellationFee', 'number'], ['Emergency Replacement Fee', 'replacementFee', 'number'],
    ['Administrative Processing Fee', 'adminFee', 'number'], ['Payment Made By', 'paymentMadeBy', 'select', ['School', 'District', 'College', 'Organization', 'Tournament Director', 'Event Sponsor', 'Brand Sponsor', 'League Office', 'Athletic Department', 'Other']],
    ['Payment Made To', 'paymentMadeTo', 'select', ['Raising The Bar Officiating Inc.', 'Officials Directly', 'Combination of RTBO and Officials', 'Other']],
    ['Payment Due Date', 'paymentDueDate', 'date'], ['Late Fee Amount', 'lateFeeAmount', 'number'], ['Late Fee Begins After Days', 'lateFeeAfterDays', 'number'],
    ['Schedule Due Date', 'scheduleDueDate', 'date'], ['Final Schedule Lock Date', 'scheduleLockDate', 'date'],
    ['Schedule Changes After Lock', 'scheduleChanges', 'select', ['Yes', 'No', 'Only with Approval', 'Subject to Additional Fees']],
    ['Schedule Format Required', 'scheduleFormat', 'select', ['Excel', 'PDF', 'Google Sheet', 'Arbiter', 'Horizon', 'RefQuest', 'RTBO Platform', 'Email', 'Other']]
  ],
  'Safety & Conduct': [
    ['Cancellation Notice Required', 'cancellationNotice', 'select', ['24 Hours', '48 Hours', '72 Hours', '7 Days', '14 Days', 'Other']],
    ['Cancellation Fee Applies', 'cancellationFeeApplies', 'select', ['Yes', 'No']],
    ['Officials Paid if Cancelled Late', 'officialsPaidLateCancel', 'select', ['Yes', 'No', 'Partial Payment', 'At RTBO Discretion', 'According to Event Policy']],
    ['Game Administrator Name', 'gameAdminName'], ['Game Administrator Phone', 'gameAdminPhone', 'tel'],
    ['Security Contact Name', 'securityContact'], ['Security Contact Phone', 'securityPhone', 'tel']
  ],
  'Brand & Media': [
    ['Brand / Sponsor Name', 'brandName'], ['Brand Representative', 'brandRepresentative'], ['Brand Contact Email', 'brandEmail', 'email'],
    ['Brand Contact Phone', 'brandPhone', 'tel'], ['Officials Must Wear Special Uniform', 'specialUniform', 'select', ['Yes', 'No']],
    ['Special Uniform Description', 'specialUniformDescription', 'textarea', null, true], ['Event Will Be Livestreamed', 'livestreamed', 'select', ['Yes', 'No']],
    ['Livestream Platform', 'livestreamPlatform'], ['Game Film Available to RTBO', 'filmAvailable', 'select', ['Yes', 'No']],
    ['Film May Be Used for Training', 'filmTrainingUse', 'select', ['Yes', 'No']], ['Media Contact Name', 'mediaContact'], ['Media Contact Phone / Email', 'mediaContactInfo']
  ],
  'Legal Terms': [
    ['Confidentiality Clause Included', 'confidentiality', 'select', ['Yes', 'No']],
    ['Non-Discrimination Clause Included', 'nondiscrimination', 'select', ['Yes', 'No']],
    ['Dispute Resolution Method', 'disputeResolution', 'select', ['Good Faith Meeting', 'Mediation', 'Arbitration', 'Court of Jurisdiction', 'Other']],
    ['Governing State / Jurisdiction', 'governingState', 'select', stateOptions], ['Termination Notice Required', 'terminationNotice', 'select', ['7 Days', '14 Days', '30 Days', 'Event-Based', 'Immediate for Cause', 'Other']],
    ['Special Terms / Additional Contract Language', 'specialTerms', 'textarea', null, true]
  ],
  Signatures: [
    ['RTBO Authorized Representative', 'rtboSigner'], ['RTBO Representative Title', 'rtboSignerTitle'],
    ['Client Authorized Representative', 'clientSigner'], ['Client Representative Title', 'clientSignerTitle'],
    ['Created By', 'createdBy'], ['Reviewed By', 'reviewedBy'], ['Attorney Review Required', 'attorneyReviewRequired', 'select', ['Yes', 'No']],
    ['Attorney Reviewed', 'attorneyReviewed', 'select', ['Yes', 'No']], ['Final Approved By', 'finalApprovedBy'],
    ['Contract Stored In', 'contractStoredIn', 'select', ['RTBO Platform', 'Dropbox', 'Google Drive', 'Microsoft OneDrive', 'Client Folder', 'Other']]
  ]
};

function formatPhone(value = '') {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function escapeHtml(value = '') {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function blank(value, fallback = '____________________________') {
  return String(value || '').trim() || fallback;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function stateLabel(value = '') {
  const match = stateOptions.find(([id, label]) => id === value || label === value);
  return match ? match[1] : blank(value, 'Arkansas');
}

function dateLabel(value = '') {
  return value || '____________';
}

function agreementNumber() {
  return `RTBO-CONTRACT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function createContract(templateId = 'high-school', user = {}) {
  const template = templates.find(item => item.id === templateId) || templates[0];
  return {
    id: '',
    templateId: template.id,
    contractCategory: template.category,
    agreementNumber: agreementNumber(),
    datePrepared: new Date().toISOString().slice(0, 10),
    effectiveDate: '',
    expirationDate: '',
    renewalOption: template.id === 'league-season' ? 'Seasonal Renewal' : 'Renewal by Written Agreement',
    contractStatus: 'Draft',
    rtboRepresentative: 'Montrel Simmons',
    rtboTitle: 'President / Director / Founder',
    rtboEmail: 'admin@rtbofficiating.com',
    rtboPhone: '(501) 240-4961',
    rtboWebsite: 'https://rtbofficiating.com',
    rtboAddress: '815 Technology Dr., Box 241445, Little Rock, AR 72223',
    clientName: '',
    organizationType: template.organizationType,
    primaryContact: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    billingAddress: '',
    venueAddress: '',
    eventName: '',
    eventType: template.eventType,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    numberOfCourts: '',
    numberOfGyms: '',
    estimatedGames: '',
    levelOfPlay: template.levelOfPlay,
    officialsSystem: template.id === 'camp-clinic' ? '2-Person Crew' : '3-Person Crew',
    officialsPerGame: '',
    totalOfficialsPerDay: '',
    totalOfficialsEvent: '',
    ruleSet: template.ruleSet,
    modifiedRules: '',
    assigningFee: '',
    assigningFeeType: template.id === 'league-season' ? 'Per Season' : 'Per Event',
    middleSchoolFee: '',
    juniorVarsityFee: '',
    varsityFee: '',
    showcaseFee: '',
    collegeFee: '',
    tournamentFee: '',
    travelFee: '',
    mileageRate: '',
    hotelPolicy: '',
    mealPerDiem: '',
    lateScheduleFee: '',
    cancellationFee: '',
    replacementFee: '',
    adminFee: '',
    paymentMadeBy: 'School',
    paymentMadeTo: 'Raising The Bar Officiating Inc.',
    paymentDueDate: '',
    lateFeeAmount: '',
    lateFeeAfterDays: '',
    scheduleDueDate: '',
    scheduleLockDate: '',
    scheduleChanges: 'Only with Approval',
    scheduleFormat: 'RTBO Platform',
    cancellationNotice: '48 Hours',
    cancellationFeeApplies: 'Yes',
    officialsPaidLateCancel: 'Partial Payment',
    gameAdminName: '',
    gameAdminPhone: '',
    securityContact: '',
    securityPhone: '',
    brandName: '',
    brandRepresentative: '',
    brandEmail: '',
    brandPhone: '',
    specialUniform: 'No',
    specialUniformDescription: '',
    livestreamed: template.id === 'brand-showcase' ? 'Yes' : 'No',
    livestreamPlatform: '',
    filmAvailable: template.id === 'brand-showcase' ? 'Yes' : 'No',
    filmTrainingUse: template.id === 'brand-showcase' ? 'Yes' : 'No',
    mediaContact: '',
    mediaContactInfo: '',
    confidentiality: 'Yes',
    nondiscrimination: 'Yes',
    disputeResolution: 'Good Faith Meeting',
    governingState: 'AR',
    terminationNotice: '30 Days',
    specialTerms: '',
    rtboSigner: 'Montrel Simmons',
    rtboSignerTitle: 'President / Director / Founder',
    clientSigner: '',
    clientSignerTitle: '',
    createdBy: user.name || '',
    reviewedBy: '',
    attorneyReviewRequired: 'Yes',
    attorneyReviewed: 'No',
    finalApprovedBy: '',
    contractStoredIn: 'RTBO Platform',
    savedAt: ''
  };
}

function feeRows(contract) {
  return [
    ['Assigning Fee', contract.assigningFee, contract.assigningFeeType],
    ['Middle School Fee Per Official', contract.middleSchoolFee, 'Per official'],
    ['Junior Varsity Fee Per Official', contract.juniorVarsityFee, 'Per official'],
    ['Varsity Fee Per Official', contract.varsityFee, 'Per official'],
    ['Showcase Fee Per Official', contract.showcaseFee, 'Per official'],
    ['College Fee Per Official', contract.collegeFee, 'Per official'],
    ['Tournament Fee Per Official', contract.tournamentFee, 'Per official'],
    ['Travel Fee', contract.travelFee, 'Travel'],
    ['Meal Per Diem', contract.mealPerDiem, 'Per diem'],
    ['Late Schedule Change Fee', contract.lateScheduleFee, 'If applicable'],
    ['Cancellation Fee', contract.cancellationFee, 'If applicable'],
    ['Emergency Replacement Fee', contract.replacementFee, 'If applicable'],
    ['Administrative Processing Fee', contract.adminFee, 'Administrative']
  ].filter(([, value]) => Number(value || 0) > 0).map(([label, value, terms]) => ({ label, value: money(value), terms, raw: Number(value || 0) }));
}

function estimatedTotal(contract) {
  return feeRows(contract).reduce((sum, row) => sum + row.raw, 0);
}

function clauses(contract, total) {
  const client = blank(contract.clientName, 'the Client / Organization');
  const media = contract.brandName || contract.livestreamed === 'Yes' || contract.filmAvailable === 'Yes'
    ? [['Brand, Media, Livestream, and Event Content', `If the event includes a brand, sponsor, livestream, media credential, or recorded content component, Client shall disclose those requirements before assignments are finalized. RTBO may consider uniform requirements, credential rules, media access, livestream logistics, film availability, and training permissions when assigning officials. Film use for RTBO training is ${contract.filmTrainingUse}.`]]
    : [];

  return [
    ['Parties', `This Basketball Officials Assigning Agreement is entered into by and between Raising The Bar Officiating Inc. ("RTBO") and ${client} ("Client"). RTBO and Client may be referred to individually as a "Party" and collectively as the "Parties."`],
    ['Engagement and Scope of Services', 'Client engages RTBO to coordinate, assign, communicate with, and administer basketball officials for the event or schedule identified in this Agreement. RTBO shall use commercially reasonable efforts to assign qualified officials based on event level, availability, geography, rule set, facility requirements, and information provided by Client.'],
    ['Term and Event Coverage', `The Agreement begins on ${dateLabel(contract.effectiveDate)} and expires on ${dateLabel(contract.expirationDate)}, unless extended, renewed, or terminated under the Agreement. The covered event is ${blank(contract.eventName, 'the scheduled basketball event')} taking place from ${dateLabel(contract.startDate)} through ${dateLabel(contract.endDate)}.`],
    ['Officials, Rules, and Assignment Standards', `RTBO will assign officials under the requested system of ${contract.officialsSystem}, using ${contract.ruleSet} unless modified rules are stated in writing. Client acknowledges that official availability may require reasonable replacement assignments, crew adjustments, or administrative coordination before or during the event.`],
    ['Client Responsibilities', 'Client shall provide complete schedules, accurate venues, game levels, start times, cancellation notices, facility access, safe working conditions, game administration, and any rules or event policies necessary for RTBO to perform.'],
    ['Fees and Payment', `Client shall pay the fees stated in this Agreement to ${contract.paymentMadeTo}. Payment is made by ${contract.paymentMadeBy} and is due on ${dateLabel(contract.paymentDueDate)}. The current estimated fee schedule total is ${money(total)}. Late schedule changes, cancellations, emergency replacements, travel costs, per diem, or administrative processing charges may be billed as stated in the fee schedule or by written agreement.`],
    ['Schedule Changes and Cancellation', `Schedules are due by ${dateLabel(contract.scheduleDueDate)} and lock on ${dateLabel(contract.scheduleLockDate)}. Schedule changes after lock are ${contract.scheduleChanges}. Cancellation notice required is ${contract.cancellationNotice}. Cancellation fees apply: ${contract.cancellationFeeApplies}. Officials paid if cancelled late: ${contract.officialsPaidLateCancel}.`],
    ['Safety, Conduct, and Site Administration', 'Client shall maintain a safe, professional, and sportsmanlike environment for officials, including appropriate facility access, crowd management, event administration, emergency procedures, and reasonable security support. RTBO may decline or withdraw assignments if site conditions create unreasonable safety or conduct concerns.'],
    ...media,
    ['Independent Contractor Relationship', 'Nothing in this Agreement creates a partnership, joint venture, franchise, agency, or employer-employee relationship between Client and RTBO or between Client and any assigned official, except where required by applicable law or separate written agreement.'],
    ['Confidentiality, Non-Discrimination, and Professional Standards', `Confidentiality clause included: ${contract.confidentiality}. Non-discrimination clause included: ${contract.nondiscrimination}. The Parties agree to administer this Agreement in a professional manner and without unlawful discrimination or retaliation.`],
    ['Risk Allocation and Event Conditions', 'To the fullest extent permitted by applicable law, each Party is responsible for its own acts, omissions, personnel, facilities, records, and compliance obligations. Neither Party shall be liable for delay or nonperformance caused by events beyond reasonable control, including severe weather, facility closure, public safety orders, or other force majeure conditions.'],
    ['Termination', `Either Party may terminate this Agreement according to the selected notice period: ${contract.terminationNotice}. Termination does not waive payment obligations for services performed, assignments confirmed, costs incurred, or fees earned before the effective termination date.`],
    ['Dispute Resolution and Governing Law', `The Parties shall first attempt to resolve disputes by ${contract.disputeResolution}. Unless otherwise required by applicable law, this Agreement is governed by the laws of ${stateLabel(contract.governingState)}, without regard to conflict-of-law principles.`],
    ['Entire Agreement and Amendments', 'This Agreement, including written attachments, schedules, fee sheets, event rules, or signed addenda, represents the Parties full understanding regarding the services described herein. Amendments must be in writing and accepted by both Parties.']
  ];
}

function fileBase(contract) {
  return String(contract.agreementNumber || contract.clientName || 'rtbo-contract').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rtbo-contract';
}

function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function printHtml(contract) {
  const total = estimatedTotal(contract);
  const rows = feeRows(contract);
  const feeTable = rows.length
    ? `<table><thead><tr><th>Description</th><th>Terms</th><th>Amount</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.terms)}</td><td>${escapeHtml(row.value)}</td></tr>`).join('')}<tr class="total"><td colspan="2">Estimated Fee Schedule Total</td><td>${escapeHtml(money(total))}</td></tr></tbody></table>`
    : '<p>No fee schedule entries have been completed.</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(contract.agreementNumber)}</title><style>@page{size:letter;margin:.55in}*{box-sizing:border-box}body{margin:0;color:#050505;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45}header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:start;margin-bottom:22px;padding:20px;color:#fff;background:#050505;border-bottom:8px solid #f58220}h1{margin:0;color:#f58220;font-size:24px;line-height:1.1}h2{margin:18px 0 7px;color:#111;font-size:14px;line-height:1.2;text-transform:uppercase}h3{margin:0 0 5px;color:#f58220;font-size:13px}p{margin:0 0 7px}.meta{text-align:right;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}.box{border:1px solid #d8d8d8;padding:10px;min-height:94px}table{width:100%;border-collapse:collapse;margin:8px 0 14px}th{color:#050505;background:#f58220;text-align:left}th,td{border:1px solid #cfcfcf;padding:7px;vertical-align:top}.total td{font-weight:700;text-align:right}.signatures{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;margin-top:28px;padding-top:18px;border-top:1px solid #cfcfcf}.line{height:34px;border-bottom:1px solid #050505;margin-top:16px}.motto{margin-top:8px;color:#d8d8d8}</style></head><body><header><div><h1>Raising The Bar Officiating Inc.</h1><p>Basketball Officials Assigning Agreement</p><p class="motto">We Will Serve, And Will Be Of Service To The Game.</p></div><div class="meta"><p>${escapeHtml(contract.agreementNumber)}</p><p>${escapeHtml(contract.contractStatus)}</p><p>${escapeHtml(dateLabel(contract.datePrepared))}</p></div></header><section class="grid"><div class="box"><h3>RTBO Information</h3><p><strong>Representative:</strong> ${escapeHtml(contract.rtboRepresentative)}</p><p><strong>Title:</strong> ${escapeHtml(contract.rtboTitle)}</p><p><strong>Email:</strong> ${escapeHtml(contract.rtboEmail)}</p><p><strong>Phone:</strong> ${escapeHtml(contract.rtboPhone)}</p><p><strong>Address:</strong> ${escapeHtml(contract.rtboAddress)}</p></div><div class="box"><h3>Client Information</h3><p><strong>Client:</strong> ${escapeHtml(blank(contract.clientName))}</p><p><strong>Contact:</strong> ${escapeHtml(blank(contract.primaryContact))}</p><p><strong>Title:</strong> ${escapeHtml(blank(contract.contactTitle))}</p><p><strong>Email:</strong> ${escapeHtml(blank(contract.contactEmail))}</p><p><strong>Phone:</strong> ${escapeHtml(blank(contract.contactPhone))}</p></div></section><section class="grid"><div class="box"><h3>Event Information</h3><p><strong>Event:</strong> ${escapeHtml(blank(contract.eventName))}</p><p><strong>Type:</strong> ${escapeHtml(contract.eventType)}</p><p><strong>Dates:</strong> ${escapeHtml(dateLabel(contract.startDate))} - ${escapeHtml(dateLabel(contract.endDate))}</p><p><strong>Venue:</strong> ${escapeHtml(blank(contract.venueAddress))}</p></div><div class="box"><h3>Officials and Rules</h3><p><strong>System:</strong> ${escapeHtml(contract.officialsSystem)}</p><p><strong>Rule Set:</strong> ${escapeHtml(contract.ruleSet)}</p><p><strong>Level:</strong> ${escapeHtml(contract.levelOfPlay)}</p><p><strong>Estimated Games:</strong> ${escapeHtml(blank(contract.estimatedGames, '____'))}</p></div></section><h2>Fee Schedule</h2>${feeTable}${clauses(contract, total).map((clause, index) => `<section><h2>${index + 1}. ${escapeHtml(clause[0])}</h2><p>${escapeHtml(clause[1])}</p></section>`).join('')}${contract.specialTerms ? `<section><h2>Special Terms</h2><p>${escapeHtml(contract.specialTerms)}</p></section>` : ''}<section class="signatures"><div><h3>Raising The Bar Officiating Inc.</h3><p><strong>Authorized Representative:</strong> ${escapeHtml(contract.rtboSigner)}</p><p><strong>Title:</strong> ${escapeHtml(contract.rtboSignerTitle)}</p><div class="line"></div><p>Signature</p><div class="line"></div><p>Date</p></div><div><h3>Client / Organization</h3><p><strong>Authorized Representative:</strong> ${escapeHtml(blank(contract.clientSigner))}</p><p><strong>Title:</strong> ${escapeHtml(blank(contract.clientSignerTitle))}</p><div class="line"></div><p>Signature</p><div class="line"></div><p>Date</p></div></section></body></html>`;
}

function ContractPreview({ contract }) {
  const total = estimatedTotal(contract);
  const rows = feeRows(contract);
  return (
    <section className="rtbo-contract-preview" aria-label="Contract preview">
      <div className="rtbo-contract-preview-header">
        <div><h3>Raising The Bar Officiating Inc.</h3><p>Basketball Officials Assigning Agreement</p><span>We Will Serve, And Will Be Of Service To The Game.</span></div>
        <div><strong>{contract.agreementNumber}</strong><span>{contract.contractStatus}</span><span>{dateLabel(contract.datePrepared)}</span></div>
      </div>
      <div className="rtbo-contract-preview-grid">
        <section><h4>RTBO Information</h4><p><strong>Representative:</strong> {contract.rtboRepresentative}</p><p><strong>Title:</strong> {contract.rtboTitle}</p><p><strong>Email:</strong> {contract.rtboEmail}</p><p><strong>Phone:</strong> {contract.rtboPhone}</p><p><strong>Address:</strong> {contract.rtboAddress}</p></section>
        <section><h4>Client Information</h4><p><strong>Client:</strong> {blank(contract.clientName)}</p><p><strong>Contact:</strong> {blank(contract.primaryContact)}</p><p><strong>Title:</strong> {blank(contract.contactTitle)}</p><p><strong>Email:</strong> {blank(contract.contactEmail)}</p><p><strong>Phone:</strong> {blank(contract.contactPhone)}</p></section>
        <section><h4>Event Information</h4><p><strong>Event:</strong> {blank(contract.eventName)}</p><p><strong>Type:</strong> {contract.eventType}</p><p><strong>Dates:</strong> {dateLabel(contract.startDate)} - {dateLabel(contract.endDate)}</p><p><strong>Venue:</strong> {blank(contract.venueAddress)}</p></section>
        <section><h4>Officials and Rules</h4><p><strong>System:</strong> {contract.officialsSystem}</p><p><strong>Rule Set:</strong> {contract.ruleSet}</p><p><strong>Level:</strong> {contract.levelOfPlay}</p><p><strong>Estimated Games:</strong> {blank(contract.estimatedGames, '____')}</p></section>
      </div>
      <section className="rtbo-contract-preview-section">
        <h4>Fee Schedule</h4>
        {rows.length ? (
          <table><thead><tr><th>Description</th><th>Terms</th><th>Amount</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.terms}</td><td>{row.value}</td></tr>)}<tr className="total"><td colSpan="2">Estimated Fee Schedule Total</td><td>{money(total)}</td></tr></tbody></table>
        ) : <p>No fee schedule entries have been completed.</p>}
      </section>
      {clauses(contract, total).map((clause, index) => <section className="rtbo-contract-preview-section" key={clause[0]}><h4>{index + 1}. {clause[0]}</h4><p>{clause[1]}</p></section>)}
      {contract.specialTerms && <section className="rtbo-contract-preview-section"><h4>Special Terms</h4><p>{contract.specialTerms}</p></section>}
      <div className="rtbo-contract-signature-grid">
        <section><h4>Raising The Bar Officiating Inc.</h4><p><strong>Authorized Representative:</strong> {contract.rtboSigner}</p><p><strong>Title:</strong> {contract.rtboSignerTitle}</p><span></span><small>Signature</small><span></span><small>Date</small></section>
        <section><h4>Client / Organization</h4><p><strong>Authorized Representative:</strong> {blank(contract.clientSigner)}</p><p><strong>Title:</strong> {blank(contract.clientSignerTitle)}</p><span></span><small>Signature</small><span></span><small>Date</small></section>
      </div>
    </section>
  );
}

export default function RTBOBasketballAssigningContractGenerator({ user = {}, onStatus = () => {} }) {
  const [view, setView] = useState('home');
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [contract, setContract] = useState(() => createContract('high-school', user));
  const [message, setMessage] = useState('');
  const [savedContracts, setSavedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => { document.title = 'RTBO Contract Generator | Forms Workspace'; }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedContracts)); }, [savedContracts]);

  const template = templates.find(item => item.id === contract.templateId) || templates[0];
  const total = estimatedTotal(contract);

  function announce(text) {
    setMessage(text);
    onStatus(text);
  }

  function update(event) {
    const { name, value } = event.target;
    setContract(current => ({ ...current, [name]: name.toLowerCase().includes('phone') ? formatPhone(value) : value }));
  }

  function openTemplate(templateId) {
    setContract(createContract(templateId, user));
    setActiveTab(tabs[0]);
    setView('editor');
    announce('Contract template opened for editing.');
  }

  function loadSaved(saved) {
    setContract({ ...createContract(saved.templateId || 'high-school', user), ...saved });
    setActiveTab(tabs[0]);
    setView('editor');
    announce('Saved contract opened for editing.');
  }

  function save() {
    const timestamp = new Date().toLocaleString();
    const record = { ...contract, id: contract.id || `contract-${Date.now()}`, savedAt: contract.savedAt || timestamp, updatedAt: timestamp };
    setSavedContracts(current => current.some(item => item.id === record.id) ? current.map(item => item.id === record.id ? record : item) : [record, ...current]);
    setContract(record);
    announce('Contract saved.');
  }

  function reset() {
    setContract(createContract(contract.templateId || 'high-school', user));
    setActiveTab(tabs[0]);
    announce('Contract form reset.');
  }

  function remove() {
    if (contract.id && !window.confirm(`Delete ${contract.agreementNumber}?`)) return;
    if (contract.id) setSavedContracts(current => current.filter(item => item.id !== contract.id));
    reset();
    announce('Contract deleted from saved contracts.');
  }

  function exportContract() {
    downloadFile(`${fileBase(contract)}.html`, printHtml(contract), 'text/html;charset=utf-8');
    announce('Contract exported as a printable HTML file.');
  }

  function printContract() {
    const win = window.open('', '_blank', 'width=960,height=1200');
    if (!win) {
      exportContract();
      announce('Popup blocked. Contract exported instead.');
      return;
    }
    win.document.open();
    win.document.write(printHtml(contract));
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);
    announce('Contract print window opened.');
  }

  function renderField(field) {
    const [label, name, type = 'text', options, wide] = field;
    const id = `contract-${name}`;
    const value = contract[name] || '';
    return (
      <label className={wide ? 'wide' : ''} htmlFor={id} key={name}>
        <span>{label}</span>
        {type === 'textarea' ? <textarea id={id} name={name} value={value} onChange={update} rows={4} /> : options ? (
          <select id={id} name={name} value={value} onChange={update}>
            {options.map(option => {
              const optionValue = Array.isArray(option) ? option[0] : option;
              const optionLabel = Array.isArray(option) ? option[1] : option;
              return <option key={`${name}-${optionValue || optionLabel}`} value={optionValue}>{optionLabel}</option>;
            })}
          </select>
        ) : <input id={id} type={type} name={name} value={value} onChange={update} inputMode={type === 'tel' ? 'tel' : undefined} autoComplete={type === 'tel' ? 'tel' : undefined} maxLength={type === 'tel' ? 14 : undefined} />}
      </label>
    );
  }

  if (view === 'home') {
    return (
      <section className="rtbo-dashboard-card rtbo-contract-generator-page">
        <div className="rtbo-dashboard-card-head"><div><p className="eyebrow">Forms Workspace</p><h3>Contract Generator</h3><p>Create basketball officials assigning contracts from approved RTBO templates.</p></div></div>
        {message && <p className="form-message success">{message}</p>}
        <div className="rtbo-contract-widget-grid" aria-label="Contract templates">
          {templates.map(item => <button className="rtbo-contract-widget" type="button" key={item.id} onClick={() => openTemplate(item.id)}><span className="eyebrow">{item.category}</span><strong>{item.title}</strong><small>{item.description}</small><b>Create Contract</b></button>)}
        </div>
        <div className="rtbo-contract-saved-section">
          <div className="rtbo-dashboard-card-head compact"><div><p className="eyebrow">Saved Contracts</p><h4>Editable Contract Records</h4></div></div>
          {savedContracts.length === 0 ? <p className="rtbo-empty-state">No saved contracts yet.</p> : (
            <div className="rtbo-contract-saved-grid">{savedContracts.map(saved => <button className="rtbo-contract-saved-widget" type="button" key={saved.id} onClick={() => loadSaved(saved)}><span>{saved.contractStatus || 'Draft'}</span><strong>{saved.clientName || saved.eventName || 'Unnamed Contract'}</strong><small>{saved.agreementNumber}</small><b>{saved.updatedAt ? `Updated ${saved.updatedAt}` : `Saved ${saved.savedAt}`}</b></button>)}</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-contract-generator-page rtbo-contract-editor-page">
      <div className="rtbo-dashboard-card-head">
        <div><p className="eyebrow">{template.category}</p><h3>{template.title}</h3><p>{contract.clientName || contract.eventName || 'Editable basketball officials assigning agreement.'}</p></div>
        <div className="rtbo-form-toolbar"><button className="btn secondary dark-btn" type="button" onClick={() => setView('home')}>Back to Contracts</button><button className="btn" type="button" onClick={save}>Save</button><button className="btn secondary dark-btn" type="button" onClick={printContract}>Print</button><button className="btn secondary dark-btn" type="button" onClick={exportContract}>Export</button><button className="btn secondary dark-btn" type="button" onClick={() => openTemplate(contract.templateId || 'high-school')}>Create New</button><button className="btn secondary dark-btn danger-action" type="button" onClick={remove}>Delete</button></div>
      </div>
      {message && <p className="form-message success">{message}</p>}
      <div className="rtbo-contract-summary-grid"><article><span>Status</span><strong>{contract.contractStatus}</strong></article><article><span>Category</span><strong>{contract.contractCategory}</strong></article><article><span>Estimated Fees</span><strong>{money(total)}</strong></article><article><span>Agreement No.</span><strong>{contract.agreementNumber}</strong></article></div>
      <div className="rtbo-contract-editor-grid">
        <section className="rtbo-contract-form-panel">
          <div className="rtbo-contract-tab-row" role="tablist" aria-label="Contract sections">{tabs.map(tab => <button className={activeTab === tab ? 'active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}>{tab}</button>)}</div>
          <div className="rtbo-contract-field-panel"><h4>{activeTab}</h4><div className="rtbo-contract-field-grid">{(fields[activeTab] || []).map(renderField)}</div></div>
        </section>
        <ContractPreview contract={contract} />
      </div>
    </section>
  );
}
