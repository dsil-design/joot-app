'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface GlobalActionContextType {
  isActionInProgress: boolean
  activeActions: Set<string>
  startAction: (actionId: string) => void
  endAction: (actionId: string) => void
  withGlobalAction: <T>(actionId: string, asyncFn: () => Promise<T>) => Promise<T>
}

const GlobalActionContext = createContext<GlobalActionContextType | null>(null)

export const useGlobalAction = () => {
  const context = useContext(GlobalActionContext)
  if (!context) {
    throw new Error('useGlobalAction must be used within a GlobalActionProvider')
  }
  return context
}

interface GlobalActionProviderProps {
  children: React.ReactNode
}

export const GlobalActionProvider: React.FC<GlobalActionProviderProps> = ({ children }) => {
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set())
  
  const isActionInProgress = activeActions.size > 0

  const startAction = useCallback((actionId: string) => {
    setActiveActions(prev => new Set(prev).add(actionId))
  }, [])

  const endAction = useCallback((actionId: string) => {
    setActiveActions(prev => {
      const next = new Set(prev)
      next.delete(actionId)
      return next
    })
  }, [])

  const withGlobalAction = useCallback(async <T,>(
    actionId: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startAction(actionId)
      const result = await asyncFn()
      return result
    } catch (error) {
      throw error
    } finally {
      endAction(actionId)
    }
  }, [startAction, endAction])

  const value: GlobalActionContextType = {
    isActionInProgress,
    activeActions,
    startAction,
    endAction,
    withGlobalAction,
  }

  return (
    <GlobalActionContext.Provider value={value}>
      {children}
    </GlobalActionContext.Provider>
  )
}
