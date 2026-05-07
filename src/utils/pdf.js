import jsPDF from 'jspdf'

// ── Paleta ───────────────────────────────────────────────────────────────────
const NEGRO  = [17, 17, 20]      // #111114  — banda del header
const GOLD   = [169, 130, 37]    // #a98225  — acento dorado (boxes de sección)
const GRIS   = [107, 107, 107]   // #6B6B6B  — labels y texto secundario
const GRIS_L = [229, 229, 229]   // separadores suaves
const BLANCO = [255, 255, 255]
const TEXTO  = [20, 20, 20]      // texto principal del cuerpo (casi negro sobre blanco)

// ── Cache del logo ────────────────────────────────────────────────────────────
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

// ── Carga imagen remota ───────────────────────────────────────────────────────
async function loadImageAsBase64(url) {
  try {
    const blob = await fetch(url).then((r) => r.blob())
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ── Comprime imagen vía canvas (max 900px, JPEG 75%) ─────────────────────────
async function comprimirImagen(src, maxPx = 900, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

// ── Header de cada página ─────────────────────────────────────────────────────
// Retorna la altura total ocupada (para saber desde dónde arrancar el contenido)
function addPageHeader(doc, pageNum, logoBase64, acta_id, fecha_emision) {
  const W = 210

  // Logo o nombre centrado (sobre fondo blanco)
  let logoH = 0
  if (logoBase64) {
    logoH = 20
    try {
      doc.addImage(logoBase64, 'PNG', W / 2 - logoH / 2, 8, logoH, logoH)
    } catch { /* si falla el formato */ }
  } else {
    doc.setTextColor(...TEXTO)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SECCO', W / 2, 14, { align: 'center' })
    logoH = 10
  }

  // Número de página (esquina derecha, pequeño)
  doc.setTextColor(...GRIS)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pág. ${pageNum}`, W - 8, 12, { align: 'right' })

  // Subtítulo
  const subY = logoH + 16
  doc.setTextColor(...TEXTO)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Acta de Recepción de Vehículo', W / 2, subY, { align: 'center' })

  // Línea dorada decorativa
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(14, subY + 3, W - 14, subY + 3)

  // Meta: número de acta y fecha (solo página 1)
  if (pageNum === 1) {
    doc.setTextColor(...GRIS)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha de emisión: ${fecha_emision}`, 14, subY + 9)
    if (acta_id) doc.text(`Acta #${acta_id}`, W - 14, subY + 9, { align: 'right' })
  }

  return subY + (pageNum === 1 ? 14 : 8)
}

// ── Título de sección ────────────────────────────────────────────────────────
function addSectionTitle(doc, title, y, badge) {
  doc.setFillColor(...GOLD)
  doc.roundedRect(10, y, 190, 7.5, 1.5, 1.5, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), 14, y + 5)
  if (badge) {
    doc.setFontSize(6.5)
    doc.setTextColor(...NEGRO)
    doc.text(badge, 196, y + 5, { align: 'right' })
  }
  return y + 11
}

// ── Campo de dato ─────────────────────────────────────────────────────────────
function addField(doc, label, value, x, y, width = 85) {
  doc.setTextColor(...GRIS)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text(label.toUpperCase(), x, y)
  doc.setTextColor(...TEXTO)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(String(value || '—'), x, y + 5)
  doc.setDrawColor(...GRIS_L)
  doc.setLineWidth(0.3)
  doc.line(x, y + 6.5, x + width, y + 6.5)
}

// ── Foto con borde y label ───────────────────────────────────────────────────
async function addPhoto(doc, src, x, y, w, h, label) {
  try {
    const raw = src?.startsWith('data:') ? src : await loadImageAsBase64(src)
    if (!raw) return
    const imgData = await comprimirImagen(raw)
    doc.setDrawColor(...GRIS_L)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 2, 2, 'S')
    doc.addImage(imgData, 'JPEG', x + 0.5, y + 0.5, w - 1, h - 1)
    if (label) {
      doc.setTextColor(...GRIS)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x + w / 2, y + h + 4, { align: 'center' })
    }
  } catch { /* sin foto */ }
}

function photoSources(value) {
  if (!value) return []
  const values = Array.isArray(value) ? value : [value]
  return values
    .map((item) => item?.preview || item?.url || item)
    .filter(Boolean)
}

// ── Generador principal ───────────────────────────────────────────────────────
export async function generarPDFActa(formData, opts = {}) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogo()
  let page   = 1
  const fechaEmision = new Date().toLocaleDateString('es-CL')

  let y = addPageHeader(doc, page, logo, formData.numero_acta, fechaEmision)

  const checkY = (needed = 20) => {
    if (y + needed > 280) {
      doc.addPage()
      page++
      y = addPageHeader(doc, page, logo, null, fechaEmision)
    }
  }

  // ── S1 — Cliente ─────────────────────────────────────────────────────────
  y = addSectionTitle(doc, 'Sección 1 — Datos del Cliente', y, 'Torre de Control')
  addField(doc, 'Nombre completo', formData.nombre, 14, y)
  addField(doc, 'RUT', formData.rut, 110, y)
  y += 14
  addField(doc, 'Teléfono', formData.telefono, 14, y)
  addField(doc, 'Correo electrónico', formData.email, 110, y)
  y += 16

  // ── S2 — Vehículo ─────────────────────────────────────────────────────────
  checkY(30)
  y = addSectionTitle(doc, 'Sección 2 — Identificación del Vehículo', y, 'Torre de Control')
  addField(doc, 'Marca',   formData.marca,   14,  y, 40)
  addField(doc, 'Modelo',  formData.modelo,  65,  y, 40)
  addField(doc, 'Año',     formData.anio,    116, y, 24)
  addField(doc, 'Patente', formData.patente, 150, y, 50)
  y += 14
  addField(doc, 'VIN',   formData.vin   || '—', 14,  y, 85)
  addField(doc, 'Color', formData.color || '—', 110, y, 85)
  y += 16

  // ── S3 — Ingreso ──────────────────────────────────────────────────────────
  checkY(30)
  y = addSectionTitle(doc, 'Sección 3 — Datos de Ingreso', y, 'Técnico')
  addField(doc, 'Fecha ingreso',    formData.fecha_ingreso,                             14,  y, 40)
  addField(doc, 'Hora ingreso',     formData.hora_ingreso,                              65,  y, 35)
  addField(doc, 'Kilometraje',      formData.kilometraje ? `${formData.kilometraje} km` : '', 110, y, 40)
  addField(doc, 'Combustible',      formData.combustible,                               160, y, 40)
  y += 14
  addField(doc, 'Llaves entregadas', String(formData.llaves ?? ''),                     14,  y, 40)
  const docList = formData.documentacion || []
  addField(doc, 'Documentación', docList.length ? docList.join(', ') : 'Ninguna',      65,  y, 130)
  y += 16

  // Fotos km / combustible
  const fotoKm   = formData.foto_km_preview
  const fotoComb = formData.foto_combustible_preview
  if (fotoKm || fotoComb) {
    checkY(52)
    doc.setTextColor(...GRIS)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Evidencia fotográfica — Kilometraje y Combustible', 14, y)
    y += 5
    if (fotoKm)   await addPhoto(doc, fotoKm,   14, y, 55, 40, 'Odómetro')
    if (fotoComb) await addPhoto(doc, fotoComb,  75, y, 55, 40, 'Combustible')
    y += 48
  }

  // ── S4 — Estado ───────────────────────────────────────────────────────────
  checkY(30)
  y = addSectionTitle(doc, 'Sección 4 — Estado del Vehículo', y, 'Técnico')

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXTO)
  doc.text('Exterior', 14, y); doc.setFont('helvetica', 'normal')
  y += 5
  addField(doc, 'Estado general', formData.estado_exterior === 'sin_danos' ? 'Sin daños visibles' : 'Con daños visibles', 14, y, 85)
  if (formData.detalle_exterior) addField(doc, 'Detalle de daños', formData.detalle_exterior, 110, y, 85)
  y += 14

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXTO)
  doc.text('Interior', 14, y); doc.setFont('helvetica', 'normal')
  y += 5
  addField(doc, 'Estado general', formData.estado_interior === 'buen_estado' ? 'Buen estado' : 'Con observaciones', 14, y, 85)
  if (formData.detalle_interior) addField(doc, 'Observaciones', formData.detalle_interior, 110, y, 85)
  y += 16

  // Fotos exterior (2 columnas)
  const extKeys   = ['frontal', 'trasera', 'lateral_izq', 'lateral_der']
  const extLabels = { frontal: 'Frontal', trasera: 'Trasera', lateral_izq: 'Lateral Izq.', lateral_der: 'Lateral Der.' }
  const extFotos  = extKeys.filter((k) => formData.fotos?.[k])
  if (extFotos.length) {
    checkY(55)
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.text('Fotos del exterior', 14, y); y += 5
    let xi = 14
    for (const key of extFotos) {
      checkY(48)
      await addPhoto(doc, formData.fotos[key], xi, y, 44, 33, extLabels[key])
      xi += 49
      if (xi > 155) { xi = 14; y += 42 }
    }
    y += 42
  }

  const fotosInterior = photoSources(formData.fotos?.interior)
  if (fotosInterior.length) {
    checkY(52)
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.text('Fotos del interior', 14, y); y += 5
    let xi = 14
    for (const [index, src] of fotosInterior.entries()) {
      checkY(48)
      await addPhoto(doc, src, xi, y, 44, 33, `Interior ${index + 1}`)
      xi += 49
      if (xi > 155) { xi = 14; y += 42 }
    }
    y += 42
  }

  const fotosDanos = photoSources(formData.fotos?.danos)
  if (fotosDanos.length) {
    checkY(52)
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.text('Fotos adicionales del vehículo', 14, y); y += 5
    let xi = 14
    for (const [index, src] of fotosDanos.entries()) {
      checkY(48)
      await addPhoto(doc, src, xi, y, 44, 33, `Adicional ${index + 1}`)
      xi += 49
      if (xi > 155) { xi = 14; y += 42 }
    }
    y += 42
  }

  // ── S5 — Trabajo ──────────────────────────────────────────────────────────
  checkY(25)
  y = addSectionTitle(doc, 'Sección 5 — Trabajo Solicitado', y, 'Técnico')
  doc.setTextColor(...TEXTO); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  const tLines = doc.splitTextToSize(formData.trabajo_solicitado || '—', 182)
  doc.text(tLines, 14, y)
  y += tLines.length * 5 + 8

  // ── S6 — Firma cliente ────────────────────────────────────────────────────
  checkY(55)
  y = addSectionTitle(doc, 'Sección 6 — Declaración y Firma del Cliente', y)
  doc.setTextColor(...GRIS); doc.setFontSize(8); doc.setFont('helvetica', 'italic')
  doc.text('"El cliente declara haber retirado todos sus objetos personales del vehículo."', 14, y, { maxWidth: 182 })
  y += 7
  doc.text('"El cliente acepta responsabilidad por objetos personales, accesorios no declarados o bienes no retirados del vehículo."', 14, y, { maxWidth: 182 })
  y += 7
  doc.text('"El cliente autoriza pruebas de ruta cuando el equipo técnico lo estime conveniente."', 14, y, { maxWidth: 182 })
  y += 9
  addField(doc, 'Nombre del cliente', formData.nombre_cliente, 14,  y, 85)
  addField(doc, 'Fecha',              formData.fecha_firma_cliente || fechaEmision, 110, y, 85)
  y += 14

  if (formData.firma_cliente) {
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.text('Firma del cliente', 14, y); y += 3
    try { doc.addImage(formData.firma_cliente, 'PNG', 14, y, 80, 28) } catch { /* sin firma */ }
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
    doc.line(14, y + 30, 96, y + 30)
    y += 35
  }

  // ── S7 — Firma SECCO ──────────────────────────────────────────────────────
  checkY(55)
  y = addSectionTitle(doc, 'Sección 7 — Recepción SECCO', y)
  addField(doc, 'Responsable', formData.nombre_responsable, 14,  y, 85)
  addField(doc, 'Cargo',       formData.cargo_responsable,  110, y, 85)
  y += 14

  if (formData.firma_secco) {
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.text('Firma SECCO', 14, y); y += 3
    try { doc.addImage(formData.firma_secco, 'PNG', 14, y, 80, 28) } catch { /* sin firma */ }
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
    doc.line(14, y + 30, 96, y + 30)
    y += 35
  }

  // ── S8 — Checklist ────────────────────────────────────────────────────────
  checkY(45)
  y = addSectionTitle(doc, 'Sección 8 — Checklist de Validación', y)
  const checkItems = [
    'Fotos del vehículo tomadas correctamente',
    'Kilometraje registrado con evidencia fotográfica',
    'Combustible registrado con evidencia fotográfica',
    'Daños preexistentes registrados',
    'Cliente firmó conformidad',
  ]
  for (const item of checkItems) {
    doc.setTextColor(...GOLD);  doc.setFontSize(9); doc.text('✓', 14, y)
    doc.setTextColor(...TEXTO); doc.text(item, 21, y)
    y += 6.5
  }
  y += 4

  // ── Cláusula de transparencia ─────────────────────────────────────────────
  checkY(22)
  doc.setFillColor(253, 248, 238)
  doc.roundedRect(10, y, 190, 16, 2, 2, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(10, y, 3, 16, 'F')
  doc.setTextColor(...TEXTO)
  doc.setFontSize(7.5); doc.setFont('helvetica', 'italic')
  doc.text(
    '"SECCO no acepta ni permite incentivos externos que alteren el diagnóstico o recomendación técnica."',
    17, y + 9, { maxWidth: 180 }
  )

  // ── Footer en todas las páginas ───────────────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...GRIS_L); doc.setLineWidth(0.3)
    doc.line(14, 286, 196, 286)
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.setFont('helvetica', 'italic')
    doc.text('SECCO — Taller Mecánico', 14, 291)
    doc.text(`${i} / ${total}`, 196, 291, { align: 'right' })
  }

  const fecha = new Date().toISOString().slice(0, 10)
  const filename = opts.filename || `acta-mantencion-${(formData.patente || 'sin-patente').toLowerCase()}-${fecha}.pdf`

  if (opts.returnBlob) return doc.output('blob')

  doc.save(filename)
}

// ── Mapea una acta guardada (formato BD) al formato de generarPDFActa ────────
function mapearActaParaPDF(acta) {
  const cliente = acta.clientes || {}
  const vehiculo = acta.vehiculos || {}
  return {
    numero_acta: acta.numero_acta,
    nombre: cliente.nombre || '',
    rut: cliente.rut || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    marca: vehiculo.marca || '',
    modelo: vehiculo.modelo || '',
    anio: vehiculo.anio || '',
    patente: vehiculo.patente || '',
    vin: vehiculo.vin || '',
    color: vehiculo.color || '',
    fecha_ingreso: acta.fecha_ingreso || '',
    hora_ingreso: acta.hora_ingreso || '',
    kilometraje: acta.km || '',
    combustible: acta.combustible || '',
    llaves: acta.llaves ?? '',
    documentacion: acta.documentacion || [],
    estado_exterior: acta.estado_exterior || '',
    detalle_exterior: acta.detalle_exterior || '',
    estado_interior: acta.estado_interior || '',
    detalle_interior: acta.detalle_interior || '',
    fotos: acta.fotos || {},
    trabajo_solicitado: acta.trabajo_solicitado || '',
    nombre_cliente: acta.nombre_cliente || cliente.nombre || '',
    fecha_firma_cliente: acta.fecha_firma_cliente || acta.fecha_ingreso || '',
    firma_cliente: acta.firma_cliente || null,
    nombre_responsable: acta.nombre_responsable || '',
    cargo_responsable: acta.cargo_responsable || '',
    firma_secco: acta.firma_secco || null,
    foto_km_preview: acta.foto_km_url || null,
    foto_combustible_preview: acta.foto_combustible_url || null,
  }
}

// ── Re-descarga desde acta guardada ──────────────────────────────────────────
export async function generarPDFDesdeActaGuardada(acta, opts = {}) {
  return generarPDFActa(mapearActaParaPDF(acta), opts)
}
