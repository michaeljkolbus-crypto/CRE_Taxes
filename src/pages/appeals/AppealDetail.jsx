import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/theme'

function calcFinancials(appeal) {
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

export default function AppealDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [appeal, setAppeal] = useState(null)
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [comps, setComps] = useState([])
  const [form, setForm] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStages()
    fetchAppeal()
    fetchComps()
  }, [id])

  const fetchStages = async () => {
    const { data } = await supabase
      .from('appeal_stages')
      .select('*')
      .order('sort_order', { ascending: true })
    if (data) setStages(data)
  }

  const fetchAppeal = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('appeals')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type), stage:appeal_stages(id, name, color)')
      .eq('id', id)
      .single()

    if (err) {
      setError('Failed to load appeal')
      console.error(err)
    } else {
      setAppeal(data)
      setForm(data)
    }
    setLoading(false)
  }

  const fetchComps = async () => {
    const { data } = await supabase
      .from('appeal_comps')
      .select('*, comp:comps(id, address, sale_date, sale_price, building_sf, relevance_score)')
      .eq('appeal_id', id)
    if (data) setComps(data)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error: err } = await supabase.from('appeals').update({
      stage_id: form.stage_id || null,
      bor_filed_date: form.bor_filed_date || null,
      bor_hearing_date: form.bor_hearing_date || null,
      bor_result_date: form.bor_result_date || null,
      bor_result: form.bor_result || null,
      ptab_filed_date: form.ptab_filed_date || null,
      ptab_hearing_date: form.ptab_hearing_date || null,
      ptab_result_date: form.ptab_result_date || null,
      ptab_result: form.ptab_result || null,
      eav_pre: form.eav_pre || null,
      eav_post: form.eav_post || null,
      tax_rate_filing_year: form.tax_rate_filing_year || null,
      retainer_amount: form.retainer_amount || 500,
      retainer_received: form.retainer_received || false,
      retainer_received_date: form.retainer_received_date || null,
      commission_pct: form.commission_pct || 50,
      commission_invoiced: form.commission_invoiced || false,
      commission_invoiced_date: form.commission_invoiced_date || null,
      commission_collected: form.commission_collected || false,
      commission_collected_date: form.commission_collected_date || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString()
    }).eq('id', id)

    if (err) {
      setError('Failed to save appeal')
      console.error(err)
    } else {
      setAppeal(form)
      setEditing(false)
      setError(null)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appeal?')) return
    const { error: err } = await supabase.from('appeals').delete().eq('id', id)
    if (err) {
      setError('Failed to delete appeal')
    } else {
      navigate('/appeals')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#64748b' }}>
        Loading...
      </div>
    )
  }

  if (!appeal) {
    return (
      <div style={{ padding: '24px', color: '#ef4444' }}>
        Appeal not found
      </div>
    )
  }

  const fin = calcFinancials(form)
  const showPTAB = form.bor_result === 'Denied' || form.bor_result === 'Partial'

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/appeals"
          style={{
            color: '#1e40af',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '12px',
            display: 'inline-block'
          }}
        >
          ← Appeals
        </Link>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
            Appeal — {appeal.property?.address} ({appeal.tax_year})
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setForm(appeal)
                    setEditing(false)
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#64748b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '8px 16px',
                  background: '#1e40af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Edit
              </button>
            )}
            {user?.is_admin && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Property chip and stage selector */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to={`/properties/${appeal.property?.id}`}
            style={{
              display: 'inline-block',
              background: '#eff6ff',
              border: '1px solid #1e40af',
              color: '#1e40af',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            {appeal.property?.address}
          </Link>

          {editing ? (
            <select
              value={form.stage_id || ''}
              onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
              style={{
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            >
              <option value="">Select Stage</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            appeal.stage && (
              <div style={{
                display: 'inline-block',
                background: appeal.stage.color,
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {appeal.stage.name}
              </div>
            )
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Main content - two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* BOR Section */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              Board of Review (BOR)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                  Filed Date
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={form.bor_filed_date || ''}
                    onChange={(e) => setForm({ ...form, bor_filed_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {form.bor_filed_date ? new Date(form.bor_filed_date).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                  Hearing Date
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={form.bor_hearing_date || ''}
                    onChange={(e) => setForm({ ...form, bor_hearing_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {form.bor_hearing_date ? new Date(form.bor_hearing_date).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                  Result Date
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={form.bor_result_date || ''}
                    onChange={(e) => setForm({ ...form, bor_result_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {form.bor_result_date ? new Date(form.bor_result_date).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                  Result
                </label>
                {editing ? (
                  <select
                    value={form.bor_result || ''}
                    onChange={(e) => setForm({ ...form, bor_result: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select</option>
                    <option value="Granted">Granted</option>
                    <option value="Denied">Denied</option>
                    <option value="Partial">Partial</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Pending">Pending</option>
                  </select>
                ) : (
                  <div style={{ fontSize: '14px', color: '#1e293b' }}>
                    {form.bor_result || '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PTAB Section - conditional */}
          {showPTAB && (
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                Property Tax Appeal Board (PTAB)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                    Filed Date
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={form.ptab_filed_date || ''}
                      onChange={(e) => setForm({ ...form, ptab_filed_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      {form.ptab_filed_date ? new Date(form.ptab_filed_date).toLocaleDateString() : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                    Hearing Date
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={form.ptab_hearing_date || ''}
                      onChange={(e) => setForm({ ...form, ptab_hearing_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      {form.ptab_hearing_date ? new Date(form.ptab_hearing_date).toLocaleDateString() : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                    Result Date
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={form.ptab_result_date || ''}
                      onChange={(e) => setForm({ ...form, ptab_result_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      {form.ptab_result_date ? new Date(form.ptab_result_date).toLocaleDateString() : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                    Result
                  </label>
                  {editing ? (
                    <select
                      value={form.ptab_result || ''}
                      onChange={(e) => setForm({ ...form, ptab_result: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select</option>
                      <option value="Granted">Granted</option>
                      <option value="Denied">Denied</option>
                      <option value="Partial">Partial</option>
                      <option value="Withdrawn">Withdrawn</option>
                      <option value="Settled">Settled</option>
                      <option value="Pending">Pending</option>
                    </select>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      {form.ptab_result || '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              Notes
            </h2>
            {editing ? (
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                placeholder="Add notes about this appeal..."
              />
            ) : (
              <div style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {form.notes || '—'}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Commission Calculator */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              Commission Calculator
            </h2>
            <div style={{ fontSize: '13px', display: 'grid', gap: '8px' }}>
              {/* Row 1: EAV Pre */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>EAV (Pre-Reduction)</div>
                {editing ? (
                  <input
                    type="number"
                    value={form.eav_pre || ''}
                    onChange={(e) => setForm({ ...form, eav_pre: e.target.value })}
                    placeholder="0"
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ color: '#1e293b' }}>{fmt.currency(parseFloat(form.eav_pre) || 0)}</div>
                )}
              </div>

              {/* Row 2: EAV Post */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>EAV (Post-Reduction)</div>
                {editing ? (
                  <input
                    type="number"
                    value={form.eav_post || ''}
                    onChange={(e) => setForm({ ...form, eav_post: e.target.value })}
                    placeholder="0"
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ color: '#1e293b' }}>{fmt.currency(parseFloat(form.eav_post) || 0)}</div>
                )}
              </div>

              {/* Separator */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Row 3: EAV Reduction (highlighted) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                alignItems: 'center',
                background: '#dbeafe',
                padding: '8px 10px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                <div style={{ color: '#1e40af' }}>EAV Reduction</div>
                <div style={{ color: '#1e40af' }}>{fmt.currency(fin.eavReduction)}</div>
              </div>

              {/* Row 4: Tax Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Tax Rate (filing year)</div>
                {editing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={form.tax_rate_filing_year || ''}
                    onChange={(e) => setForm({ ...form, tax_rate_filing_year: e.target.value })}
                    placeholder="0.00"
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ color: '#1e293b' }}>{(parseFloat(form.tax_rate_filing_year) || 0).toFixed(2)}%</div>
                )}
              </div>

              {/* Separator */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Row 5: Total Tax Savings (highlighted) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                alignItems: 'center',
                background: '#dcfce7',
                padding: '8px 10px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                <div style={{ color: '#166534' }}>Total Tax Savings</div>
                <div style={{ color: '#166534' }}>{fmt.currency(fin.totalTaxSavings)}</div>
              </div>

              {/* Row 6: Retainer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Retainer Amount</div>
                {editing ? (
                  <input
                    type="number"
                    value={form.retainer_amount || '500'}
                    onChange={(e) => setForm({ ...form, retainer_amount: e.target.value })}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ color: '#1e293b' }}>{fmt.currency(parseFloat(form.retainer_amount) || 500)}</div>
                )}
              </div>

              {/* Row 7: Commission % */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#64748b' }}>Commission %</div>
                {editing ? (
                  <input
                    type="number"
                    step="0.1"
                    value={form.commission_pct || '50'}
                    onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                ) : (
                  <div style={{ color: '#1e293b' }}>{(parseFloat(form.commission_pct) || 50).toFixed(1)}%</div>
                )}
              </div>

              {/* Separator */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              {/* Row 8: Commission Amount (highlighted) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                alignItems: 'center',
                background: '#22c55e',
                padding: '8px 10px',
                borderRadius: '4px',
                fontWeight: '600',
                color: '#fff'
              }}>
                <div>Commission Amount</div>
                <div>{fmt.currency(fin.commissionAmount)}</div>
              </div>
            </div>
          </div>

          {/* Payment Tracking */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
              Payment Tracking
            </h2>
            <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
              {/* Retainer Received */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {editing ? (
                  <>
                    <input
                      type="checkbox"
                      checked={form.retainer_received || false}
                      onChange={(e) => setForm({ ...form, retainer_received: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Retainer Received</label>
                    <input
                      type="date"
                      value={form.retainer_received_date || ''}
                      onChange={(e) => setForm({ ...form, retainer_received_date: e.target.value })}
                      disabled={!form.retainer_received}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        opacity: form.retainer_received ? 1 : 0.5
                      }}
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={form.retainer_received || false}
                      disabled
                      style={{ width: '16px', height: '16px', cursor: 'not-allowed' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Retainer Received</label>
                    <div style={{ color: '#1e293b' }}>
                      {form.retainer_received_date ? new Date(form.retainer_received_date).toLocaleDateString() : '—'}
                    </div>
                  </>
                )}
              </div>

              {/* Commission Invoiced */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {editing ? (
                  <>
                    <input
                      type="checkbox"
                      checked={form.commission_invoiced || false}
                      onChange={(e) => setForm({ ...form, commission_invoiced: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Commission Invoiced</label>
                    <input
                      type="date"
                      value={form.commission_invoiced_date || ''}
                      onChange={(e) => setForm({ ...form, commission_invoiced_date: e.target.value })}
                      disabled={!form.commission_invoiced}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        opacity: form.commission_invoiced ? 1 : 0.5
                      }}
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={form.commission_invoiced || false}
                      disabled
                      style={{ width: '16px', height: '16px', cursor: 'not-allowed' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Commission Invoiced</label>
                    <div style={{ color: '#1e293b' }}>
                      {form.commission_invoiced_date ? new Date(form.commission_invoiced_date).toLocaleDateString() : '—'}
                    </div>
                  </>
                )}
              </div>

              {/* Commission Collected */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {editing ? (
                  <>
                    <input
                      type="checkbox"
                      checked={form.commission_collected || false}
                      onChange={(e) => setForm({ ...form, commission_collected: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Commission Collected</label>
                    <input
                      type="date"
                      value={form.commission_collected_date || ''}
                      onChange={(e) => setForm({ ...form, commission_collected_date: e.target.value })}
                      disabled={!form.commission_collected}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        opacity: form.commission_collected ? 1 : 0.5
                      }}
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={form.commission_collected || false}
                      disabled
                      style={{ width: '16px', height: '16px', cursor: 'not-allowed' }}
                    />
                    <label style={{ color: '#64748b', flex: 1 }}>Commission Collected</label>
                    <div style={{ color: '#1e293b' }}>
                      {form.commission_collected_date ? new Date(form.commission_collected_date).toLocaleDateString() : '—'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Comps Section */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
            Linked Comps
          </h2>
          <button
            style={{
              padding: '6px 12px',
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Add Comps
          </button>
        </div>

        {comps.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
            No comps linked to this appeal yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Address</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Sale Date</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Sale Price</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Bldg SF</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>$/SF</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Score</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Selected</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c, idx) => (
                <tr key={c.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', color: '#1e293b' }}>{c.comp?.address}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b' }}>
                    {c.comp?.sale_date ? new Date(c.comp.sale_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b' }}>
                    {fmt.currency(parseFloat(c.comp?.sale_price) || 0)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b' }}>
                    {fmt.number(parseFloat(c.comp?.building_sf) || 0)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b' }}>
                    {fmt.currency((parseFloat(c.comp?.sale_price) || 0) / (parseFloat(c.comp?.building_sf) || 1))}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#1e293b' }}>
                    {(parseFloat(c.comp?.relevance_score) || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
