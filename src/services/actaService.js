import { api } from './api';

export const actaService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/actas${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/actas/${id}`),
  /** GET /api/actas/patente/:patente?limite=&status= */
  buscarPorPatente: (patente, params = {}) => {
    const path = `/api/actas/patente/${encodeURIComponent(patente)}`
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
    ).toString()
    return api.get(`${path}${qs ? `?${qs}` : ''}`)
  },
  buscarBorradorPorPatente: (patente) => api.get(`/api/actas/borrador/patente/${encodeURIComponent(patente)}`),
  guardarBorrador: (formData) => api.post('/api/actas/borrador', formData),
  crear: (datos) => api.post('/api/actas', datos),
  actualizar: (id, datos) => api.put(`/api/actas/${id}`, datos),
  cerrar: (id) => api.patch(`/api/actas/${id}/cerrar`, {}),
  eliminar: (id) => api.delete(`/api/actas/${id}`),

  subirFoto: (actaId, tipo, base64, mimetype = 'image/jpeg', ext = 'jpg') =>
    api.post('/api/fotos/acta', { actaId, tipo, base64, mimetype, ext }),

  /** Crea (o devuelve) la OT asociada al acta */
  iniciarOT: (actaId) => api.post(`/api/actas/${actaId}/iniciar-ot`),
};
