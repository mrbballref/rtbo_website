import React from 'react';

const stateOptions = [
  ['', 'Select state'],
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming']
];

function normalizeStateValue(source = '') {
  const current = String(source || '').trim();
  if (!current) return '';
  const match = stateOptions.find(([optionValue, label]) => (
    optionValue.toLowerCase() === current.toLowerCase()
    || label.toLowerCase() === current.toLowerCase()
  ));
  return match?.[0] || '';
}

export default function StateSelect({ name = 'state', value, defaultValue, onChange, required = false, disabled = false }) {
  const valueProps = value === undefined
    ? { defaultValue: normalizeStateValue(defaultValue) }
    : { value: normalizeStateValue(value) };
  return (
    <select name={name} onChange={onChange || (() => {})} required={required} disabled={disabled} {...valueProps}>
      {stateOptions.map(([optionValue, label]) => <option key={optionValue || 'empty'} value={optionValue}>{label}</option>)}
    </select>
  );
}
