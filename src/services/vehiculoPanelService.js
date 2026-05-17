import { vehiculoService } from './vehiculoService'
import { actaService } from './actaService'
import { diagnosticoService } from './diagnosticoService'
import { cotizacionService } from './cotizacionService'
import { ordenTrabajoService } from './ordenTrabajoService'
import { actaEntregaService } from './actaEntregaService'
import { unwrapApiList } from '../lib/unwrapApiList'
import { normalizePatente } from '../lib/normalizePatente'

const LIMITE = 30

function isNotFound(err) {
  return err?.status === 404
}

function clientesFromVehiculo(veh) {
  if (!veh) return []
  const c = veh.clientes
  if (Array.isArray(c)) return c
  if (c && typeof c === 'object' && c.id) return [c]
  return []
}

function filterOtsByPatente(ots, patenteNorm) {
  return ots.filter((ot) => normalizePatente(ot.vehiculos?.patente) === patenteNorm)
}

/**
 * Carga en paralelo todo lo disponible por patente (4–5 requests).
 * OT: sin endpoint por patente — se filtra del listado general.
 */
export async function fetchVehiculoPanelData(patente) {
  const patenteNorm = normalizePatente(patente)
  if (!patenteNorm) {
    throw new Error('Patente no válida')
  }

  const [vehRes, actasRes, borradorRes, entregasRes, borradorEntregaRes, diagsRes, cotsRes, otsRes] = await Promise.allSettled([
    vehiculoService.buscarPorPatente(patenteNorm),
    actaService.buscarPorPatente(patenteNorm, { limite: LIMITE }),
    actaService.buscarBorradorPorPatente(patenteNorm),
    actaEntregaService.buscarPorPatente(patenteNorm, { limite: LIMITE }),
    actaEntregaService.buscarBorradorPorPatente(patenteNorm),
    diagnosticoService.buscarPorPatente(patenteNorm, { limite: LIMITE }),
    cotizacionService.buscarPorPatente(patenteNorm, { limite: LIMITE }),
    ordenTrabajoService.listar({ limite: 100 }),
  ])

  const vehiculo = vehRes.status === 'fulfilled' ? vehRes.value : null
  const vehiculoError = vehRes.status === 'rejected' && !isNotFound(vehRes.reason)
    ? (vehRes.reason?.message || 'Error al cargar vehículo')
    : null

  const actas = actasRes.status === 'fulfilled'
    ? unwrapApiList(actasRes.value, ['actas'])
    : []
  const actasError = actasRes.status === 'rejected' ? (actasRes.reason?.message || 'Error al cargar actas') : null

  let borradorActa = null
  if (borradorRes.status === 'fulfilled') {
    const raw = borradorRes.value
    borradorActa = raw?.acta ?? (raw?.id ? raw : null)
  }

  const actasEntrega = entregasRes.status === 'fulfilled'
    ? unwrapApiList(entregasRes.value, ['actas_entrega', 'actas'])
    : []
  const actasEntregaError = entregasRes.status === 'rejected'
    ? (entregasRes.reason?.message || 'Error al cargar actas de entrega')
    : null

  let borradorEntrega = null
  if (borradorEntregaRes.status === 'fulfilled') {
    const raw = borradorEntregaRes.value
    borradorEntrega = raw?.acta_entrega ?? raw?.acta ?? (raw?.id ? raw : null)
  }

  const diagnosticos = diagsRes.status === 'fulfilled'
    ? unwrapApiList(diagsRes.value, ['diagnosticos'])
    : []
  const diagnosticosError = diagsRes.status === 'rejected'
    ? (diagsRes.reason?.message || 'Error al cargar diagnósticos')
    : null

  const cotizaciones = cotsRes.status === 'fulfilled'
    ? unwrapApiList(cotsRes.value, ['cotizaciones'])
    : []
  const cotizacionesError = cotsRes.status === 'rejected'
    ? (cotsRes.reason?.message || 'Error al cargar cotizaciones')
    : null

  const otsRaw = otsRes.status === 'fulfilled'
    ? unwrapApiList(otsRes.value, ['ordenes', 'ordenes_trabajo'])
    : []
  const ordenes = filterOtsByPatente(otsRaw, patenteNorm)
  const ordenesError = otsRes.status === 'rejected'
    ? (otsRes.reason?.message || 'Error al cargar órdenes de trabajo')
    : null
  const ordenesFiltradoLocal = otsRes.status === 'fulfilled'

  return {
    patente: patenteNorm,
    vehiculo,
    vehiculoNoEncontrado: vehRes.status === 'rejected' && isNotFound(vehRes.reason),
    vehiculoError,
    clientes: clientesFromVehiculo(vehiculo),
    actas,
    actasError,
    borradorActa,
    actasEntrega,
    actasEntregaError,
    borradorEntrega,
    diagnosticos,
    diagnosticosError,
    cotizaciones,
    cotizacionesError,
    ordenes,
    ordenesError,
    ordenesFiltradoLocal,
  }
}
