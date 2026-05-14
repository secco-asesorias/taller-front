import { resumenFinanciero } from './pdfPresupuesto'

function n(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function fechaDdMmYyyy(d = new Date()) {
  const pad = (x) => String(x).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

/**
 * Cuerpo JSON para `POST /api/cotizaciones/:id/pdf` (mismos campos que espera el backend; valores string).
 */
export function buildCotizacionPdfApiPayload(cot) {
  const acta = cot.actas || {}
  const veh = cot.vehiculos || acta.vehiculos || {}
  const vehManual = cot.vista_cliente?.vehiculo_manual || {}
  const cli = cot.clientes || acta.clientes || cot.vista_cliente?.cliente_manual || {}
  const diasValidez = String(cot.vista_cliente?.dias_validez ?? cot.dias_validez ?? 7)

  const resumen = resumenFinanciero(cot)
  const items = (cot.items || [])
    .filter((it) => String(it.descripcion || '').trim())
    .map((item, i) => {
      const isMO = String(item.tipo || '').toLowerCase().includes('mano')
      const qty = n(item.cantidad, 1)
      const costo = isMO ? 0 : n(item.costo_unitario)
      const pu = n(item.precio_unitario)
      const ventaCIVA = isMO
        ? 0
        : (pu > 0 ? pu : costo > 0 ? Math.round((costo / 1.19) / 0.70 * 1.19) : 0)
      const ventaNeto = ventaCIVA > 0 ? Math.round(ventaCIVA / 1.19) : 0
      const mo = isMO ? (pu || n(item.mano_obra)) : n(item.mano_obra)
      const repuestoNetLine = isMO ? 0 : Math.round(ventaNeto * qty)
      const moLine = Math.round(mo)
      const detalle = [item.observacion, item.tipo].filter(Boolean).join(' · ')
      return {
        index: String(i + 1),
        descripcion: String(item.descripcion || ''),
        detalle,
        cantidad: String(qty),
        repuesto: String(repuestoNetLine),
        manoObra: String(moLine),
        total: String(Math.round(repuestoNetLine + moLine)),
      }
    })

  return {
    fecha: fechaDdMmYyyy(),
    cotizacionNumero: String(cot.numero_cotizacion ?? ''),
    diasValidez,
    cliente: {
      nombre: String(cli.nombre || ''),
      telefono: String(cli.telefono || ''),
      correo: String(cli.email || ''),
    },
    vehiculo: {
      patente: String(veh.patente || vehManual.patente || ''),
      marca: String(veh.marca || vehManual.marca || ''),
      modelo: String(veh.modelo || vehManual.modelo || ''),
      anio: String(veh.anio || vehManual.anio || ''),
      kilometraje: acta.km != null && acta.km !== '' ? String(acta.km) : '',
      vin: String(veh.vin || veh.vin_chasis || acta.vin || ''),
    },
    items,
    resumen: {
      neto: String(Math.round(resumen.netoFinal)),
      iva: String(Math.round(resumen.ivaDebito)),
      subtotal: String(Math.round(resumen.subtotalCliente)),
      cargoServicio: String(Math.round(resumen.cargoPorServicio)),
      descuento: String(Math.round(resumen.descuentoMonto)),
      total: String(Math.round(resumen.totalFinalCliente)),
    },
  }
}
