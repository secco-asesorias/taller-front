import supabase from '../config/supabase';
import { upsertCliente } from './cliente.service';
import { upsertVehiculo } from './vehiculo.service';
import { ActaCreate, ActaUpdate } from '../models/acta.model';

const ACTA_SELECT = `
  id, numero_acta, fecha_ingreso, hora_ingreso, status, created_at, updated_at,
  km, combustible, tecnico_nombre, tc_nombre, cliente_id, vehiculo_id,
  clientes (id, nombre, rut, email, telefono),
  vehiculos (id, marca, modelo, patente, anio, color)
`;

interface BorradorInput {
  nombre: string; rut: string; telefono?: string; email?: string;
  marca: string; modelo: string; anio: number; patente: string;
  vin?: string; color?: string; fecha_ingreso: string; hora_ingreso?: string;
}

export async function guardarBorrador(formData: BorradorInput) {
  const cliente = await upsertCliente({
    nombre: formData.nombre, rut: formData.rut,
    telefono: formData.telefono, email: formData.email,
  });

  const vehiculo = await upsertVehiculo({
    marca: formData.marca, modelo: formData.modelo, anio: formData.anio,
    patente: formData.patente, vin: formData.vin || null,
    color: formData.color || null, cliente_id: cliente.id as string,
  });

  const { data: existente } = await supabase
    .from('actas')
    .select('id, numero_acta')
    .eq('vehiculo_id', vehiculo.id)
    .eq('status', 'borrador')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existente) return { acta: existente, cliente, vehiculo, reutilizado: true };

  const { data: acta, error } = await supabase
    .from('actas')
    .insert({
      vehiculo_id: vehiculo.id, cliente_id: cliente.id,
      fecha_ingreso: formData.fecha_ingreso, hora_ingreso: formData.hora_ingreso,
      km: 0, combustible: 'pendiente', status: 'borrador', checklist_completo: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { acta, cliente, vehiculo, reutilizado: false };
}

export async function crearActa(datos: ActaCreate) {
  if (!datos.vehiculo_id) throw new Error('No se puede crear un acta sin vehículo asociado.');
  const { data, error } = await supabase.from('actas').insert(datos).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarActa(id: string, datos: ActaUpdate) {
  const { data, error } = await supabase
    .from('actas')
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarActas({ status, limite = 30 }: { status?: string; limite?: number } = {}) {
  let query = supabase
    .from('actas')
    .select(ACTA_SELECT)
    .not('vehiculo_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limite);

  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function cargarActaCompleta(actaId: string) {
  const { data, error } = await supabase
    .from('actas')
    .select('*, clientes(*), vehiculos(*), fotos_acta(tipo, url)')
    .eq('id', actaId)
    .single();
  if (error) throw error;
  return data;
}

export async function buscarBorradorPorPatente(patente: string) {
  const patenteNorm = patente.trim().toUpperCase();
  const { data: vehiculo } = await supabase
    .from('vehiculos').select('id').ilike('patente', patenteNorm).single();

  if (!vehiculo) return [];

  const { data, error } = await supabase
    .from('actas')
    .select(ACTA_SELECT)
    .eq('vehiculo_id', (vehiculo as { id: string }).id)
    .eq('status', 'borrador')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
