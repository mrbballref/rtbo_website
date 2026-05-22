import React, { useEffect, useMemo, useRef, useState } from 'react';
import './tax-center.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const W9_REVISION = 'March 2024';

const stateOptions = [
  ['', 'State'],
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

const classificationOptions = [
  ['individual', 'Individual/sole proprietor'], ['c_corp', 'C Corporation'], ['s_corp', 'S Corporation'],
  ['partnership', 'Partnership'], ['trust_estate', 'Trust/estate'], ['llc', 'Limited liability company'], ['other', 'Other']
];

const requesterTypes = ['School', 'League', 'Conference', 'Organization', 'Tournament Director', 'Event Center', 'Community Partner'];

function today() { return new Date().toISOString().slice(0, 10); }

function formNumber(records = []) {
  const year = new Date().getFullYear();
  const max = records.reduce((value, record) => {
    const match = String(record.formNumber || record.form_number || '').match(/(\d+)$/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `RTBO-W9-${year}-${String(max + 1).padStart(3, '0')}`;
}

function createW9Form(records = []) {
  return {
    id: 0,
    formNumber: formNumber(records),
    revision: W9_REVISION,
    recordName: 'RTBO W-9 for Schools, Leagues, and Organizations',
    requesterType: 'School',
    requesterName: '',
    requesterEmail: '',
    availableForDownload: true,
    name: '',
    businessName: '',
    taxClassification: '',
    llcTaxClassification: '',
    otherClassification: '',
    foreignPartners: false,
    exemptPayeeCode: '',
    fatcaCode: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    requesterAddress: '',
    accountNumbers: '',
    tinType: 'ein',
    tin: '',
    signatureName: '',
    signatureDate: today(),
    status: 'ready'
  };
}

function normalizeW9(record = {}) {
  return {
    ...createW9Form(),
    ...record,
    id: Number(record.id || 0),
    formNumber: record.formNumber || record.form_number || '',
    recordName: record.recordName || record.record_name || '',
    requesterType: record.requesterType || record.requester_type || 'School',
    requesterName: record.requesterName || record.requester_name || '',
    requesterEmail: record.requesterEmail || record.requester_email || '',
    availableForDownload: Boolean(record.availableForDownload ?? record.available_for_download ?? true),
    businessName: record.businessName || record.business_name || '',
    taxClassification: record.taxClassification || record.tax_classification || '',
    llcTaxClassification: record.llcTaxClassification || record.llc_tax_classification || '',
    otherClassification: record.otherClassification || record.other_classification || '',
    foreignPartners: Boolean(record.foreignPartners ?? record.foreign_partners ?? false),
    exemptPayeeCode: record.exemptPayeeCode || record.exempt_payee_code || '',
    fatcaCode: record.fatcaCode || record.fatca_code || '',
    addressLine1: record.addressLine1 || record.address_line1 || '',
    addressLine2: record.addressLine2 || record.address_line2 || '',
    tinType: record.tinType || record.tin_type || 'ein',
    tin: record.tin || '',
    signatureName: record.signatureName || record.signature_name || '',
    signatureDate: record.signatureDate || record.signature_date || '',
    status: record.status || 'ready',
    createdAt: record.createdAt || record.created_at || '',
    updatedAt: record.updatedAt || record.updated_at || ''
  };
}

function taxPdfFileName(form = {}) {
  const source = form.formNumber || form.recordName || 'RTBO-W9';
  const safe = String(source).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${safe || 'rtbo-w9'}.pdf`;
}

function taxPdfBlob(pdf = {}) {
  const binary = atob(String(pdf.contentBase64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: pdf.mimeType || 'application/pdf' });
}

async function requestTaxPdfSaveTarget(form = {}) {
  const suggestedName = taxPdfFileName(form);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Completed W-9 PDF', accept: { 'application/pdf': ['.pdf'] } }]
      });
      return { type: 'file-picker', handle, suggestedName };
    } catch (error) {
      if (error?.name === 'AbortError') return { type: 'canceled', suggestedName };
    }
  }
  return { type: 'download', suggestedName };
}

async function saveTaxPdfToComputer(pdf = {}, target = { type: 'download' }) {
  if (target?.type === 'canceled') return { saved: false, canceled: true };
  const blob = taxPdfBlob(pdf);
  const fileName = target?.suggestedName || pdf.fileName || 'RTBO-W9.pdf';
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

function taxPdfSaveMessage(result = {}) {
  if (result.canceled) return 'PDF save was canceled.';
  if (result.method === 'file-picker') return 'W-9 PDF saved to the selected location on this computer.';
  return 'W-9 PDF downloaded to the browser downloads folder.';
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Tax Center request failed.');
  return data;
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Tax Center request failed.');
  return data;
}

function selectedClassificationLabel(form = {}) {
  if (form.taxClassification === 'llc') return `Limited liability company (${form.llcTaxClassification || 'classification pending'})`;
  if (form.taxClassification === 'other') return form.otherClassification || 'Other';
  return classificationOptions.find(([value]) => value === form.taxClassification)?.[1] || 'Not selected';
}

function TaxFieldError({ errors, name }) {
  if (!errors[name]) return null;
  return <span className="rtbo-tax-field-error" id={`tax-error-${name}`}>{errors[name]}</span>;
}

function w9AddressLine(form = {}) {
  return [form.addressLine1, form.addressLine2].filter(Boolean).join(' ');
}

function w9CityLine(form = {}) {
  return [form.city, form.state, form.zip].filter(Boolean).join(', ');
}

function w9RequesterText(form = {}) {
  return [form.requesterName, form.requesterAddress].filter(Boolean).join('\n');
}

function W9OverlayText({ className, children }) {
  if (!children) return null;
  return <span className={`rtbo-w9-fill ${className || ''}`}>{children}</span>;
}

function W9Preview({ form = {} }) {
  const tin = form.tin || form.tinMasked || '';
  const tinDigits = String(tin).replace(/\D+/g, '');
  const einDigits = form.tinType === 'ein' ? tinDigits.padEnd(9, ' ').slice(0, 9).split('') : [];
  const ssnDigits = form.tinType === 'ssn' ? tinDigits.padEnd(9, ' ').slice(0, 9).split('') : [];
  const checkClass = (value) => form.taxClassification === value ? ' checked' : '';

  return (
    <section className="rtbo-w9-preview-shell rtbo-tax-print-zone" aria-label={`Completed W-9 preview for ${form.name || 'payee'}`}>
      <div className="rtbo-w9-exact-page">
        <img src="/assets/forms/fw9-2024-page-1.png" alt="Official IRS Form W-9 template, Rev. March 2024" />
        <W9OverlayText className="line-name">{form.name}</W9OverlayText>
        <W9OverlayText className="line-business">{form.businessName}</W9OverlayText>
        <span className={`rtbo-w9-mark class-individual${checkClass('individual')}`}>X</span>
        <span className={`rtbo-w9-mark class-c-corp${checkClass('c_corp')}`}>X</span>
        <span className={`rtbo-w9-mark class-s-corp${checkClass('s_corp')}`}>X</span>
        <span className={`rtbo-w9-mark class-partnership${checkClass('partnership')}`}>X</span>
        <span className={`rtbo-w9-mark class-trust${checkClass('trust_estate')}`}>X</span>
        <span className={`rtbo-w9-mark class-llc${checkClass('llc')}`}>X</span>
        <span className={`rtbo-w9-mark class-other${checkClass('other')}`}>X</span>
        <W9OverlayText className="line-llc">{form.taxClassification === 'llc' ? form.llcTaxClassification : ''}</W9OverlayText>
        <W9OverlayText className="line-other">{form.taxClassification === 'other' ? form.otherClassification : ''}</W9OverlayText>
        <span className={`rtbo-w9-mark line-3b${form.foreignPartners ? ' checked' : ''}`}>X</span>
        <W9OverlayText className="line-exempt-payee">{form.exemptPayeeCode}</W9OverlayText>
        <W9OverlayText className="line-fatca">{form.fatcaCode}</W9OverlayText>
        <W9OverlayText className="line-address">{w9AddressLine(form)}</W9OverlayText>
        <W9OverlayText className="line-city">{w9CityLine(form)}</W9OverlayText>
        <W9OverlayText className="line-requester">{w9RequesterText(form)}</W9OverlayText>
        <W9OverlayText className="line-accounts">{form.accountNumbers}</W9OverlayText>
        {ssnDigits.map((digit, index) => <W9OverlayText key={`ssn-${index}`} className={`tin-ssn tin-${index}`}>{digit.trim()}</W9OverlayText>)}
        {einDigits.map((digit, index) => <W9OverlayText key={`ein-${index}`} className={`tin-ein tin-${index}`}>{digit.trim()}</W9OverlayText>)}
        <W9OverlayText className="line-signature">{form.signatureName}</W9OverlayText>
        <W9OverlayText className="line-signature-date">{form.signatureDate}</W9OverlayText>
      </div>
    </section>
  );
}

export default function TaxCenter({ user = {}, canManageTaxForms = false, onStatus = () => {} }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(() => createW9Form());
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionNode = document.querySelector('meta[name="description"]');
    const robotsNode = document.querySelector('meta[name="robots"]');
    const previousDescription = descriptionNode?.getAttribute('content') || '';
    const previousRobots = robotsNode?.getAttribute('content') || '';
    document.title = 'RTBO Tax Center | W-9 Forms';
    descriptionNode?.setAttribute('content', 'Secure RTBO Tax Center for creating completed Form W-9 PDFs and making requester copies available to approved schools, leagues, and organizations.');
    robotsNode?.setAttribute('content', 'noindex, nofollow');
    loadRecords();
    return () => {
      document.title = previousTitle;
      if (descriptionNode) descriptionNode.setAttribute('content', previousDescription);
      if (robotsNode) robotsNode.setAttribute('content', previousRobots);
    };
  }, []);

  function announce(text) { setMessage(text); onStatus(text); }

  async function loadRecords(statusText = '') {
    setLoading(true);
    try {
      const data = await apiGet('/admin-tax-forms.php');
      const nextRecords = (data.records || []).map(normalizeW9);
      setRecords(nextRecords);
      if (!canManageTaxForms && nextRecords[0]) setForm(nextRecords[0]);
      if (statusText) announce(statusText);
    } catch (error) {
      announce(error.message || 'W-9 records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function updateForm(event) {
    const { name, type, checked, value } = event.target;
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setPrintPreviewOpen(false);
    setErrors(current => ({ ...current, [name]: '' }));
  }

  function validateCurrentForm(actionLabel = 'continuing') {
    const nextErrors = {};
    [
      ['recordName', 'Record name is required.'], ['name', 'Line 1 name is required.'],
      ['taxClassification', 'Federal tax classification is required.'], ['addressLine1', 'Address is required.'],
      ['city', 'City is required.'], ['state', 'State is required.'], ['zip', 'ZIP code is required.'],
      ['tin', 'TIN is required.'], ['signatureName', 'Signature name is required.'], ['signatureDate', 'Signature date is required.']
    ].forEach(([name, error]) => { if (!String(form[name] || '').trim()) nextErrors[name] = error; });
    if (form.taxClassification === 'llc' && !form.llcTaxClassification) nextErrors.llcTaxClassification = 'LLC tax classification is required.';
    if (form.taxClassification === 'other' && !String(form.otherClassification || '').trim()) nextErrors.otherClassification = 'Describe the other tax classification.';
    if (String(form.requesterEmail || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.requesterEmail).trim())) nextErrors.requesterEmail = 'Enter a valid requester email address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) { announce(`Complete the required W-9 fields before ${actionLabel}.`); return false; }
    return true;
  }

  function createNewForm() {
    setForm(createW9Form(records));
    setErrors({});
    setPrintPreviewOpen(false);
    announce('New W-9 form started.');
  }

  function editRecord(record) {
    const next = normalizeW9(record);
    setForm({ ...createW9Form(records), ...next, tin: '' });
    setErrors({});
    setPrintPreviewOpen(false);
    announce('Saved W-9 opened for editing. Re-enter the TIN before saving updates.');
  }

  async function saveForm(event) {
    event?.preventDefault();
    if (!canManageTaxForms || !validateCurrentForm('saving')) return;
    setSaving(true);
    try {
      const data = await apiPostJson('/admin-tax-forms.php', { action: 'save', taxForm: form });
      const saved = normalizeW9(data.record || form);
      setRecords(current => current.some(item => Number(item.id) === Number(saved.id)) ? current.map(item => Number(item.id) === Number(saved.id) ? saved : item) : [saved, ...current]);
      setForm(current => ({ ...current, id: saved.id, formNumber: saved.formNumber || current.formNumber }));
      announce(data.message || 'W-9 saved and available in Tax Center.');
    } catch (error) {
      announce(error.message || 'W-9 could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function createPdf(source = form) {
    const payload = source?.id && !source.tin ? { action: 'pdf', id: source.id } : { action: 'pdf', taxForm: source };
    const data = await apiPostJson('/admin-tax-forms.php', payload);
    return data.pdf;
  }

  async function savePdf(source = form) {
    if (source === form && canManageTaxForms && !validateCurrentForm('saving the PDF')) return;
    setSaving(true);
    try {
      announce('Choose where to save the completed W-9 PDF on this computer.');
      const target = await requestTaxPdfSaveTarget(source);
      if (target?.type === 'canceled') { announce('PDF save was canceled.'); return; }
      const pdf = await createPdf(source);
      const result = await saveTaxPdfToComputer(pdf, target);
      announce(`Completed W-9 PDF created. ${taxPdfSaveMessage(result)}`);
    } catch (error) {
      announce(error.message || 'Completed W-9 PDF could not be created.');
    } finally {
      setSaving(false);
    }
  }

  function printPreview() {
    if (canManageTaxForms && !validateCurrentForm('previewing')) return;
    setPrintPreviewOpen(true);
    announce('W-9 print preview is ready. Review it, then click Print W-9.');
    window.requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function printPreparedW9() {
    if (canManageTaxForms && !validateCurrentForm('printing')) return;
    setSaving(true);
    try {
      announce('Choose where to save the W-9 PDF before printing.');
      const target = await requestTaxPdfSaveTarget(form);
      if (target?.type === 'canceled') { announce('PDF save was canceled. Printing was not started.'); return; }
      const pdf = await createPdf(form);
      const result = await saveTaxPdfToComputer(pdf, target);
      document.body.classList.add('rtbo-printing-tax');
      window.addEventListener('afterprint', () => document.body.classList.remove('rtbo-printing-tax'), { once: true });
      window.print();
      window.setTimeout(() => document.body.classList.remove('rtbo-printing-tax'), 1500);
      announce(`System print dialog opened. ${taxPdfSaveMessage(result)}`);
    } catch (error) {
      document.body.classList.remove('rtbo-printing-tax');
      announce(error.message || 'W-9 could not be saved before printing.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id = form.id) {
    if (!canManageTaxForms || !id) { createNewForm(); return; }
    if (!window.confirm('Delete this saved W-9 record?')) return;
    setSaving(true);
    try {
      const data = await apiPostJson('/admin-tax-forms.php', { action: 'delete', id });
      setRecords(current => current.filter(item => Number(item.id) !== Number(id)));
      createNewForm();
      announce(data.message || 'W-9 record deleted.');
    } catch (error) {
      announce(error.message || 'W-9 record could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  const visibleRecords = useMemo(() => records.filter(record => canManageTaxForms || record.availableForDownload), [records, canManageTaxForms]);
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <article className="rtbo-dashboard-card rtbo-tax-center-page">
      <div className="rtbo-dashboard-card-head">
        <div><p className="eyebrow">Tax Center</p><h3>W-9 Forms</h3><p>Create a completed Form W-9 for approved schools, leagues, and organizations to download after login.</p></div>
        <div className="rtbo-form-toolbar">
          {canManageTaxForms && <button className="btn secondary dark-btn" type="button" onClick={createNewForm} disabled={saving}>Create New W-9</button>}
          {canManageTaxForms && <button className="btn" type="button" onClick={saveForm} disabled={saving}>{saving ? 'Working...' : 'Save W-9'}</button>}
          <button className="btn secondary dark-btn" type="button" onClick={() => savePdf(canManageTaxForms ? form : visibleRecords[0])} disabled={saving || (!canManageTaxForms && visibleRecords.length === 0)}>Save PDF</button>
          {canManageTaxForms && <button className="btn secondary dark-btn" type="button" onClick={printPreview} disabled={saving}>Print Preview</button>}
          {canManageTaxForms && <button className="btn secondary dark-btn" type="button" onClick={() => deleteRecord()} disabled={saving}>Delete W-9</button>}
        </div>
      </div>
      {message && <p className={`form-message${hasErrors || /required|could not|canceled/i.test(message) ? ' error' : ''}`}>{message}</p>}
      <div className="rtbo-tax-workspace">
        {canManageTaxForms && (
          <form className="form rtbo-tax-form" onSubmit={saveForm} noValidate>
            <section className="rtbo-tax-panel"><div><p className="eyebrow">Access</p><h4>Download Record</h4></div><div className="grid two">
              <label>Record Name<input name="recordName" value={form.recordName} onChange={updateForm} required aria-invalid={Boolean(errors.recordName)} /><TaxFieldError errors={errors} name="recordName" /></label>
              <label>Requester Type<select name="requesterType" value={form.requesterType} onChange={updateForm}>{requesterTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
              <label>Requester Name<input name="requesterName" value={form.requesterName} onChange={updateForm} /></label>
              <label>Requester Email<input type="email" name="requesterEmail" value={form.requesterEmail} onChange={updateForm} aria-invalid={Boolean(errors.requesterEmail)} /><TaxFieldError errors={errors} name="requesterEmail" /></label>
              <label className="rtbo-tax-check-row span-two"><input type="checkbox" name="availableForDownload" checked={form.availableForDownload} onChange={updateForm} /><span>Available for approved schools, leagues, and organizations to download after login.</span></label>
            </div></section>
            <section className="rtbo-tax-panel"><div><p className="eyebrow">Form W-9</p><h4>Taxpayer Details</h4></div><div className="grid two">
              <label>Line 1 Name<input name="name" value={form.name} onChange={updateForm} required aria-invalid={Boolean(errors.name)} /><TaxFieldError errors={errors} name="name" /></label>
              <label>Line 2 Business Name<input name="businessName" value={form.businessName} onChange={updateForm} /></label>
              <label>Federal Tax Classification<select name="taxClassification" value={form.taxClassification} onChange={updateForm} required aria-invalid={Boolean(errors.taxClassification)}><option value="">Select classification</option>{classificationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><TaxFieldError errors={errors} name="taxClassification" /></label>
              {form.taxClassification === 'llc' ? <label>LLC Tax Classification<select name="llcTaxClassification" value={form.llcTaxClassification} onChange={updateForm}><option value="">Select C, S, or P</option><option value="C">C Corporation</option><option value="S">S Corporation</option><option value="P">Partnership</option></select><TaxFieldError errors={errors} name="llcTaxClassification" /></label> : <label>Other Classification<input name="otherClassification" value={form.otherClassification} onChange={updateForm} disabled={form.taxClassification !== 'other'} /><TaxFieldError errors={errors} name="otherClassification" /></label>}
              <label>Exempt Payee Code<input name="exemptPayeeCode" value={form.exemptPayeeCode} onChange={updateForm} /></label>
              <label>FATCA Code<input name="fatcaCode" value={form.fatcaCode} onChange={updateForm} /></label>
              <label className="rtbo-tax-check-row span-two"><input type="checkbox" name="foreignPartners" checked={form.foreignPartners} onChange={updateForm} /><span>Line 3b applies for foreign partners, owners, or beneficiaries.</span></label>
            </div></section>
            <section className="rtbo-tax-panel"><div><p className="eyebrow">Address</p><h4>Requester Copy Details</h4></div><div className="grid two">
              <label>Address Line 1<input name="addressLine1" value={form.addressLine1} onChange={updateForm} required aria-invalid={Boolean(errors.addressLine1)} /><TaxFieldError errors={errors} name="addressLine1" /></label>
              <label>Address Line 2<input name="addressLine2" value={form.addressLine2} onChange={updateForm} /></label>
              <label>City<input name="city" value={form.city} onChange={updateForm} required aria-invalid={Boolean(errors.city)} /><TaxFieldError errors={errors} name="city" /></label>
              <label>State<select name="state" value={form.state} onChange={updateForm} required aria-invalid={Boolean(errors.state)}>{stateOptions.map(([value, label]) => <option key={value || 'blank'} value={value}>{label}</option>)}</select><TaxFieldError errors={errors} name="state" /></label>
              <label>ZIP Code<input name="zip" value={form.zip} onChange={updateForm} required aria-invalid={Boolean(errors.zip)} /><TaxFieldError errors={errors} name="zip" /></label>
              <label>Account Numbers<input name="accountNumbers" value={form.accountNumbers} onChange={updateForm} /></label>
              <label className="span-two">Requester Address<textarea name="requesterAddress" value={form.requesterAddress} onChange={updateForm} rows="3" /></label>
            </div></section>
            <section className="rtbo-tax-panel"><div><p className="eyebrow">Certification</p><h4>TIN and Signature</h4></div><div className="grid two">
              <label>TIN Type<select name="tinType" value={form.tinType} onChange={updateForm}><option value="ein">Employer Identification Number</option><option value="ssn">Social Security Number</option></select></label>
              <label>TIN<input name="tin" value={form.tin} onChange={updateForm} required aria-invalid={Boolean(errors.tin)} /><TaxFieldError errors={errors} name="tin" /></label>
              <label>Signature Name<input name="signatureName" value={form.signatureName} onChange={updateForm} required aria-invalid={Boolean(errors.signatureName)} /><TaxFieldError errors={errors} name="signatureName" /></label>
              <label>Signature Date<input type="date" name="signatureDate" value={form.signatureDate} onChange={updateForm} required aria-invalid={Boolean(errors.signatureDate)} /><TaxFieldError errors={errors} name="signatureDate" /></label>
            </div></section>
          </form>
        )}
        <aside className={`rtbo-tax-preview-column${printPreviewOpen ? ' is-print-preview' : ''}`} ref={previewRef}>
          <div className="rtbo-tax-preview-banner">{printPreviewOpen ? 'Print Preview Ready - Review Before Printing' : 'Live W-9 Preview'}</div>
          {printPreviewOpen && <div className="rtbo-tax-preview-actions"><span>Preview is ready.</span><button className="btn" type="button" onClick={printPreparedW9} disabled={saving}>Print W-9</button><button className="btn secondary dark-btn" type="button" onClick={() => savePdf(form)} disabled={saving}>Save PDF</button><button className="btn secondary dark-btn" type="button" onClick={() => setPrintPreviewOpen(false)} disabled={saving}>Close Preview</button></div>}
          <W9Preview form={form} />
        </aside>
      </div>
      <section className="rtbo-tax-panel rtbo-tax-library"><div className="rtbo-dashboard-card-head compact"><div><p className="eyebrow">Completed W-9 Library</p><h4>{canManageTaxForms ? 'Saved Tax Records' : 'Available Downloads'}</h4></div><button className="btn secondary dark-btn" type="button" onClick={() => loadRecords('Tax Center refreshed.')} disabled={loading || saving}>Refresh</button></div>
        {loading && <p className="rtbo-empty-state">Loading W-9 records...</p>}
        {!loading && visibleRecords.length === 0 && <p className="rtbo-empty-state">No completed W-9 records are available yet.</p>}
        {visibleRecords.length > 0 && <div className="rtbo-tax-record-grid">{visibleRecords.map(record => <article className="rtbo-tax-record-card" key={`tax-${record.id || record.formNumber}`}><div><strong>{record.recordName || record.formNumber}</strong><span>{record.availableForDownload ? 'Available' : 'Admin Only'}</span></div><p>{record.name || 'Name pending'} / {selectedClassificationLabel(record)}</p><small>{record.tinMasked || 'TIN on secure record'} / Rev. {record.revision || W9_REVISION}</small><div className="button-row"><button className="btn secondary dark-btn" type="button" onClick={() => savePdf(record)} disabled={saving}>Download PDF</button>{canManageTaxForms && <button className="btn secondary dark-btn" type="button" onClick={() => editRecord(record)} disabled={saving}>Edit</button>}{canManageTaxForms && <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteRecord(record.id)} disabled={saving}>Delete</button>}</div></article>)}</div>}
      </section>
    </article>
  );
}
