import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface AuthRequest extends Request {
  user?: { id: string; email?: string };
  token?: string;
  perfil?: { rol: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  req.user = { id: user.id, email: user.email };
  req.token = token;
  next();
}

export default authenticate;
