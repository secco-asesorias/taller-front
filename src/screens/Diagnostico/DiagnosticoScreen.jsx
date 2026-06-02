import { useEffect, useState } from 'react'
import { DiagnosticoProvider, useDiagnostico } from '../../context/DiagnosticoContext'
import { diagnosticoService } from '../../services/diagnosticoService'
import DiagnosticoForm from './DiagnosticoForm'
import { useMobile } from '../../hooks/useMobile'

// Loader interno: carga el diagnóstico y lo inyecta en el contexto
function DiagnosticoLoader({ diagnosticoId, onVolver }) {
  const { cargarDesdeDiagnostico } = useDiagnostico()
  const isMobile = useMobile()
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!diagnosticoId) {
      setError('ID de diagnóstico no especificado')
      return
    }
    diagnosticoService.obtener(diagnosticoId)
      .then((diag) => {
        cargarDesdeDiagnostico(diag)
        setListo(true)
      })
      .catch((err) => setError(err.message || 'Error al cargar diagnóstico'))
  }, [diagnosticoId, cargarDesdeDiagnostico])

  if (error) {
    return (
      <div style={{ padding: isMobile ? '32px 12px' : '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--destructive)', fontSize: 14, marginBottom: 16 }}>⚠ {error}</p>
        <button className="s-btn-secondary" onClick={onVolver}>Volver</button>
      </div>
    )
  }

  if (!listo) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando diagnóstico...</p>
      </div>
    )
  }

  return <DiagnosticoForm onVolver={onVolver} />
}

// Pantalla principal: envuelve con DiagnosticoProvider
export default function DiagnosticoScreen({ diagnosticoId, onVolver }) {
  return (
    <DiagnosticoProvider>
      <DiagnosticoLoader diagnosticoId={diagnosticoId} onVolver={onVolver} />
    </DiagnosticoProvider>
  )
}
