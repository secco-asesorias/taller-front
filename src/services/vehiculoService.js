import { api } from './api';

export const vehiculoService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/vehiculos${qs ? `?${qs}` : ''}`);
  },
  obtenerPorId: (id) => api.get(`/api/vehiculos/${id}`),
  buscarPorPatente: (patente) => api.get(`/api/vehiculos/patente/${encodeURIComponent(patente)}`),
  listarPorCliente: (clienteId) => api.get(`/api/vehiculos/cliente/${clienteId}`),
  crear: (datos) => api.post('/api/vehiculos', datos),
  actualizar: (id, datos) => api.put(`/api/vehiculos/${id}`, datos),
  eliminar: (id) => api.delete(`/api/vehiculos/${id}`),
};
