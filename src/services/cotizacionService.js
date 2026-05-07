import { api } from './api';

export const cotizacionService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/cotizaciones${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/cotizaciones/${id}`),
  crearDesdeDiagnostico: (diagnosticoId) => api.post(`/api/cotizaciones/desde-diagnostico/${diagnosticoId}`, {}),
  actualizar: (id, datos) => api.put(`/api/cotizaciones/${id}`, datos),
  aprobar: (id) => api.patch(`/api/cotizaciones/${id}/aprobar`, {}),
  rechazar: (id, motivo = '') => api.patch(`/api/cotizaciones/${id}/rechazar`, { motivo }),
};
