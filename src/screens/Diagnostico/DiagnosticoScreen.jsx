import { useEffect, useState } from 'react'
import { DiagnosticoProvider, useDiagnostico } from '../../context/DiagnosticoContext'
import { diagnosticoService } from '../../services/diagnosticoService'
import DiagnosticoForm from './DiagnosticoForm'

// Loader interno: carga el diagnóstico y lo inyecta en el contexto
function DiagnosticoLoader({ diagnosticoId, onVolver }) {
  const { cargarDesdeDiagnostico } = useDiagnostico()
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
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: '#FF453A', fontSize: 14, marginBottom: 16 }}>⚠ {error}</p>
        <button className="s-btn-secondary" onClick={onVolver}>Volver</button>
      </div>
    )
  }

  if (!listo) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando diagnóstico...</p>
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
