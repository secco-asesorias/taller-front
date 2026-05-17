import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { normalizePatente, isPatenteAbrible } from '../lib/normalizePatente'
import VehiculoPanelDrawer from '../components/vehiculo/VehiculoPanelDrawer'

const VehiculoPanelContext = createContext(null)

export function VehiculoPanelProvider({ children }) {
  const [patente, setPatente] = useState(null)

  const openVehiculoPanel = useCallback((value) => {
    if (!isPatenteAbrible(value)) return
    setPatente(normalizePatente(value))
  }, [])

  const closeVehiculoPanel = useCallback(() => {
    setPatente(null)
  }, [])

  const value = useMemo(
    () => ({ patente, openVehiculoPanel, closeVehiculoPanel, isOpen: Boolean(patente) }),
    [patente, openVehiculoPanel, closeVehiculoPanel],
  )

  return (
    <VehiculoPanelContext.Provider value={value}>
      {children}
      <VehiculoPanelDrawer patente={patente} onClose={closeVehiculoPanel} />
    </VehiculoPanelContext.Provider>
  )
}

export function useVehiculoPanel() {
  const ctx = useContext(VehiculoPanelContext)
  if (!ctx) {
    throw new Error('useVehiculoPanel debe usarse dentro de VehiculoPanelProvider')
  }
  return ctx
}

/** Versión segura para componentes que pueden renderizarse fuera del provider. */
export function useVehiculoPanelOptional() {
  return useContext(VehiculoPanelContext)
}
