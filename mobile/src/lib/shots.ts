/**
 * Fotos del gráfico de cada trade.
 * En la nube van a un almacén privado: cada usuario solo puede ver su carpeta (<usuario>/<movimiento>.jpg).
 * Mientras no hay conexión, la foto se guarda en el iPhone y se sube después.
 */
import { File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { Movement } from './types';

const BUCKET = 'trade-shots';
export const shotPath = (uid: string, moveId: string) => `${uid}/${moveId}.jpg`;

/** Copia la foto elegida a la carpeta de la app para que iOS no la borre antes de subirla. */
export function keepLocal(uri: string, moveKey: string): string {
  if (Platform.OS === 'web') return uri;
  try {
    const dest = new File(Paths.document, `shot-${moveKey}-${Date.now()}.jpg`);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export function dropLocal(uri?: string | null) {
  if (!uri || Platform.OS === 'web') return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch {}
}

/** Sube la foto local y devuelve la ruta en la nube. Lanza error si no hay conexión. */
export async function uploadShot(uid: string, moveId: string, localUri: string): Promise<string> {
  if (!supabase) throw new Error('Sin nube');
  const path = shotPath(uid, moveId);
  const bytes = Platform.OS === 'web' ? new Uint8Array(await (await fetch(localUri)).arrayBuffer()) : await new File(localUri).bytes();
  const r = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (r.error) throw r.error;
  urls.delete(path);
  return path;
}

export async function removeShots(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (!supabase || !list.length) return;
  for (let i = 0; i < list.length; i += 100) await supabase.storage.from(BUCKET).remove(list.slice(i, i + 100));
  list.forEach((p) => urls.delete(p));
}

/** Borra todas las fotos del usuario (al borrar sus datos o su cuenta). */
export async function removeAllShots(uid: string) {
  if (!supabase) return;
  for (let round = 0; round < 50; round++) {
    const r = await supabase.storage.from(BUCKET).list(uid, { limit: 1000 });
    if (r.error || !r.data?.length) return;
    await supabase.storage.from(BUCKET).remove(r.data.map((f) => `${uid}/${f.name}`));
    if (r.data.length < 1000) return;
  }
}

/* enlaces temporales para ver las fotos (caducan en 1 hora) */
const urls = new Map<string, { url: string; until: number }>();
async function signedUrl(path: string) {
  const c = urls.get(path);
  if (c && c.until > Date.now()) return c.url;
  if (!supabase) return null;
  const r = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (r.error || !r.data) return null;
  urls.set(path, { url: r.data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return r.data.signedUrl;
}

/** Dirección para mostrar la foto de un movimiento (local si aún no se ha subido). */
export function useShotUrl(m?: Pick<Movement, 'shot' | 'shotLocal'> | null) {
  const local = m?.shotLocal ?? null;
  const path = m?.shot ?? null;
  const [remote, setRemote] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (local || !path) return;
    let alive = true;
    signedUrl(path).then((url) => { if (alive) setRemote({ path, url }); });
    return () => { alive = false; };
  }, [local, path]);
  if (local) return local;
  return remote && remote.path === path ? remote.url : null;
}
