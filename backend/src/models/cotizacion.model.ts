import { z } from 'zod';

export const ItemCotizacionSchema = z.object({
  tipo: z.enum(['repuesto', 'servicio', 'trabajo', 'mano_obra']),
  descripcion: z.string().min(1),
  cantidad: z.number().min(1).default(1),
  costo_unitario: z.number().min(0).default(0),
  precio_unitario: z.number().min(0).default(0),
  mano_obra: z.number().min(0).default(0),
  urgencia: z.enum(['necesario', 'recomendado', 'opcional']).default('recomendado'),
  observacion: z.string().optional().nullable(),
});

export const CotizacionUpdateSchema = z.object({
  items: z.array(ItemCotizacionSchema).optional(),
  status: z.enum(['borrador', 'lista', 'enviada', 'aprobada', 'rechazada']).optional(),
  notas: z.string().optional().nullable(),
  notas_internas: z.string().optional().nullable(),
  vista_cliente: z.record(z.string(), z.unknown()).optional(),
  descuento: z.number().min(0).optional(),
  tipo_presupuesto: z.enum(['inicial', 'final']).optional(),
});

export type ItemCotizacion = z.infer<typeof ItemCotizacionSchema>;
export type CotizacionUpdate = z.infer<typeof CotizacionUpdateSchema>;
