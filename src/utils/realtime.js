import { supabase } from '../lib/supabase'

/**
 * Suscribe a cambios en una tabla de Supabase.
 * Devuelve una función de cleanup para llamar en useEffect return.
 *
 * @param {string} tabla - nombre de la tabla a escuchar
 * @param {function} callback - recibe el payload {eventType, new, old}
 * @returns {function} cleanup
 */
export function suscribirTabla(tabla, callback) {
  const channel = supabase
    .channel(`realtime:${tabla}:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tabla },
      (payload) => callback(payload)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Suscribe a cambios en una fila específica de una tabla.
 */
export function suscribirFila(tabla, columna, valor, callback) {
  const channel = supabase
    .channel(`realtime:${tabla}:${columna}:${valor}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tabla,
        filter: `${columna}=eq.${valor}`,
      },
      (payload) => callback(payload)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
