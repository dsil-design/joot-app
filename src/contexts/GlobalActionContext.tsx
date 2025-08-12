'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

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
  const [navigationPending, setNavigationPending] = useState(false)
  
  const isActionInProgress = activeActions.size > 0 || navigationPending

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

  // Listen for navigation events to clear the navigation pending state
  useEffect(() => {
    // Listen for page visibility change (when user navigates away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden (likely navigating away)
        // Don't change navigationPending here - let it stay true
      } else if (document.visibilityState === 'visible') {
        // Page became visible again - clear all states
        setNavigationPending(false)
        // Clear all active actions when returning to a page
        setActiveActions(new Set())
      }
    }

    // Listen for beforeunload to detect navigation attempts
    const handleBeforeUnload = () => {
      // Don't change state here - we want to maintain disabled state
      // during the navigation process
    }

    // Listen for pagehide event which fires when navigating away
    const handlePageHide = () => {
      // Page is being unloaded - maintain disabled state
      // Don't clear anything here
    }

    // Listen for pageshow event which fires when page becomes visible
    const handlePageShow = () => {
      // Clear states when page is shown (including back/forward navigation)
      setNavigationPending(false)
      setActiveActions(new Set())
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  const withGlobalAction = useCallback(async <T,>(
    actionId: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startAction(actionId)
      const result = await asyncFn()
      
      // Check if the action might have triggered a navigation
      // by looking for common navigation patterns
      const isLikelyNavigation = actionId.includes('login') || 
                                actionId.includes('signup') || 
                                actionId.includes('logout') ||
                                actionId.includes('demo-login')
      
      if (isLikelyNavigation) {
        // Set navigation pending to maintain disabled state
        setNavigationPending(true)
        
        // For navigation actions, NEVER end the action in the finally block
        // The action will only be cleared by navigation events or fallback timeout
        setTimeout(() => {
          setNavigationPending(false)
          endAction(actionId)
        }, 5000) // 5 second fallback - longer to ensure navigation completes
        
        return result
      }
      
      return result
    } catch (error) {
      // On error, clear navigation pending since we're staying on the page
      setNavigationPending(false)
      
      // Check if it was a navigation action that failed
      const isLikelyNavigation = actionId.includes('login') || 
                                actionId.includes('signup') || 
                                actionId.includes('logout') ||
                                actionId.includes('demo-login')
      
      if (isLikelyNavigation) {
        // End the action immediately on navigation failure
        endAction(actionId)
      }
      
      throw error
    } finally {
      // Only end the action immediately if it's NOT a navigation action
      const isLikelyNavigation = actionId.includes('login') || 
                                actionId.includes('signup') || 
                                actionId.includes('logout') ||
                                actionId.includes('demo-login')
      
      if (!isLikelyNavigation) {
        endAction(actionId)
      }
      // For navigation actions, do NOT call endAction here at all
      // It will be handled by the timeout or navigation events
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
