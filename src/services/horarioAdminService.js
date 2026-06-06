import { api } from './api';

export const horarioAdminService = {
  getReservasSemana: (fecha_desde, fecha_hasta) =>
    api.get(`/api/reservas?fecha_desde=${fecha_desde}&fecha_hasta=${fecha_hasta}`),

  actualizarEstadoReserva: (id, estado) =>
    api.patch(`/api/reservas/${id}/estado`, { estado }),

  eliminarReserva: (id) =>
    api.delete(`/api/reservas/${id}`),
};
