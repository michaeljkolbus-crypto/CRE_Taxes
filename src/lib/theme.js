export const APPEAL_STAGE_COLORS = {
  'Prospect': '#94a3b8',
  'Contacted': '#3b82f6',
  'Agreement Signed': '#8b5cf6',
  'BOR Filed': '#f59e0b',
  'BOR Hearing': '#f97316',
  'BOR Result': '#06b6d4',
  'PTAB Filed': '#ec4899',
  'PTAB Hearing': '#ef4444',
  'PTAB Result': '#84cc16',
  'Commission Invoiced': '#10b981',
  'Collected': '#059669',
}

export const PROPERTY_TYPES = [
  'Apartment', 'Mixed Use', 'Retail', 'Office', 'Industrial',
  'Warehouse', 'Manufacturing', 'Commercial', 'Duplex', 'Other'
]

export const COUNTIES = ['Peoria', 'Tazewell', 'Woodford', 'Other']

export const BOR_RESULT_OPTIONS = ['Granted', 'Denied', 'Partial', 'Withdrawn', 'Pending']
export const PTAB_RESULT_OPTIONS = ['Granted', 'Denied', 'Partial', 'Withdrawn', 'Pending', 'Settled']

// Commission calc helpers
export function calcAppealFinancials(appeal) {
  const eavPre = parseFloat(appeal?.eav_pre) || 0
  const eavPost = parseFloat(appeal?.eav_post) || 0
  const taxRate = parseFloat(appeal?.tax_rate_filing_year) || 0
  const retainer = parseFloat(appeal?.retainer_amount) ?? 500
  const commPct = parseFloat(appeal?.commission_pct) ?? 50

  const eavReduction = Math.max(0, eavPre - eavPost)
  const totalTaxSavings = 2 * eavReduction * (taxRate / 100)
  const commissionAmount = (commPct / 100) * Math.max(0, totalTaxSavings - retainer)

  return { eavReduction, totalTaxSavings, commissionAmount }
}

export const fmt = {
  currency: (v) => v == null || v === '' ? '—' : '$' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  number: (v) => v == null || v === '' ? '—' : parseFloat(v).toLocaleString(),
  percent: (v) => v == null || v === '' ? '—' : parseFloat(v).toFixed(2) + '%',
  date: (v) => {
    if (!v) return '—'
    const d = new Date(v + 'T12:00:00')
    return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`
  }
}