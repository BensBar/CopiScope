import { useState, useCallback } from 'react'

export interface DrillDownState {
  isOpen: boolean
  title: string
  content: React.ReactNode
}

export function useDrillDown() {
  const [state, setState] = useState<DrillDownState>({ isOpen: false, title: '', content: null })

  const open = useCallback((title: string, content: React.ReactNode) => {
    setState({ isOpen: true, title, content })
  }, [])

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }))
  }, [])

  return { ...state, open, close }
}
