import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * useViewPreferences
 *
 * Manages named layout configs for a given view type.
 *
 * @param {string} viewType — 'property_detail' | 'property_list'
 * @returns {{ views, loading, saveView, updateView, deleteView, refetch }}
 *
 * view shape: { id, name, is_default, config, created_at }
 * config shape (property_detail): { tabs: [{ id, label, visible }] }
 * config shape (property_list):   { columns: [{ key, visible }] }
 */
export function useViewPreferences(viewType) {
  const { user } = useAuth()
  const [views, setViews]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchViews = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_view_preferences')
        .select('id, name, is_default, config, created_at')
        .eq('user_id', user.id)
        .eq('view_type', viewType)
        .order('created_at', { ascending: true })
      if (!error) setViews(data || [])
    } catch (err) {
      console.error('useViewPreferences fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, viewType])

  useEffect(() => { fetchViews() }, [fetchViews])

  /**
   * Save a NEW named view.
   * Returns the created row (with id) or null on error.
   */
  const saveView = useCallback(async (name, config) => {
    if (!user || !name?.trim()) return null
    try {
      const { data, error } = await supabase
        .from('user_view_preferences')
        .insert({
          user_id: user.id,
          view_type: viewType,
          name: name.trim(),
          config,
        })
        .select('id, name, is_default, config, created_at')
        .single()
      if (error) throw error
      await fetchViews()
      return data
    } catch (err) {
      console.error('saveView error:', err)
      return null
    }
  }, [user, viewType, fetchViews])

  /**
   * Overwrite an EXISTING view's name and/or config.
   */
  const updateView = useCallback(async (id, { name, config }) => {
    try {
      const patch = { updated_at: new Date().toISOString() }
      if (name  != null) patch.name   = name.trim()
      if (config != null) patch.config = config
      const { error } = await supabase
        .from('user_view_preferences')
        .update(patch)
        .eq('id', id)
      if (error) throw error
      await fetchViews()
    } catch (err) {
      console.error('updateView error:', err)
    }
  }, [fetchViews])

  /**
   * Delete a view by id.
   */
  const deleteView = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('user_view_preferences')
        .delete()
        .eq('id', id)
      if (error) throw error
      await fetchViews()
    } catch (err) {
      console.error('deleteView error:', err)
    }
  }, [fetchViews])

  return { views, loading, saveView, updateView, deleteView, refetch: fetchViews }
}
