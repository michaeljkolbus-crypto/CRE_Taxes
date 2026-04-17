import { useState } from 'react'

const PAGE_SIZES = [25, 50, 100, 200, 300]

/**
 * Pagination — shared pagination bar for all list views
 *
 * Props:
 *  - total:          number   total records
 *  - page:           number   current page (0-indexed)
 *  - pageSize:       number   records per page
 *  - onPageChange:   (page: number) => void
 *  - onPageSizeChange: (size: number) => void
 */
export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startRow   = total === 0 ? 0 : page * pageSize + 1
  const endRow     = Math.min((page + 1) * pageSize, total)

  // Build page number window (up to 7 visible)
  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i)
    }
    const pages = []
    if (page <= 3) {
      // Near start: 0 1 2 3 4 ... last
      for (let i = 0; i < 5; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages - 1)
    } else if (page >= totalPages - 4) {
      // Near end: 0 ... last-4 last-3 last-2 last-1 last
      pages.push(0)
      pages.push('...')
      for (let i = totalPages - 5; i < totalPages; i++) pages.push(i)
    } else {
      // Middle: 0 ... cur-1 cur cur+1 ... last
      pages.push(0)
      pages.push('...')
      pages.push(page - 1)
      pages.push(page)
      pages.push(page + 1)
      pages.push('...')
      pages.push(totalPages - 1)
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  const btnBase = {
    minWidth: 32, height: 32, padding: '0 6px',
    border: '1px solid #e2e8f0', borderRadius: 6,
    background: '#fff', color: '#475569',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.12s', whiteSpace: 'nowrap',
  }
  const btnActive = { ...btnBase, background: '#1e40af', color: '#fff', borderColor: '#1e40af', fontWeight: 700 }
  const btnDisabled = { ...btnBase, opacity: 0.4, cursor: 'not-allowed' }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', borderTop: '1px solid #e2e8f0',
      background: '#fff', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#64748b'
    }}>

      {/* Left: page size selector + record count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Show:</span>
          {PAGE_SIZES.map(size => (
            <button
              key={size}
              onClick={() => { onPageSizeChange(size); onPageChange(0) }}
              style={size === pageSize ? btnActive : btnBase}
            >
              {size}
            </button>
          ))}
        </div>
        <span style={{ color: '#94a3b8' }}>|</span>
        <span>
          {total === 0
            ? 'No records'
            : `Page ${page + 1} of ${totalPages} — ${startRow.toLocaleString()}–${endRow.toLocaleString()} of ${total.toLocaleString()}`
          }
        </span>
      </div>

      {/* Right: page number controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* First */}
        <button
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          title="First page"
          style={page === 0 ? btnDisabled : btnBase}
        >«</button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          title="Previous page"
          style={page === 0 ? btnDisabled : btnBase}
        >‹ Prev</button>

        {/* Page numbers */}
        {pageNumbers.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
            : <button
                key={p}
                onClick={() => onPageChange(p)}
                style={p === page ? btnActive : btnBase}
              >{p + 1}</button>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          title="Next page"
          style={page >= totalPages - 1 ? btnDisabled : btnBase}
        >Next ›</button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          title="Last page"
          style={page >= totalPages - 1 ? btnDisabled : btnBase}
        >»</button>
      </div>
    </div>
  )
}
