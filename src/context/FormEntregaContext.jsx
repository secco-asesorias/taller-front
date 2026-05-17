import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FormEntregaContext = createContext(null)

const SESSION_KEY = 'secco_acta_entrega_draft'
const SKIP_FIELDS = new Set(['foto_km', 'foto_combustible'])

function initialState() {
  const now = new Date()
  return {
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    marca: '',
    modelo: '',
    anio: '',
    patente: '',
    vin: '',
    color: '',
    fecha_entrega: now.toISOString().slice(0, 10),
    hora_entrega: now.toTimeString().slice(0, 5),
    kilometraje: '',
    foto_km: null,
    foto_km_preview: null,
    combustible: '',
    foto_combustible: null,
    foto_combustible_preview: null,
    llaves: '',
    documentacion: [],
    documentacion_otros: '',
    estado_exterior: '',
    detalle_exterior: '',
    fotos: {},
    estado_interior: '',
    detalle_interior: '',
    trabajo_realizado: '',
    acepta_declaracion: false,
    acepta_responsabilidad_objetos: false,
    acepta_pruebas_ruta: false,
    nombre_cliente: '',
    firma_cliente: null,
    fecha_firma_cliente: now.toISOString().slice(0, 10),
    nombre_responsable: '',
    cargo_responsable: '',
    firma_secco: null,
    fecha_firma_secco: now.toISOString().slice(0, 10),
    acta_entrega_id: null,
    numero_acta_entrega: null,
    cliente_id: null,
    vehiculo_id: null,
    seleccion_confirmada: false,
    trabajo_origen_key: '',
    trabajo_origen_tipo: '',
    trabajo_origen_ref_id: null,
    firma_cliente_key: '',
    firma_secco_key: '',
  }
}

function restaurarDesdeSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (parsed.nombre || parsed.patente || parsed.acta_entrega_id) {
      return { ...initialState(), ...parsed }
    }
  } catch { /* ignore */ }
  return null
}

export function mergeActaEntregaIntoInitialForm(acta) {
  if (!acta?.id) return initialState()
  const cliente = acta.clientes
  const vehiculo = acta.vehiculos
  const fotosActa = Array.isArray(acta.fotos_acta) ? acta.fotos_acta : []
  const fotoPorTipo = Object.fromEntries(
    fotosActa
      .filter((f) => f?.tipo && f?.url)
      .map((f) => [String(f.tipo).toLowerCase().trim(), String(f.url)]),
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
    acta_entrega_id: acta.id,
    numero_acta_entrega: acta.numero_acta_entrega ?? acta.numero_acta ?? null,
    cliente_id: acta.cliente_id,
    vehiculo_id: acta.vehiculo_id,
    fecha_entrega: acta.fecha_entrega || acta.fecha_ingreso || now.toISOString().slice(0, 10),
    hora_entrega: acta.hora_entrega?.slice?.(0, 5) || acta.hora_ingreso?.slice?.(0, 5) || now.toTimeString().slice(0, 5),
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
    trabajo_realizado: acta.trabajo_realizado || acta.trabajo_solicitado || '',
    acepta_declaracion: !!acta.acepta_declaracion,
    acepta_responsabilidad_objetos: !!acta.acepta_responsabilidad_objetos,
    acepta_pruebas_ruta: !!acta.acepta_pruebas_ruta,
    firma_cliente: fotoPorTipo.firma_cliente || acta.firma_cliente_url || null,
    firma_secco: fotoPorTipo.firma_secco || acta.firma_secco_url || null,
    nombre_responsable: acta.nombre_responsable || acta.tecnico_nombre || acta.tc_nombre || '',
    cargo_responsable: acta.cargo_responsable || '',
    seleccion_confirmada: !!(acta.cliente_id && acta.vehiculo_id && (acta.trabajo_realizado || acta.trabajo_solicitado)),
  }
}

export function FormEntregaProvider({ children, restore = true }) {
  const [formData, setFormData] = useState(() => (restore ? (restaurarDesdeSession() || initialState()) : initialState()))

  useEffect(() => {
    if (!restore) return
    try {
      const toSave = Object.fromEntries(
        Object.entries(formData).filter(([k]) => !SKIP_FIELDS.has(k)),
      )
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave))
    } catch { /* ignore */ }
  }, [formData, restore])

  const updateForm = useCallback((campos) => {
    setFormData((prev) => ({ ...prev, ...campos }))
  }, [])

  const resetForm = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setFormData(initialState())
  }, [])

  const cargarDesdeActa = useCallback((acta) => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setFormData(mergeActaEntregaIntoInitialForm(acta))
  }, [])

  return (
    <FormEntregaContext.Provider value={{ formData, updateForm, resetForm, cargarDesdeActa }}>
      {children}
    </FormEntregaContext.Provider>
  )
}

export function useFormEntrega() {
  const ctx = useContext(FormEntregaContext)
  if (!ctx) throw new Error('useFormEntrega debe usarse dentro de FormEntregaProvider')
  return ctx
}
