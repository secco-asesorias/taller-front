import { api } from './api';

export const clienteService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/clientes${qs ? `?${qs}` : ''}`);
  },
  obtenerPorId: (id) => api.get(`/api/clientes/${id}`),
  obtenerPorRut: (rut) => api.get(`/api/clientes/rut/${encodeURIComponent(rut)}`),
  crear: (datos) => api.post('/api/clientes', datos),
  actualizar: (id, datos) => api.put(`/api/clientes/${id}`, datos),
};
