import { useState, useRef, useEffect } from 'react'

/**
 * RecordToolbar - reusable toolbar for record list pages
 *
 * Props:
 *  - title: string
 *  - count: number
 *  - onAdd: () => void
 *  - addLabel: string
 *  - onImport: () => void         (optional)
 *  - onExport: () => void         (optional)
 *  - columns: [{key, label, visible}]
 *  - onColumnsChange: (cols) => void
 *  - selectedIds: string[]
 *  - massReplaceFields: [{key, label, type, options}]
 *  - onMassReplace: ({field, value, ids}) => void
 *  - viewMode: 'list'|'icon'|'map'   (optional, for Properties)
 *  - onViewChange: (mode) => void    (optional)
 *  - showViewToggle: bool
 */
export default function RecordToolbar({
  title, count,
  onAdd, addLabel = '+ Add',
  onImport, onExport,
  columns = [], onColumnsChange,
  selectedIds = [],
  massReplaceFields = [], onMassReplace,
  viewMode, onViewChange, showViewToggle = false,
}) {
  const [showColumns, setShowColumns] = useState(false)
  const [showMassReplace, setShowMassReplace] = useState(false)
  const [mrField, setMrField] = useState('')
  const [mrValue, setMrValue] = useState('')

  const columnsRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (columnsRef.current && !columnsRef.current.contains(e.target)) setShowColumns(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleColumn(key) {
    const updated = columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    onColumnsChange?.(updated)
  }

  function handleMassReplace() {
    if (!mrField || mrValue === '') return
    onMassReplace?.({ field: mrField, value: mrValue, ids: selectedIds })
    setShowMassReplace(false)
    setMrField('')
    setMrValue('')
  }

  const mrFieldDef = massReplaceFields.find(f => f.key === mrField)

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px' }}>
      {/* Top row: title + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
          {count != null && (
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
              {count.toLocaleString()} record{count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* View toggle (Properties only) */}
          {showViewToggle && onViewChange && (
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { mode: 'list', title: 'List', icon: listViewIcon },
                { mode: 'icon', title: 'Icon', icon: iconViewIcon },
                { mode: 'map',  title: 'Map',  icon: mapViewIcon  },
              ].map(({ mode, title: t, icon }) => (
                <button
                  key={mode}
                  title={t + ' view'}
                  onClick={() => onViewChange(mode)}
                  style={{
                    padding: '5px 10px',
                    background: viewMode === mode ? '#1e40af' : '#fff',
                    color: viewMode === mode ? '#fff' : '#64748b',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: viewMode === mode ? 600 : 400,
                    transition: 'all 0.15s'
                  }}
                >
                  {icon}
                  <span style={{ fontSize: 12 }}>{t}</span>
                </button>
              ))}
            </div>
          )}

          {/* Import */}
          {onImport && (
            <ToolbarBtn icon={importIcon} label="Import" onClick={onImport} />
          )}

          {/* Export */}
          {onExport && (
            <ToolbarBtn icon={exportIcon} label="Export" onClick={onExport} />
          )}

          {/* Columns picker */}
          {columns.length > 0 && (
            <div ref={columnsRef} style={{ position: 'relative' }}>
              <ToolbarBtn icon={columnsIcon} label="Columns" onClick={() => setShowColumns(!showColumns)} active={showColumns} />
              {showColumns && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: 12, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Show / Hide Columns
                  </div>
                  {columns.map(col => (
                    <label key={col.key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 4px', cursor: 'pointer', fontSize: 13, color: '#1e293b'
                    }}>
                      <input
                        type="checkbox"
                        checked={col.visible !== false}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: '#1e40af', cursor: 'pointer' }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mass Replace */}
          {massReplaceFields.length > 0 && selectedIds.length > 0 && (
            <ToolbarBtn icon={massReplaceIcon} label={`Replace (${selectedIds.length})`} onClick={() => setShowMassReplace(true)} highlight />
          )}

          {/* Primary add button */}
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                background: '#1e40af', color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 14px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Mass Replace Modal */}
      {showMassReplace && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>Mass Replace</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
              Update <strong>{selectedIds.length}</strong> selected record{selectedIds.length !== 1 ? 's' : ''}.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Field</label>
              <select
                value={mrField}
                onChange={e => { setMrField(e.target.value); setMrValue('') }}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
              >
                <option value="">Select field...</option>
                {massReplaceFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>

            {mrField && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>New Value</label>
                {mrFieldDef?.type === 'select' ? (
                  <select
                    value={mrValue}
                    onChange={e => setMrValue(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="">Select...</option>
                    {mrFieldDef.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={mrFieldDef?.type || 'text'}
                    value={mrValue}
                    onChange={e => setMrValue(e.target.value)}
                    placeholder="Enter new value..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMassReplace(false)} style={{
                padding: '7px 16px', border: '1px solid #e2e8f0', borderRadius: 8,
                background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>Cancel</button>
              <button
                onClick={handleMassReplace}
                disabled={!mrField || mrValue === ''}
                style={{
                  padding: '7px 16px', background: '#1e40af', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: (!mrField || mrValue === '') ? 'not-allowed' : 'pointer',
                  opacity: (!mrField || mrValue === '') ? 0.5 : 1
                }}
              >
                Apply to {selectedIds.length} record{selectedIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolbarBtn({ icon, label, onClick, active, highlight }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 11px',
        background: highlight ? '#dbeafe' : (active || hovered) ? '#f1f5f9' : '#fff',
        border: `1px solid ${highlight ? '#93c5fd' : '#e2e8f0'}`,
        borderRadius: 8, cursor: 'pointer',
        color: highlight ? '#1e40af' : '#475569',
        fontSize: 13, fontWeight: 500,
        transition: 'all 0.15s', whiteSpace: 'nowrap'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

const listViewIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const iconViewIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const mapViewIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
)
const importIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const exportIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const columnsIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
)
const massReplaceIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
