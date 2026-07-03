// ponytail: simple fetch-once config hook, no caching lib needed
"use client"

import { useEffect, useState } from "react"

interface ConfigMap {
  [key: string]: string | number | boolean | null
}

export function useConfig() {
  const [config, setConfig] = useState<ConfigMap>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          const map: ConfigMap = {}
          for (const item of d.data) {
            map[item.key] = item.value
          }
          setConfig(map)
        }
      })
      .catch(() => {}) // silent fail, use defaults
      .finally(() => setLoaded(true))
  }, [])

  return { config, loaded }
}
