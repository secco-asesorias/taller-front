import { api } from './api';

export const actaService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/actas${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/actas/${id}`),
  buscarBorradorPorPatente: (patente) => api.get(`/api/actas/borrador/patente/${encodeURIComponent(patente)}`),
  guardarBorrador: (formData) => api.post('/api/actas/borrador', formData),
  crear: (datos) => api.post('/api/actas', datos),
  actualizar: (id, datos) => api.put(`/api/actas/${id}`, datos),
  cerrar: (id) => api.patch(`/api/actas/${id}/cerrar`, {}),
  eliminar: (id) => api.delete(`/api/actas/${id}`),

  subirFoto: (actaId, tipo, base64, mimetype = 'image/jpeg', ext = 'jpg') =>
    api.post('/api/fotos/acta', { actaId, tipo, base64, mimetype, ext }),
};
