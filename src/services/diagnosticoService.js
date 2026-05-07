import { api } from './api';

export const diagnosticoService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/diagnosticos${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/diagnosticos/${id}`),
  buscarPorPatente: (patente) => api.get(`/api/diagnosticos/buscar/patente/${encodeURIComponent(patente)}`),
  crear: (actaId, patente) => api.post('/api/diagnosticos', { acta_id: actaId, patente }),
  actualizar: (id, datos) => api.put(`/api/diagnosticos/${id}`, datos),
  guardarChecklist: (id, items) => api.put(`/api/diagnosticos/${id}/checklist`, { items }),
  guardarRepuestos: (id, repuestos) => api.put(`/api/diagnosticos/${id}/repuestos`, { repuestos }),

  subirFoto: (diagnosticoId, seccion, item, base64, mimetype = 'image/jpeg', ext = 'jpg') =>
    api.post('/api/fotos/diagnostico', { diagnosticoId, seccion, item, base64, mimetype, ext }),

  eliminarFoto: (foto) => api.delete('/api/fotos/diagnostico', foto),
};
