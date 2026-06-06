const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Error al conectar con el servidor'), {
      status: res.status,
      data: err,
    });
  }

  return res.json();
}

export const reservaService = {
  getHorariosDisponibles: (fecha) =>
    request('GET', `/api/horarios/disponibles?fecha=${fecha}`),

  crearReserva: (datos) =>
    request('POST', '/api/reservas', datos),
};
