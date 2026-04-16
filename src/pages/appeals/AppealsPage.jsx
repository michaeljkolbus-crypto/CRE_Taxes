import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
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

function getBORBadge(result) {
  switch (result) {
    case 'Granted':
      return { bg: '#dcfce7', color: '#166534', text: 'Granted' }
    case 'Denied':
      return { bg: '#fee2e2', color: '#991b1b', text: 'Denied' }
    case 'Partial':
      return { bg: '#fef3c7', color: '#92400e', text: 'Partial' }
    case 'Withdrawn':
    case 'Pending':
      return { bg: '#f3f4f6', color: '#374151', text: result || 'Pending' }
    default:
      return { bg: '#f3f4f6', color: '#374151', text: '—' }
  }
}

function getPTABBadge(result) {
  switch (result) {
    case 'Granted':
      return { bg: '#dcfce7', color: '#166534', text: 'Granted' }
    case 'Denied':
      return { bg: '#fee2e2', color: '#991b1b', text: 'Denied' }
    case 'Partial':
      return { bg: '#fef3c7', color: '#92400e', text: 'Partial' }
    case 'Withdrawn':
    case 'Settled':
    case 'Pending':
      return { bg: '#f3f4f6', color: '#374151', text: result || 'Pending' }
    default:
      return { bg: '#f3f4f6', color: '#374151', text: '—' }
  }
}

export default function AppealsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [appeals, setAppeals] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })
  
  // Filters
  const [searchText, setSearchText] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedCounty, setSelectedCounty] = useState('')
  const [counties, setCounties] = useState([])

  useEffect(() => {
    fetchStages()
    fetchAppeals()
  }, [selectedStage, selectedYear, selectedCounty, pagination.page])

  const fetchStages = async () => {
    const { data } = await supabase
      .from('appeal_stages')
      .select('*')
      .order('sort_order', { ascending: true })
    if (data) setStages(data)
  }

  const fetchAppeals = async () => {
    setLoading(true)
    let query = supabase
      .from('appeals')
      .select('*, property:properties(id, address, city, county, parcel_id, property_type), stage:appeal_stages(id, name, color)', { count: 'exact' })

    // Apply filters
    if (selectedStage !== 'all') {
      query = query.eq('stage_id', selectedStage)
    }
    if (selectedYear) {
      query = query.eq('tax_year', parseInt(selectedYear))
    }
    if (selectedCounty) {
      query = query.eq('property.county', selectedCounty)
    }

    const from = (pagination.page - 1) * pagination.pageSize
    const to = from + pagination.pageSize - 1

    const { data, count: totalCount, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching appeals:', error)
    } else {
      setAppeals(data || [])
      setCount(totalCount || 0)
    }
    setLoading(false)
  }

  // Filter by search after fetch
  const filtered = appeals.filter(a => {
    const address = a.property?.address?.toLowerCase() || ''
    const parcel = a.property?.parcel_id?.toLowerCase() || ''
    const search = searchText.toLowerCase()
    return address.includes(search) || parcel.includes(search)
  })

  const borBadge = (result) => {
    const badge = getBORBadge(result)
    return (
      <div style={{
        display: 'inline-block',
        background: badge.bg,
        color: badge.color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {badge.text}
      </div>
    )
  }

  const ptabBadge = (result) => {
    const badge = getPTABBadge(result)
    return (
      <div style={{
        display: 'inline-block',
        background: badge.bg,
        color: badge.color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {badge.text}
      </div>
    )
  }

  const stageBadge = (stage) => (
    <div style={{
      display: 'inline-block',
      background: stage?.color || '#e2e8f0',
      color: '#fff',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500'
    }}>
      {stage?.name}
    </div>
  )

  if (view === 'pipeline') {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>Appeals</h1>
          <button
            onClick={() => setView('list')}
            style={{
              padding: '8px 12px',
              background: '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            List View
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {stages.map(stage => {
            const stageAppeals = appeals.filter(a => a.stage_id === stage.id)
            return (
              <div key={stage.id} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    background: stage.color,
                    borderRadius: '50%'
                  }} />
                  {stage.name} ({stageAppeals.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stageAppeals.map(a => {
                    const fin = calcFinancials(a)
                    return (
                      <div
                        key={a.id}
                        onClick={() => navigate(`/appeals/${a.id}`)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#eff6ff'
                          e.currentTarget.style.borderColor = '#1e40af'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8fafc'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                          {a.property?.address}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                          Tax Year: {a.tax_year}
                        </div>
                        <div style={{ fontSize: '12px', color: '#1e293b' }}>
                          EAV Reduction: <strong>{fmt.currency(fin.eavReduction)}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1e293b' }}>
                          Commission: <strong>{fmt.currency(fin.commissionAmount)}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(count / pagination.pageSize)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RecordToolbar
        title="Appeals"
        count={count}
        addLabel="Pipeline View"
        onAdd={() => setView('pipeline')}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

      {/* Filters */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <input
          type="text"
          placeholder="Search address or parcel ID"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        />
        <select
          value={selectedStage}
          onChange={(e) => {
            setSelectedStage(e.target.value)
            setPagination({ ...pagination, page: 1 })
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        >
          <option value="all">All Stages</option>
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Tax Year"
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value)
            setPagination({ ...pagination, page: 1 })
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Address</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>County</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Tax Year</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Stage</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>BOR Result</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>PTAB Result</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>EAV Reduction</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Tax Savings</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Commission</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No appeals found
                </td>
              </tr>
            ) : (
              filtered.map((appeal, idx) => {
                const fin = calcFinancials(appeal)
                const bgColor = idx % 2 === 0 ? '#fff' : '#f8fafc'
                return (
                  <tr key={appeal.id} style={{ background: bgColor, borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', color: '#1e293b' }}>
                      <Link
                        to={`/properties/${appeal.property?.id}`}
                        style={{ color: '#1e40af', textDecoration: 'none', cursor: 'pointer' }}
                      >
                        {appeal.property?.address}
                      </Link>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1e293b' }}>
                      {appeal.property?.county}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1e293b' }}>
                      {appeal.tax_year}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {stageBadge(appeal.stage)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {borBadge(appeal.bor_result)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {ptabBadge(appeal.ptab_result)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1e293b' }}>
                      {fmt.currency(fin.eavReduction)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1e293b' }}>
                      {fmt.currency(fin.totalTaxSavings)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#1e293b', fontWeight: '600' }}>
                      {fmt.currency(fin.commissionAmount)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/appeals/${appeal.id}`)}
                        style={{
                          padding: '4px 8px',
                          background: '#1e40af',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            style={{
              padding: '6px 12px',
              background: pagination.page === 1 ? '#e2e8f0' : '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            Previous
          </button>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Page {pagination.page} of {totalPages}
          </span>
          <button
            disabled={pagination.page === totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            style={{
              padding: '6px 12px',
              background: pagination.page === totalPages ? '#e2e8f0' : '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
      </div>
  )
}
