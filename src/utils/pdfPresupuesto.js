import jsPDF from 'jspdf'

const GOLD    = [169, 130, 37]
const GOLD_BG = [250, 244, 224]
const DARK    = [17, 24, 39]
const GRIS    = [107, 114, 128]
const GRIS_L  = [229, 231, 235]
const GRIS_BG = [249, 250, 251]
const TEXTO   = [31, 41, 55]
const DANGER  = [220, 38, 38]
const WHITE   = [255, 255, 255]

const FONT = 'helvetica'

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
  } catch { _logoCache = null }
  return _logoCache
}

function n(value, fallback = 0) {
  const p = Number(value)
  return Number.isFinite(p) ? p : fallback
}

function t(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function money(value) {
  const num = n(value)
  if (num === 0) return '$0'
  return `$${num.toLocaleString('es-CL')}`
}

export function resumenFinanciero(cotizacion) {
  const vista = cotizacion.vista_cliente || {}
  const costoRepuestosNetos = n(cotizacion.costo_repuestos_netos, n(cotizacion.costo_total_neto, Math.round(n(cotizacion.costo_total) / 1.19)))
  const ventaRepuestosNetos = n(cotizacion.venta_repuestos_netos, n(cotizacion.neto_repuestos))
  const ventaMo             = n(cotizacion.venta_mo, n(cotizacion.neto_mo, n(cotizacion.mano_obra_total)))
  const horasTrabajo        = n(cotizacion.horas_trabajo, n(vista.horas_trabajo))
  const costoHoraTecnico    = n(cotizacion.costo_hora_tecnico, n(vista.costo_hora_tecnico))
  const costoMoReal         = n(cotizacion.costo_mo_real, Math.round(horasTrabajo * costoHoraTecnico))
  const costoTotalReal      = n(cotizacion.costo_total_real, costoRepuestosNetos + costoMoReal)
  const netoFinal           = n(cotizacion.neto_final, n(cotizacion.subtotal))
  const descuentoValor      = n(cotizacion.descuento_valor, n(vista.descuento_valor))
  const descuentoTipo       = cotizacion.descuento_tipo || vista.descuento_tipo || 'monto'
  const netoAntesDescuento  = n(cotizacion.neto_antes_descuento, netoFinal)
  const utilidadRepuestos   = n(cotizacion.utilidad_repuestos, ventaRepuestosNetos - costoRepuestosNetos)
  const utilidadMo          = n(cotizacion.utilidad_mo, ventaMo - costoMoReal)
  const ivaDebito           = n(cotizacion.iva_debito, n(cotizacion.iva, Math.round(netoFinal * 0.19)))
  const ivaCredito          = n(cotizacion.iva_credito, Math.round(costoRepuestosNetos * 0.19))
  const diferenciaIvaSii    = n(cotizacion.diferencia_iva_sii, n(cotizacion.dif_iva, ivaDebito - ivaCredito))
  const subtotalCliente     = n(cotizacion.subtotal_cliente, n(cotizacion.total, netoFinal + ivaDebito))
  const totalFinalSinDesc   = n(cotizacion.total_final_sin_descuento, Math.round(subtotalCliente / 0.98))
  const cargoPorServicio    = n(cotizacion.cargo_por_servicio, totalFinalSinDesc - subtotalCliente)
  const descuentoCalculado  = descuentoTipo === 'porcentaje'
    ? totalFinalSinDesc * (descuentoValor / 100)
    : descuentoValor
  const descuentoMonto      = n(cotizacion.descuento, Math.min(totalFinalSinDesc, Math.max(0, descuentoCalculado)))
  const totalFinalCliente   = n(cotizacion.total_final_cliente, Math.max(0, totalFinalSinDesc - descuentoMonto))
  const utilidadAntesDesc   = n(cotizacion.utilidad_antes_descuento, utilidadRepuestos + utilidadMo)
  const utilidadTotal       = n(cotizacion.utilidad_total, utilidadAntesDesc - descuentoMonto)
  const margenPct           = n(cotizacion.margen_pct, n(cotizacion.margen, netoFinal > 0 ? (utilidadTotal / netoFinal) * 100 : 0))

  return {
    costoRepuestosNetos, ventaRepuestosNetos, horasTrabajo, costoHoraTecnico, costoMoReal,
    totalCostosNeto: costoTotalReal, totalCostos: costoTotalReal + ivaCredito,
    ventaMo, costoTotalReal, netoFinal, netoAntesDescuento, descuentoMonto, descuentoValor, descuentoTipo,
    totalIngresosNeto: netoFinal, totalIngresos: subtotalCliente,
    utilidadRepuestos, utilidadMo, utilidadAntesDesc, utilidadTotal, margenPct,
    ivaDebito, ivaCredito, diferenciaIvaSii, subtotalCliente, cargoPorServicio,
    totalFinalSinDesc, totalFinalCliente,
  }
}

function clampY(y) { return Number.isFinite(Number(y)) ? Number(y) : 20 }

function text(doc, value, x, y, opts = {}) {
  doc.setTextColor(...(opts.color || TEXTO))
  doc.setFontSize(n(opts.size, 8))
  doc.setFont(FONT, opts.bold ? 'bold' : 'normal')
  doc.text(t(value), n(x), clampY(y))
}

function wrapped(doc, value, x, y, width, opts = {}) {
  let yy = clampY(y)
  const lines = doc.splitTextToSize(t(value), n(width, 170))
  const clean = Array.isArray(lines) ? lines : [lines]
  for (const line of clean) {
    text(doc, line, x, yy, opts)
    yy += n(opts.lineHeight, 4.6)
  }
  return yy
}

function hline(doc, x1, y1, x2, y2, color = GRIS_L) {
  doc.setDrawColor(...color)
  doc.line(n(x1), clampY(y1), n(x2), clampY(y2))
}

function rect(doc, x, y, w, h, color, fill = 'F') {
  doc.setFillColor(...color)
  doc.rect(n(x), clampY(y), n(w), n(h), fill)
}

function section(doc, label, y) {
  const yy = clampY(y)
  rect(doc, 10, yy, 190, 6.5, DARK)
  doc.setTextColor(...WHITE)
  doc.setFontSize(7.5)
  doc.setFont(FONT, 'bold')
  doc.text(t(label).toUpperCase(), 14, yy + 4.5)
  return yy + 11
}

function notaSection(doc, label, contenido, y, width = 182) {
  const yy = clampY(y)
  rect(doc, 10, yy, 190, 6, GOLD_BG)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.rect(10, yy, 190, 6, 'S')
  doc.setLineWidth(0.2)
  doc.setTextColor(...GOLD)
  doc.setFontSize(7.5)
  doc.setFont(FONT, 'bold')
  doc.text(t(label).toUpperCase(), 14, yy + 4.2)
  let ny = yy + 9
  ny = wrapped(doc, contenido, 14, ny, width, { size: 8, lineHeight: 4.8 })
  return ny + 4
}

function datos(cotizacion) {
  const acta       = cotizacion.actas || {}
  const veh        = cotizacion.vehiculos || acta.vehiculos || {}
  const vehManual  = cotizacion.vista_cliente?.vehiculo_manual || {}
  const cliManual  = cotizacion.vista_cliente?.cliente_manual  || {}
  const cli        = cotizacion.clientes || acta.clientes || {}
  return {
    cliente:        cli.nombre    || cliManual.nombre    || '',
    telefono:       cli.telefono  || cliManual.telefono  || '',
    email:          cli.email     || cliManual.email     || '',
    vehiculo:       `${veh.marca  || vehManual.marca  || ''} ${veh.modelo || vehManual.modelo || ''}`.trim(),
    patente:        veh.patente   || vehManual.patente   || '',
    anio:           veh.anio      || vehManual.anio      || '',
    km:             veh.kilometraje || acta.km || vehManual.km || '',
    vin:            veh.vin || veh.chasis || vehManual.vin || '',
    tipoPresupuesto: cotizacion.tipo_presupuesto || cotizacion.vista_cliente?.tipo_presupuesto || '',
    diasValidez:    n(cotizacion.vista_cliente?.dias_validez, 7),
    numeroActa:     acta.numero_acta || '',
  }
}

function filenameFor(cotizacion, modo) {
  const d    = datos(cotizacion)
  const base = d.patente || cotizacion.numero_cotizacion || 'secco'
  return `${modo === 'interno' ? 'presupuesto-interno' : 'presupuesto-cliente'}-${base}.pdf`
}

function descargar(doc, filename) {
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function generar(cotizacion, modo, opts = {}) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogo()
  const d    = datos(cotizacion)
  let y      = 10

  // ── ENCABEZADO ─────────────────────────────────────────────────────────────
  rect(doc, 0, 0, 210, 28, DARK)

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 4, 20, 20)
    } catch { /* ignora */ }
  }

  doc.setTextColor(...WHITE)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(15)
  doc.text(modo === 'interno' ? 'Presupuesto Interno' : 'Propuesta de Servicio', 38, 13)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 200, 200)
  doc.text('Secco Automotriz — Servicio técnico especializado', 38, 19)

  // Fecha y número (derecha del header)
  const fechaStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.setFont(FONT, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(200, 200, 200)
  doc.text('Fecha:', 148, 10)
  doc.setFont(FONT, 'bold')
  doc.setTextColor(...WHITE)
  doc.text(fechaStr, 163, 10)

  if (cotizacion.numero_cotizacion) {
    doc.setFont(FONT, 'normal')
    doc.setTextColor(200, 200, 200)
    doc.text('N° Cotización:', 148, 16)
    doc.setFont(FONT, 'bold')
    doc.setTextColor(...WHITE)
    doc.text(`#${cotizacion.numero_cotizacion}`, 163, 16)
  }

  if (d.tipoPresupuesto) {
    const badge = d.tipoPresupuesto.toUpperCase() === 'INICIAL' ? 'INICIAL' : 'FINAL'
    rect(doc, 148, 19, 22, 5.5, GOLD)
    doc.setFont(FONT, 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...WHITE)
    doc.text(badge, 152, 23.3)
  }

  y = 34

  const check = (need = 24) => {
    if (y + need > 282) { doc.addPage(); y = 14 }
  }

  // ── DATOS DEL CLIENTE ──────────────────────────────────────────────────────
  check(40)
  y = section(doc, 'Datos del cliente', y)

  const col2 = 110
  text(doc, 'CLIENTE', 14, y, { color: GRIS, size: 6.5, bold: true })
  text(doc, 'TELÉFONO', col2, y, { color: GRIS, size: 6.5, bold: true })
  y += 4.5
  text(doc, d.cliente || '-', 14, y, { size: 9.5, bold: true })
  text(doc, d.telefono || '-', col2, y, { size: 9.5 })
  y += 8
  text(doc, 'CORREO ELECTRÓNICO', 14, y, { color: GRIS, size: 6.5, bold: true })
  y += 4.5
  text(doc, d.email || '-', 14, y, { size: 9 })
  y += 10

  // ── DATOS DEL VEHÍCULO ─────────────────────────────────────────────────────
  check(44)
  y = section(doc, 'Datos del vehículo', y)

  text(doc, 'VEHÍCULO', 14, y, { color: GRIS, size: 6.5, bold: true })
  text(doc, 'PATENTE', col2, y, { color: GRIS, size: 6.5, bold: true })
  y += 4.5
  text(doc, d.vehiculo || '-', 14, y, { size: 9.5, bold: true })
  text(doc, d.patente  || '-', col2, y, { size: 9.5, bold: true })
  y += 8
  text(doc, 'AÑO', 14, y, { color: GRIS, size: 6.5, bold: true })
  text(doc, 'KILOMETRAJE', col2, y, { color: GRIS, size: 6.5, bold: true })
  y += 4.5
  text(doc, t(d.anio), 14, y, { size: 9 })
  text(doc, d.km ? `${n(d.km).toLocaleString('es-CL')} km` : '-', col2, y, { size: 9 })
  y += 7
  if (d.vin) {
    text(doc, 'VIN / CHASIS', 14, y, { color: GRIS, size: 6.5, bold: true })
    y += 4.5
    text(doc, d.vin, 14, y, { size: 8.5 })
    y += 6
  }
  y += 3

  // ── RESUMEN / DESCRIPCIÓN DEL TRABAJO ─────────────────────────────────────
  const resumenTexto = cotizacion.vista_cliente?.resumen || ''
  if (resumenTexto) {
    check(28)
    y = section(doc, 'Descripción del trabajo', y)
    y = wrapped(doc, resumenTexto, 14, y, 182, { size: 8.5, lineHeight: 4.8 })
    y += 6
  }

  // ── DETALLE DE ÍTEMS ───────────────────────────────────────────────────────
  check(44)
  y = section(doc, modo === 'interno' ? 'Detalle interno' : 'Detalle de trabajos', y)

  // Cabecera de tabla
  rect(doc, 10, y, 190, 6.5, GRIS_BG)
  const hY = y + 4.5
  text(doc, '#',      14,  hY, { color: GRIS, size: 6.8, bold: true })
  text(doc, 'Descripción', 22, hY, { color: GRIS, size: 6.8, bold: true })
  text(doc, 'Cant.', 110,  hY, { color: GRIS, size: 6.8, bold: true })
  if (modo === 'interno') {
    text(doc, 'Costo neto',   124, hY, { color: GRIS, size: 6.8, bold: true })
    text(doc, 'Venta c/IVA',  152, hY, { color: GRIS, size: 6.8, bold: true })
    text(doc, 'M.O.',         178, hY, { color: GRIS, size: 6.8, bold: true })
  } else {
    text(doc, 'Repuesto',     138, hY, { color: GRIS, size: 6.8, bold: true })
    text(doc, 'M.O.',         178, hY, { color: GRIS, size: 6.8, bold: true })
  }
  y += 7
  hline(doc, 10, y, 200, y, GRIS_L)
  y += 2

  const printableItems = (cotizacion.items || []).filter((item) => item.descripcion)
  let itemIndex = 0

  if (!printableItems.length) {
    text(doc, 'Sin ítems ingresados.', 14, y, { color: GRIS, size: 8 })
    y += 8
  }

  for (const item of printableItems) {
    itemIndex++
    const isMO      = String(item.tipo || '').toLowerCase().includes('mano')
    const qty       = n(item.cantidad, 1)
    const costo     = isMO ? 0 : n(item.costo_unitario)
    const pu        = n(item.precio_unitario)
    const ventaCIVA = isMO ? 0 : (pu > 0 ? pu : costo > 0 ? Math.round((costo / 1.19) / 0.70 * 1.19) : 0)
    const ventaNeto = ventaCIVA > 0 ? Math.round(ventaCIVA / 1.19) : 0
    const mo        = isMO ? (pu || n(item.mano_obra)) : n(item.mano_obra)
    const tieneObs  = item.observacion && String(item.observacion).trim()

    const extraLines = tieneObs ? 1 : 0
    const alturaEstimada = 7 + (tieneObs ? 5 : 0)
    check(alturaEstimada + 4)

    const startY    = y
    const descWidth = modo === 'interno' ? 84 : 110

    // número de ítem
    text(doc, String(itemIndex), 14, startY + 1, { size: 7, color: GRIS })

    const afterDesc = wrapped(doc, item.descripcion, 22, startY, descWidth, { size: 7.8, lineHeight: 4.4 })
    let rowBottom   = afterDesc

    if (tieneObs) {
      const obsY = wrapped(doc, item.observacion, 22, afterDesc, descWidth, { size: 6.5, color: GRIS, lineHeight: 4 })
      rowBottom = obsY
    }

    text(doc, String(qty), 110, startY + 1, { size: 7.8 })

    if (modo === 'interno') {
      text(doc, isMO ? '-' : money(costo),     124, startY + 1, { size: 7.5 })
      text(doc, isMO ? '-' : money(ventaCIVA), 152, startY + 1, { size: 7.5 })
      text(doc, money(mo),                     178, startY + 1, { size: 7.5 })
    } else {
      text(doc, isMO ? '-' : money(ventaNeto), 138, startY + 1, { size: 7.5 })
      text(doc, money(mo),                     178, startY + 1, { size: 7.5 })
    }

    y = Math.max(rowBottom + 2, startY + 7)
    hline(doc, 10, y, 200, y)
    y += 2.5
  }

  // ── RESUMEN DE VALORES ─────────────────────────────────────────────────────
  y += 2
  check(16)
  y = section(doc, 'Resumen de valores', y)

  const resumen = resumenFinanciero(cotizacion)

  const groups = modo === 'interno'
    ? [
        { title: 'A. Costos', rows: [
            ['Costos repuestos neto', resumen.costoRepuestosNetos],
            ['Costos M.O. neto',      resumen.costoMoReal],
            ['Total costos neto',     resumen.totalCostosNeto],
            ['IVA crédito (compras)', resumen.ivaCredito],
            ['Total costos bruto',    resumen.totalCostos],
          ]},
        { title: 'B. Ingresos', rows: [
            ['Ingresos repuestos neto', resumen.ventaRepuestosNetos],
            ['Ingresos M.O. neto',      resumen.ventaMo],
            ['Total ingresos neto',     resumen.totalIngresosNeto],
            ['IVA débito (ventas)',      resumen.ivaDebito],
            ['Total ingresos bruto',    resumen.totalIngresos],
          ]},
        { title: 'C. Utilidad', rows: [
            ['Utilidad repuestos',       resumen.utilidadRepuestos],
            ['Utilidad M.O.',            resumen.utilidadMo],
            ['Utilidad antes descuento', resumen.utilidadAntesDesc],
            ...(resumen.descuentoMonto > 0 ? [[
              resumen.descuentoTipo === 'porcentaje'
                ? `Descuento (${resumen.descuentoValor}%)`
                : 'Descuento',
              -resumen.descuentoMonto,
            ]] : []),
            ['Utilidad total', resumen.utilidadTotal],
            ['Margen', `${resumen.margenPct.toFixed(1)}%`],
          ]},
        { title: 'D. Impuestos SII', rows: [
            ['IVA crédito', resumen.ivaCredito],
            ['IVA débito',  resumen.ivaDebito],
            ['Diferencia SII', resumen.diferenciaIvaSii],
          ]},
        { title: 'E. Resumen cliente', rows: [
            ['Neto',                          resumen.netoFinal],
            ['IVA 19%',                       resumen.ivaDebito],
            ['Subtotal (neto + IVA)',          resumen.subtotalCliente],
            ['Cargo por servicio',            resumen.cargoPorServicio],
            ['Total sin descuento',           resumen.totalFinalSinDesc],
            ...(resumen.descuentoMonto > 0 ? [[
              resumen.descuentoTipo === 'porcentaje'
                ? `Descuento (${resumen.descuentoValor}%)`
                : 'Descuento',
              -resumen.descuentoMonto,
            ]] : []),
            ['Total final cliente', resumen.totalFinalCliente],
          ]},
      ]
    : (() => {
        const rows = []
        rows.push(['Neto', resumen.netoFinal])
        rows.push(['IVA 19%', resumen.ivaDebito])
        rows.push(['Subtotal (neto + IVA)', resumen.subtotalCliente])
        rows.push(['Cargo por servicio', resumen.cargoPorServicio])
        rows.push(['Total sin descuento', resumen.totalFinalSinDesc])
        if (resumen.descuentoMonto > 0) {
          rows.push([
            resumen.descuentoTipo === 'porcentaje'
              ? `Descuento (${resumen.descuentoValor}%)`
              : 'Descuento',
            -resumen.descuentoMonto,
          ])
        }
        rows.push(['Total final', resumen.totalFinalCliente])
        return [{ title: 'Resumen', rows }]
      })()

  // Renderizar grupos de resumen — ancho completo, chequeo fila por fila
  const VX = 196  // valor alineado a la derecha

  for (const group of groups) {
    // título del grupo: barra sutil
    check(14)
    rect(doc, 10, y, 190, 6.5, GRIS_BG)
    doc.setFont(FONT, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GOLD)
    doc.text(group.title.toUpperCase(), 14, y + 4.5)
    y += 9

    for (const [label, value] of group.rows) {
      const isTotal = label === 'Total final' || label === 'Total final cliente'
      const isNeg   = typeof value === 'number' && value < 0
      const valStr  = typeof value === 'number'
        ? (isNeg ? `-${money(-value)}` : money(value))
        : String(value ?? '')

      if (isTotal) {
        check(10)
        rect(doc, 10, y - 3, 190, 9, GOLD_BG)
        doc.setDrawColor(...GOLD)
        doc.setLineWidth(0.4)
        doc.rect(10, y - 3, 190, 9, 'S')
        doc.setLineWidth(0.2)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...DARK)
        doc.text(label, 14, y + 2)
        doc.setTextColor(...GOLD)
        doc.setFontSize(10)
        doc.text(valStr, VX, y + 2, { align: 'right' })
        y += 9
      } else {
        check(7)
        doc.setFont(FONT, 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...(isNeg ? DANGER : GRIS))
        doc.text(label, 14, y)
        doc.setFont(FONT, isNeg ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...(isNeg ? DANGER : TEXTO))
        doc.text(valStr, VX, y, { align: 'right' })
        y += 6.5
      }
    }
    y += 5
  }

  // ── HORAS / COSTO HORA (solo interno) ─────────────────────────────────────
  if (modo === 'interno' && (resumen.horasTrabajo > 0 || resumen.costoHoraTecnico > 0)) {
    check(18)
    y += 2
    text(doc, `Horas de trabajo: ${resumen.horasTrabajo} h  |  Costo/hora técnico: ${money(resumen.costoHoraTecnico)}`, 14, y, { color: GRIS, size: 7 })
    y += 8
  }

  // ── COMENTARIOS PARA EL CLIENTE ────────────────────────────────────────────
  if (cotizacion.notas && String(cotizacion.notas).trim()) {
    check(28)
    y += 2
    y = notaSection(doc, 'Comentarios para el cliente', cotizacion.notas, y, 182)
  }

  // ── NOTAS INTERNAS / TORRE DE CONTROL (solo interno) ──────────────────────
  if (modo === 'interno' && cotizacion.notas_internas && String(cotizacion.notas_internas).trim()) {
    check(28)
    y += 2
    y = notaSection(doc, 'Notas internas — Torre de control', cotizacion.notas_internas, y, 182)
  }

  // ── PIE DE PÁGINA ──────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    const footerY = 292
    hline(doc, 10, footerY - 2, 200, footerY - 2, GRIS_L)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRIS)
    doc.text(
      `Esta propuesta tiene una validez de ${d.diasValidez} días a partir de la fecha de emisión.`,
      14, footerY + 2,
    )
    doc.text(`Página ${p} de ${pageCount}`, 185, footerY + 2)
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
