import { useState, useRef, useEffect } from 'react'

const DEFAULT_COLOR = '#64748b'

// Convert hex color to rgba string
function hexToRgba(hex, alpha) {
  const h = (hex || '').replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(100,116,139,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Hashtag-style multi-tag input with autocomplete.
 *
 * Props:
 *   value       : string[]              — currently selected tag names
 *   onChange    : (string[]) => void    — called with updated tag array
 *   groups      : { name, color }[]    — catalog of known groups (autocomplete + colors)
 *   onAddGroup  : (name) => void        — called when a brand-new tag is added (to create catalog entry)
 *   label       : string
 *   placeholder : string
 */
export default function TagInput({
  value = [],
  onChange,
  groups = [],
  onAddGroup,
  label,
  placeholder = 'Add group…',
}) {
  const [inputValue, setInputValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState(-1)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  // Build color lookup map (case-insensitive)
  const colorMap = Object.fromEntries(
    groups.map(g => [g.name.toLowerCase(), g.color])
  )
  const getColor = (name) => colorMap[(name || '').toLowerCase()] || DEFAULT_COLOR

  // Suggestions: groups not already selected, filtered by input
  const filtered = groups
    .filter(g => !value.some(v => v.toLowerCase() === g.name.toLowerCase()))
    .filter(g =>
      inputValue === '' || g.name.toLowerCase().includes(inputValue.toLowerCase())
    )

  // Is the current input a brand-new group (not in catalog, not already selected)?
  const isNew =
    inputValue.trim() !== '' &&
    !groups.some(g => g.name.toLowerCase() === inputValue.trim().toLowerCase()) &&
    !value.some(v => v.toLowerCase() === inputValue.trim().toLowerCase())

  const addTag = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (value.some(v => v.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...value, trimmed])
    setInputValue('')
    setDropdownOpen(false)
    setFocusIdx(-1)
    inputRef.current?.focus()
    // If brand-new tag, notify parent so it can create a catalog entry
    if (!groups.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) {
      onAddGroup?.(trimmed)
    }
  }

  const removeTag = (idx) => {
    onChange(value.filter((_, i) => i !== idx))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (focusIdx >= 0 && focusIdx < filtered.length) {
        addTag(filtered[focusIdx].name)
      } else if (focusIdx === filtered.length && isNew) {
        addTag(inputValue.trim())
      } else if (inputValue.trim()) {
        addTag(inputValue.trim())
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const max = filtered.length + (isNew ? 0 : -1)
      setFocusIdx(i => Math.min(i + 1, max))
      setDropdownOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1)
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setFocusIdx(-1)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setFocusIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = dropdownOpen && (filtered.length > 0 || isNew)

  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
        }}>
          {label}
        </label>
      )}

      <div ref={wrapperRef} style={{ position: 'relative' }}>
        {/* Chip pill container + input */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
            minHeight: 38, padding: '5px 10px',
            border: '1px solid #e2e8f0', borderRadius: 6,
            background: '#fff', cursor: 'text', boxSizing: 'border-box',
          }}
        >
          {value.map((tag, idx) => {
            const color = getColor(tag)
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 99,
                  background: hexToRgba(color, 0.12),
                  color,
                  border: `1px solid ${hexToRgba(color, 0.35)}`,
                  fontSize: 12, fontWeight: 600, lineHeight: 1.4,
                  userSelect: 'none',
                }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeTag(idx) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, color, opacity: 0.7, fontSize: 14,
                    lineHeight: 1, display: 'flex', alignItems: 'center',
                  }}
                >×</button>
              </span>
            )
          })}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setDropdownOpen(true)
              setFocusIdx(-1)
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            style={{
              border: 'none', outline: 'none', fontSize: 13, color: '#1e293b',
              flex: '1 1 80px', minWidth: 80, padding: 0, background: 'transparent',
            }}
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 4,
            maxHeight: 220, overflowY: 'auto',
          }}>
            {filtered.map((g, idx) => (
              <div
                key={g.name}
                onMouseDown={e => { e.preventDefault(); addTag(g.name) }}
                onMouseEnter={() => setFocusIdx(idx)}
                style={{
                  padding: '8px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: focusIdx === idx ? '#f1f5f9' : '#fff',
                  fontSize: 13, color: '#1e293b',
                }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: g.color, flexShrink: 0,
                }} />
                #{g.name}
              </div>
            ))}

            {isNew && (
              <div
                onMouseDown={e => { e.preventDefault(); addTag(inputValue.trim()) }}
                onMouseEnter={() => setFocusIdx(filtered.length)}
                style={{
                  padding: '8px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: focusIdx === filtered.length ? '#f1f5f9' : '#fff',
                  fontSize: 13, color: '#1e40af',
                  borderTop: filtered.length > 0 ? '1px solid #f1f5f9' : 'none',
                  fontStyle: 'italic',
                }}
              >
                + Create &ldquo;<strong style={{ fontStyle: 'normal' }}>{inputValue.trim()}</strong>&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
        Type to search · Enter or Tab to add · Backspace to remove last
      </p>
    </div>
  )
}

// Export helper for use in other components
export { hexToRgba }
