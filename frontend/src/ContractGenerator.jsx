import React, { useEffect, useRef, useState } from 'react';
import './contract-generator.css';

const STORAGE_KEY = 'rtbo-basketball-assigning-contracts';
const LOGO_SRC = '/assets/images/logo.png';
const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const CONTRACT_BCC_EMAIL = 'mrbballref1775@yahoo.com';
const CELEBRITY_FUNDRAISING_TEMPLATE_ID = 'celebrity-fundraising-sponsorship';

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
  'Travel Basketball Tournament', 'AAU / Grassroots Event', 'Nike Event', 'Adidas Event', 'Under Armor Event',
  'New Balance Event', 'Reebok Event', 'Private Sporting Event', 'League Contract', 'School / Clinic',
  'One-Day Event', 'Multi-Day Event', 'Conference Assigning', 'Celebrity Game / Fundraising / Sponsorship',
  'Independent Contractor Agreement', 'Other Sporting Event'
];

const organizationTypes = [
  'School District', 'High School', 'College / University', 'Athletic Conference', 'Tournament Company',
  'Event Center', 'Community Center', 'Boys & Girls Club', 'Shoe Company / Brand Event',
  'Recreation Department', 'Private Organization', 'Nonprofit Organization', 'Charity / Fundraising Organization',
  'Celebrity Game Organizer', 'Sponsor / Donor Organization', 'Official / Contractor', 'Other'
];

const eventTypes = [
  'Regular Season Games', 'Tournament', 'Showcase', 'Camp', 'League Play', 'Playoffs', 'Championship Event',
  'Scrimmage', 'Jamboree', 'All-Star Event', 'Brand-Sponsored Event', 'Classic', 'Conference Tournament',
  'Community Event', 'Celebrity Basketball Game', 'Fundraising Basketball Event', 'Sponsorship Activation',
  'Charity Basketball Event', 'Other Sporting Event', 'Other'
];

const ruleSets = [
  'NFHS Rules', 'NJCAA Women Rules', 'NJCAA Men Rules', 'NAIA Women Rules', 'NAIA Men Rules',
  'NCAA Women Rules', 'NCAA Men Rules', 'WNBA-Style Rules', 'NBA-Style Rules',
  'Tournament-Specific Rules', 'Modified Rules', 'House Rules'
];

const tabs = [
  'Contract Details', 'Client & Event', 'Officials & Rules', 'Fees & Payment',
  'Operations & Expectations', 'Training & Review', 'Brand & Media', 'Legal Terms', 'Signatures'
];

const templates = [
  ['high-school', 'High School Assigning Contract', 'High School', 'High School', 'Regular Season Games', 'NFHS Rules', 'Varsity', 'School, district, and athletic department assigning agreement.'],
  ['official-independent-contractor', 'Independent Contractor Agreement', 'Independent Contractor Agreement', 'Official / Contractor', 'Regular Season Games', 'NCAA Men Rules', 'Mixed Levels', 'Official independent contractor officiating agreement with digital signature workflow.'],
  ['college-university', 'College / University Contract', 'College / University', 'College / University', 'Regular Season Games', 'NCAA Men Rules', 'NCAA', 'College basketball game and event assigning agreement.'],
  ['conference', 'Conference Assigning Contract', 'Conference Assigning', 'Athletic Conference', 'League Play', 'NFHS Rules', 'Mixed Levels', 'Conference, member school, league, and season-long assigning agreement.'],
  ['organization', 'Organization Assigning Contract', 'Private Sporting Event', 'Private Organization', 'Other Sporting Event', 'Modified Rules', 'Mixed Levels', 'Organization, nonprofit, recreation, or private sporting event assigning agreement.'],
  ['event-center', 'Event Center Contract', 'Event Center', 'Event Center', 'Tournament', 'Tournament-Specific Rules', 'Mixed Levels', 'Event center basketball coverage and multi-court assigning agreement.'],
  ['community-center', 'Community Center Contract', 'Community Center', 'Community Center', 'Community Event', 'House Rules', 'Youth / Grassroots', 'Community center, recreation, and youth basketball assigning agreement.'],
  ['boys-girls-club', 'Boys & Girls Club Contract', 'Boys & Girls Club', 'Boys & Girls Club', 'League Play', 'House Rules', 'Youth / Grassroots', 'Youth development, recreation league, and club basketball assigning agreement.'],
  ['tournament', 'Tournament Contract', 'Showcase Tournament', 'Tournament Company', 'Tournament', 'Tournament-Specific Rules', 'Mixed Levels', 'Single-site or multi-site tournament assigning agreement.'],
  [CELEBRITY_FUNDRAISING_TEMPLATE_ID, 'Celebrity Game / Fundraising / Sponsorship Contract', 'Celebrity Game / Fundraising / Sponsorship', 'Charity / Fundraising Organization', 'Celebrity Basketball Game', 'Modified Rules', 'Celebrity / Fundraising / Sponsor Activation', 'Celebrity basketball game, fundraiser, sponsor activation, media, donation, and event coverage agreement.'],
  ['nike-showcase', 'Nike Basketball Contract', 'Nike Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Nike, EYBL-style, showcase, media, and elite event assigning agreement.'],
  ['adidas-showcase', 'Adidas Basketball Contract', 'Adidas Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Adidas, 3SSB-style, showcase, media, and elite event assigning agreement.'],
  ['under-armor-showcase', 'Under Armor Basketball Contract', 'Under Armor Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Under Armor / Under Armour-style showcase, media, and elite event assigning agreement.'],
  ['new-balance-showcase', 'New Balance Basketball Contract', 'New Balance Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'New Balance showcase, media, and elite event assigning agreement.'],
  ['reebok-showcase', 'Reebok Basketball Contract', 'Reebok Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Reebok showcase, media, and elite event assigning agreement.'],
  ['brand-showcase', 'Brand / Showcase Contract', 'AAU / Grassroots Event', 'Shoe Company / Brand Event', 'Brand-Sponsored Event', 'Tournament-Specific Rules', 'Elite Showcase', 'Brand, media, livestream, and elite showcase event agreement.'],
  ['league-season', 'League / Season Contract', 'League Contract', 'Athletic Conference', 'League Play', 'NFHS Rules', 'Mixed Levels', 'Recurring league, conference, or season-long assigning agreement.'],
  ['camp-clinic', 'School / Clinic Contract', 'School / Clinic', 'Private Organization', 'Camp', 'Modified Rules', 'Youth / Grassroots', 'School, clinic, and instructional event agreement.']
].map(([id, title, category, organizationType, eventType, ruleSet, levelOfPlay, description]) => ({
  id, title, category, organizationType, eventType, ruleSet, levelOfPlay, description
}));

const brandNames = {
  'nike-showcase': 'Nike',
  'adidas-showcase': 'Adidas',
  'under-armor-showcase': 'Under Armor',
  'new-balance-showcase': 'New Balance',
  'reebok-showcase': 'Reebok',
  'brand-showcase': 'Brand / Sponsor',
  [CELEBRITY_FUNDRAISING_TEMPLATE_ID]: 'Celebrity / Sponsor / Fundraising Partner'
};

const defaultExecutiveSummary = 'Raising The Bar Officiating Inc. will provide organized, dependable, transparent basketball officials assigning services built on communication, training, evaluation, accountability, and service to the game. This agreement establishes the operational structure for assignments, schedules, confirmations, game coverage, evaluations, payment expectations, safety standards, and professional communication between RTBO and the Client.';

const defaultAssigningCriteria = 'Assignments may be based on official ability, availability, location, reasonable travel, level of play, matchup intensity, crew chemistry, school rotation, conflict avoidance, evaluation history, professionalism, communication history, reliability, and event needs.';

const defaultTechnologyPlatform = 'RTBO may use an assigning website, digital assignment platform, email, text messaging, phone communication, or another approved workflow to manage schedules, availability, confirmations, partners, venue information, reports, evaluations, invoices, film review, and communication logs.';

const defaultAssignorDuties = 'RTBO will coordinate assignments, communicate with officials and Client contacts, manage assignment changes, support official development, use observer and film feedback when available, maintain professional channels of communication, and use commercially reasonable efforts to provide qualified officials for covered games and events.';

const defaultOfficialExpectations = 'Officials are expected to communicate professionally, confirm assignments, arrive on time, dress properly, meet with administration and table personnel when appropriate, enforce the selected rule set, maintain sportsmanship standards, and represent RTBO and the game with preparation, consistency, accountability, and professionalism.';

const defaultAdministrationExpectations = 'Client will provide accurate schedules, site contacts, venue details, safe working conditions, dressing areas when available, security or escort plans when needed, timely communication of changes, and timely payment according to the approved fee schedule.';

const defaultCoachExpectations = 'Coaches and event leadership should communicate respectfully with officials, follow bench decorum and sportsmanship expectations, use the agreed concern process for formal issues, provide film when requested, and observe a 24-hour cool-off period before formal review except for urgent safety, ejection, fighting, or misconduct matters.';

const defaultTrainingModel = 'RTBO may support camps, clinics, online training, rules quizzes, mechanics review, film study, observer reports, mentor feedback, readiness assessments, and periodic rankings to develop officials and strengthen assignment quality.';

const defaultComplaintProcess = 'Formal concerns should be submitted through the agreed communication process and supported by game film whenever possible. RTBO may review film, request additional information, consult observers, and provide appropriate feedback while maintaining professionalism and respect for the game.';

const defaultClosingStatement = 'This agreement is submitted with the intent to build a professional working relationship that benefits the Client, participating teams, coaches, players, officials, administrators, and the game of basketball.';

const independentContractorExecutiveSummary = 'Raising The Bar Officiating Inc. engages the Contractor as an independent contractor official to provide basketball officiating and officiating-related services for accepted assignments. This agreement establishes the contractor relationship, assignment rules, payment expectations, professional conduct standards, policy acknowledgments, insurance obligations, risk allocation, and digital signature process for RTBO officials.';

const independentContractorAssigningCriteria = 'Assignments may be offered based on availability, classification, location, training completion, test results, physical readiness when applicable, professional conduct, conflict avoidance, evaluation history, communication, game level, event needs, and the sole discretion of Raising The Bar Officiating Inc.';

const independentContractorTechnologyPlatform = 'RTBO may use its website, assigning platform, email, text messaging, phone communication, payment system, forms, reports, calendars, digital signature tools, or other approved technology to offer assignments, collect availability, confirm games, process payments, document reports, and maintain agreement records.';

const independentContractorExpectations = 'The Contractor shall perform accepted services professionally, arrive prepared and on time, wear the approved uniform, comply with applicable rules and mechanics, communicate promptly, avoid conflicts of interest, maintain sportsmanship standards, protect the integrity of the game, and represent RTBO with honesty, fairness, accountability, and service.';

const independentContractorClosingStatement = 'By signing this Agreement, the Organization and Contractor acknowledge that they have reviewed the agreement, understand the independent contractor relationship, and agree to follow the professional standards required for RTBO basketball officiating services.';

const celebrityFundraisingExecutiveSummary = 'Raising The Bar Officiating Inc. will provide professional basketball officials assigning services for a celebrity game, fundraising event, charity basketball event, or sponsorship activation. This agreement documents event coverage, official staffing, sponsor and media requirements, donation and ticketing responsibilities, celebrity participant expectations, safety standards, payment expectations, and professional communication between RTBO and the Client.';

const celebrityFundraisingAssigningCriteria = 'Assignments may be based on official availability, experience with special events, professionalism, media readiness, celebrity game environment, crowd size, sponsor requirements, conflict avoidance, location, travel needs, security expectations, schedule reliability, and RTBO discretion.';

const celebrityFundraisingTechnologyPlatform = 'RTBO may use its website, assignment platform, email, text messaging, phone communication, event briefings, production notes, sponsor requirement sheets, digital signature tools, payment records, invoices, reports, and media coordination notes to manage the celebrity game, fundraiser, sponsor activation, officials, event contacts, schedules, confirmations, and post-event review.';

const celebrityFundraisingAssignorDuties = 'RTBO will coordinate officials assignments, communicate event-specific instructions to officials, review schedule and venue details, support sponsor or media requirements that directly affect officiating, communicate with event leadership, coordinate emergency replacements when possible, and use commercially reasonable efforts to provide qualified officials for the covered celebrity game, fundraiser, or sponsorship event.';

const celebrityFundraisingOfficialExpectations = 'Officials are expected to arrive prepared and on time, wear the approved uniform unless a special event uniform is approved, communicate professionally with celebrity participants, coaches, sponsors, media personnel, administrators, and event leadership, enforce the selected rule set or house rules, protect game flow and participant safety, and represent RTBO with discretion, professionalism, consistency, and service.';

const celebrityFundraisingAdministrationExpectations = 'Client will provide accurate event schedules, celebrity participant expectations, sponsor requirements, venue details, credential rules, admission or ticketing plans, beneficiary information, media and livestream requirements, dressing areas when available, security or escort plans when needed, safe working conditions, timely schedule changes, and timely payment according to the approved fee schedule.';

const celebrityFundraisingCoachExpectations = 'Celebrity game coaches, team captains, event hosts, sponsors, and event leadership should communicate respectfully with officials, follow the agreed sportsmanship and bench decorum expectations, avoid public criticism of officials, follow the agreed concern process, and prioritize participant safety, charity purpose, sponsor obligations, and positive event presentation.';

const celebrityFundraisingTrainingModel = 'RTBO may provide pre-event official briefing notes, event rules review, house rules review, sportsmanship expectations, sponsor or media requirements that affect officials, film or livestream review when available, and post-event feedback to improve future celebrity games, fundraising events, and sponsor activations.';

const celebrityFundraisingComplaintProcess = 'Concerns should be submitted through the agreed event contact or RTBO representative and supported by film, livestream clips, reports, or written detail when available. RTBO may review the issue, request additional context, communicate with event leadership, and provide appropriate feedback while protecting the fundraising purpose, sponsor relationships, participant safety, and official professionalism.';

const celebrityFundraisingTimeline = 'Pre-Event: confirm event date, venue, beneficiary or cause, sponsor requirements, celebrity participant expectations, rules, security plan, media plan, and payment terms.\nEvent Week: finalize schedule, officials, site contacts, uniforms, credentials, arrival time, and emergency communication plan.\nEvent Day: officials arrive, meet with event leadership, confirm rules and safety expectations, and provide game coverage.\nPost-Event: complete invoices, reports, film review if available, sponsor or event recap notes, and any follow-up items.';

const celebrityFundraisingClosingStatement = 'This agreement is submitted to support a professional celebrity game, fundraising event, or sponsorship activation that protects the event mission, participating celebrities and athletes, sponsors, beneficiaries, spectators, officials, administrators, and the game of basketball.';

const celebrityFundraisingSpecialTerms = 'Client is solely responsible for fundraising compliance, donation collection, charitable solicitation rules, sponsor inventory, ticket sales, admissions, tax receipts, prize or auction approvals, celebrity appearance agreements, celebrity travel or hospitality, sponsorship fulfillment, and public statements unless a separate written agreement states otherwise. RTBO is responsible only for the officiating assigning services and related officiating support described in this agreement.';

const fields = {
  'Contract Details': [
    ['Contract Category', 'contractCategory', 'select', categories], ['Agreement Number', 'agreementNumber'],
    ['Date Prepared', 'datePrepared', 'date'], ['Effective Date', 'effectiveDate', 'date'], ['Expiration Date', 'expirationDate', 'date'],
    ['Proposal / Agreement Type', 'proposalType', 'select', ['Basketball Officials Assigning Services', 'Conference Basketball Officials Assigning Services', 'Tournament Basketball Officials Assigning Services', 'Brand / Showcase Basketball Officials Assigning Services', 'Celebrity Game, Fundraising, and Sponsorship Basketball Officials Assigning Services', 'Independent Contractor Basketball Officiating Agreement', 'Other Sporting Event Officials Assigning Services']],
    ['Recommended Service Cycle', 'serviceCycleLength', 'select', ['Single Event', 'Seasonal Agreement', 'Two-Year Cycle', 'Three-Year Cycle', 'Minimum Four-Year Cycle', 'Event-by-Event']],
    ['Renewal Option', 'renewalOption', 'select', ['No Renewal', 'Automatic Renewal', 'Renewal by Written Agreement', 'Seasonal Renewal', 'Event-by-Event Renewal']],
    ['Contract Status', 'contractStatus', 'select', ['Draft', 'Pending Review', 'Sent for Signature', 'Client Signed', 'Fully Executed', 'Signed', 'Active', 'Expired', 'Terminated']],
    ['RTBO Representative', 'rtboRepresentative'], ['RTBO Representative Title', 'rtboTitle'],
    ['RTBO Email', 'rtboEmail', 'email'], ['RTBO Phone', 'rtboPhone', 'tel'], ['RTBO Website', 'rtboWebsite', 'url'],
    ['RTBO Mailing Address', 'rtboAddress', 'textarea', null, true],
    ['Executive Summary', 'executiveSummary', 'textarea', null, true]
  ],
  'Client & Event': [
    ['Client / Organization Name', 'clientName'], ['Organization Type', 'organizationType', 'select', organizationTypes],
    ['Conference / Member Schools', 'memberSchools', 'textarea', null, true],
    ['Primary Contact', 'primaryContact'], ['Primary Contact Title', 'contactTitle'], ['Email Address', 'contactEmail', 'email'],
    ['Phone Number', 'contactPhone', 'tel'], ['Billing Address', 'billingAddress', 'textarea', null, true],
    ['Event / Venue Address', 'venueAddress', 'textarea', null, true], ['Event Name', 'eventName'],
    ['Event Type', 'eventType', 'select', eventTypes], ['Event Start Date', 'startDate', 'date'], ['Event End Date', 'endDate', 'date'],
    ['Event Start Time', 'startTime', 'time'], ['Event End Time', 'endTime', 'time'], ['Number of Courts', 'numberOfCourts', 'number'],
    ['Number of Gyms / Facilities', 'numberOfGyms', 'number'], ['Estimated Number of Games', 'estimatedGames', 'number'],
    ['Schedule Submitted By', 'scheduleSubmittedBy'], ['Schedule Submission Deadline', 'scheduleSubmissionDeadline', 'date'],
    ['Expected Level of Play', 'levelOfPlay', 'select', ['Middle School', 'Junior High', '9th Grade', 'Junior Varsity', 'Varsity', 'Postseason', 'High School', 'NJCAA', 'NAIA', 'NCAA DIII', 'NCAA DII', 'NCAA DI', 'NCAA', 'Pro-Am', 'Semi-Pro', 'Professional', 'Youth / Grassroots', 'Elite Showcase', 'Mixed Levels']]
  ],
  'Officials & Rules': [
    ['Officials System', 'officialsSystem', 'select', ['Individual Official', '2-Person Crew', '3-Person Crew', '4-Person Crew', 'Shot Clock Operator Needed', 'Table Crew Needed', 'Observer / Evaluator Needed', 'Site Supervisor Needed', 'Assigning Supervisor Needed']],
    ['Officials Needed Per Game', 'officialsPerGame', 'number'], ['Total Officials Needed Per Day', 'totalOfficialsPerDay', 'number'],
    ['Total Officials Needed for Event', 'totalOfficialsEvent', 'number'], ['Applicable Rule Set', 'ruleSet', 'select', ruleSets],
    ['Assignment Platform', 'assignmentPlatform', 'select', ['RTBO Platform', 'Horizon Web Ref', 'Arbiter', 'RefQuest', 'Assignr', 'Google Workspace', 'Email / Spreadsheet', 'Other']],
    ['Assigning Criteria', 'assigningCriteria', 'textarea', null, true],
    ['Technology and Communication Platform', 'technologyPlatform', 'textarea', null, true],
    ['Modified / House Rules Description', 'modifiedRules', 'textarea', null, true]
  ],
  'Fees & Payment': [
    ['Assigning Fee Amount', 'assigningFee', 'number'], ['Assigning Fee Type', 'assigningFeeType', 'select', ['Per School', 'Per Game', 'Per Day', 'Per Event', 'Per Tournament', 'Per Season', 'Flat Rate', 'Percentage-Based', 'Other']],
    ['Per-School Assigning Fee', 'perSchoolAssigningFee', 'number'], ['Per-Game Assigning Fee', 'perGameAssigningFee', 'number'],
    ['Middle School Fee Per Official', 'middleSchoolFee', 'number'], ['Junior Varsity Fee Per Official', 'juniorVarsityFee', 'number'],
    ['Junior High Fee Per Official', 'juniorHighFee', 'number'], ['Varsity Fee Per Official', 'varsityFee', 'number'],
    ['Showcase Fee Per Official', 'showcaseFee', 'number'], ['College Fee Per Official', 'collegeFee', 'number'],
    ['Tournament Fee Per Official', 'tournamentFee', 'number'], ['Conference Tournament Fee', 'conferenceTournamentFee', 'number'],
    ['Classic / Special Event Fee', 'specialEventFee', 'number'],
    ['Travel Fee', 'travelFee', 'number'], ['Mileage Rate', 'mileageRate', 'number'], ['Hotel Reimbursement Policy', 'hotelPolicy'],
    ['Meal Per Diem', 'mealPerDiem', 'number'], ['Late Schedule Change Fee', 'lateScheduleFee', 'number'],
    ['Cancellation Fee', 'cancellationFee', 'number'], ['Emergency Replacement Fee', 'replacementFee', 'number'],
    ['Administrative Processing Fee', 'adminFee', 'number'], ['Payment Made By', 'paymentMadeBy', 'select', ['School', 'District', 'College', 'Organization', 'Tournament Director', 'Fundraising Host', 'Charity Event Organizer', 'Event Sponsor', 'Brand Sponsor', 'Sponsorship Partner', 'Title Sponsor', 'League Office', 'Athletic Department', 'Raising The Bar Officiating Inc.', 'Other']],
    ['Payment Made To', 'paymentMadeTo', 'select', ['Raising The Bar Officiating Inc.', 'Officials Directly', 'Contractor / Official', 'Combination of RTBO and Officials', 'Other']],
    ['Payment Due Date', 'paymentDueDate', 'date'], ['Late Fee Amount', 'lateFeeAmount', 'number'], ['Late Fee Begins After Days', 'lateFeeAfterDays', 'number'],
    ['Schedule Due Date', 'scheduleDueDate', 'date'], ['Final Schedule Lock Date', 'scheduleLockDate', 'date'],
    ['Schedule Changes After Lock', 'scheduleChanges', 'select', ['Yes', 'No', 'Only with Approval', 'Subject to Additional Fees']],
    ['Schedule Format Required', 'scheduleFormat', 'select', ['Excel', 'PDF', 'Google Sheet', 'Arbiter', 'Horizon', 'RefQuest', 'RTBO Platform', 'Email', 'Other']],
    ['Payment Processing Time', 'paymentProcessingTime', 'select', ['On-site when possible', 'Within 3 Business Days', 'Within 7 Days', 'Within 14 Days', 'Within 30 Days', 'By Written Agreement']]
  ],
  'Operations & Expectations': [
    ['Cancellation Notice Required', 'cancellationNotice', 'select', ['24 Hours', '48 Hours', '72 Hours', '7 Days', '14 Days', 'Other']],
    ['Cancellation Fee Applies', 'cancellationFeeApplies', 'select', ['Yes', 'No']],
    ['Officials Paid if Cancelled Late', 'officialsPaidLateCancel', 'select', ['Yes', 'No', 'Partial Payment', 'At RTBO Discretion', 'According to Event Policy']],
    ['Game Administrator Name', 'gameAdminName'], ['Game Administrator Phone', 'gameAdminPhone', 'tel'],
    ['Security Contact Name', 'securityContact'], ['Security Contact Phone', 'securityPhone', 'tel'],
    ['RTBO / Assignor Duties', 'assignorDuties', 'textarea', null, true],
    ['Officials Expectations', 'officialExpectations', 'textarea', null, true],
    ['Administration Expectations', 'administrationExpectations', 'textarea', null, true],
    ['Coach / Event Leadership Expectations', 'coachExpectations', 'textarea', null, true]
  ],
  'Training & Review': [
    ['Observer Program Included', 'observerProgramIncluded', 'select', ['Yes', 'No', 'If Available', 'By Written Agreement']],
    ['Film Review Included', 'filmReviewIncluded', 'select', ['Yes', 'No', 'If Available', 'By Written Agreement']],
    ['Preseason Meeting Required', 'preseasonMeetingRequired', 'select', ['Yes', 'No', 'By Written Agreement']],
    ['Postseason Review Required', 'postseasonReviewRequired', 'select', ['Yes', 'No', 'By Written Agreement']],
    ['Training and Evaluation Model', 'trainingEvaluationModel', 'textarea', null, true],
    ['Complaint and Film Review Process', 'complaintFilmReviewProcess', 'textarea', null, true],
    ['Operational Timeline', 'operationalTimeline', 'textarea', null, true]
  ],
  'Brand & Media': [
    ['Brand / Sponsor Name', 'brandName'], ['Brand Representative', 'brandRepresentative'], ['Brand Contact Email', 'brandEmail', 'email'],
    ['Brand Contact Phone', 'brandPhone', 'tel'], ['Officials Must Wear Special Uniform', 'specialUniform', 'select', ['Yes', 'No']],
    ['Special Uniform Description', 'specialUniformDescription', 'textarea', null, true], ['Event Will Be Livestreamed', 'livestreamed', 'select', ['Yes', 'No']],
    ['Livestream Platform', 'livestreamPlatform'], ['Game Film Available to RTBO', 'filmAvailable', 'select', ['Yes', 'No']],
    ['Film May Be Used for Training', 'filmTrainingUse', 'select', ['Yes', 'No']], ['Media Contact Name', 'mediaContact'], ['Media Contact Phone / Email', 'mediaContactInfo'],
    ['Beneficiary / Cause', 'fundraisingBeneficiary'], ['Fundraising Goal', 'fundraisingGoal'],
    ['Sponsorship Package / Level', 'sponsorshipPackage'], ['Sponsor Deliverables', 'sponsorshipDeliverables', 'textarea', null, true],
    ['Celebrity Participant Requirements', 'celebrityParticipantRequirements', 'textarea', null, true],
    ['Sponsor Recognition Plan', 'sponsorRecognition', 'textarea', null, true],
    ['Donation / Revenue Handling', 'donationHandling', 'textarea', null, true],
    ['Ticketing / Admission Plan', 'ticketingPlan', 'textarea', null, true],
    ['Public Relations Approval', 'publicRelationsApproval', 'textarea', null, true]
  ],
  'Legal Terms': [
    ['Confidentiality Clause Included', 'confidentiality', 'select', ['Yes', 'No']],
    ['Non-Discrimination Clause Included', 'nondiscrimination', 'select', ['Yes', 'No']],
    ['Dispute Resolution Method', 'disputeResolution', 'select', ['Good Faith Meeting', 'Mediation', 'Arbitration', 'Court of Jurisdiction', 'Other']],
    ['Governing State / Jurisdiction', 'governingState', 'select', stateOptions], ['Termination Notice Required', 'terminationNotice', 'select', ['48 Hours', '7 Days', '14 Days', '30 Days', 'Event-Based', 'Immediate for Cause', 'Other']],
    ['Closing Statement', 'closingStatement', 'textarea', null, true],
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

function contractLogoUrl() {
  if (typeof window !== 'undefined') {
    return new URL(LOGO_SRC, window.location.origin).href;
  }
  return LOGO_SRC;
}

function blank(value, fallback = '____________________________') {
  return String(value || '').trim() || fallback;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function multiline(value = '', fallback = '') {
  const text = String(value || '').trim() || fallback;
  return text.split(/\n+/).map(item => item.trim()).filter(Boolean);
}

function multilineHtml(value = '', fallback = '') {
  return multiline(value, fallback).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

function stateLabel(value = '') {
  const match = stateOptions.find(([id, label]) => id === value || label === value);
  return match ? match[1] : blank(value, 'Arkansas');
}

function dateLabel(value = '') {
  return value || '____________';
}

function isIndependentContractorContract(contract = {}) {
  return contract.templateId === 'official-independent-contractor' || contract.contractCategory === 'Independent Contractor Agreement';
}

function isCelebrityFundraisingContract(contract = {}) {
  return contract.templateId === CELEBRITY_FUNDRAISING_TEMPLATE_ID
    || contract.contractCategory === 'Celebrity Game / Fundraising / Sponsorship';
}

function fieldDisplayLabel(contract = {}, label = '') {
  if (!isIndependentContractorContract(contract)) return label;
  const labels = {
    'Client / Organization Name': 'Official / Contractor Name',
    'Organization Type': 'Contractor Type',
    'Conference / Member Schools': 'Applicable Classification / Sanctioning Body',
    'Primary Contact': 'Official Primary Contact',
    'Primary Contact Title': 'Contractor Title / Role',
    'Email Address': 'Official Email Address',
    'Phone Number': 'Official Phone Number',
    'Billing Address': 'Contractor Mailing Address',
    'Event / Venue Address': 'Primary Service Area / Address',
    'Event Name': 'Covered Services',
    'Event Type': 'Assignment Type',
    'Expected Level of Play': 'Official Classification / Level',
    'Officials System': 'Contractor Assignment Role',
    'Officials Needed Per Game': 'Assignments Accepted Per Game',
    'Total Officials Needed Per Day': 'Daily Assignment Capacity',
    'Total Officials Needed for Event': 'Season Assignment Capacity',
    'Payment Made By': 'Payment Made By',
    'Payment Made To': 'Payment Made To',
    'Client Authorized Representative': 'Contractor / Official',
    'Client Representative Title': 'Contractor Title / Role'
  };
  return labels[label] || label;
}

function agreementNumber() {
  return `RTBO-CONTRACT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function createContract(templateId = 'high-school', user = {}) {
  const template = templates.find(item => item.id === templateId) || templates[0];
  const isBrand = Boolean(brandNames[template.id]);
  const isConference = ['conference', 'league-season'].includes(template.id);
  const isOfficialAgreement = template.id === 'official-independent-contractor';
  const isCelebrityFundraising = template.id === CELEBRITY_FUNDRAISING_TEMPLATE_ID;
  return {
    id: '',
    templateId: template.id,
    contractCategory: template.category,
    agreementNumber: agreementNumber(),
    datePrepared: new Date().toISOString().slice(0, 10),
    effectiveDate: '',
    expirationDate: '',
    proposalType: isOfficialAgreement ? 'Independent Contractor Basketball Officiating Agreement' : (isCelebrityFundraising ? 'Celebrity Game, Fundraising, and Sponsorship Basketball Officials Assigning Services' : (isConference ? 'Conference Basketball Officials Assigning Services' : (isBrand ? 'Brand / Showcase Basketball Officials Assigning Services' : 'Basketball Officials Assigning Services'))),
    serviceCycleLength: isOfficialAgreement ? 'Seasonal Agreement' : (isConference ? 'Minimum Four-Year Cycle' : (template.id === 'tournament' || isBrand ? 'Single Event' : 'Seasonal Agreement')),
    renewalOption: isConference || template.id === 'league-season' ? 'Seasonal Renewal' : (isCelebrityFundraising ? 'Event-by-Event Renewal' : 'Renewal by Written Agreement'),
    contractStatus: 'Draft',
    rtboRepresentative: 'Montrel Simmons',
    rtboTitle: 'President / Director / Founder',
    rtboEmail: 'admin@rtbofficiating.com',
    rtboPhone: '(501) 240-4961',
    rtboWebsite: 'https://rtbofficiating.com',
    rtboAddress: '815 Technology Dr., Box 241445, Little Rock, AR 72223',
    executiveSummary: isOfficialAgreement ? independentContractorExecutiveSummary : (isCelebrityFundraising ? celebrityFundraisingExecutiveSummary : defaultExecutiveSummary),
    clientName: '',
    organizationType: template.organizationType,
    memberSchools: '',
    primaryContact: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    billingAddress: '',
    venueAddress: '',
    eventName: isOfficialAgreement ? 'Basketball Officiating Services' : (isCelebrityFundraising ? 'Celebrity Fundraising Basketball Game' : ''),
    eventType: template.eventType,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    numberOfCourts: isCelebrityFundraising ? '1' : '',
    numberOfGyms: isCelebrityFundraising ? '1' : '',
    estimatedGames: isCelebrityFundraising ? '1' : '',
    scheduleSubmittedBy: '',
    scheduleSubmissionDeadline: '',
    levelOfPlay: template.levelOfPlay,
    officialsSystem: isOfficialAgreement ? 'Individual Official' : (template.id === 'camp-clinic' ? '2-Person Crew' : '3-Person Crew'),
    officialsPerGame: '',
    totalOfficialsPerDay: '',
    totalOfficialsEvent: '',
    ruleSet: template.ruleSet,
    assignmentPlatform: 'RTBO Platform',
    assigningCriteria: isOfficialAgreement ? independentContractorAssigningCriteria : (isCelebrityFundraising ? celebrityFundraisingAssigningCriteria : defaultAssigningCriteria),
    technologyPlatform: isOfficialAgreement ? independentContractorTechnologyPlatform : (isCelebrityFundraising ? celebrityFundraisingTechnologyPlatform : defaultTechnologyPlatform),
    modifiedRules: '',
    assigningFee: '',
    assigningFeeType: isOfficialAgreement ? 'Per Game' : (template.id === 'league-season' ? 'Per Season' : 'Per Event'),
    perSchoolAssigningFee: '',
    perGameAssigningFee: '',
    middleSchoolFee: '',
    juniorVarsityFee: '',
    juniorHighFee: '',
    varsityFee: '',
    showcaseFee: '',
    collegeFee: '',
    tournamentFee: '',
    conferenceTournamentFee: '',
    specialEventFee: '',
    travelFee: '',
    mileageRate: '',
    hotelPolicy: '',
    mealPerDiem: '',
    lateScheduleFee: '',
    cancellationFee: '',
    replacementFee: '',
    adminFee: '',
    paymentMadeBy: isOfficialAgreement ? 'Raising The Bar Officiating Inc.' : (isCelebrityFundraising ? 'Fundraising Host' : 'School'),
    paymentMadeTo: isOfficialAgreement ? 'Contractor / Official' : 'Raising The Bar Officiating Inc.',
    paymentDueDate: '',
    lateFeeAmount: '',
    lateFeeAfterDays: '',
    scheduleDueDate: '',
    scheduleLockDate: '',
    scheduleChanges: 'Only with Approval',
    scheduleFormat: 'RTBO Platform',
    paymentProcessingTime: isOfficialAgreement ? 'Within 14 Days' : 'Within 3 Business Days',
    cancellationNotice: '48 Hours',
    cancellationFeeApplies: 'Yes',
    officialsPaidLateCancel: 'Partial Payment',
    gameAdminName: '',
    gameAdminPhone: '',
    securityContact: '',
    securityPhone: '',
    assignorDuties: isCelebrityFundraising ? celebrityFundraisingAssignorDuties : defaultAssignorDuties,
    officialExpectations: isOfficialAgreement ? independentContractorExpectations : (isCelebrityFundraising ? celebrityFundraisingOfficialExpectations : defaultOfficialExpectations),
    administrationExpectations: isOfficialAgreement ? 'RTBO will communicate accepted assignments, provide applicable policies or rules, manage assignment changes, maintain agreement records, and process payments through the selected payment system according to the payment schedule established by RTBO.' : (isCelebrityFundraising ? celebrityFundraisingAdministrationExpectations : defaultAdministrationExpectations),
    coachExpectations: isCelebrityFundraising ? celebrityFundraisingCoachExpectations : defaultCoachExpectations,
    observerProgramIncluded: 'If Available',
    filmReviewIncluded: 'If Available',
    preseasonMeetingRequired: isConference ? 'Yes' : 'By Written Agreement',
    postseasonReviewRequired: isConference ? 'Yes' : 'By Written Agreement',
    trainingEvaluationModel: isOfficialAgreement ? 'Contractor must attend required clinics, meetings, seminars, schools, trainings, and qualifying tests or examinations required by RTBO before or during the Term. Continued eligibility may depend on completed training, rules knowledge, mechanics, conduct, evaluations, and availability.' : (isCelebrityFundraising ? celebrityFundraisingTrainingModel : defaultTrainingModel),
    complaintFilmReviewProcess: isOfficialAgreement ? 'RTBO may review reports, game film, observer feedback, administrator concerns, conduct issues, missed assignments, late cancellations, or policy concerns. RTBO may suspend, remove, or terminate assignment eligibility when the Organization determines that action is appropriate.' : (isCelebrityFundraising ? celebrityFundraisingComplaintProcess : defaultComplaintProcess),
    operationalTimeline: isOfficialAgreement ? 'Agreement Start: effective date entered by RTBO.\nSeason Term: one basketball season unless otherwise renewed, extended, or terminated.\nAssignments: may include preseason, in-season, postseason, scrimmage, exhibition, regular-season, tournament, clinic, school, or related basketball activities.\nAssignment Changes: all assignments remain subject to change or cancellation by RTBO.\nPostseason / Closeout: complete reports, payment documentation, evaluations, and any required agreement closeout steps.' : (isCelebrityFundraising ? celebrityFundraisingTimeline : 'Spring / Early Summer: confirm intent, collect preliminary schedules, and begin recruiting and training planning.\nSummer: collect availability, host or support training, review schedules, and prepare preseason communication.\nPreseason: finalize schedules, begin assignments, and meet with administrators or coaches when requested.\nRegular Season / Event Window: manage assignments, evaluate officials, review film, and address schedule changes.\nTournament / Postseason: select officials based on performance, availability, professionalism, and evaluation feedback.\nPostseason Review: review assignments, evaluations, feedback, and recommendations for the next agreement period.'),
    brandName: brandNames[template.id] || '',
    brandRepresentative: '',
    brandEmail: '',
    brandPhone: '',
    specialUniform: isCelebrityFundraising ? 'Yes' : 'No',
    specialUniformDescription: isCelebrityFundraising ? 'Event-approved officials uniform unless RTBO and Client agree to special sponsor or fundraiser apparel in writing.' : '',
    livestreamed: isBrand || isCelebrityFundraising ? 'Yes' : 'No',
    livestreamPlatform: '',
    filmAvailable: isBrand || isCelebrityFundraising ? 'Yes' : 'No',
    filmTrainingUse: isBrand || isCelebrityFundraising ? 'Yes' : 'No',
    mediaContact: '',
    mediaContactInfo: '',
    fundraisingBeneficiary: '',
    fundraisingGoal: '',
    sponsorshipPackage: '',
    sponsorshipDeliverables: 'Sponsor recognition, event signage, announcements, social media mentions, livestream recognition, logo placement, hospitality, or other sponsor inventory are the responsibility of Client unless RTBO agrees in writing to support a specific item.',
    celebrityParticipantRequirements: 'Client is responsible for celebrity appearance agreements, player guest lists, VIP credentials, travel or hospitality, security needs, image or likeness approvals, and participant communication.',
    sponsorRecognition: 'Client will provide sponsor recognition requirements before assignments are finalized. RTBO will consider only those sponsor requirements that affect officiating uniforms, credentials, court access, media timing, or game administration.',
    donationHandling: 'Client is responsible for donation processing, ticket revenue, charitable solicitation compliance, tax receipts, beneficiary payments, prize or auction rules, and sponsor funds unless a separate written agreement states otherwise.',
    ticketingPlan: 'Client will manage ticketing, admissions, guest lists, VIP access, comp tickets, security screening, and spectator entry unless a separate written agreement states otherwise.',
    publicRelationsApproval: 'Client is responsible for approving public statements, sponsor messages, celebrity announcements, media releases, livestream copy, charity descriptions, and promotional materials connected to the event.',
    confidentiality: 'Yes',
    nondiscrimination: 'Yes',
    disputeResolution: 'Good Faith Meeting',
    governingState: 'AR',
    terminationNotice: isOfficialAgreement ? '48 Hours' : '30 Days',
    closingStatement: isOfficialAgreement ? independentContractorClosingStatement : (isCelebrityFundraising ? celebrityFundraisingClosingStatement : defaultClosingStatement),
    specialTerms: isCelebrityFundraising ? celebrityFundraisingSpecialTerms : '',
    rtboSigner: 'Montrel Simmons',
    rtboSignerTitle: isOfficialAgreement ? 'Director' : 'President / Director / Founder',
    clientSigner: '',
    clientSignerTitle: isOfficialAgreement ? 'Independent Contractor Official' : '',
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
    ['Per-School Assigning Fee', contract.perSchoolAssigningFee, 'Per school'],
    ['Per-Game Assigning Fee', contract.perGameAssigningFee, 'Per game'],
    ['Middle School Fee Per Official', contract.middleSchoolFee, 'Per official'],
    ['Junior Varsity Fee Per Official', contract.juniorVarsityFee, 'Per official'],
    ['Junior High Fee Per Official', contract.juniorHighFee, 'Per official'],
    ['Varsity Fee Per Official', contract.varsityFee, 'Per official'],
    ['Showcase Fee Per Official', contract.showcaseFee, 'Per official'],
    ['College Fee Per Official', contract.collegeFee, 'Per official'],
    ['Tournament Fee Per Official', contract.tournamentFee, 'Per official'],
    ['Conference Tournament Fee', contract.conferenceTournamentFee, 'Per game / event'],
    ['Classic / Special Event Fee', contract.specialEventFee, 'Per game / event'],
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

function contractPaperTitle(contract) {
  if (isIndependentContractorContract(contract)) {
    return 'Independent Contractor Officiating Agreement | Basketball';
  }
  if (isCelebrityFundraisingContract(contract)) {
    return 'Celebrity Game, Fundraising, and Sponsorship Basketball Officials Assigning Agreement';
  }
  const category = String(contract.contractCategory || 'Basketball').replace(/\s+Contract$/i, '');
  return `${category} Basketball Officials Assigning Agreement`;
}

function proposalObjectives() {
  return [
    'Provide organized, dependable, and transparent basketball officials assigning services.',
    'Create a structured official evaluation and development process for the covered games and events.',
    'Improve communication among administrators, coaches, officials, observers, and the assignor.',
    'Use technology to manage assignments, availability, confirmations, schedules, reports, evaluations, invoices, and communication.',
    'Develop new and experienced officials through camps, training, film review, mentorship, observation, and accountability.',
    'Support long-term growth by creating consistency, credibility, and professional standards across all games.'
  ].join('\n');
}

function eventCoverageText(contract) {
  return [
    `Covered client or organization: ${blank(contract.clientName, 'to be completed')}.`,
    `Covered event or schedule: ${blank(contract.eventName, 'to be completed')}.`,
    `Event type: ${contract.eventType}. Level of play: ${contract.levelOfPlay}. Rule set: ${contract.ruleSet}.`,
    `Coverage dates: ${dateLabel(contract.startDate)} through ${dateLabel(contract.endDate)}.`,
    `Venue or facilities: ${blank(contract.venueAddress, 'to be completed')}.`,
    `Estimated games: ${blank(contract.estimatedGames, 'to be completed')}. Courts: ${blank(contract.numberOfCourts, 'to be completed')}. Gyms / facilities: ${blank(contract.numberOfGyms, 'to be completed')}.`,
    `Officials system: ${contract.officialsSystem}. Officials needed per game: ${blank(contract.officialsPerGame, 'to be completed')}.`
  ].join('\n');
}

function contractServiceFocus(contract) {
  const focus = {
    'high-school': 'school district game coverage, athletic department coordination, site administration, sportsmanship expectations, and NFHS-based crew assignment',
    'college-university': 'college game coverage, athletic department coordination, campus site details, NCAA/NJCAA/NAIA rule alignment, and higher-level official readiness',
    conference: 'conference-wide schedule management, member-school communication, long-term official development, evaluation, rotation, postseason selection, and consistent conference standards',
    organization: 'private organization game coverage, event-specific rules, staffing accountability, site contact coordination, and professional communication',
    'event-center': 'facility-based event coverage, multi-court logistics, site supervisor communication, game flow coordination, and emergency assignment coverage',
    'community-center': 'community program coverage, recreation-league rules, youth safety, site communication, and consistent assignment coverage',
    'boys-girls-club': 'youth development event coverage, club safety standards, sportsmanship, recreation-league rules, and reliable official assignments',
    tournament: 'single-site or multi-site tournament coverage, bracket changes, court rotation, crew depth, emergency replacements, and high-volume event communication',
    [CELEBRITY_FUNDRAISING_TEMPLATE_ID]: 'celebrity game coverage, fundraising event operations, sponsor activation support, media coordination, donation and ticketing boundaries, safety planning, and positive event presentation',
    'nike-showcase': 'Nike-branded showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'adidas-showcase': 'Adidas-branded showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'under-armor-showcase': 'Under Armor-branded showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'new-balance-showcase': 'New Balance-branded showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'reebok-showcase': 'Reebok-branded showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'brand-showcase': 'brand-sponsored showcase coverage, elite matchup assignments, media considerations, uniform requirements, schedule movement, and event production support',
    'league-season': 'season-long league coverage, weekly schedule management, school rotation, assignment consistency, and postseason selection standards',
    'camp-clinic': 'school or clinic coverage, instructional settings, modified rules, official development, and safe learning environments',
    'official-independent-contractor': 'independent contractor basketball officiating services, professional conduct, assignment acceptance, training requirements, payment processing, insurance obligations, and digital execution'
  };
  return focus[contract.templateId] || 'basketball event coverage, professional communication, assignment accountability, and service to the game';
}

function professionalExecutiveSummary(contract) {
  if (isIndependentContractorContract(contract)) {
    return `${contract.executiveSummary}\nThis ${contractPaperTitle(contract)} is structured for officials who will accept basketball officiating assignments as independent contractors through RTBO. It preserves RTBO assignment discretion, confirms the Contractor's tax and insurance responsibilities, and documents the standards required before and after assignments are accepted.`;
  }
  if (isCelebrityFundraisingContract(contract)) {
    return `${contract.executiveSummary}\nThis ${contractPaperTitle(contract)} is specifically structured for celebrity basketball games, fundraising events, charitable causes, sponsor activations, livestreamed events, media presentation, participant safety, event revenue boundaries, and professional officiating coverage. RTBO's responsibility is limited to the officiating assigning services and related support stated in this agreement unless the parties execute a separate written addendum.`;
  }
  return `${contract.executiveSummary}\nThis ${contractPaperTitle(contract)} is specifically structured for ${contractServiceFocus(contract)}. The agreement is intended to give RTBO, the Client, participating schools or teams, officials, coaches, administrators, and event leadership a clear operating document before assignments begin.`;
}

function agreementSnapshotRows(contract, total) {
  if (isIndependentContractorContract(contract)) {
    return [
      ['Contractor / Official', blank(contract.clientName, 'To be completed')],
      ['Covered Services', blank(contract.eventName, 'Basketball Officiating Services')],
      ['Classification', blank(contract.levelOfPlay, 'To be completed')],
      ['Term', `${dateLabel(contract.effectiveDate)} - ${dateLabel(contract.expirationDate)}`],
      ['Assignment Role', blank(contract.officialsSystem, 'Individual Official')],
      ['Payment Method', blank(contract.paymentProcessingTime, 'By RTBO payment schedule')],
      ['Governing Law', stateLabel(contract.governingState)],
      ['Estimated Fees', money(total)]
    ];
  }
  return [
    ['Client', blank(contract.clientName, 'To be completed')],
    ['Event / Schedule', blank(contract.eventName, 'To be completed')],
    ['Category', blank(contract.contractCategory, 'Basketball Assigning')],
    ['Service Cycle', blank(contract.serviceCycleLength, 'Seasonal Agreement')],
    ['Coverage Dates', `${dateLabel(contract.startDate)} - ${dateLabel(contract.endDate)}`],
    ['Rule Set', blank(contract.ruleSet, 'To be completed')],
    ['Crew System', blank(contract.officialsSystem, 'To be completed')],
    ['Estimated Fees', money(total)]
  ];
}

function independentContractorClauses(contract, total) {
  const contractor = blank(contract.clientName, 'the Contractor / Official');
  const classification = blank(contract.levelOfPlay, 'the applicable classification');
  const term = `The term of this Agreement begins on ${dateLabel(contract.effectiveDate)} and ends on ${dateLabel(contract.expirationDate)}, unless renewed, extended, suspended, or terminated under this Agreement. Unless RTBO states otherwise in writing, the Agreement applies to one basketball season.`;

  return [
    ['INTRODUCTION AND IDENTIFICATION OF PARTIES', `This Independent Contractor Officiating Agreement is entered into by and between Raising The Bar Officiating Inc., an Arkansas non-profit corporation with an address of ${blank(contract.rtboAddress, '815 Technology Dr., Box 241445, Little Rock, Arkansas 72223')}, and ${contractor}, with a mailing address of ${blank(contract.billingAddress, 'to be completed')}.\nRTBO wishes to engage Contractor as an independent contractor for the purpose of providing basketball officiating services and related officiating work for the benefit of RTBO, its members, clients, schools, conferences, organizations, events, and approved assignment partners. Contractor desires to perform those services on an independent contractor basis, subject to the terms and conditions of this Agreement.`],
    ['TERM', term],
    ['CONTRACTOR STATUS', `Contractor is engaged by RTBO as an independent contractor to perform basketball officiating and officiating-related work at games, scrimmages, exhibitions, tournaments, schools, clinics, meetings, seminars, travel, and related activities sanctioned or approved by RTBO, ${classification}, or another approved governing body.\nContractor is not an employee, agent, partner, joint venturer, or legal representative of RTBO. Nothing in this Agreement creates an employer-employee relationship. RTBO does not control the specific methods by which Contractor performs officiating services except as stated in this Agreement, applicable rules, mechanics, policies, safety requirements, and assignment standards.\nContractor is solely responsible for all federal, state, and local taxes, Social Security taxes, unemployment insurance taxes, business license fees, and other obligations arising from Contractor's services. RTBO will not withhold federal or state taxes from compensation paid under this Agreement and may issue a Form 1099 when required by law.`],
    ['GAME ASSIGNMENTS', `This Agreement does not obligate RTBO to make any game assignment to Contractor, nor does it guarantee a minimum number, level, quality, location, or type of assignments. Contractor may accept or decline any game assignment when offered.\nRTBO may require Contractor to attend clinics, meetings, seminars, schools, trainings, qualifying tests, examinations, and, when applicable, a physical examination by a medical doctor. Assignments may include preseason, in-season, postseason, regular-season, tournament, exhibition, scrimmage, clinic, school, and other basketball-related activities.\nAll assignments remain subject to change, reassignment, removal, or cancellation in RTBO's sole discretion. Contractor may revoke acceptance of an assignment no later than ninety-six (96) hours before the original posted game time, except for illness, family emergency, business emergency, or another reason accepted by RTBO.`],
    ['ASSIGNMENT CRITERIA AND COMMUNICATION PLATFORM', `${contract.assigningCriteria}\n${contract.technologyPlatform}`],
    ['PAYMENT AND TAX RESPONSIBILITY', `For each assignment fulfilled by Contractor, Contractor shall receive the applicable game fee, assignment fee, or approved compensation entered into this Agreement or otherwise communicated by RTBO. The current estimated fee schedule total is ${money(total)}.\nPayment shall be made by ${blank(contract.paymentMadeBy, 'Raising The Bar Officiating Inc.')} to ${blank(contract.paymentMadeTo, 'Contractor / Official')} through the payment system and schedule established by RTBO. Current payment processing selection: ${blank(contract.paymentProcessingTime, 'By RTBO payment schedule')}.\nContractor is responsible for providing accurate payment information required to process compensation. Contractor may, at RTBO's or a host institution's discretion, receive additional compensation such as lodging, meals, mileage, travel reimbursement, per diem, or other approved benefits as part of or in addition to the game fee.`],
    ['EXPENSES, EQUIPMENT, TOOLS, AND MATERIALS', `Contractor is responsible for all expenses incurred while performing services unless RTBO and Contractor mutually agree otherwise in writing. Contractor will furnish all vehicles, uniforms, whistles, equipment, tools, materials, and other items necessary to provide the services unless RTBO states otherwise in writing.\nTravel fee selection: ${feeDisplay(contract.travelFee)}. Mileage rate: ${blank(contract.mileageRate, 'to be completed if applicable')}. Lodging policy: ${blank(contract.hotelPolicy, 'to be completed if applicable')}. Meal per diem: ${feeDisplay(contract.mealPerDiem)}.`],
    ['ORGANIZATION POLICIES, LOCATION RULES, AND PROFESSIONAL CONDUCT', `Contractor acknowledges that Contractor has been provided with or has access to RTBO personal conduct policies, anti-harassment policies, sportsmanship expectations, assignment procedures, and other professional standards. Contractor represents that Contractor is familiar with applicable location-specific rules and policies where services will be performed.\nContractor shall perform all services consistently with RTBO policies, location rules, applicable law, approved mechanics, assignment instructions, and professional standards. Contractor shall not commit any act that reflects negatively on Contractor's or RTBO's integrity, morality, honesty, reputation, fairness, or public confidence in basketball officiating. RTBO may immediately suspend or terminate this Agreement or remove Contractor from assignments for policy violations, misconduct, safety concerns, dishonesty, unprofessional conduct, or conduct that prejudices RTBO, schools, member institutions, participants, fans, coaches, game officials, coordinators, supervisors, or observers.`],
    ['NCAA, SPORT-SPECIFIC, AND WAGERING RULES', `Contractor agrees to comply with all applicable rules and regulations of the NCAA, NFHS, NJCAA, NAIA, professional, school, conference, tournament, RTBO, and sport-specific bodies applicable to the assignment. Contractor also agrees to conform to published basketball officiating mechanics unless modified by RTBO or the applicable assignment authority.\nContractor shall not, directly or indirectly, wager, gamble, or participate in any game of chance relating to the outcome of any athletic contest. A violation of this section may result in immediate suspension, termination, removal from assignments, and any additional reporting or compliance action required by applicable rules.`],
    ['TERMINATION', `Either party may terminate this Agreement at any time and for any reason by giving at least forty-eight (48) hours written notice to the other party, subject to the assignment revocation rules in this Agreement. RTBO may suspend or terminate this Agreement immediately without prior notice for cause, including misconduct, policy violations, rule violations, safety concerns, dishonesty, wagering, failure to meet requirements, or conduct that RTBO determines is inconsistent with its standards.`],
    ['INDEMNIFICATION', `Contractor shall observe and comply with all federal, state, and local laws, ordinances, regulations, rules, certificates, licenses, permits, bonds, insurance requirements, and other obligations applicable to Contractor's services. To the fullest extent permitted by law, Contractor shall defend, indemnify, and hold harmless RTBO and its directors, officers, employees, members, affiliates, agents, representatives, successors, and assigns from claims, damages, liabilities, losses, and expenses arising from Contractor's performance of services, acts, omissions, failure to comply with this Agreement, bodily injury, death, or damage to real or personal property.`],
    ['INSURANCE', `Contractor shall purchase and maintain insurance sufficient to protect Contractor from claims for damages, personal injury, bodily injury, sickness, death, property damage, or other exposure directly or indirectly related to Contractor's services. Contractor represents that Contractor has and will maintain health insurance or other coverage sufficient for Contractor's performance of services and any potential injury, sickness, or death connected to those services. Contractor shall provide current proof of insurance upon request. Contractor bears responsibility for obtaining and maintaining required insurance coverage.`],
    ['ASSUMPTION OF RISK AND RELEASE', `Contractor understands and assumes all risks related to performing services, including travel to and from assignments, services performed at any location or facility, participation in meetings, seminars, schools, clinics, and events incidental to the services, and potential exposure to infectious disease or other known or unknown risks.\nTo the fullest extent permitted by law, Contractor releases RTBO and its directors, officers, employees, members, affiliates, agents, representatives, successors, and assigns from claims arising out of personal or bodily injury, illness, death, property loss, property damage, economic loss, travel, assignment performance, or events incidental to the services, including claims arising out of negligent acts or omissions, except where release is prohibited by law.`],
    ['GOVERNING LAW AND JURISDICTION', `This Agreement, performance under this Agreement, and claims arising out of or relating to this Agreement are governed by the laws of ${stateLabel(contract.governingState)}, without regard to conflict-of-law principles. The parties agree to first attempt to resolve disputes by ${blank(contract.disputeResolution, 'good faith meeting')}, unless urgent legal or equitable relief is required.`],
    ['SEVERABILITY, ENTIRE AGREEMENT, COUNTERPARTS, AND BINDING EFFECT', `If any term or condition of this Agreement is invalid, illegal, or unenforceable, that determination shall not affect any other term or condition or render that term unenforceable in any other jurisdiction.\nThis Agreement constitutes the entire agreement between RTBO and Contractor with respect to the subject matter and supersedes all prior or contemporaneous understandings, whether written or oral. This Agreement may only be amended by a writing signed by both parties.\nThis Agreement may be executed in one or more counterparts and by digital signature, each of which is deemed an original, and all of which together constitute one instrument. This Agreement is binding on RTBO's successors and assigns and Contractor's successors, legal representatives, and heirs. Contractor may not assign this Agreement without RTBO's written consent.`],
    ['CLOSING STATEMENT', contract.closingStatement]
  ];
}

function clauses(contract, total) {
  if (isIndependentContractorContract(contract)) {
    return independentContractorClauses(contract, total);
  }

  const client = blank(contract.clientName, 'the Client / Organization');
  const celebrityFundraising = isCelebrityFundraisingContract(contract)
    ? [
        ['CELEBRITY GAME, FUNDRAISING, AND SPONSORSHIP TERMS', `Beneficiary / cause: ${blank(contract.fundraisingBeneficiary, 'to be completed by Client')}. Fundraising goal: ${blank(contract.fundraisingGoal, 'to be completed if applicable')}. Sponsorship package / level: ${blank(contract.sponsorshipPackage, 'to be completed if applicable')}.\nClient is responsible for celebrity appearance agreements, VIP or guest lists, travel or hospitality for celebrity participants, sponsor inventory, promotional copy, fundraising compliance, donation handling, ticketing, admissions, tax receipts, beneficiary payment instructions, prize or auction rules, and public statements unless RTBO agrees otherwise in a separate written addendum.\nRTBO is responsible only for basketball officials assigning services, officials communication, and related officiating support described in this Agreement.`],
        ['SPONSOR DELIVERABLES, RECOGNITION, AND EVENT PRESENTATION', `${blank(contract.sponsorshipDeliverables, 'Sponsor deliverables must be completed by Client or sponsor unless RTBO accepts a specific written responsibility.')}\nSponsor recognition plan: ${blank(contract.sponsorRecognition, 'to be completed by Client')}\nCelebrity participant requirements: ${blank(contract.celebrityParticipantRequirements, 'to be completed by Client')}\nPublic relations approval: ${blank(contract.publicRelationsApproval, 'Client controls promotional, sponsor, beneficiary, celebrity, and media approvals unless otherwise agreed in writing.')}`],
        ['DONATION, REVENUE, TICKETING, AND BENEFICIARY HANDLING', `Donation / revenue handling: ${blank(contract.donationHandling, 'Client is responsible for donation processing, ticket revenue, sponsor funds, beneficiary payments, and charitable solicitation compliance.')}\nTicketing / admission plan: ${blank(contract.ticketingPlan, 'Client is responsible for ticketing, admission, credentials, guest lists, and VIP access unless otherwise agreed in writing.')}\nRTBO does not provide tax, fundraising, charitable solicitation, sponsorship, celebrity appearance, securities, or accounting advice. Client should obtain appropriate legal, tax, accounting, insurance, and sponsorship review for the fundraising and sponsorship portions of the event.`]
      ]
    : [];
  const media = contract.brandName || contract.livestreamed === 'Yes' || contract.filmAvailable === 'Yes'
    ? [['Brand, Media, Livestream, and Event Content', `If the event includes ${blank(contract.brandName, 'a brand or sponsor')}, livestream, media credential, broadcast, social content, or recorded content requirements, Client shall disclose those requirements before assignments are finalized. RTBO may consider uniform requirements, credential rules, media access, livestream logistics, film availability, production needs, and training permissions when assigning officials. Film use for RTBO training is ${contract.filmTrainingUse}.`]]
    : [];

  return [
    ['EXECUTIVE SUMMARY', professionalExecutiveSummary(contract)],
    ['PROPOSAL OBJECTIVES', proposalObjectives()],
    ['ASSIGNING OF GAMES', eventCoverageText(contract)],
    ['ASSIGNING CRITERIA', contract.assigningCriteria],
    ['TECHNOLOGY AND COMMUNICATION PLATFORM', `${contract.technologyPlatform}\nCurrent assignment platform selection: ${contract.assignmentPlatform}. Schedule format required: ${contract.scheduleFormat}.`],
    ['ASSIGNOR DUTIES AND EXPECTATIONS', contract.assignorDuties],
    ['OFFICIALS EXPECTATIONS', contract.officialExpectations],
    ['ADMINISTRATION EXPECTATIONS', `${contract.administrationExpectations}\nSchedule submission deadline: ${dateLabel(contract.scheduleSubmissionDeadline || contract.scheduleDueDate)}. Final schedule lock date: ${dateLabel(contract.scheduleLockDate)}.`],
    ['COACH EXPECTATIONS', contract.coachExpectations],
    ['TRAINING AND EVALUATION MODEL', `Observer program included: ${contract.observerProgramIncluded}. Film review included: ${contract.filmReviewIncluded}. Preseason meeting required: ${contract.preseasonMeetingRequired}. Postseason review required: ${contract.postseasonReviewRequired}.\n${contract.trainingEvaluationModel}`],
    ['COMPLAINT AND FILM REVIEW PROCESS', contract.complaintFilmReviewProcess],
    ['PROPOSED OPERATIONAL TIMELINE', contract.operationalTimeline],
    ...celebrityFundraising,
    ['IDENTIFICATION OF PARTIES', `Coordinator of Officials: ${blank(contract.rtboRepresentative, 'Montrel Simmons')} / Raising The Bar Officiating Inc.\nClient / Organization: ${client}.\nMember schools, teams, facilities, or participating groups: ${blank(contract.memberSchools, 'to be completed if applicable')}.`],
    ['AGREEMENT TERM', `The Agreement begins on ${dateLabel(contract.effectiveDate)} and expires on ${dateLabel(contract.expirationDate)}, unless extended, renewed, or terminated under this Agreement. The selected service cycle is ${contract.serviceCycleLength}. Renewal option: ${contract.renewalOption}.`],
    ['SERVICES AND RESPONSIBILITIES OF THE COORDINATOR OF OFFICIALS', `Client engages RTBO to coordinate, assign, communicate with, and administer basketball officials for ${blank(contract.eventName, 'the covered schedule, season, tournament, showcase, organization, facility, or event')}. RTBO shall use commercially reasonable efforts to provide qualified officials based on event level, availability, geography, rule set, facility requirements, assignment criteria, and information provided by Client.`],
    ['SERVICES AND RESPONSIBILITIES OF THE CLIENT', `${contract.administrationExpectations}\nClient shall provide complete schedules, accurate venues, game levels, start times, cancellation notices, facility access, safe working conditions, game administration, and any rules or event policies necessary for RTBO to perform.`],
    ['PAYMENT OF SERVICES', `Client shall pay the fees stated in this Agreement to ${contract.paymentMadeTo}. Payment is made by ${contract.paymentMadeBy} and is due on ${dateLabel(contract.paymentDueDate)}. The current estimated completed fee schedule total is ${money(total)}. Officials payments should be processed ${contract.paymentProcessingTime}. Late schedule changes, cancellations, emergency replacements, travel costs, mileage, lodging, per diem, or administrative processing charges may be billed as stated in the fee schedule or by written agreement.`],
    ['SCHEDULE CHANGES AND CANCELLATION', `Schedules are due by ${dateLabel(contract.scheduleDueDate)} and lock on ${dateLabel(contract.scheduleLockDate)}. Schedule changes after lock are ${contract.scheduleChanges}. Cancellation notice required is ${contract.cancellationNotice}. Cancellation fees apply: ${contract.cancellationFeeApplies}. Officials paid if cancelled late: ${contract.officialsPaidLateCancel}.`],
    ['SAFETY, CONDUCT, AND SITE ADMINISTRATION', `Client shall maintain a safe, professional, and sportsmanlike environment for officials, including appropriate facility access, crowd management, event administration, emergency procedures, and reasonable security support. Game administrator: ${blank(contract.gameAdminName, 'to be provided')}. Security contact: ${blank(contract.securityContact, 'to be provided')}. RTBO may decline or withdraw assignments if site conditions create unreasonable safety or conduct concerns.`],
    ...media,
    ['LEGAL TERMS AND PROFESSIONAL STANDARDS', `Independent contractor relationship: Nothing in this Agreement creates a partnership, joint venture, franchise, agency, or employer-employee relationship between Client and RTBO or between Client and any assigned official, except where required by applicable law or separate written agreement.\nConfidentiality clause included: ${contract.confidentiality}. Non-discrimination clause included: ${contract.nondiscrimination}. The Parties agree to administer this Agreement in a professional manner and without unlawful discrimination or retaliation.\nRisk allocation: To the fullest extent permitted by applicable law, each Party is responsible for its own acts, omissions, personnel, facilities, records, and compliance obligations. Neither Party shall be liable for delay or nonperformance caused by events beyond reasonable control, including severe weather, facility closure, public safety orders, or other force majeure conditions.\nTermination: Either Party may terminate this Agreement according to the selected notice period: ${contract.terminationNotice}. Termination does not waive payment obligations for services performed, assignments confirmed, costs incurred, or fees earned before the effective termination date.\nDispute resolution and governing law: The Parties shall first attempt to resolve disputes by ${contract.disputeResolution}. Unless otherwise required by applicable law, this Agreement is governed by the laws of ${stateLabel(contract.governingState)}, without regard to conflict-of-law principles.\nEntire agreement: This Agreement, including written attachments, schedules, fee sheets, event rules, or signed addenda, represents the Parties full understanding regarding the services described herein. Amendments must be in writing and accepted by both Parties.`],
    ['CLOSING STATEMENT', contract.closingStatement]
  ];
}

function fileBase(contract) {
  return String(contract.agreementNumber || contract.clientName || 'rtbo-contract').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rtbo-contract';
}

function contractPdfFileName(contract = {}) {
  return `${fileBase(contract)}.pdf`;
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

async function contractApiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Contract request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function contractApiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Contract request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function contractPdfBlob(pdf = {}) {
  const base64 = String(pdf.contentBase64 || '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: pdf.mimeType || 'application/pdf' });
}

async function requestContractPdfSaveTarget(contract = {}) {
  const suggestedName = contractPdfFileName(contract);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Printable contract PDF',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      return { type: 'file-picker', handle, suggestedName };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { type: 'canceled', suggestedName };
      }
    }
  }

  return { type: 'download', suggestedName };
}

async function saveContractPdfToComputer(pdf = {}, target = { type: 'download' }) {
  if (target?.type === 'canceled') {
    return { saved: false, canceled: true };
  }

  const blob = contractPdfBlob(pdf);
  const fileName = target?.suggestedName || pdf.fileName || 'RTBO-Contract.pdf';

  if (target?.type === 'file-picker' && target.handle) {
    const writable = await target.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { saved: true, method: 'file-picker' };
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { saved: true, method: 'download' };
}

function contractPdfSaveMessage(result = {}) {
  if (result.canceled) return 'PDF save was canceled.';
  if (result.method === 'file-picker') return 'PDF saved to the selected location on this computer.';
  if (result.method === 'download') return 'PDF downloaded to the browser downloads folder.';
  return 'PDF save completed.';
}

function validateContractDelivery(contract = {}, actionLabel = 'continuing') {
  const errors = [];
  const isContractorAgreement = isIndependentContractorContract(contract);
  if (!String(contract.agreementNumber || '').trim()) errors.push('Agreement number is required.');
  if (!String(contract.clientName || '').trim()) errors.push(`${isContractorAgreement ? 'Official / contractor' : 'Client / organization'} name is required.`);
  if (!String(contract.primaryContact || contract.clientSigner || '').trim()) errors.push(`${isContractorAgreement ? 'Official / contractor' : 'Client'} contact or signer is required.`);
  if (!String(contract.contactEmail || '').trim()) {
    errors.push(`${isContractorAgreement ? 'Official' : 'Client'} email address is required.`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contract.contactEmail).trim())) {
    errors.push(`Enter a valid ${isContractorAgreement ? 'official' : 'client'} email address.`);
  }
  if (errors.length > 0) {
    throw new Error(`Complete the contract delivery fields before ${actionLabel}: ${errors.join(' ')}`);
  }
}

function feeDisplay(value) {
  return Number(value || 0) > 0 ? money(value) : '$________';
}

function proposalFeeRows(contract) {
  if (isCelebrityFundraisingContract(contract)) {
    return [
      ['Celebrity Game / Fundraiser', contract.assigningFee || contract.perGameAssigningFee, contract.specialEventFee || contract.varsityFee, contract.specialEventFee || contract.showcaseFee, 'Final rate should reflect celebrity participants, sponsor requirements, media needs, crowd size, and security expectations.'],
      ['Sponsor Activation / Media Event', contract.assigningFee || contract.adminFee, contract.showcaseFee || contract.specialEventFee, contract.specialEventFee, 'Applies when sponsor inventory, livestream timing, special uniforms, credentials, or media windows affect officiating operations.'],
      ['Fundraising Tournament / Multi-Game Event', contract.tournamentFee || contract.assigningFee, contract.showcaseFee || contract.tournamentFee, contract.tournamentFee || contract.specialEventFee, 'May apply when the fundraiser includes multiple teams, brackets, courts, or schedule blocks.'],
      ['Travel / Administration', contract.adminFee, contract.travelFee, contract.mealPerDiem, 'Travel, meals, lodging, emergency replacements, sponsor briefings, or administrative costs may apply when approved.']
    ];
  }
  return [
    ['Varsity', contract.assigningFee || contract.perGameAssigningFee, contract.varsityFee, contract.specialEventFee, 'Final rate to be approved by the client authority.'],
    ['Junior Varsity', contract.assigningFee || contract.perGameAssigningFee, contract.juniorVarsityFee, contract.specialEventFee, 'May be paired with varsity doubleheaders when appropriate.'],
    ['Junior High', contract.assigningFee || contract.perGameAssigningFee, contract.juniorHighFee || contract.middleSchoolFee, contract.specialEventFee, 'Final rate to reflect travel, coverage, and crew availability.'],
    ['Conference Tournament', contract.conferenceTournamentFee || contract.assigningFee, contract.tournamentFee || contract.varsityFee, contract.conferenceTournamentFee || contract.tournamentFee, 'Postseason assignments based on performance and availability.'],
    ['Special Events / Classics', contract.specialEventFee || contract.showcaseFee, contract.showcaseFee || contract.tournamentFee, contract.specialEventFee || contract.tournamentFee, 'Rates may vary by event structure, brand requirements, and number of courts.'],
    ['Travel / Administration', contract.adminFee, contract.travelFee, contract.mealPerDiem, 'Travel, meals, lodging, emergency replacements, or administrative costs may apply when approved.']
  ];
}

function contractorFeeRows(contract) {
  return [
    ['Regular Season / Exhibition / Scrimmage', contract.varsityFee || contract.collegeFee || contract.assigningFee, contract.travelFee, 'Game fee for accepted assignments, subject to RTBO assignment confirmation.'],
    ['Junior Varsity / Junior High / Middle School', contract.juniorVarsityFee || contract.juniorHighFee || contract.middleSchoolFee, contract.travelFee, 'Applies when Contractor accepts lower-level assignments.'],
    ['College / Advanced Classification', contract.collegeFee || contract.varsityFee, contract.travelFee, 'Applies to NJCAA, NAIA, NCAA, Pro-Am, or other approved advanced assignments when selected.'],
    ['Tournament / Postseason / Special Event', contract.tournamentFee || contract.conferenceTournamentFee || contract.specialEventFee, contract.mealPerDiem, 'Rates may vary by event structure, travel, schedule load, and assignment terms.'],
    ['Administrative / Additional Compensation', contract.adminFee || contract.replacementFee || contract.lateScheduleFee, contract.mealPerDiem, 'Additional compensation, lodging, meals, mileage, or reimbursements apply only when approved by RTBO or host institution.']
  ];
}

function shouldInsertFeeScheduleAfter(sectionTitle, contract) {
  if (isIndependentContractorContract(contract)) {
    return sectionTitle === 'PAYMENT AND TAX RESPONSIBILITY';
  }
  return sectionTitle === 'TECHNOLOGY AND COMMUNICATION PLATFORM';
}

function coverRows(contract) {
  return [
    ['Prepared By', blank(contract.rtboRepresentative, 'Montrel Simmons') + ', ' + blank(contract.rtboTitle, 'President / Director / Founder')],
    ['RTBO Contact', `${blank(contract.rtboRepresentative, 'Montrel Simmons')} | ${blank(contract.rtboPhone, '(501) 240-4961')}`],
    ['Organization', 'Raising The Bar Officiating Inc.'],
    ['Email', blank(contract.rtboEmail, 'admin@rtbofficiating.com')],
    ['Website', blank(contract.rtboWebsite, 'https://rtbofficiating.com')],
    ['Proposal Type', blank(contract.proposalType, 'Basketball Officials Assigning Services')],
    [isIndependentContractorContract(contract) ? 'Prepared For / Contractor' : 'Prepared For', blank(contract.clientName, isIndependentContractorContract(contract) ? 'Official / Contractor' : 'Client / Organization / Event Leadership')],
    ['Agreement #', blank(contract.agreementNumber, 'RTBO-CONTRACT')]
  ];
}

function timelineRows(value) {
  return multiline(value).map(line => {
    const separator = line.indexOf(':');
    if (separator === -1) return ['Timeline Item', line];
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  });
}

function articleNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function paperSectionHtml(title, text, index) {
  return `<section class="paper-section"><div class="section-kicker">ARTICLE ${articleNumber(index)}</div><div class="section-body"><h2>${escapeHtml(title)}</h2>${multilineHtml(text)}</div></section>`;
}

function snapshotHtml(contract, total) {
  return `<section class="snapshot"><h2>Agreement Snapshot</h2><div class="snapshot-grid">${agreementSnapshotRows(contract, total).map(row => `<div><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`).join('')}</div></section>`;
}

function feeTableHtml(contract, total) {
  if (isIndependentContractorContract(contract)) {
    return `<section class="fee-section"><div class="fee-head"><span>Financial Schedule</span><h2>CONTRACTOR OFFICIATING FEE SCHEDULE</h2><p>Final game fees, reimbursements, lodging, meals, and additional compensation are subject to assignment confirmation and RTBO payment procedures.</p></div><table class="fee-table"><thead><tr><th>Assignment Category</th><th>Game Fee</th><th>Travel / Additional Compensation</th><th>Notes</th></tr></thead><tbody>${contractorFeeRows(contract).map(row => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(feeDisplay(row[1]))}</td><td>${escapeHtml(feeDisplay(row[2]))}</td><td>${escapeHtml(row[3])}</td></tr>`).join('')}<tr class="total"><td colspan="3">Estimated completed fee schedule total</td><td>${escapeHtml(money(total))}</td></tr></tbody></table><p class="fee-note">Payment processing selection: ${escapeHtml(contract.paymentProcessingTime)}.</p></section>`;
  }

  return `<section class="fee-section"><div class="fee-head"><span>Financial Schedule</span><h2>ASSIGNOR FEES AND OFFICIALS FEES</h2><p>Final assigning fees and officials game fees should be discussed and agreed upon by the Client and RTBO before execution of the final agreement. The following structure is provided for review and approval.</p></div><table class="fee-table"><thead><tr><th>Category</th><th>Assignor Fee</th><th>Official Game Fee</th><th>Tournament / Classic Fee</th><th>Notes</th></tr></thead><tbody>${proposalFeeRows(contract).map(row => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(feeDisplay(row[1]))}</td><td>${escapeHtml(feeDisplay(row[2]))}</td><td>${escapeHtml(feeDisplay(row[3]))}</td><td>${escapeHtml(row[4])}</td></tr>`).join('')}<tr class="total"><td colspan="4">Estimated completed fee schedule total</td><td>${escapeHtml(money(total))}</td></tr></tbody></table><p class="fee-note">Officials payments should be made according to the approved payment procedure. Current payment processing selection: ${escapeHtml(contract.paymentProcessingTime)}.</p></section>`;
}

function signatureHtml(contract) {
  const clientSigned = contract.clientSignedAt ? `<p>Digitally signed: ${escapeHtml(contract.clientSignedAt)}</p>` : '';
  const rtboSigned = contract.rtboSignedAt ? `<p>Digitally signed: ${escapeHtml(contract.rtboSignedAt)}</p>` : '';
  const signerLabel = isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client / Organization Representative';
  const organizationLabel = isIndependentContractorContract(contract) ? 'Contractor Name' : 'School/Organization';
  return `<section class="signature-page"><div class="signature-intro"><span>Execution Copy</span><h2>SIGNATURE PAGE</h2><p>IN WITNESS WHEREOF, the ${isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client representative'} and the Coordinator of Officials have caused this agreement to be reviewed and executed on the date(s) indicated below. Final terms, fees, dates, and legal language should be approved by the appropriate authority before execution.</p></div><div class="signature-grid"><div><h3>${escapeHtml(signerLabel)}</h3><p>Printed Name: ${escapeHtml(blank(contract.clientSigner, '_______________________________'))}</p><p>Position/Title: ${escapeHtml(blank(contract.clientSignerTitle, '_______________________________'))}</p><p>${escapeHtml(organizationLabel)}: ${escapeHtml(blank(contract.clientName, '_______________________________'))}</p><div class="line"></div><p>Signature</p><div class="line"></div><p>Date</p>${clientSigned}</div><div><h3>Coordinator of Officials</h3><p>${escapeHtml(blank(contract.rtboSigner, 'Montrel Simmons'))}</p><p>Raising The Bar Officiating Inc.</p><p>${escapeHtml(blank(contract.rtboSignerTitle, 'President / Director / Founder'))}</p><div class="line"></div><p>Signature</p><div class="line"></div><p>Date</p>${rtboSigned}</div></div></section>`;
}

function printHtml(contract) {
  const total = estimatedTotal(contract);
  const title = contractPaperTitle(contract);
  const logo = contractLogoUrl();
  const sections = clauses(contract, total);
  const sectionHtml = sections.map((section, index) => {
    const html = paperSectionHtml(section[0], section[1], index);
    return shouldInsertFeeScheduleAfter(section[0], contract) ? html + feeTableHtml(contract, total) : html;
  }).join('');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(contract.agreementNumber)}</title>
<style>
@page{size:letter;margin:.52in}
*{box-sizing:border-box}
body{position:relative;margin:0;color:#111;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:10.8px;line-height:1.5}
.watermark{position:fixed;left:50%;top:56%;z-index:-1;width:360px;max-width:56%;opacity:.045;transform:translate(-50%,-50%)}
.running-header{display:flex;align-items:center;justify-content:center;gap:8px;border-bottom:1px solid #d7d7d7;color:#111;font-size:8.7px;padding:0 0 7px;margin-bottom:18px;letter-spacing:.01em;text-align:center}
.running-logo{width:22px;height:22px;object-fit:contain;flex:0 0 auto}
.cover{position:relative;margin-bottom:18px;border:1px solid #d9d9d9;border-top:8px solid #f58220;background:linear-gradient(180deg,#fff 0%,#fafafa 100%);box-shadow:0 8px 20px rgba(0,0,0,.06)}
.cover-band{display:grid;grid-template-columns:92px minmax(0,1fr);gap:18px;align-items:center;padding:22px 24px 18px;border-bottom:5px solid #111}
.cover-logo{display:block;width:92px;height:92px;object-fit:contain}
.cover h1{margin:0;color:#111;font-size:20px;letter-spacing:.09em}
.cover h2{margin:6px 0 7px;color:#111;font-size:18px;line-height:1.15}
.tagline{margin:0;color:#111;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.cover-meta{padding:14px 24px 18px}
.cover table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e0e0e0}
.cover th{width:32%;color:#111;text-align:left;background:#f6f6f6}
.cover th,.cover td{border-bottom:1px solid #ededed;padding:6px 8px}
.motto{margin:12px 0 0;color:#111;font-weight:700;text-align:center}
.snapshot{break-inside:avoid;margin:0 0 16px;padding:14px;border:1px solid #d8d8d8;border-left:6px solid #f58220;background:#fcfcfc}
.snapshot h2{margin:0 0 10px;color:#111;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.snapshot-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.snapshot-grid div{min-height:52px;padding:8px;border:1px solid #e2e2e2;background:#fff}
.snapshot-grid span{display:block;margin-bottom:4px;color:#555;font-size:8.4px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.snapshot-grid strong{display:block;color:#111;font-size:10.2px;line-height:1.25}
.paper-section{display:grid;grid-template-columns:74px minmax(0,1fr);gap:16px;break-inside:avoid;margin:0 0 14px;padding-bottom:11px;border-bottom:1px solid #ededed}
.section-kicker{color:#f58220;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.paper-section h2{margin:0 0 7px;color:#111;font-size:12.5px;line-height:1.2;text-transform:uppercase;letter-spacing:.025em}
.paper-section p{margin:0 0 6px;color:#111}
.fee-section{break-inside:avoid;margin:2px 0 16px;padding:13px;border:1px solid #d8d8d8;background:#fff}
.fee-head{border-left:5px solid #f58220;padding-left:10px;margin-bottom:10px}
.fee-head span,.signature-intro span{display:block;color:#f58220;font-size:8.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.fee-head h2,.signature-intro h2{margin:2px 0 6px;color:#111;font-size:12.5px;text-transform:uppercase;letter-spacing:.025em}
.fee-head p,.fee-note{margin:0 0 7px;color:#111}
.fee-table{width:100%;border-collapse:collapse;margin:8px 0 9px}
.fee-table th{background:#111;color:#fff;text-align:left}
.fee-table th:first-child{background:#f58220;color:#111}
.fee-table th,.fee-table td{border:1px solid #cfcfcf;padding:6px;vertical-align:top}
.fee-table .total td{font-weight:700;text-align:right;background:#f7f7f7}
.signature-page{break-before:page;border:1px solid #d8d8d8;border-top:8px solid #111;padding:18px}
.signature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;margin-top:18px}
.signature-grid>div{padding:14px;border:1px solid #dedede;background:#fafafa}
.signature-grid h3{margin:0 0 9px;color:#111;font-size:12px}
.line{height:30px;border-bottom:1px solid #111;margin:14px 0 5px}
@media print{button{display:none}}
</style>
</head>
<body>
<img class="watermark" src="${escapeHtml(logo)}" alt="" aria-hidden="true">
<div class="running-header"><img class="running-logo" src="${escapeHtml(logo)}" alt="">Raising The Bar Officiating Inc. | ${escapeHtml(title)}</div>
<section class="cover">
  <div class="cover-band"><img class="cover-logo" src="${escapeHtml(logo)}" alt="Raising The Bar Officiating Inc. logo"><div><h1>RAISING THE BAR OFFICIATING INC.</h1><h2>${escapeHtml(title)}</h2><p class="tagline">Professional Assigning | Training | Evaluation | Communication | Accountability</p></div></div>
  <div class="cover-meta"><table><tbody>${coverRows(contract).map(row => `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td></tr>`).join('')}</tbody></table><p class="motto">"We Will Serve, And Will Be Of Service To The Game."</p></div>
</section>
${snapshotHtml(contract, total)}
${sectionHtml}
${contract.specialTerms ? paperSectionHtml('SPECIAL TERMS / ADDITIONAL CONTRACT LANGUAGE', contract.specialTerms, sections.length) : ''}
${signatureHtml(contract)}
</body>
</html>`;
}

function PaperParagraphs({ text }) {
  return multiline(text).map(line => <p key={line}>{line}</p>);
}

function AgreementSnapshot({ contract, total }) {
  return (
    <section className="rtbo-contract-snapshot">
      <h4>Agreement Snapshot</h4>
      <div>
        {agreementSnapshotRows(contract, total).map(row => <article key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong></article>)}
      </div>
    </section>
  );
}

function PaperSection({ section, index }) {
  return (
    <section className="rtbo-contract-preview-section">
      <div className="rtbo-contract-section-kicker">ARTICLE {articleNumber(index)}</div>
      <div>
        <h4>{section[0]}</h4>
        <PaperParagraphs text={section[1]} />
      </div>
    </section>
  );
}

function ProposalFeeTable({ contract, total }) {
  if (isIndependentContractorContract(contract)) {
    return (
      <table className="rtbo-contract-paper-fees">
        <thead><tr><th>Assignment Category</th><th>Game Fee</th><th>Travel / Additional Compensation</th><th>Notes</th></tr></thead>
        <tbody>
          {contractorFeeRows(contract).map(row => <tr key={row[0]}><td>{row[0]}</td><td>{feeDisplay(row[1])}</td><td>{feeDisplay(row[2])}</td><td>{row[3]}</td></tr>)}
          <tr className="total"><td colSpan="3">Estimated completed fee schedule total</td><td>{money(total)}</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="rtbo-contract-paper-fees">
      <thead><tr><th>Category</th><th>Assignor Fee</th><th>Official Game Fee</th><th>Tournament / Classic Fee</th><th>Notes</th></tr></thead>
      <tbody>
        {proposalFeeRows(contract).map(row => <tr key={row[0]}><td>{row[0]}</td><td>{feeDisplay(row[1])}</td><td>{feeDisplay(row[2])}</td><td>{feeDisplay(row[3])}</td><td>{row[4]}</td></tr>)}
        <tr className="total"><td colSpan="4">Estimated completed fee schedule total</td><td>{money(total)}</td></tr>
      </tbody>
    </table>
  );
}

function ContractPreview({ contract }) {
  const total = estimatedTotal(contract);
  const title = contractPaperTitle(contract);
  const sections = clauses(contract, total);
  return (
    <section className="rtbo-contract-preview rtbo-contract-paper" aria-label="Contract preview">
      <img className="rtbo-contract-paper-watermark" src={LOGO_SRC} alt="" aria-hidden="true" />
      <div className="rtbo-contract-running-header"><img src={LOGO_SRC} alt="" />Raising The Bar Officiating Inc. | {title}</div>
      <section className="rtbo-contract-paper-cover">
        <div className="rtbo-contract-cover-band">
          <img className="rtbo-contract-cover-logo" src={LOGO_SRC} alt="Raising The Bar Officiating Inc. logo" />
          <div>
            <h3>RAISING THE BAR OFFICIATING INC.</h3>
            <h4>{title}</h4>
            <p>Professional Assigning | Training | Evaluation | Communication | Accountability</p>
          </div>
        </div>
        <div className="rtbo-contract-cover-meta">
          <table><tbody>{coverRows(contract).map(row => <tr key={row[0]}><th>{row[0]}</th><td>{row[1]}</td></tr>)}</tbody></table>
          <strong>"We Will Serve, And Will Be Of Service To The Game."</strong>
        </div>
      </section>
      <AgreementSnapshot contract={contract} total={total} />
      {sections.map((section, index) => (
        <React.Fragment key={section[0]}>
          <PaperSection section={section} index={index} />
          {shouldInsertFeeScheduleAfter(section[0], contract) && (
            <section className="rtbo-contract-preview-section rtbo-contract-fee-section">
              <div className="rtbo-contract-section-kicker">Financial Schedule</div>
              <div>
              <h4>{isIndependentContractorContract(contract) ? 'CONTRACTOR OFFICIATING FEE SCHEDULE' : 'ASSIGNOR FEES AND OFFICIALS FEES'}</h4>
              <p>{isIndependentContractorContract(contract) ? 'Final game fees, reimbursements, lodging, meals, and additional compensation are subject to assignment confirmation and RTBO payment procedures.' : 'Final assigning fees and officials game fees should be discussed and agreed upon by the Client and RTBO before execution of the final agreement.'}</p>
              <ProposalFeeTable contract={contract} total={total} />
              <p>{isIndependentContractorContract(contract) ? 'Payment processing selection' : 'Officials payments should be made according to the approved payment procedure. Current payment processing selection'}: {contract.paymentProcessingTime}.</p>
              </div>
            </section>
          )}
        </React.Fragment>
      ))}
      {contract.specialTerms && <PaperSection section={['SPECIAL TERMS / ADDITIONAL CONTRACT LANGUAGE', contract.specialTerms]} index={sections.length} />}
      <section className="rtbo-contract-preview-section rtbo-contract-signature-page">
        <div className="rtbo-contract-section-kicker">Execution Copy</div>
        <div>
          <h4>SIGNATURE PAGE</h4>
          <p>IN WITNESS WHEREOF, the {isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client representative'} and the Coordinator of Officials have caused this agreement to be reviewed and executed on the date(s) indicated below.</p>
        <div className="rtbo-contract-signature-grid">
          <section><h4>{isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client / Organization Representative'}</h4><p>Printed Name: {blank(contract.clientSigner, '_______________________________')}</p><p>Position/Title: {blank(contract.clientSignerTitle, '_______________________________')}</p><p>{isIndependentContractorContract(contract) ? 'Contractor Name' : 'School/Organization'}: {blank(contract.clientName, '_______________________________')}</p><span></span><small>Signature</small><span></span><small>Date</small>{contract.clientSignedAt && <p>Digitally signed: {contract.clientSignedAt}</p>}</section>
          <section><h4>Coordinator of Officials</h4><p>{blank(contract.rtboSigner, 'Montrel Simmons')}</p><p>Raising The Bar Officiating Inc.</p><p>{blank(contract.rtboSignerTitle, 'President / Director / Founder')}</p><span></span><small>Signature</small><span></span><small>Date</small>{contract.rtboSignedAt && <p>Digitally signed: {contract.rtboSignedAt}</p>}</section>
        </div>
        </div>
      </section>
    </section>
  );
}

export default function RTBOBasketballAssigningContractGenerator({
  user = {},
  onStatus = () => {},
  initialTemplateId = 'high-school',
  initialView = 'home'
}) {
  const startingTemplateId = templates.some(item => item.id === initialTemplateId) ? initialTemplateId : 'high-school';
  const [view, setView] = useState(initialView === 'editor' ? 'editor' : 'home');
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [contract, setContract] = useState(() => createContract(startingTemplateId, user));
  const [message, setMessage] = useState('');
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedContracts, setSavedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const contractPreviewRef = useRef(null);

  useEffect(() => { document.title = 'RTBO Contract Generator | Forms Workspace'; }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedContracts)); }, [savedContracts]);
  useEffect(() => {
    let active = true;
    contractApiGet('/admin-contracts.php')
      .then((data) => {
        if (!active || !Array.isArray(data.contracts)) return;
        setSavedContracts(data.contracts);
        if (data.contracts.length > 0) announce(`${data.contracts.length} saved contract${data.contracts.length === 1 ? '' : 's'} loaded.`);
      })
      .catch((error) => {
        if (error.status !== 403 && error.status !== 401) {
          announce(error.message || 'Saved contracts could not be loaded from the server.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const template = templates.find(item => item.id === contract.templateId) || templates[0];
  const total = estimatedTotal(contract);

  function announce(text) {
    setMessage(text);
    onStatus(text);
  }

  function update(event) {
    const { name, value } = event.target;
    setContract(current => ({ ...current, [name]: name.toLowerCase().includes('phone') ? formatPhone(value) : value }));
    setPrintPreviewOpen(false);
  }

  function openTemplate(templateId) {
    setContract(createContract(templateId, user));
    setActiveTab(tabs[0]);
    setView('editor');
    setPrintPreviewOpen(false);
    announce('Contract template opened for editing.');
  }

  function loadSaved(saved) {
    setContract({ ...createContract(saved.templateId || 'high-school', user), ...saved });
    setActiveTab(tabs[0]);
    setView('editor');
    setPrintPreviewOpen(false);
    announce('Saved contract opened for editing.');
  }

  function storeContractRecord(contractRecord) {
    setSavedContracts(current => current.some(item => item.id === contractRecord.id) ? current.map(item => item.id === contractRecord.id ? contractRecord : item) : [contractRecord, ...current]);
    setContract(contractRecord);
    return contractRecord;
  }

  function buildContractRecord(source = contract) {
    const timestamp = new Date().toLocaleString();
    return { ...source, id: source.id || `contract-${Date.now()}`, savedAt: source.savedAt || timestamp, updatedAt: timestamp };
  }

  async function persistContractRecord(source = contract) {
    const localRecord = buildContractRecord(source);
    const data = await contractApiPostJson('/admin-contracts.php', { action: 'save', contract: localRecord });
    return storeContractRecord({ ...localRecord, ...(data.contract || {}) });
  }

  async function createContractPdf(source = contract) {
    const data = await contractApiPostJson('/admin-contracts.php', { action: 'pdf', contract: source });
    return data.pdf;
  }

  function saveLocalOnly(source = contract) {
    return storeContractRecord(buildContractRecord(source));
  }

  async function save() {
    setSaving(true);
    setPrintPreviewOpen(false);
    try {
      const saved = await persistContractRecord(contract);
      announce('Choose where to save the contract PDF on this computer.');
      const localSaveTarget = await requestContractPdfSaveTarget(saved);
      const pdf = await createContractPdf(saved);
      const localResult = await saveContractPdfToComputer(pdf, localSaveTarget);
      announce(`Contract saved. ${contractPdfSaveMessage(localResult)}`);
    } catch (error) {
      try {
        saveLocalOnly(contract);
        announce(`${error.message || 'Server save failed.'} A local browser copy was saved, but the contract was not saved to the production API.`);
      } catch {
        announce(error.message || 'Contract could not be saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setContract(createContract(contract.templateId || 'high-school', user));
    setActiveTab(tabs[0]);
    setPrintPreviewOpen(false);
    announce('Contract form reset.');
  }

  async function remove() {
    if (contract.id && !window.confirm(`Delete ${contract.agreementNumber}?`)) return;
    setSaving(true);
    try {
      if (contract.id) {
        await contractApiPostJson('/admin-contracts.php', { action: 'delete', id: contract.id, agreementNumber: contract.agreementNumber });
        setSavedContracts(current => current.filter(item => item.id !== contract.id));
      }
      reset();
      announce(contract.id ? 'Contract deleted from saved contracts.' : 'Unsaved contract cleared.');
    } catch (error) {
      announce(error.message || 'Contract could not be deleted.');
    } finally {
      setSaving(false);
    }
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

  function scrollContractPreviewIntoView() {
    window.requestAnimationFrame(() => {
      contractPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function printPreviewContract() {
    setPrintPreviewOpen(true);
    announce('Contract preview is ready. Review it, then click Print Contract.');
    scrollContractPreviewIntoView();
  }

  async function saveContractPdf() {
    setSaving(true);
    try {
      announce('Choose where to save the contract PDF on this computer.');
      const localSaveTarget = await requestContractPdfSaveTarget(contract);
      const pdf = await createContractPdf(contract);
      const localResult = await saveContractPdfToComputer(pdf, localSaveTarget);
      announce(`Contract PDF created. ${contractPdfSaveMessage(localResult)}`);
    } catch (error) {
      announce(error.message || 'Contract PDF could not be created.');
    } finally {
      setSaving(false);
    }
  }

  async function emailContract() {
    try {
      validateContractDelivery(contract, 'emailing');
    } catch (error) {
      announce(error.message);
      return;
    }

    setSaving(true);
    try {
      announce('Choose where to save the emailed contract PDF on this computer.');
      const localSaveTarget = await requestContractPdfSaveTarget(contract);
      if (localSaveTarget?.type === 'canceled') {
        announce('PDF save was canceled. The contract was not emailed.');
        return;
      }

      const saved = await persistContractRecord(contract);
      const data = await contractApiPostJson('/admin-contracts.php', {
        action: 'email',
        contract: saved,
        recipientEmail: saved.contactEmail,
        bccEmail: CONTRACT_BCC_EMAIL
      });
      if (data.contract) storeContractRecord(data.contract);
      const localResult = await saveContractPdfToComputer(data.pdf, localSaveTarget);
      setPrintPreviewOpen(false);
      announce(`${data.message || `Contract PDF emailed to ${saved.contactEmail}.`} Bcc sent to ${CONTRACT_BCC_EMAIL}. ${contractPdfSaveMessage(localResult)}`);
    } catch (error) {
      announce(error.message || 'Contract email could not be sent.');
    } finally {
      setSaving(false);
    }
  }

  async function superAdminSignContract() {
    if (user?.role !== 'super_admin') {
      announce('Super Admin access is required to countersign contracts.');
      return;
    }
    if (!contract.clientSignedAt) {
      announce(`The ${isIndependentContractorContract(contract) ? 'contractor / official' : 'client'} must digitally sign this contract before the Super Admin countersigns it.`);
      return;
    }
    try {
      validateContractDelivery(contract, 'sending the final signed contract');
    } catch (error) {
      announce(error.message);
      return;
    }
    if (!window.confirm(`Countersign this contract as Super Admin and email the final signed PDF to the ${isIndependentContractorContract(contract) ? 'contractor / official' : 'client'}?`)) {
      return;
    }

    setSaving(true);
    try {
      announce('Choose where to save the final fully signed contract PDF on this computer.');
      const localSaveTarget = await requestContractPdfSaveTarget(contract);
      if (localSaveTarget?.type === 'canceled') {
        announce('PDF save was canceled. Super Admin signature was not applied.');
        return;
      }

      const data = await contractApiPostJson('/admin-contracts.php', {
        action: 'admin-sign',
        contract,
        rtboSigner: contract.rtboSigner || user?.name || 'Montrel Simmons',
        bccEmail: CONTRACT_BCC_EMAIL
      });
      if (data.contract) storeContractRecord(data.contract);
      const localResult = await saveContractPdfToComputer(data.pdf, localSaveTarget);
      setPrintPreviewOpen(false);
      announce(`${data.message || `Final fully signed contract emailed to ${contract.contactEmail}.`} Bcc sent to ${CONTRACT_BCC_EMAIL}. ${contractPdfSaveMessage(localResult)}`);
    } catch (error) {
      announce(error.message || 'Super Admin signature could not be completed.');
    } finally {
      setSaving(false);
    }
  }

  async function printPreparedContract() {
    setSaving(true);
    try {
      announce('Choose where to save the contract PDF before printing.');
      const localSaveTarget = await requestContractPdfSaveTarget(contract);
      if (localSaveTarget?.type === 'canceled') {
        announce('PDF save was canceled. Printing was not started.');
        return;
      }

      const pdf = await createContractPdf(contract);
      const localResult = await saveContractPdfToComputer(pdf, localSaveTarget);
      if (localResult.canceled) {
        announce('PDF save was canceled. Printing was not started.');
        return;
      }
      printContract();
      announce(`System print dialog opened. Choose the printer and confirm to finish printing. ${contractPdfSaveMessage(localResult)}`);
    } catch (error) {
      announce(error.message || 'Contract PDF could not be saved before printing.');
    } finally {
      setSaving(false);
    }
  }

  function renderField(field) {
    const [label, name, type = 'text', options, wide] = field;
    const id = `contract-${name}`;
    const value = contract[name] || '';
    const displayLabel = fieldDisplayLabel(contract, label);
    return (
      <label className={wide ? 'wide' : ''} htmlFor={id} key={name}>
        <span>{displayLabel}</span>
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
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={() => setView('home')} disabled={saving}>Back to Contracts</button>
          <button className="btn secondary dark-btn" type="button" onClick={printPreviewContract} disabled={saving}>Print Preview</button>
          <button className="btn" type="button" onClick={save} disabled={saving}>{saving ? 'Working...' : 'Save Contract'}</button>
          <button className="btn secondary dark-btn" type="button" onClick={saveContractPdf} disabled={saving}>Save PDF</button>
          <button className="btn secondary dark-btn" type="button" onClick={emailContract} disabled={saving}>Email Contract</button>
          {user?.role === 'super_admin' && <button className="btn secondary dark-btn" type="button" onClick={superAdminSignContract} disabled={saving}>Super Admin Sign</button>}
          <button className="btn secondary dark-btn" type="button" onClick={reset} disabled={saving}>Reset Contract</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => openTemplate(contract.templateId || 'high-school')} disabled={saving}>Create New</button>
          <button className="btn secondary dark-btn danger-action" type="button" onClick={remove} disabled={saving}>Delete Contract</button>
        </div>
      </div>
      {message && <p className="form-message success">{message}</p>}
      <div className="rtbo-contract-summary-grid"><article><span>Status</span><strong>{contract.contractStatus}</strong></article><article><span>Category</span><strong>{contract.contractCategory}</strong></article><article><span>Estimated Fees</span><strong>{money(total)}</strong></article><article><span>Agreement No.</span><strong>{contract.agreementNumber}</strong></article></div>
      <div className="rtbo-contract-editor-grid">
        <section className="rtbo-contract-form-panel">
          <div className="rtbo-contract-tab-row" role="tablist" aria-label="Contract sections">{tabs.map(tab => <button className={activeTab === tab ? 'active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}>{tab}</button>)}</div>
          <div className="rtbo-contract-field-panel"><h4>{activeTab}</h4><div className="rtbo-contract-field-grid">{(fields[activeTab] || []).map(renderField)}</div></div>
        </section>
        <aside className={`rtbo-contract-preview-column${printPreviewOpen ? ' is-print-preview' : ''}`} aria-label="Contract preview before printing" ref={contractPreviewRef}>
          <div className="rtbo-contract-preview-banner">{printPreviewOpen ? 'Print Preview Ready - Review Before Printing' : 'Live Contract Preview - Review Before Printing'}</div>
          {printPreviewOpen && (
            <div className="rtbo-contract-preview-actions" aria-live="polite">
              <span>Preview is ready.</span>
              <button className="btn" type="button" onClick={printPreparedContract} disabled={saving}>Print Contract</button>
              <button className="btn secondary dark-btn" type="button" onClick={saveContractPdf} disabled={saving}>Save PDF</button>
              <button className="btn secondary dark-btn" type="button" onClick={emailContract} disabled={saving}>Email Contract</button>
              {user?.role === 'super_admin' && <button className="btn secondary dark-btn" type="button" onClick={superAdminSignContract} disabled={saving}>Super Admin Sign</button>}
              <button className="btn secondary dark-btn" type="button" onClick={() => setPrintPreviewOpen(false)} disabled={saving}>Close Preview</button>
            </div>
          )}
          <ContractPreview contract={contract} />
        </aside>
      </div>
    </section>
  );
}
