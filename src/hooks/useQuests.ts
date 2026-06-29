import { useState, useEffect } from 'react'
import { fetchQuestList, fetchQuestDetail } from '@/lib/dataStore'
import type { QuestSummary, QuestDetail } from '@/lib/dataStore'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useQuestList() {
  const [state, setState] = useState<AsyncState<QuestSummary[]>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState(prev => prev.data ? { ...prev, loading: false } : { data: null, loading: true, error: null })

    fetchQuestList()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })

    return () => { cancelled = true }
  }, [])

  return { quests: state.data || [], loading: state.loading, error: state.error }
}

export function useQuestDetail(questId: string | null) {
  const [state, setState] = useState<AsyncState<QuestDetail>>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!questId) {
      setState({ data: null, loading: false, error: null })
      return
    }

    let cancelled = false
    setState(prev => prev.data?.id === questId ? { ...prev, loading: false } : { data: null, loading: true, error: null })

    fetchQuestDetail(questId)
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: String(err) }) })

    return () => { cancelled = true }
  }, [questId])

  return { quest: state.data, loading: state.loading, error: state.error }
}
