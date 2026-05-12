import { api } from './api';

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
};
