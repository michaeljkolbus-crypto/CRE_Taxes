import { useState, useCallback } from 'react'

/**
 * useResizableColumns — drag-to-resize table column widths
 *
 * @param {Array<{key: string, defaultWidth?: number}>} columnDefs
 * @param {number} fallbackWidth - default width in px if not specified per column
 * @returns {{ widths, startResize, resizeHandleStyle }}
 *
 * Usage in a table header:
 *   const { widths, startResize, resizeHandleStyle } = useResizableColumns(columns)
 *   ...
 *   <table style={{ tableLayout: 'fixed', width: '100%' }}>
 *     <thead>
 *       <tr>
 *         <th style={{ width: widths['name'], position: 'relative' }}>
 *           Name
 *           <span style={resizeHandleStyle} onMouseDown={e => startResize('name', e)} />
 *         </th>
 *       </tr>
 *     </thead>
 */
export function useResizableColumns(columnDefs = [], fallbackWidth = 150) {
  const [widths, setWidths] = useState(() => {
    const w = {}
    columnDefs.forEach(c => {
      w[c.key] = c.defaultWidth ?? fallbackWidth
    })
    return w
  })

  const startResize = useCallback((key, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = widths[key] ?? fallbackWidth

    function onMove(me) {
      const delta = me.clientX - startX
      const newW  = Math.max(60, startW + delta)
      setWidths(prev => ({ ...prev, [key]: newW }))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [widths, fallbackWidth])

  /** Inline style for the drag handle element inside each <th> */
  const resizeHandleStyle = {
    position: 'absolute',
    top: 0, right: 0,
    width: 5, height: '100%',
    cursor: 'col-resize',
    userSelect: 'none',
    zIndex: 1,
    // Subtle visual indicator on hover (handled via CSS hover in the element or inline)
  }

  return { widths, startResize, resizeHandleStyle }
}
