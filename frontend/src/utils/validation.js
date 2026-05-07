// Validación de RUT chileno
export function validarRUT(rut) {
  if (!rut) return false
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '')
  if (rutLimpio.length < 2) return false

  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1).toUpperCase()

  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo
    multiplo = multiplo < 7 ? multiplo + 1 : 2
  }
  const dvEsperado = 11 - (suma % 11)
  const dvCalculado =
    dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado)

  return dv === dvCalculado
}

// Formatea RUT mientras el usuario escribe
export function formatearRUT(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, '')
  if (limpio.length === 0) return ''

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1).toUpperCase()

  if (cuerpo.length === 0) return dv

  let cuerpoFormateado = ''
  for (let i = cuerpo.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) cuerpoFormateado = '.' + cuerpoFormateado
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado
  }

  return `${cuerpoFormateado}-${dv}`
}

// Valida email
export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Valida teléfono chileno (8-9 dígitos)
export function validarTelefono(tel) {
  const limpio = tel.replace(/\D/g, '')
  return limpio.length >= 8 && limpio.length <= 12
}

// Valida patente chilena: siempre 6 caracteres (sin espacios). Formatos comunes: AABB12, BBBB12, AA1234
export function validarPatente(patente) {
  const p = String(patente ?? '').replace(/\s/g, '').toUpperCase()
  if (p.length !== 6) return false
  return (
    /^[A-Z]{2}[A-Z0-9]{2}\d{2}$/.test(p) ||
    /^[A-Z]{4}\d{2}$/.test(p) ||
    /^[A-Z]{2}\d{4}$/.test(p)
  )
}

// Validar sección 1
export function validarSeccion1(datos) {
  const errores = {}
  if (!datos.nombre?.trim()) errores.nombre = 'El nombre es obligatorio'
  if (!datos.rut?.trim()) {
    errores.rut = 'El RUT es obligatorio'
  } else if (!validarRUT(datos.rut)) {
    errores.rut = 'RUT inválido'
  }
  if (!datos.telefono?.trim()) {
    errores.telefono = 'El teléfono es obligatorio'
  } else if (!validarTelefono(datos.telefono)) {
    errores.telefono = 'Teléfono inválido'
  }
  if (!datos.email?.trim()) {
    errores.email = 'El correo es obligatorio'
  } else if (!validarEmail(datos.email)) {
    errores.email = 'Correo inválido'
  }
  return errores
}

// Validar sección 2
export function validarSeccion2(datos) {
  const errores = {}
  if (!datos.marca?.trim()) errores.marca = 'La marca es obligatoria'
  if (!datos.modelo?.trim()) errores.modelo = 'El modelo es obligatorio'
  if (!datos.anio || datos.anio < 1900 || datos.anio > new Date().getFullYear() + 1)
    errores.anio = 'Año inválido'
  if (!datos.patente?.trim()) {
    errores.patente = 'La patente es obligatoria'
  } else if (!validarPatente(datos.patente)) {
    const len = String(datos.patente).replace(/\s/g, '').length
    errores.patente =
      len !== 6
        ? 'La patente debe tener exactamente 6 caracteres'
        : 'Formato de patente inválido'
  }
  return errores
}

// Validar sección 3
export function validarSeccion3(datos) {
  const errores = {}
  if (!datos.fecha_ingreso) errores.fecha_ingreso = 'La fecha es obligatoria'
  if (!datos.hora_ingreso) errores.hora_ingreso = 'La hora es obligatoria'
  if (!datos.kilometraje || datos.kilometraje <= 0)
    errores.kilometraje = 'El kilometraje es obligatorio'
  if (!datos.foto_km_preview) errores.foto_km = 'La foto del kilometraje es obligatoria'
  if (!datos.combustible) errores.combustible = 'Selecciona el nivel de combustible'
  if (!datos.foto_combustible_preview) errores.foto_combustible = 'La foto del combustible es obligatoria'
  if (datos.llaves === '' || datos.llaves === null || datos.llaves === undefined) errores.llaves = 'Indica la cantidad de llaves'
  return errores
}

// Validar sección 4
export function validarSeccion4(datos) {
  const errores = {}
  if (!datos.estado_exterior) errores.estado_exterior = 'Selecciona el estado exterior'
  if (datos.estado_exterior === 'con_danos' && !datos.detalle_exterior?.trim())
    errores.detalle_exterior = 'Describe los daños observados'
  const fotosReq = ['frontal', 'trasera', 'lateral_izq', 'lateral_der']
  const fotosFaltantes = fotosReq.filter((f) => !datos.fotos?.[f])
  if (fotosFaltantes.length > 0)
    errores.fotos_exterior = 'Faltan fotos obligatorias del exterior'
  if (!datos.estado_interior) errores.estado_interior = 'Selecciona el estado interior'
  if (datos.estado_interior === 'con_observaciones' && !datos.detalle_interior?.trim())
    errores.detalle_interior = 'Describe las observaciones del interior'
  const fotosInterior = Array.isArray(datos.fotos?.interior) ? datos.fotos.interior : (datos.fotos?.interior ? [datos.fotos.interior] : [])
  if (!fotosInterior.length) errores.foto_interior = 'La foto del interior es obligatoria'
  return errores
}

// Validar sección 5
export function validarSeccion5(datos) {
  const errores = {}
  if (!datos.trabajo_solicitado?.trim())
    errores.trabajo_solicitado = 'Describe el trabajo solicitado'
  return errores
}

// Validar sección 6
export function validarSeccion6(datos) {
  const errores = {}
  if (!datos.acepta_declaracion) errores.acepta_declaracion = 'El cliente debe aceptar la declaración'
  if (!datos.acepta_responsabilidad_objetos) errores.acepta_responsabilidad_objetos = 'El cliente debe aceptar la responsabilidad por objetos no retirados'
  if (!datos.acepta_pruebas_ruta) errores.acepta_pruebas_ruta = 'El cliente debe autorizar pruebas de ruta'
  if (!datos.nombre_cliente?.trim()) errores.nombre_cliente = 'El nombre es obligatorio'
  if (!datos.firma_cliente) errores.firma_cliente = 'La firma del cliente es obligatoria'
  return errores
}

// Validar sección 7
export function validarSeccion7(datos) {
  const errores = {}
  if (!datos.nombre_responsable?.trim())
    errores.nombre_responsable = 'El nombre del responsable es obligatorio'
  if (!datos.cargo_responsable) errores.cargo_responsable = 'Selecciona el cargo'
  if (!datos.firma_secco) errores.firma_secco = 'La firma SECCO es obligatoria'
  return errores
}
