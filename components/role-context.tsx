'use client'
import { createContext, useContext, useState } from 'react'
export type DemoRole = 'App Owner' | 'App Admin' | 'Super Admin' | 'End User'
const RoleContext = createContext<{ role: DemoRole; setRole: (role: DemoRole) => void }>({
  role: 'Super Admin',
  setRole: () => {},
})
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<DemoRole>('Super Admin')
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>
}
export const useRole = () => useContext(RoleContext)
