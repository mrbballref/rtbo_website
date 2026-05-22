import React, { useEffect, useState } from 'react';
import './contract-signing-page.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

function image(name) {
  return `/assets/images/${name}`;
}

function readContractSigningToken() {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.replace(/^#\/?/, '');
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  return new URLSearchParams(query).get('token') || '';
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
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
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function isErrorStatus(status) {
  return ['required', 'missing', 'could not', 'invalid'].some((term) => status.toLowerCase().includes(term));
}

function isIndependentContractorContract(contract = {}) {
  return contract.templateId === 'official-independent-contractor' || contract.contractCategory === 'Independent Contractor Agreement';
}

export default function ContractSigningPage() {
  const [token, setToken] = useState(readContractSigningToken);
  const [contract, setContract] = useState(null);
  const [form, setForm] = useState({ signerName: '', signerTitle: '', signature: '', acceptedTerms: false });
  const [status, setStatus] = useState('Loading contract signing record...');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const nextToken = readContractSigningToken();
    setToken(nextToken);
    if (!nextToken) {
      setLoading(false);
      setStatus('This contract signing link is missing a signature token.');
      return undefined;
    }

    let active = true;
    setLoading(true);
    apiGet(`/admin-contracts.php?action=signing-contract&token=${encodeURIComponent(nextToken)}`)
      .then((data) => {
        if (!active) return;
        const record = data.contract || {};
        setContract(record);
        setForm((current) => ({
          ...current,
          signerName: current.signerName || record.clientSigner || record.primaryContact || '',
          signerTitle: current.signerTitle || record.clientSignerTitle || record.contactTitle || '',
          signature: current.signature || record.clientSigner || record.primaryContact || ''
        }));
        setStatus(record.clientSignedAt ? 'This agreement has already been signed.' : 'Review the agreement details, then complete the digital signature fields.');
      })
      .catch((error) => {
        if (active) setStatus(error.message || 'Contract signing record could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function updateSigningForm(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function submitSignature(event) {
    event.preventDefault();
    if (!form.signerName.trim() || !form.signature.trim() || !form.acceptedTerms) {
      setStatus('Printed name, digital signature, and acceptance are required.');
      return;
    }

    setSubmitting(true);
    setStatus('Submitting digital signature and notifying RTBO...');
    try {
      const data = await apiPostJson('/admin-contracts.php', {
        action: 'sign',
        token,
        signerName: form.signerName,
        signerTitle: form.signerTitle,
        signature: form.signature,
        acceptedTerms: form.acceptedTerms
      });
      setContract(data.contract || contract);
      setStatus(data.message || 'Contract signed. RTBO has been notified for countersignature.');
    } catch (error) {
      setStatus(error.message || 'Digital signature could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rtbo-contract-sign-page">
      <section className="rtbo-contract-sign-card">
        <div className="rtbo-contract-sign-brand">
          <img src={image('logo.png')} alt="Raising The Bar Officiating Inc. logo" />
          <div>
            <p className="eyebrow">Digital Contract Signature</p>
            <h1>Raising The Bar Officiating Inc.</h1>
            <p>Review and sign the assigned basketball officials agreement.</p>
          </div>
        </div>

        {status && <p className={`form-message${isErrorStatus(status) ? ' error' : ' success'}`}>{status}</p>}

        {loading ? <p className="rtbo-empty-state">Loading contract...</p> : contract ? (
          <div className="rtbo-contract-sign-workspace">
            <section className="rtbo-contract-sign-summary">
              <h2>{contract.contractCategory || 'Basketball Officials Assigning Agreement'}</h2>
              <dl>
                <div><dt>Agreement #</dt><dd>{contract.agreementNumber}</dd></div>
                <div><dt>{isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client'}</dt><dd>{contract.clientName || (isIndependentContractorContract(contract) ? 'Contractor / Official' : 'Client / Organization')}</dd></div>
                <div><dt>{isIndependentContractorContract(contract) ? 'Covered Services' : 'Event'}</dt><dd>{contract.eventName || (isIndependentContractorContract(contract) ? 'Basketball Officiating Services' : 'Covered schedule')}</dd></div>
                <div><dt>Effective</dt><dd>{contract.effectiveDate || 'Pending'}</dd></div>
                <div><dt>Expires</dt><dd>{contract.expirationDate || 'Pending'}</dd></div>
                <div><dt>Status</dt><dd>{contract.contractStatus || 'Pending Signature'}</dd></div>
              </dl>
              <p>{contract.summary || 'This agreement establishes the operating terms for RTBO basketball officials assigning services.'}</p>
            </section>

            <form className="form rtbo-contract-sign-form" onSubmit={submitSignature}>
              <label>Printed Name<input name="signerName" value={form.signerName} onChange={updateSigningForm} required disabled={Boolean(contract.clientSignedAt)} /></label>
              <label>Title<input name="signerTitle" value={form.signerTitle} onChange={updateSigningForm} disabled={Boolean(contract.clientSignedAt)} /></label>
              <label>Digital Signature<input name="signature" value={form.signature} onChange={updateSigningForm} required disabled={Boolean(contract.clientSignedAt)} /></label>
              <label className="rtbo-contract-sign-consent">
                <input type="checkbox" name="acceptedTerms" checked={form.acceptedTerms} onChange={updateSigningForm} disabled={Boolean(contract.clientSignedAt)} />
                <span>I confirm I am authorized to sign this agreement electronically, and I accept the contract terms as presented.</span>
              </label>
              <button className="btn" type="submit" disabled={submitting || Boolean(contract.clientSignedAt)}>{submitting ? 'Submitting...' : contract.clientSignedAt ? 'Signature Submitted' : 'Sign Contract'}</button>
              <p className="rtbo-contract-sign-note">Once both parties have signed the contract, the final fully signed PDF will be emailed to the {isIndependentContractorContract(contract) ? 'contractor / official' : 'client'} for their records.</p>
            </form>
          </div>
        ) : <p className="rtbo-empty-state">No contract record is available for this signing link.</p>}
      </section>
    </section>
  );
}
