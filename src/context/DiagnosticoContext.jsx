import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const DiagnosticoContext = createContext(null)

const SESSION_KEY = 'secco_diagnostico_draft'

function initialState() {
  return {
    diagnostico_id: null,
    numero_diagnostico: null,
    acta_id: null,
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    vin: '',
    kilometraje: '',
    nombre_cliente: '',
    trabajo_solicitado: '',
    fecha_ingreso: '',
    tecnico_asignado: '',
    tipo_mantencion: null,
    horas_estimadas: '',
    observaciones_generales: '',
    status: 'pendiente',
    checklist: {},
    fotos: {},
    repuestos: [],
  }
}

function restaurarDesdeSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (parsed.diagnostico_id) {
      return { ...initialState(), ...parsed }
    }
  } catch {}
  return null
}

export function DiagnosticoProvider({ children }) {
  const [diagnosticoData, setDiagnosticoData] = useState(() => restaurarDesdeSession() || initialState())

  // Sincronizar al sessionStorage en cada cambio
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(diagnosticoData))
    } catch {}
  }, [diagnosticoData])

  const updateDiagnostico = useCallback((campos) => {
    setDiagnosticoData((prev) => ({ ...prev, ...campos }))
  }, [])

  const resetDiagnostico = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    setDiagnosticoData(initialState())
  }, [])

  const cargarDesdeDiagnostico = useCallback((diagnostico) => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    const acta = diagnostico.actas || {}
    const vehiculo = acta.vehiculos || {}
    const cliente = acta.clientes || {}

    const checklist = {}
    for (const row of diagnostico.diagnostico_checklist || []) {
      checklist[`${row.seccion}_${row.item}`] = {
        estado: row.estado || 'ok',
        observacion: row.observacion || '',
        item: row.item,
        seccion: row.seccion,
      }
    }

    const fotos = {}
    for (const foto of diagnostico.diagnostico_fotos || []) {
      const key = foto.item ? `${foto.seccion}_${foto.item}` : String(foto.seccion)
      fotos[key] = [...(fotos[key] || []), {
        id: foto.id,
        url: foto.url,
        item: foto.item || null,
        descripcion: foto.descripcion || '',
        orden: foto.orden || 0,
      }]
    }

    Object.keys(fotos).forEach((key) => {
      fotos[key].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    })

    setDiagnosticoData({
      ...initialState(),
      diagnostico_id: diagnostico.id,
      numero_diagnostico: diagnostico.numero_diagnostico,
      acta_id: diagnostico.acta_id,
      patente: vehiculo.patente || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || '',
      color: vehiculo.color || '',
      vin: vehiculo.vin || '',
      kilometraje: acta.km || '',
      nombre_cliente: cliente.nombre || '',
      trabajo_solicitado: acta.trabajo_solicitado || '',
      fecha_ingreso: acta.fecha_ingreso || '',
      tecnico_asignado: diagnostico.tecnico_asignado || acta.tecnico_nombre || '',
      tipo_mantencion: diagnostico.tipo_mantencion || null,
      horas_estimadas: diagnostico.horas_estimadas || '',
      observaciones_generales: diagnostico.observaciones_generales || '',
      status: diagnostico.status || 'pendiente',
      checklist,
      fotos,
      repuestos: (diagnostico.diagnostico_repuestos || []).map((r) => ({
        nombre: r.nombre || '',
        cantidad: r.cantidad || 1,
        es_base: !!r.es_base,
        urgencia: r.urgencia || 'recomendado',
        observacion: r.observacion || '',
      })),
    })
  }, [])

  return (
    <DiagnosticoContext.Provider value={{ diagnosticoData, updateDiagnostico, resetDiagnostico, cargarDesdeDiagnostico }}>
      {children}
    </DiagnosticoContext.Provider>
  )
}

export function useDiagnostico() {
  const ctx = useContext(DiagnosticoContext)
  if (!ctx) throw new Error('useDiagnostico debe usarse dentro de DiagnosticoProvider')
  return ctx
}
