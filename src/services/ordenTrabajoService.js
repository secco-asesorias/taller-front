import { api } from './api';

export const ordenTrabajoService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/ordenes-trabajo${qs ? `?${qs}` : ''}`);
  },
  obtener: (id) => api.get(`/api/ordenes-trabajo/${id}`),
  actualizar: (id, datos) => api.put(`/api/ordenes-trabajo/${id}`, datos),
  /** Asigna técnico. Acepta { tecnico_id, tecnico_nombre } o { email } */
  asignar: (id, datos) =>
    api.patch(`/api/ordenes-trabajo/${id}/asignar`, datos),
  /** Mecánico inicia la OT → guarda inicio_servicio */
  iniciarOT: (id) => api.patch(`/api/ordenes-trabajo/${id}/iniciar-ot`, {}),
  /** Mecánico termina la OT → pasa a en_revision */
  terminarOT: (id) => api.patch(`/api/ordenes-trabajo/${id}/terminar-ot`, {}),
  /** TC aprueba la OT → pasa a finalizada */
  aprobarOT: (id) => api.patch(`/api/ordenes-trabajo/${id}/aprobar`, {}),
  /** TC entrega el vehículo → pasa a entregada + crea acta de entrega */
  entregar: (id) => api.patch(`/api/ordenes-trabajo/${id}/entregar`, {}),
  /** Eliminar OT (admin) */
  eliminar: (id) => api.delete(`/api/ordenes-trabajo/${id}`),
};
