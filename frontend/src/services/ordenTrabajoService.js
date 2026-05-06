import { api } from './api';

export const ordenTrabajoService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/ordenes-trabajo${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/ordenes-trabajo/${id}`),
  actualizar: (id, datos) => api.put(`/api/ordenes-trabajo/${id}`, datos),
  asignar: (id, tecnicoId, tecnicoNombre) =>
    api.patch(`/api/ordenes-trabajo/${id}/asignar`, { tecnico_id: tecnicoId, tecnico_nombre: tecnicoNombre }),
};
