import { unwrapApiList } from '../lib/unwrapApiList'
import { normalizePatente } from '../lib/normalizePatente'
import { clienteService } from './clienteService'
import { vehiculoService } from './vehiculoService'

function clienteNombre(veh) {
  const c = veh?.clientes
  if (Array.isArray(c)) return c[0]?.nombre || ''
  return c?.nombre || ''
}

function mergeVehiculo(existing, incoming) {
  if (!existing) return incoming
  return {
    ...existing,
    ...incoming,
    clientes: incoming.clientes || existing.clientes,
  }
}

function dedupeVehiculos(list) {
  const byKey = new Map()
  for (const v of list) {
    if (!v) continue
    const key = v.id || normalizePatente(v.patente)
    if (!key) continue
    byKey.set(key, mergeVehiculo(byKey.get(key), v))
  }
  return [...byKey.values()].sort((a, b) => {
    const pa = normalizePatente(a.patente)
    const pb = normalizePatente(b.patente)
    return pa.localeCompare(pb, 'es')
  })
}

export async function fetchTodosLosVehiculos({ limite = 200 } = {}) {
  try {
    const data = await vehiculoService.listar({ limite })
    const list = unwrapApiList(data, ['vehiculos'])
    if (list.length) return dedupeVehiculos(list)
  } catch (e) {
    if (e?.status !== 404 && e?.status !== 405) throw e
  }

  const clientes = unwrapApiList(await clienteService.listar({ limite: 100 }), ['clientes'])
  const batches = await Promise.all(
    clientes.map(async (cliente) => {
      try {
        const raw = await vehiculoService.listarPorCliente(cliente.id)
        const vehs = unwrapApiList(raw, ['vehiculos'])
        return vehs.map((v) => ({
          ...v,
          clientes: v.clientes || cliente,
          cliente_id: v.cliente_id || cliente.id,
        }))
      } catch {
        return []
      }
    }),
  )

  return dedupeVehiculos(batches.flat())
}

export function filtrarVehiculos(vehiculos, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return vehiculos
  return vehiculos.filter((v) => {
    const patente = normalizePatente(v.patente).toLowerCase()
    const marca = String(v.marca || '').toLowerCase()
    const modelo = String(v.modelo || '').toLowerCase()
    const vin = String(v.vin || '').toLowerCase()
    const color = String(v.color || '').toLowerCase()
    const cliente = clienteNombre(v).toLowerCase()
    return (
      patente.includes(q) ||
      marca.includes(q) ||
      modelo.includes(q) ||
      vin.includes(q) ||
      color.includes(q) ||
      cliente.includes(q)
    )
  })
}
