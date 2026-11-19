import { router } from 'expo-router';
import { useState } from 'react';

import { Sheet } from '@/components/sheet';
import { Button, Field, success, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/store';

export default function CambiarPassword() {
  const { theme: t, session } = useStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (!supabase || !session?.user.email) return;
    if (next.length < 8) { setError('La nueva contraseña necesita al menos 8 caracteres.'); return; }
    if (next !== repeat) { setError('Las dos contraseñas nuevas no coinciden.'); return; }
    setBusy(true);
    setError(undefined);
    // Comprobamos la contraseña actual antes de cambiarla
    const check = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
    if (check.error) { setBusy(false); setError('La contraseña actual no es correcta.'); return; }
    const r = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (r.error) { setError(/should be different/i.test(r.error.message) ? 'La nueva contraseña tiene que ser distinta.' : r.error.message); return; }
    success();
    router.back();
  };

  return (
    <Sheet title="Cambiar contraseña">
      <Field label="Contraseña actual" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />
      <Field label="Nueva contraseña" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Mínimo 8 caracteres" />
      <Field label="Repite la nueva contraseña" value={repeat} onChangeText={setRepeat} secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={save} />
      {error && <Txt v="small" color={t.neg}>{error}</Txt>}
      <Button title={busy ? 'Guardando…' : 'Guardar nueva contraseña'} onPress={save} disabled={busy} />
    </Sheet>
  );
}
