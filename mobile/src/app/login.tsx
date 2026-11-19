import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Field, Segmented, success, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/store';

export default function Login() {
  const { theme: t } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean }>();

  const submit = async () => {
    if (!supabase) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMsg({ text: 'Escribe un email válido.' }); return; }
    if (password.length < 8) { setMsg({ text: 'La contraseña necesita al menos 8 caracteres.' }); return; }
    setBusy(true);
    setMsg(undefined);
    const creds = { email: email.trim().toLowerCase(), password };
    const r = mode === 'in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (r.error) {
      const m = r.error.message;
      setMsg({ text: /invalid login/i.test(m) ? 'Email o contraseña incorrectos.' : /already registered/i.test(m) ? 'Ese email ya tiene cuenta: inicia sesión.' : m });
      return;
    }
    if (mode === 'up' && !r.data.session) {
      setMsg({ ok: true, text: 'Te hemos enviado un email para confirmar la cuenta. Ábrelo y vuelve para iniciar sesión.' });
      setMode('in');
      return;
    }
    success();
    router.back();
  };

  if (!supabase) {
    return (
      <Sheet title="Sincronización">
        <Txt v="body">La conexión con la nube todavía no está configurada en esta versión.</Txt>
      </Sheet>
    );
  }

  return (
    <Sheet title={mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}>
      <Segmented options={[{ value: 'in', label: 'Tengo cuenta' }, { value: 'up', label: 'Soy nuevo' }]} value={mode} onChange={(v) => { setMode(v); setMsg(undefined); }} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="tu@email.com" />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        textContentType={mode === 'in' ? 'password' : 'newPassword'}
        placeholder="Mínimo 8 caracteres"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {msg && <Txt v="small" color={msg.ok ? t.pos : t.neg}>{msg.text}</Txt>}
      <Button title={busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'} onPress={submit} disabled={busy} />
      <View style={{ gap: 4 }}>
        <Txt v="small">Tus datos solo los ves tú: cada usuario tiene su propio espacio aislado en la base de datos.</Txt>
      </View>
    </Sheet>
  );
}
