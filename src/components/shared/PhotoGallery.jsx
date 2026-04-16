import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../../lib/supabase'

const SUPABASE_URL = 'https://qkpfrjfiiuveuybpftep.supabase.co'

// Record type → legacy single-photo column (kept in sync for backward compat)
const LEGACY_COL   = { property: 'image_url', contact: 'photo_url' }
const RECORD_TABLE = { property: 'properties', contact: 'contacts' }

// ── Storage upload helper ─────────────────────────────────────────────────────
const uploadToStorage = async (file, recordType, recordId) => {
  const ext  = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')
  const folder = recordType === 'contact' ? 'contacts' : 'properties'
  const path   = `${folder}/${recordId}_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error('Upload failed: ' + error.message)

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
  return { path, url: urlData.publicUrl }
}

// ── Thumbnail item ─────────────────────────────────────────────────────────────
function ThumbItem({ photo, active, onSelect, onSetMain, onDelete, settingMain, deleting }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button
        onClick={onSelect}
        style={{
          width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
          border: `2px solid ${active ? '#1e40af' : 'transparent'}`,
          cursor: 'pointer', padding: 0, background: '#f1f5f9',
          display: 'block', transition: 'border-color 0.15s', boxSizing: 'border-box'
        }}
      >
        <img
          src={photo.public_url} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => (e.currentTarget.style.display = 'none')}
        />
      </button>

      {photo.is_main && (
        <div style={{
          position: 'absolute', top: 2, left: 2,
          background: 'rgba(0,0,0,0.65)', borderRadius: 4,
          padding: '1px 4px', fontSize: 9, color: '#fbbf24', fontWeight: 700,
          lineHeight: 1.4, pointerEvents: 'none'
        }}>★</div>
      )}

      {hov && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 8,
          background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 10
        }}>
          {!photo.is_main && (
            <button
              onClick={e => { e.stopPropagation(); onSetMain() }}
              disabled={settingMain}
              title="Set as main photo"
              style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: 15, padding: '2px 3px', lineHeight: 1 }}
            >
              {settingMain ? '…' : '★'}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            disabled={deleting}
            title="Delete photo"
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13, padding: '2px 3px', lineHeight: 1 }}
          >
            {deleting ? '…' : '🗑'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── PhotoGallery ──────────────────────────────────────────────────────────────
// Props:
//   recordType  – 'property' | 'contact'
//   recordId    – uuid string
//   mode        – 'compact' (square avatar, used in contact hero)
//               | 'wide' (full-width banner, used in property hero)
//   initials    – char shown as placeholder in compact mode
//   fallbackUrl – URL shown when gallery is empty
//   onMainPhotoChange – called with new URL (or null) when main photo changes
export const PhotoGallery = forwardRef(function PhotoGallery(
  { recordType, recordId, mode = 'compact', initials = '?', fallbackUrl, onMainPhotoChange, hideControls = false },
  ref
) {
  const [photos,       setPhotos]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeIdx,    setActiveIdx]    = useState(0)
  const [uploading,    setUploading]    = useState(false)
  const [deletingId,   setDeletingId]   = useState(null)
  const [settingMainId,setSettingMainId]= useState(null)
  const fileInputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileInputRef.current?.click(),
    triggerDelete: () => { if (activePhoto) handleDelete(activePhoto) },
  }))

  const loadPhotos = useCallback(async () => {
    if (!recordId) { setLoading(false); return }
    try {
      const { data, error } = await supabase
        .from('record_photos')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setPhotos(data || [])
      const mainIdx = (data || []).findIndex(r => r.is_main)
      setActiveIdx(mainIdx >= 0 ? mainIdx : 0)
    } catch (e) {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }, [recordType, recordId])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  const syncLegacyCol = async (url) => {
    const table = RECORD_TABLE[recordType]
    const col   = LEGACY_COL[recordType]
    if (!table || !col) return
    await supabase.from(table).update({ [col]: url }).eq('id', recordId)
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(f =>
      f.type.match(/^image\/(jpeg|jpg|png|webp)$/i)
    )
    if (!files.length) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const { path, url } = await uploadToStorage(files[i], recordType, recordId)
        const isFirst = photos.length === 0 && i === 0
        const { error: dbError } = await supabase.from('record_photos').insert([{
          record_type: recordType,
          record_id:   recordId,
          storage_path: path,
          public_url:  url,
          is_main:     isFirst,
          sort_order:  photos.length + i,
        }])
        if (dbError) throw dbError
        if (isFirst) {
          await syncLegacyCol(url)
          onMainPhotoChange?.(url)
        }
      }
      await loadPhotos()
    } catch (err) {
      alert('Photo upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSetMain = async (photo) => {
    if (photo.is_main || settingMainId) return
    setSettingMainId(photo.id)
    try {
      await supabase
        .from('record_photos')
        .update({ is_main: false })
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .eq('is_main', true)

      await supabase
        .from('record_photos')
        .update({ is_main: true })
        .eq('id', photo.id)

      await syncLegacyCol(photo.public_url)
      onMainPhotoChange?.(photo.public_url)
      await loadPhotos()
    } catch (err) {
      alert('Failed to set main: ' + err.message)
    } finally {
      setSettingMainId(null)
    }
  }

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    setDeletingId(photo.id)
    try {
      // Delete from storage
      await supabase.storage.from('photos').remove([photo.storage_path])
      // Delete DB row
      await supabase.from('record_photos').delete().eq('id', photo.id)
      const remaining = photos.filter(p => p.id !== photo.id)
      if (photo.is_main) {
        if (remaining.length > 0) {
          await supabase.from('record_photos').update({ is_main: true }).eq('id', remaining[0].id)
          await syncLegacyCol(remaining[0].public_url)
          onMainPhotoChange?.(remaining[0].public_url)
        } else {
          await syncLegacyCol(null)
          onMainPhotoChange?.(null)
        }
      }
      await loadPhotos()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const prev = () => setActiveIdx(i => (i - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1))
  const next = () => setActiveIdx(i => (i + 1) % Math.max(photos.length, 1))
  const activePhoto = photos[activeIdx] || null
  const displayUrl  = activePhoto?.public_url || fallbackUrl || null

  const fileInput = (
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: 'none' }}
      accept="image/jpeg,image/jpg,image/png,image/webp"
      multiple
      onChange={handleUpload}
    />
  )

  // ── COMPACT MODE (contact hero, square) ────────────────────────────────────
  if (mode === 'compact') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {/* Main photo */}
        <div style={{
          position: 'relative', width: 200, height: 200, borderRadius: 16,
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 72, fontWeight: 800, color: '#fff',
          border: '2px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          flexShrink: 0
        }}>
          {displayUrl
            ? <img src={displayUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
            : !loading && <span>{initials}</span>
          }
          {photos.length > 1 && (
            <>
              <button onClick={prev} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <button onClick={next} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div style={{ display: 'flex', gap: 5, maxWidth: 200, flexWrap: 'wrap', justifyContent: 'center' }}>
            {photos.map((p, i) => (
              <ThumbItem
                key={p.id} photo={p} active={i === activeIdx}
                onSelect={() => setActiveIdx(i)}
                onSetMain={() => handleSetMain(p)}
                onDelete={() => handleDelete(p)}
                settingMain={settingMainId === p.id}
                deleting={deletingId === p.id}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!hideControls && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: '100%' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 14px', fontSize: 11, color: '#64748b', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? 'Uploading…' : photos.length === 0 ? '📷 Upload Photo' : '📷 Add Photo'}
            </button>
            {activePhoto && !activePhoto.is_main && (
              <button
                onClick={() => handleSetMain(activePhoto)}
                disabled={!!settingMainId}
                style={{ background: 'none', border: '1px solid #f59e0b', borderRadius: 8, padding: '4px 12px', fontSize: 11, color: '#f59e0b', cursor: 'pointer', fontWeight: 600, opacity: settingMainId ? 0.6 : 1 }}
              >
                {settingMainId === activePhoto.id ? 'Setting…' : '★ Set as Main'}
              </button>
            )}
            {activePhoto && (
              <button
                onClick={() => handleDelete(activePhoto)}
                disabled={!!deletingId}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 12px', fontSize: 11, color: '#94a3b8', cursor: 'pointer', fontWeight: 600, opacity: deletingId ? 0.6 : 1 }}
              >
                {deletingId === activePhoto.id ? 'Deleting…' : '🗑 Remove'}
              </button>
            )}
          </div>
        )}
        {fileInput}
      </div>
    )
  }

  // ── WIDE MODE (property hero banner) ──────────────────────────────────────
  return (
    <div>
      {/* Main photo area */}
      <div style={{ height: 240, overflow: 'hidden', position: 'relative', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {displayUrl
          ? <img src={displayUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
              <span style={{ fontSize: 40 }}>🏢</span>
              <span style={{ fontSize: 12 }}>No photos — click Add below</span>
            </div>
          )
        }
        {displayUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 50%)' }} />}

        {activePhoto?.is_main && photos.length > 1 && (
          <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#fbbf24', zIndex: 2 }}>★ Main</div>
        )}
        {photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 600, zIndex: 2 }}>
            {activeIdx + 1} / {photos.length}
          </div>
        )}
        {photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 5, zIndex: 2 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)}
                style={{ width: i === activeIdx ? 22 : 8, height: 8, borderRadius: 4, background: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }}
              />
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={prev} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>‹</button>
            <button onClick={next} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>›</button>
          </>
        )}
      </div>

      {/* Thumbnail strip + action bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0 4px', flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <ThumbItem
            key={p.id} photo={p} active={i === activeIdx}
            onSelect={() => setActiveIdx(i)}
            onSetMain={() => handleSetMain(p)}
            onDelete={() => handleDelete(p)}
            settingMain={settingMainId === p.id}
            deleting={deletingId === p.id}
          />
        ))}
        {/* Add button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Add photo(s)"
          style={{ width: 52, height: 52, borderRadius: 8, border: '2px dashed #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 10, gap: 2, transition: 'border-color 0.15s,color 0.15s', opacity: uploading ? 0.5 : 1, flexShrink: 0 }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#1e40af'; e.currentTarget.style.color = '#1e40af' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
          <span>{uploading ? '…' : 'Add'}</span>
        </button>

        {activePhoto && !activePhoto.is_main && (
          <button
            onClick={() => handleSetMain(activePhoto)}
            disabled={!!settingMainId}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #f59e0b', background: 'none', color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: settingMainId ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {settingMainId ? 'Setting…' : '★ Set as Main'}
          </button>
        )}
        {activePhoto && (
          <button
            onClick={() => handleDelete(activePhoto)}
            disabled={!!deletingId}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', opacity: deletingId ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {deletingId ? 'Deleting…' : '🗑 Remove'}
          </button>
        )}
      </div>
      {fileInput}
    </div>
  )
})

export default PhotoGallery
