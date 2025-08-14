"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname()

  const pageVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.98 
    },
    in: { 
      opacity: 1, 
      y: 0,
      scale: 1 
    },
    out: { 
      opacity: 0, 
      y: -20,
      scale: 1.02 
    }
  }

  const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const, 
    duration: 0.4
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}