import { supabase } from '../lib/supabase'

/**
 * Reclama el lock de edición sobre un documento.
 * Si lo tiene otro usuario, retorna { bloqueadoPor: { nombre, activo_hasta } }.
 * Si lo pudo reclamar, retorna null.
 */
export async function reclamarLock(tabla, registroId, usuarioId, nombreUsuario) {
  if (!registroId || !usuarioId) return null

  // Verificar si alguien más tiene el lock activo
  const { data: actual } = await supabase
    .from('sesiones_edicion')
    .select('usuario_id, nombre_usuario, activo_hasta')
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .single()

  if (actual) {
    const vence = new Date(actual.activo_hasta)
    const aun_activo = vence > new Date()

    // Si lo tiene otro usuario y el lock no venció, informar
    if (actual.usuario_id !== usuarioId && aun_activo) {
      return { bloqueadoPor: { nombre: actual.nombre_usuario, activo_hasta: actual.activo_hasta } }
    }
  }

  // Reclamar o renovar el lock
  await supabase
    .from('sesiones_edicion')
    .upsert({
      tabla,
      registro_id: registroId,
      usuario_id: usuarioId,
      nombre_usuario: nombreUsuario,
      activo_hasta: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    }, { onConflict: 'tabla,registro_id' })

  return null
}

/**
 * Renueva el lock (llamar cada ~90s mientras el formulario esté abierto).
 */
export async function renovarLock(tabla, registroId, usuarioId) {
  if (!registroId || !usuarioId) return

  await supabase
    .from('sesiones_edicion')
    .update({ activo_hasta: new Date(Date.now() + 2 * 60 * 1000).toISOString() })
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .eq('usuario_id', usuarioId)
}

/**
 * Libera el lock al cerrar el formulario.
 */
export async function liberarLock(tabla, registroId, usuarioId) {
  if (!registroId || !usuarioId) return

  await supabase
    .from('sesiones_edicion')
    .delete()
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .eq('usuario_id', usuarioId)
}

/**
 * Consulta quién está editando actualmente (sin reclamar el lock).
 */
export async function consultarLock(tabla, registroId) {
  if (!registroId) return null

  const { data } = await supabase
    .from('sesiones_edicion')
    .select('usuario_id, nombre_usuario, activo_hasta')
    .eq('tabla', tabla)
    .eq('registro_id', registroId)
    .single()

  if (!data) return null

  const vence = new Date(data.activo_hasta)
  if (vence <= new Date()) return null

  return { nombre: data.nombre_usuario, activo_hasta: data.activo_hasta }
}
