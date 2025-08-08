'use client'

import React from 'react'
import { GlobalActionProvider, useGlobalAction } from '@/contexts/GlobalActionContext'
import { ActionFieldset } from '@/components/ui/action-fieldset'

interface GlobalActionWrapperProps {
  children: React.ReactNode
}

/**
 * Internal wrapper component that consumes the GlobalActionContext
 * and wraps children in an ActionFieldset that responds to global action state
 */
const GlobalActionWrapperInner: React.FC<GlobalActionWrapperProps> = ({ children }) => {
  const { isActionInProgress } = useGlobalAction()
  
  return (
    <ActionFieldset disabled={isActionInProgress}>
      {children}
    </ActionFieldset>
  )
}

/**
 * GlobalActionWrapper - Provides global action state management and automatic
 * disabling of all interactive elements when any action is in progress.
 * 
 * This component should wrap your entire app content to enable global
 * action state management across all pages and components.
 */
export const GlobalActionWrapper: React.FC<GlobalActionWrapperProps> = ({ children }) => {
  return (
    <GlobalActionProvider>
      <GlobalActionWrapperInner>
        {children}
      </GlobalActionWrapperInner>
    </GlobalActionProvider>
  )
}
