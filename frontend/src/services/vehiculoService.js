import { api } from './api';

export const vehiculoService = {
  obtenerPorId: (id) => api.get(`/api/vehiculos/${id}`),
  buscarPorPatente: (patente) => api.get(`/api/vehiculos/patente/${encodeURIComponent(patente)}`),
  listarPorCliente: (clienteId) => api.get(`/api/vehiculos/cliente/${clienteId}`),
  crear: (datos) => api.post('/api/vehiculos', datos),
  actualizar: (id, datos) => api.put(`/api/vehiculos/${id}`, datos),
};
