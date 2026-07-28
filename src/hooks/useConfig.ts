"use client"

import { useEffect, useState } from "react"

interface ConfigMap {
  [key: string]: string | number | boolean | null
}

export type ConfigState = {
  config: ConfigMap
  loaded: boolean
  error: string | null
}

// ponytail: module-level cache deduplicates fetches across all consumers
const TTL = 60_000
let cache: { data: ConfigMap; ts: number } | null = null
let inflight: Promise<void> | null = null

function fresh(): boolean {
  return cache !== null && Date.now() - cache.ts < TTL
}

export function useConfig(): ConfigState {
  const [config, setConfig] = useState<ConfigMap>(fresh() ? cache!.data : {})
  const [loaded, setLoaded] = useState(fresh())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (fresh()) return

    let cancelled = false

    async function load() {
      if (inflight) {
        await inflight
        if (!cancelled) {
          if (cache) setConfig(cache.data)
          setLoaded(true)
        }
        return
      }

      inflight = (async () => {
        try {
          const res = await fetch("/api/config")
          const d = await res.json()
          if (d.success && Array.isArray(d.data)) {
            const map: ConfigMap = {}
            for (const item of d.data) {
              map[item.key] = item.value
            }
            cache = { data: map, ts: Date.now() }
            if (!cancelled) setConfig(map)
          }
        } catch (e: unknown) {
          if (cache && !fresh()) cache = null
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load config")
          }
        } finally {
          inflight = null
          if (!cancelled) setLoaded(true)
        }
      })()

      await inflight
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { config, loaded, error }
}
