import { createContext, useContext } from 'react'

// ID of the page that will receive the dragged item as a child (cross-parent drop)
export const NestTargetContext = createContext<string | null>(null)

export function useNestTarget() {
  return useContext(NestTargetContext)
}
