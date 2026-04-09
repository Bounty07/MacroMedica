// C:/Users/MonPc/Downloads/MMFR/src/context/RoleContext.tsx
import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'

export type Role = 'admin' | 'medecin' | 'secretaire' | 'assistant'

export type User = {
  name: string
  initials: string
  role: Role
  roleLabel: string
}

export const USERS: Record<Role, User> = {
  admin: {
    name: 'Othmane Touggani',
    initials: 'OT',
    role: 'admin',
    roleLabel: 'Administrateur',
  },
  medecin: {
    name: 'Dr Salma Idrissi',
    initials: 'SI',
    role: 'medecin',
    roleLabel: 'Medecin',
  },
  secretaire: {
    name: 'Nadia Bennani',
    initials: 'NB',
    role: 'secretaire',
    roleLabel: 'Secretaire',
  },
  assistant: {
    name: 'Youssef Amrani',
    initials: 'YA',
    role: 'assistant',
    roleLabel: 'Assistant',
  },
}

type RoleContextValue = {
  user: User
  setRole: (role: Role) => void
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('admin')

  return (
    <RoleContext.Provider
      value={{
        user: USERS[role],
        setRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)

  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }

  return context
}
