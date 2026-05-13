import jsPDF from 'jspdf'

const GOLD = [169, 130, 37]
const GRIS = [107, 107, 107]
const GRIS_L = [229, 229, 229]
const TEXTO = [20, 20, 20]

let _logoCache = undefined
async function cargarLogo() {
  if (_logoCache !== undefined) return _logoCache
  try {
    const resp = await fetch('/logo-secco.png')
    if (!resp.ok) { _logoCache = null; return null }
    const blob = await resp.blob()
    _logoCache = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    _logoCache = null
  }
  return _logoCache
}

function n(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function t(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function money(value) {
  return `$${n(value).toLocaleString('es-CL')}`
}

function totalClienteCobro(totalFinal) {
  return Math.round(n(totalFinal) / 0.98)
}

function resumenFinanciero(cotizacion) {
  const vista = cotizacion.vista_cliente || {}
  const costoRepuestosNetos = n(cotizacion.costo_repuestos_netos, n(cotizacion.costo_total_neto, Math.round(n(cotizacion.costo_total) / 1.19)))
  const ventaRepuestosNetos = n(cotizacion.venta_repuestos_netos, n(cotizacion.neto_repuestos))
  const ventaMo = n(cotizacion.venta_mo, n(cotizacion.neto_mo, n(cotizacion.mano_obra_total)))
  const horasTrabajo = n(cotizacion.horas_trabajo, n(vista.horas_trabajo))
  const costoHoraTecnico = n(cotizacion.costo_hora_tecnico, n(vista.costo_hora_tecnico))
  const costoMoReal = n(cotizacion.costo_mo_real, Math.round(horasTrabajo * costoHoraTecnico))
  const costoTotalReal = n(cotizacion.costo_total_real, costoRepuestosNetos + costoMoReal)
  const netoFinal = n(cotizacion.neto_final, n(cotizacion.subtotal))
  const descuentoValor = n(cotizacion.descuento_valor, n(vista.descuento_valor))
  const descuentoTipo = cotizacion.descuento_tipo || vista.descuento_tipo || 'monto'
  const netoAntesDescuento = n(cotizacion.neto_antes_descuento, netoFinal)
  const utilidadRepuestos = n(cotizacion.utilidad_repuestos, ventaRepuestosNetos - costoRepuestosNetos)
  const utilidadMo = n(cotizacion.utilidad_mo, ventaMo - costoMoReal)
  const ivaDebito = n(cotizacion.iva_debito, n(cotizacion.iva, Math.round(netoFinal * 0.19)))
  const ivaCredito = n(cotizacion.iva_credito, Math.round(costoRepuestosNetos * 0.19))
  const diferenciaIvaSii = n(cotizacion.diferencia_iva_sii, n(cotizacion.dif_iva, ivaDebito - ivaCredito))
  const subtotalCliente = n(cotizacion.subtotal_cliente, n(cotizacion.total, netoFinal + ivaDebito))
  const totalFinalSinDescuento = n(cotizacion.total_final_sin_descuento, totalClienteCobro(subtotalCliente))
  const cargoPorServicio = n(cotizacion.cargo_por_servicio, totalFinalSinDescuento - subtotalCliente)
  const descuentoCalculado = descuentoTipo === 'porcentaje'
    ? totalFinalSinDescuento * (descuentoValor / 100)
    : descuentoValor
  const descuentoMonto = n(cotizacion.descuento, Math.min(totalFinalSinDescuento, Math.max(0, descuentoCalculado)))
  const totalFinalCliente = n(cotizacion.total_final_cliente, Math.max(0, totalFinalSinDescuento - descuentoMonto))
  const utilidadAntesDescuento = n(cotizacion.utilidad_antes_descuento, utilidadRepuestos + utilidadMo)
  const utilidadTotal = n(cotizacion.utilidad_total, utilidadAntesDescuento - descuentoMonto)
  const margenPct = n(cotizacion.margen_pct, n(cotizacion.margen, netoFinal > 0 ? (utilidadTotal / netoFinal) * 100 : 0))

  return {
    costoRepuestosNetos,
    ventaRepuestosNetos,
    horasTrabajo,
    costoHoraTecnico,
    costoMoReal,
    totalCostosNeto: costoTotalReal,
    totalCostos: costoTotalReal + ivaCredito,
    ventaMo,
    costoTotalReal,
    netoFinal,
    netoAntesDescuento,
    descuentoMonto,
    descuentoValor,
    descuentoTipo,
    totalIngresosNeto: netoFinal,
    totalIngresos: subtotalCliente,
    utilidadRepuestos,
    utilidadMo,
    utilidadAntesDescuento,
    utilidadTotal,
    margenPct,
    ivaDebito,
    ivaCredito,
    diferenciaIvaSii,
    subtotalCliente,
    cargoPorServicio,
    totalFinalSinDescuento,
    totalFinalCliente,
  }
}

function clampY(y) {
  return Number.isFinite(Number(y)) ? Number(y) : 20
}

function text(doc, value, x, y, opts = {}) {
  const xx = n(x)
  const yy = clampY(y)
  doc.setTextColor(...(opts.color || TEXTO))
  doc.setFontSize(n(opts.size, 8))
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.text(t(value), xx, yy)
}

function wrapped(doc, value, x, y, width, opts = {}) {
  let yy = clampY(y)
  const lines = doc.splitTextToSize(t(value), n(width, 170))
  const clean = Array.isArray(lines) ? lines : [lines]
  for (const line of clean) {
    text(doc, line, x, yy, opts)
    yy += n(opts.lineHeight, 4.4)
  }
  return yy
}

function line(doc, x1, y1, x2, y2) {
  doc.setDrawColor(...GRIS_L)
  doc.line(n(x1), clampY(y1), n(x2), clampY(y2))
}

function section(doc, label, y) {
  const yy = clampY(y)
  doc.setFillColor(...GOLD)
  doc.rect(10, yy, 190, 7, 'F')
  text(doc, t(label).toUpperCase(), 14, yy + 4.8, { color: [255, 255, 255], size: 8, bold: true })
  return yy + 12
}

function datos(cotizacion) {
  const acta = cotizacion.actas || {}
  const veh = cotizacion.vehiculos || acta.vehiculos || {}
  const vehManual = cotizacion.vista_cliente?.vehiculo_manual || {}
  const cli = cotizacion.clientes || acta.clientes || cotizacion.vista_cliente?.cliente_manual || {}
  return {
    cliente: cli.nombre || '',
    telefono: cli.telefono || '',
    email: cli.email || '',
    vehiculo: `${veh.marca || vehManual.marca || ''} ${veh.modelo || vehManual.modelo || ''}`.trim(),
    patente: veh.patente || vehManual.patente || '',
    anio: veh.anio || vehManual.anio || '',
  }
}

function filenameFor(cotizacion, modo) {
  const d = datos(cotizacion)
  const base = d.patente || cotizacion.numero_cotizacion || 'secco'
  return `${modo === 'interno' ? 'presupuesto-interno' : 'presupuesto-cliente'}-${base}.pdf`
}

function descargar(doc, filename) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function generar(cotizacion, modo, opts = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogo()
  const d = datos(cotizacion)
  let y = 12

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 95, 8, 20, 20)
      y = 34
    } catch {
      text(doc, 'SECCO', 94, 18, { size: 15, bold: true })
      y = 30
    }
  } else {
    text(doc, 'SECCO', 94, 18, { size: 15, bold: true })
    y = 30
  }

  text(doc, modo === 'interno' ? 'Presupuesto Interno' : 'Propuesta de Servicio', 72, y, { size: 13, bold: true })
  y += 5
  doc.setDrawColor(...GOLD)
  doc.line(14, y, 196, y)
  y += 8
  text(doc, `Fecha: ${new Date().toLocaleDateString('es-CL')}`, 14, y, { color: GRIS, size: 7.5 })
  text(doc, cotizacion.numero_cotizacion ? `Cotizacion #${cotizacion.numero_cotizacion}` : 'Cotizacion', 158, y, { color: GRIS, size: 7.5 })
  y += 10

  const check = (need = 24) => {
    if (y + need > 282) {
      doc.addPage()
      y = 18
    }
  }

  y = section(doc, 'Datos del vehiculo', y)
  text(doc, 'CLIENTE', 14, y, { color: GRIS, size: 6.5 })
  text(doc, d.cliente || '-', 14, y + 5, { size: 9, bold: true })
  text(doc, 'TELEFONO', 110, y, { color: GRIS, size: 6.5 })
  text(doc, d.telefono || '-', 110, y + 5, { size: 9, bold: true })
  y += 13
  text(doc, 'CORREO', 14, y, { color: GRIS, size: 6.5 })
  text(doc, d.email || '-', 14, y + 5, { size: 9, bold: true })
  y += 13
  text(doc, 'VEHICULO', 14, y, { color: GRIS, size: 6.5 })
  text(doc, d.vehiculo || '-', 14, y + 5, { size: 9, bold: true })
  text(doc, 'PATENTE', 110, y, { color: GRIS, size: 6.5 })
  text(doc, d.patente || '-', 110, y + 5, { size: 9, bold: true })
  y += 15

  if (cotizacion.vista_cliente?.resumen || cotizacion.notas) {
    check(28)
    y = section(doc, 'Resumen', y)
    y = wrapped(doc, cotizacion.vista_cliente?.resumen || cotizacion.notas, 14, y, 182, { size: 8 })
    y += 6
  }

  check(40)
  y = section(doc, modo === 'interno' ? 'Detalle interno' : 'Detalle de trabajos', y)
  text(doc, 'Item', 14, y, { color: GRIS, size: 7, bold: true })
  text(doc, 'Cant.', 104, y, { color: GRIS, size: 7, bold: true })
  if (modo === 'interno') {
    text(doc, 'Costo', 120, y, { color: GRIS, size: 7, bold: true })
    text(doc, 'Venta+30%', 143, y, { color: GRIS, size: 7, bold: true })
    text(doc, 'M.O.', 170, y, { color: GRIS, size: 7, bold: true })
  } else {
    text(doc, 'Repuesto', 130, y, { color: GRIS, size: 7, bold: true })
    text(doc, 'M.O.', 170, y, { color: GRIS, size: 7, bold: true })
  }
  y += 4
  line(doc, 14, y, 196, y)
  y += 5

  const printableItems = (cotizacion.items || []).filter((item) => item.descripcion)
  if (!printableItems.length) {
    text(doc, 'Sin items ingresados.', 14, y, { color: GRIS, size: 8 })
    y += 8
  }

  for (const item of printableItems) {
    check(20)
    const isMO = String(item.tipo || '').toLowerCase().includes('mano')
    const qty = n(item.cantidad, 1)
    const costo = isMO ? 0 : n(item.costo_unitario)
    const pu = n(item.precio_unitario)
    // precio_unitario guardado es el precio final c/IVA (prioridad absoluta).
    // Fallback: margen real 30% → costo_neto / 0.70 * 1.19
    const ventaCIVA = isMO ? 0 : (pu > 0 ? pu : costo > 0 ? Math.round((costo / 1.19) / 0.70 * 1.19) : 0)
    const ventaNeto = ventaCIVA > 0 ? Math.round(ventaCIVA / 1.19) : 0
    const mo = isMO ? (pu || n(item.mano_obra)) : n(item.mano_obra)
    const startY = y
    const nextY = wrapped(doc, item.descripcion, 14, y, modo === 'interno' ? 84 : 104, { size: 7.5, lineHeight: 4 })
    text(doc, qty, 104, startY, { size: 7.5 })
    if (modo === 'interno') {
      text(doc, money(costo), 120, startY, { size: 7.2 })
      text(doc, isMO ? '-' : money(ventaCIVA), 143, startY, { size: 7.2 })
      text(doc, money(mo), 170, startY, { size: 7.2 })
    } else {
      text(doc, isMO ? '-' : money(ventaNeto), 130, startY, { size: 7.2 })
      text(doc, money(mo), 170, startY, { size: 7.2 })
    }
    y = Math.max(nextY + 2, startY + 8)
    line(doc, 14, y, 196, y)
    y += 3
  }

  check(48)
  y += 3
  y = section(doc, 'Resumen de valores', y)
  const resumen = resumenFinanciero(cotizacion)

  const groups = modo === 'interno'
    ? [
        {
          title: 'A. Costos',
          rows: [
            ['Costos Repuestos Neto', resumen.costoRepuestosNetos],
            ['Costos MO Neto', resumen.costoMoReal],
            ['Total Costos Neto', resumen.totalCostosNeto],
            ['IVA crédito', resumen.ivaCredito],
            ['Total Costos', resumen.totalCostos],
          ],
        },
        {
          title: 'B. Ingresos',
          rows: [
            ['Ingresos Repuestos Neto', resumen.ventaRepuestosNetos],
            ['Ingresos MO Neto', resumen.ventaMo],
            ['Total Ingresos Neto', resumen.totalIngresosNeto],
            ['IVA débito', resumen.ivaDebito],
            ['Total Ingresos', resumen.totalIngresos],
          ],
        },
        {
          title: 'C. Utilidad',
          rows: [
            ['Utilidad Repuestos', resumen.utilidadRepuestos],
            ['Utilidad MO', resumen.utilidadMo],
            ['Utilidad antes descuento', resumen.utilidadAntesDescuento],
            ...(resumen.descuentoMonto > 0 ? [
              [
                resumen.descuentoTipo === 'porcentaje' ? `Descuento (${resumen.descuentoValor}%)` : 'Descuento',
                -resumen.descuentoMonto,
              ],
            ] : []),
            ['Utilidad Total', resumen.utilidadTotal],
            ['Margen', `${resumen.margenPct.toFixed(2)}%`],
          ],
        },
        {
          title: 'D. Impuestos',
          rows: [
            ['IVA crédito', resumen.ivaCredito],
            ['IVA débito', resumen.ivaDebito],
            ['Diferencia SII', resumen.diferenciaIvaSii],
          ],
        },
        {
          title: 'E. Resumen Cliente',
          rows: [
            ['Neto', resumen.netoFinal],
            ['IVA', resumen.ivaDebito],
            ['Subtotal cliente (neto + IVA)', resumen.subtotalCliente],
            ['Cargo por servicio', resumen.cargoPorServicio],
            ['Total sin descuento', resumen.totalFinalSinDescuento],
            ...(resumen.descuentoMonto > 0 ? [
              [
                resumen.descuentoTipo === 'porcentaje' ? `Descuento (${resumen.descuentoValor}%)` : 'Descuento',
                -resumen.descuentoMonto,
              ],
            ] : []),
            ['Total final cliente', resumen.totalFinalCliente],
          ],
        },
      ]
    : (() => {
        const tieneDescuento = resumen.descuentoMonto > 0
        const labelDescuento = tieneDescuento
          ? resumen.descuentoTipo === 'porcentaje'
            ? `Descuento (${resumen.descuentoValor}%)`
            : 'Descuento'
          : null
        const rowsCliente = []
        rowsCliente.push(['Neto', resumen.netoFinal])
        rowsCliente.push(['IVA 19%', resumen.ivaDebito])
        rowsCliente.push(['Subtotal cliente (neto + IVA)', resumen.subtotalCliente])
        rowsCliente.push(['Cargo por servicio', resumen.cargoPorServicio])
        rowsCliente.push(['Total sin descuento', resumen.totalFinalSinDescuento])
        if (tieneDescuento) rowsCliente.push([labelDescuento, -resumen.descuentoMonto])
        rowsCliente.push(['Total final cliente', resumen.totalFinalCliente])
        return [{ title: 'Resumen cliente', rows: rowsCliente }]
      })()

  const DANGER = [255, 69, 58]
  for (const group of groups) {
    check(10 + group.rows.length * 7)
    text(doc, group.title, 112, y, { color: GOLD, size: 8, bold: true })
    y += 6
    for (const [label, value] of group.rows) {
      const isTotal = label === 'Total final cliente'
      const isDifIva = label === 'Diferencia IVA (SII)'
      const isNegative = typeof value === 'number' && value < 0
      text(doc, label, 112, y, { color: isNegative ? DANGER : GRIS, size: 8 })
      text(
        doc,
        typeof value === 'number' ? (isNegative ? `-${money(-value)}` : money(value)) : String(value ?? ''),
        166, y,
        {
          color: isTotal ? GOLD : (isDifIva || isNegative) ? DANGER : TEXTO,
          size: 8.5,
          bold: isTotal || isDifIva,
        }
      )
      y += 7
    }
    y += 2
  }

  if (modo === 'cliente' && cotizacion.notas) {
    check(24)
    y += 4
    y = section(doc, 'Notas', y)
    y = wrapped(doc, cotizacion.notas, 14, y, 182, { size: 8 })
  }

  if (modo === 'interno' && cotizacion.notas_internas) {
    check(24)
    y += 4
    y = section(doc, 'Notas internas', y)
    y = wrapped(doc, cotizacion.notas_internas, 14, y, 182, { size: 8 })
  }

  if (opts.returnBlob) return doc.output('blob')

  descargar(doc, filenameFor(cotizacion, modo))
}

export function generarPDFPresupuestoCliente(cotizacion, opts = {}) {
  return generar(cotizacion, 'cliente', opts)
}

export function generarPDFPresupuestoInterno(cotizacion, opts = {}) {
  return generar(cotizacion, 'interno', opts)
}
