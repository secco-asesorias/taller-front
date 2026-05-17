import { normalizePatente } from '../lib/normalizePatente'
import { unwrapApiList } from '../lib/unwrapApiList'
import { vehiculoService } from '../services/vehiculoService'
import { actaService } from '../services/actaService'
import { cotizacionService } from '../services/cotizacionService'
import { ordenTrabajoService } from '../services/ordenTrabajoService'
import { actaEntregaService } from '../services/actaEntregaService'

function firmasDesdeActa(acta, prefijo = '') {
  if (!acta) return { firmaCliente: null, firmaSecco: null }
  const fotos = Array.isArray(acta.fotos_acta) ? acta.fotos_acta : []
  const porTipo = Object.fromEntries(
    fotos.filter((f) => f?.tipo && f?.url).map((f) => [String(f.tipo).toLowerCase(), f.url]),
  )
  return {
    firmaCliente: porTipo.firma_cliente || acta.firma_cliente_url || acta.firma_cliente || null,
    firmaSecco: porTipo.firma_secco || acta.firma_secco_url || acta.firma_secco || null,
  }
}

function textoTrabajoDesdeOt(ot) {
  if (!ot) return ''
  const lineas = Array.isArray(ot.instrucciones)
    ? ot.instrucciones
      .map((ins) => String(ins?.texto || ins?.descripcion || '').trim())
      .filter(Boolean)
    : []
  if (lineas.length) return lineas.map((t) => `• ${t}`).join('\n')
  const fallback = String(ot.descripcion || ot.trabajo || ot.observaciones || '').trim()
  if (fallback) return fallback
  return `Orden de trabajo #${ot.numero_ot || '—'}`
}

function textoTrabajoDesdeCot(cot) {
  const items = Array.isArray(cot.items) ? cot.items : []
  const lineas = items
    .map((it) => String(it.descripcion || '').trim())
    .filter(Boolean)
    .map((d) => `• ${d}`)
  if (lineas.length) return lineas.join('\n')
  const titulo = cot.vista_cliente?.titulo || cot.titulo
  if (titulo) return String(titulo)
  return `Cotización #${cot.numero_cotizacion || '—'}`
}

function textoTrabajoDesdeActaIngreso(acta) {
  const t = String(acta.trabajo_solicitado || acta.trabajo_realizado || '').trim()
  if (t) return t
  return `Acta de ingreso #${acta.numero_acta || '—'}`
}

function uniqById(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

/**
 * Carga vehículo, clientes vinculados y opciones de trabajo/firmas ya existentes en el taller.
 */
export async function cargarContextoEntregaPorPatente(patente) {
  const patenteNorm = normalizePatente(patente)
  if (!patenteNorm) throw new Error('Ingresa una patente válida')

  const [vehRes, actasRes, cotsRes, otsRes, entregasRes] = await Promise.allSettled([
    vehiculoService.buscarPorPatente(patenteNorm),
    actaService.buscarPorPatente(patenteNorm, { limite: 25 }),
    cotizacionService.buscarPorPatente(patenteNorm, { limite: 25 }),
    ordenTrabajoService.listar({ limite: 120 }),
    actaEntregaService.buscarPorPatente(patenteNorm, { limite: 15 }),
  ])

  if (vehRes.status === 'rejected') {
    const err = vehRes.reason
    if (err?.status === 404) {
      throw new Error('No hay un vehículo registrado con esa patente. Regístralo primero en Clientes o en un acta de ingreso.')
    }
    throw new Error(err?.message || 'No se pudo buscar el vehículo')
  }

  const vehiculo = vehRes.value
  const clientesRaw = vehiculo?.clientes
  const clientes = Array.isArray(clientesRaw)
    ? clientesRaw
    : clientesRaw?.id
      ? [clientesRaw]
      : vehiculo?.cliente_id
        ? [{ id: vehiculo.cliente_id, nombre: vehiculo.cliente_nombre }]
        : []

  const actasIngreso = actasRes.status === 'fulfilled'
    ? unwrapApiList(actasRes.value, ['actas'])
    : []
  const cotizaciones = cotsRes.status === 'fulfilled'
    ? unwrapApiList(cotsRes.value, ['cotizaciones'])
    : []
  const otsTodas = otsRes.status === 'fulfilled'
    ? unwrapApiList(otsRes.value, ['ordenes', 'ordenes_trabajo'])
    : []
  const ots = otsTodas.filter((ot) => normalizePatente(ot.vehiculos?.patente) === patenteNorm)
  const entregasPrevias = entregasRes.status === 'fulfilled'
    ? unwrapApiList(entregasRes.value, ['actas_entrega', 'actas'])
    : []

  const trabajos = []

  for (const ot of ots) {
    const texto = textoTrabajoDesdeOt(ot)
    if (!texto) continue
    trabajos.push({
      id: `ot-${ot.id}`,
      tipo: 'ot',
      refId: ot.id,
      label: `OT #${ot.numero_ot || '—'} · ${ot.status || ''}`.trim(),
      texto,
    })
  }

  for (const cot of cotizaciones) {
    const texto = textoTrabajoDesdeCot(cot)
    if (!texto) continue
    trabajos.push({
      id: `cot-${cot.id}`,
      tipo: 'cotizacion',
      refId: cot.id,
      label: `Cotización #${cot.numero_cotizacion || '—'} · ${cot.status || ''}`.trim(),
      texto,
    })
  }

  for (const acta of actasIngreso) {
    const texto = textoTrabajoDesdeActaIngreso(acta)
    if (!texto) continue
    trabajos.push({
      id: `acta-${acta.id}`,
      tipo: 'acta_ingreso',
      refId: acta.id,
      label: `Acta ingreso #${acta.numero_acta || '—'} · ${acta.status || ''}`.trim(),
      texto,
    })
  }

  const firmasCliente = []
  const firmasSecco = []

  for (const acta of actasIngreso) {
    const { firmaCliente, firmaSecco } = firmasDesdeActa(acta)
    if (firmaCliente) {
      firmasCliente.push({
        id: `ingreso-fc-${acta.id}`,
        origen: 'acta_ingreso',
        actaId: acta.id,
        label: `Firma cliente — Acta ingreso #${acta.numero_acta || '—'}`,
        preview: firmaCliente,
        nombre: acta.nombre_cliente || acta.clientes?.nombre || '',
      })
    }
    if (firmaSecco) {
      firmasSecco.push({
        id: `ingreso-fs-${acta.id}`,
        origen: 'acta_ingreso',
        actaId: acta.id,
        label: `Firma SECCO — Acta ingreso #${acta.numero_acta || '—'}`,
        preview: firmaSecco,
        nombre: acta.nombre_responsable || acta.tecnico_nombre || acta.tc_nombre || '',
        cargo: acta.cargo_responsable || '',
      })
    }
  }

  for (const ent of entregasPrevias) {
    const { firmaCliente, firmaSecco } = firmasDesdeActa(ent)
    const num = ent.numero_acta_entrega ?? ent.numero_acta
    if (firmaCliente) {
      firmasCliente.push({
        id: `ent-fc-${ent.id}`,
        origen: 'acta_entrega',
        actaId: ent.id,
        label: `Firma cliente — Entrega #${num || '—'}`,
        preview: firmaCliente,
        nombre: ent.nombre_cliente || ent.clientes?.nombre || '',
      })
    }
    if (firmaSecco) {
      firmasSecco.push({
        id: `ent-fs-${ent.id}`,
        origen: 'acta_entrega',
        actaId: ent.id,
        label: `Firma SECCO — Entrega #${num || '—'}`,
        preview: firmaSecco,
        nombre: ent.nombre_responsable || ent.tecnico_nombre || '',
        cargo: ent.cargo_responsable || '',
      })
    }
  }

  return {
    patente: patenteNorm,
    vehiculo,
    clientes: uniqById(clientes.filter((c) => c?.id)),
    actasIngreso,
    cotizaciones,
    ots,
    entregasPrevias,
    trabajos: uniqById(trabajos),
    firmasCliente: uniqById(firmasCliente),
    firmasSecco: uniqById(firmasSecco),
  }
}

export function aplicarVehiculoYClienteAlForm(updateForm, vehiculo, cliente) {
  if (!vehiculo || !cliente) return
  updateForm({
    vehiculo_id: vehiculo.id,
    cliente_id: cliente.id,
    patente: vehiculo.patente || '',
    marca: vehiculo.marca || '',
    modelo: vehiculo.modelo || '',
    anio: vehiculo.anio != null ? String(vehiculo.anio) : '',
    vin: vehiculo.vin || '',
    color: vehiculo.color || '',
    nombre: cliente.nombre || '',
    rut: cliente.rut || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    nombre_cliente: cliente.nombre || '',
  })
}
