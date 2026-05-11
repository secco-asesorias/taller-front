import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FormContext = createContext(null)

const SESSION_KEY = 'secco_acta_draft'

// Campos que no se pueden serializar (File objects) — se excluyen del sessionStorage
const SKIP_FIELDS = new Set(['foto_km', 'foto_combustible'])

function initialState() {
  const now = new Date()
  return {
    // Sección 1
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    // Sección 2
    marca: '',
    modelo: '',
    anio: '',
    patente: '',
    vin: '',
    color: '',
    // Sección 3
    fecha_ingreso: now.toISOString().slice(0, 10),
    hora_ingreso: now.toTimeString().slice(0, 5),
    kilometraje: '',
    foto_km: null,
    foto_km_preview: null,
    combustible: '',
    foto_combustible: null,
    foto_combustible_preview: null,
    llaves: '',
    documentacion: [],
    documentacion_otros: '',
    // Sección 4
    estado_exterior: '',
    detalle_exterior: '',
    fotos: {},
    estado_interior: '',
    detalle_interior: '',
    // Sección 5
    trabajo_solicitado: '',
    presupuesto_inicial_id: null,
    // Sección 6
    acepta_declaracion: false,
    acepta_responsabilidad_objetos: false,
    acepta_pruebas_ruta: false,
    nombre_cliente: '',
    firma_cliente: null,
    fecha_firma_cliente: now.toISOString().slice(0, 10),
    // Sección 7
    nombre_responsable: '',
    cargo_responsable: '',
    firma_secco: null,
    fecha_firma_secco: now.toISOString().slice(0, 10),
    // IDs y metadatos Supabase
    acta_id: null,
    numero_acta: null,
    cliente_id: null,
    vehiculo_id: null,
  }
}

function restaurarDesdeSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    // Solo restaurar si hay datos significativos (no solo el estado inicial vacío)
    if (parsed.nombre || parsed.patente || parsed.acta_id) {
      return { ...initialState(), ...parsed }
    }
  } catch {}
  return null
}

/**
 * Mapeo puro GET /api/actas/:id → estado del formulario (mismo criterio que `cargarDesdeActa`).
 * Sirve para calcular el paso inicial sin depender del estado React recién actualizado.
 */
export function mergeActaIntoInitialForm(acta) {
  if (!acta?.id) return initialState()
  const cliente = acta.clientes
  const vehiculo = acta.vehiculos
  const fotosActa = Array.isArray(acta.fotos_acta) ? acta.fotos_acta : []
  const fotoPorTipo = Object.fromEntries(
    fotosActa
      .filter((f) => f?.tipo && f?.url)
      .map((f) => [String(f.tipo).toLowerCase().trim(), String(f.url)])
  )
  const now = new Date()
  return {
    ...initialState(),
    nombre: cliente?.nombre || '',
    rut: cliente?.rut || '',
    telefono: cliente?.telefono || '',
    email: cliente?.email || '',
    nombre_cliente: acta.nombre_cliente || cliente?.nombre || '',
    marca: vehiculo?.marca || '',
    modelo: vehiculo?.modelo || '',
    anio: vehiculo?.anio || '',
    patente: vehiculo?.patente || '',
    vin: vehiculo?.vin || '',
    color: vehiculo?.color || '',
    acta_id: acta.id,
    numero_acta: acta.numero_acta,
    cliente_id: acta.cliente_id,
    vehiculo_id: acta.vehiculo_id,
    fecha_ingreso: acta.fecha_ingreso || now.toISOString().slice(0, 10),
    hora_ingreso: acta.hora_ingreso?.slice(0, 5) || now.toTimeString().slice(0, 5),
    kilometraje: acta.km === undefined || acta.km === null ? '' : String(acta.km),
    combustible: acta.combustible || '',
    llaves: acta.llaves === undefined || acta.llaves === null ? '' : Number(acta.llaves),
    documentacion: Array.isArray(acta.documentacion) ? acta.documentacion : (acta.documentacion ? [acta.documentacion] : []),
    documentacion_otros: acta.documentacion_otros || '',
    foto_km_preview: fotoPorTipo.km || null,
    foto_combustible_preview: fotoPorTipo.combustible || null,
    estado_exterior: acta.estado_exterior || '',
    detalle_exterior: acta.detalle_exterior || '',
    estado_interior: acta.estado_interior || '',
    detalle_interior: acta.detalle_interior || '',
    fotos: {
      ...(fotoPorTipo.frontal ? { frontal: fotoPorTipo.frontal } : {}),
      ...(fotoPorTipo.trasera ? { trasera: fotoPorTipo.trasera } : {}),
      ...(fotoPorTipo.lateral_izq ? { lateral_izq: fotoPorTipo.lateral_izq } : {}),
      ...(fotoPorTipo.lateral_der ? { lateral_der: fotoPorTipo.lateral_der } : {}),
      ...(fotoPorTipo.interior ? { interior: [{ id: 'interior-0', preview: fotoPorTipo.interior }] } : {}),
    },
    trabajo_solicitado: acta.trabajo_solicitado || '',
    presupuesto_inicial_id: acta.presupuesto_inicial_id || null,
    acepta_declaracion: !!acta.acepta_declaracion,
    acepta_responsabilidad_objetos: !!acta.acepta_responsabilidad_objetos,
    acepta_pruebas_ruta: !!acta.acepta_pruebas_ruta,
    firma_cliente: fotoPorTipo.firma_cliente || acta.firma_cliente_url || null,
    firma_secco: fotoPorTipo.firma_secco || acta.firma_secco_url || null,
    nombre_responsable: acta.nombre_responsable || acta.tecnico_nombre || acta.tc_nombre || '',
    cargo_responsable: acta.cargo_responsable || '',
  }
}

export function FormProvider({ children, restore = true }) {
  const [formData, setFormData] = useState(() => (restore ? (restaurarDesdeSession() || initialState()) : initialState()))

  // Sincronizar al sessionStorage en cada cambio (excepto campos no serializables)
  useEffect(() => {
    if (!restore) return
    try {
      const toSave = Object.fromEntries(
        Object.entries(formData).filter(([k]) => !SKIP_FIELDS.has(k))
      )
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave))
    } catch {}
  }, [formData, restore])

  const updateForm = useCallback((campos) => {
    setFormData((prev) => ({ ...prev, ...campos }))
  }, [])

  const resetForm = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    setFormData(initialState())
  }, [])

  // Carga datos desde un acta borrador de Supabase
  const cargarDesdeActa = useCallback((acta) => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    setFormData(mergeActaIntoInitialForm(acta))
  }, [])

  return (
    <FormContext.Provider value={{ formData, updateForm, resetForm, cargarDesdeActa }}>
      {children}
    </FormContext.Provider>
  )
}

export function useForm() {
  const ctx = useContext(FormContext)
  if (!ctx) throw new Error('useForm debe usarse dentro de FormProvider')
  return ctx
}
