import { api } from './api';

export const actaEntregaService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/actas-entrega${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/actas-entrega/${id}`),
  buscarPorPatente: (patente, params = {}) => {
    const path = `/api/actas-entrega/patente/${encodeURIComponent(patente)}`;
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
    ).toString();
    return api.get(`${path}${qs ? `?${qs}` : ''}`);
  },
  buscarBorradorPorPatente: (patente) =>
    api.get(`/api/actas-entrega/borrador/patente/${encodeURIComponent(patente)}`),
  guardarBorrador: (formData) => api.post('/api/actas-entrega/borrador', formData),
  crear: (datos) => api.post('/api/actas-entrega', datos),
  actualizar: (id, datos) => api.put(`/api/actas-entrega/${id}`, datos),
  cerrar: (id) => api.patch(`/api/actas-entrega/${id}/cerrar`, {}),
  eliminar: (id) => api.delete(`/api/actas-entrega/${id}`),
};
