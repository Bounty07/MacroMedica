import { useEffect, useRef, useState } from 'react'
import {
  clearEdgeFunctionUnavailable,
  describeEdgeFunctionError,
  isEdgeFunctionTemporarilyUnavailable,
  markEdgeFunctionUnavailable,
} from '../lib/edgeFunctionErrors'
import { supabase } from '../lib/supabase'
import { buildPracticeAnalyticsMetrics, loadPracticeAnalyticsSourceData } from '../lib/practiceAnalytics'

function hasAdvice(payload) {
  return Boolean(payload?.headline || payload?.issue || payload?.suggestions?.length)
}

export function usePracticeInsights({ cabinetId, refreshToken }) {
  const requestIdRef = useRef(0)
  const [metrics, setMetrics] = useState(null)
  const [insight, setInsight] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!cabinetId || !supabase) {
      setMetrics(null)
      setInsight(null)
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    async function run() {
      setIsLoading(true)

      try {
        const sourceData = await loadPracticeAnalyticsSourceData({
          client: supabase,
          cabinetId,
        })

        if (isCancelled || requestIdRef.current !== requestId) return

        const nextMetrics = buildPracticeAnalyticsMetrics(sourceData)
        setMetrics(nextMetrics)

        if (!nextMetrics.hasSufficientData) {
          setInsight(null)
          return
        }

        if (isEdgeFunctionTemporarilyUnavailable('ai-consultant')) {
          setInsight(null)
          return
        }

        const { data, error } = await supabase.functions.invoke('ai-consultant', {
          body: { metrics: nextMetrics },
        })

        if (isCancelled || requestIdRef.current !== requestId) return

        if (error || data?.error) {
          markEdgeFunctionUnavailable('ai-consultant')
          throw new Error(data?.error || error?.message || 'Erreur analytics')
        }

        clearEdgeFunctionUnavailable('ai-consultant')
        setInsight(hasAdvice(data) ? data : null)
      } catch (error) {
        markEdgeFunctionUnavailable('ai-consultant')
        console.warn('Practice insights unavailable:', describeEdgeFunctionError(error, 'ai-consultant'))
        if (!isCancelled && requestIdRef.current === requestId) {
          setInsight(null)
        }
      } finally {
        if (!isCancelled && requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    }

    run()

    return () => {
      isCancelled = true
    }
  }, [cabinetId, refreshToken])

  return {
    metrics,
    insight,
    isLoading,
  }
}
