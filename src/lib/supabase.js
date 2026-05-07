import { supabase } from '../services/api'
import { diagnosticoService } from '../services/diagnosticoService'
import { ordenTrabajoService } from '../services/ordenTrabajoService'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function fileToExtension(file) {
  const extFromName = file.name?.split('.').pop()?.toLowerCase()
  if (extFromName) return extFromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function supabaseConfigurado() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export async function listarOTs(limite = 30, status) {
  return ordenTrabajoService.listar({ limite, ...(status ? { status } : {}) })
}

export async function listarOTsPorTecnico(tecnicoId, limite = 30, status) {
  const ots = await listarOTs(limite, status)
  if (!tecnicoId) return ots
  return ots.filter((ot) => ot.tecnico_id === tecnicoId || ot.tecnico_nombre === tecnicoId)
}

export async function cargarOTCompleta(id) {
  return ordenTrabajoService.obtener(id)
}

export async function avanzarEstadoOT(id, status) {
  return ordenTrabajoService.actualizar(id, { status, nota_historial: `Estado cambiado a: ${status}` })
}

export async function subirFotoDiagnostico(diagnosticoId, seccion, item, file) {
  const base64 = typeof file === 'string' ? file : await fileToDataUrl(file)
  const mimetype = typeof file === 'string' ? 'image/jpeg' : file.type || 'image/jpeg'
  const ext = typeof file === 'string' ? 'jpg' : fileToExtension(file)

  const data = await diagnosticoService.subirFoto(diagnosticoId, seccion, item, base64, mimetype, ext)
  return {
    ...data,
    item: data?.item ?? item ?? null,
    descripcion: data?.descripcion ?? '',
    orden: data?.orden ?? 0,
  }
}

export async function eliminarFotoDiagnostico(foto) {
  return diagnosticoService.eliminarFoto(foto)
}

export { supabase }