import { api, fetchBinary } from './api';
import { buildCotizacionPdfApiPayload } from '../utils/cotizacionPdfApiPayload';

function filenameFromContentDisposition(cd) {
  if (!cd) return null;
  const star = /filename\*=(?:UTF-8''|utf-8'')([^;\s]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(cd);
  if (plain) return plain[1].replace(/^["']|["']$/g, '');
  return null;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fallbackNombrePdf(cot, id) {
  const acta = cot.actas || {};
  const veh = cot.vehiculos || acta.vehiculos || {};
  const vehManual = cot.vista_cliente?.vehiculo_manual || {};
  const patente = String(veh.patente || vehManual.patente || '').replace(/[^\w-]/g, '');
  if (patente) return `cotizacion-${patente}.pdf`;
  if (cot.numero_cotizacion != null && cot.numero_cotizacion !== '') {
    return `cotizacion-${cot.numero_cotizacion}.pdf`;
  }
  return `cotizacion-${id}.pdf`;
}

export const cotizacionService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/cotizaciones${qs ? `?${qs}` : ''}`);
  },
  /** GET /api/cotizaciones/buscar/patente/:patente?limite= */
  buscarPorPatente: (patente, params = {}) => {
    const path = `/api/cotizaciones/buscar/patente/${encodeURIComponent(patente)}`
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
    ).toString()
    return api.get(`${path}${qs ? `?${qs}` : ''}`)
  },
  obtener: (id) => api.get(`/api/cotizaciones/${id}`),
  crearBorrador: () => api.post('/api/cotizaciones/borrador', {}),
  crearInicialDesdeActa: (actaId) => api.post(`/api/cotizaciones/desde-acta/${actaId}`, {}),
  crearDesdeDiagnostico: (diagnosticoId) => api.post(`/api/cotizaciones/desde-diagnostico/${diagnosticoId}`, {}),
  actualizar: (id, datos) => api.put(`/api/cotizaciones/${id}`, datos),
  aprobar: (id) => api.patch(`/api/cotizaciones/${id}/aprobar`, {}),
  rechazar: (id, motivo = '') => api.patch(`/api/cotizaciones/${id}/rechazar`, { motivo }),
  eliminar: (id) => api.delete(`/api/cotizaciones/${id}`),

  /** Vincula la cotización a un acta. Si más adelante existe el endpoint dedicado, cambiar acá. */
  vincularActa: (id, actaId) => api.put(`/api/cotizaciones/${id}`, { acta_id: actaId }),
  /** Desvincula la cotización del acta. Requiere que el backend acepte `acta_id: null` en el PUT. */
  desvincularActa: (id) => api.put(`/api/cotizaciones/${id}`, { acta_id: null }),

  /**
   * PDF cliente generado en servidor.
   * Los navegadores no envían body en GET; se usa POST con el mismo path y payload JSON.
   * Si el backend solo expone GET sin body, debe leer la cotización por id o añadir esta ruta POST.
   */
  descargarPdfCliente: async (id, cotizacion) => {
    const body = buildCotizacionPdfApiPayload(cotizacion);
    const { blob, contentDisposition } = await fetchBinary(
      'POST',
      `/api/cotizaciones/${encodeURIComponent(id)}/pdf`,
      body,
    );
    const fromHeader = filenameFromContentDisposition(contentDisposition);
    triggerBlobDownload(blob, fromHeader || fallbackNombrePdf(cotizacion, id));
  },
};
