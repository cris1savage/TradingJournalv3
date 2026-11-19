import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Field, Segmented, success, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/store';

type Mode = 'in' | 'up' | 'reset' | 'reset-code';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function niceError(m: string) {
  if (/invalid login/i.test(m)) return 'Email o contraseña incorrectos.';
  if (/already registered|already been registered/i.test(m)) return 'Ese email ya tiene cuenta: inicia sesión.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu email con el enlace que te enviamos y vuelve a intentarlo.';
  if (/token has expired|invalid.*otp|otp.*invalid|token.*invalid/i.test(m)) return 'El código no es válido o ha caducado. Pide uno nuevo.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  if (/should be different/i.test(m)) return 'La nueva contraseña tiene que ser distinta de la anterior.';
  return m;
}

export default function Login() {
  const { theme: t } = useStore();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean }>();

  const go = (m: Mode) => { setMode(m); setMsg(undefined); setPassword(''); setCode(''); };
  const cleanEmail = email.trim().toLowerCase();

  const run = async (fn: () => Promise<void>) => {
    if (!supabase) return;
    setBusy(true);
    setMsg(undefined);
    try { await fn(); } finally { setBusy(false); }
  };

  const signInOrUp = () => run(async () => {
    if (!EMAIL_RE.test(cleanEmail)) { setMsg({ text: 'Escribe un email válido.' }); return; }
    if (password.length < 8) { setMsg({ text: 'La contraseña necesita al menos 8 caracteres.' }); return; }
    const creds = { email: cleanEmail, password };
    const r = mode === 'in' ? await supabase!.auth.signInWithPassword(creds) : await supabase!.auth.signUp(creds);
    if (r.error) { setMsg({ text: niceError(r.error.message) }); return; }
    if (mode === 'up' && !r.data.session) {
      setMsg({ ok: true, text: 'Cuenta creada. Te hemos enviado un email para confirmarla: ábrelo y vuelve para iniciar sesión.' });
      go('in');
      return;
    }
    success();
    router.back();
  });

  const sendResetCode = () => run(async () => {
    if (!EMAIL_RE.test(cleanEmail)) { setMsg({ text: 'Escribe el email de tu cuenta.' }); return; }
    const r = await supabase!.auth.resetPasswordForEmail(cleanEmail);
    if (r.error) { setMsg({ text: niceError(r.error.message) }); return; }
    setMode('reset-code');
    setMsg({ ok: true, text: `Si ${cleanEmail} tiene cuenta, te llegará un email con un código de 6 dígitos. Revisa también la carpeta de spam.` });
  });

  const confirmReset = () => run(async () => {
    if (!/^\d{6,8}$/.test(code.trim())) { setMsg({ text: 'Escribe el código numérico del email.' }); return; }
    if (password.length < 8) { setMsg({ text: 'La nueva contraseña necesita al menos 8 caracteres.' }); return; }
    const v = await supabase!.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'recovery' });
    if (v.error) { setMsg({ text: niceError(v.error.message) }); return; }
    const u = await supabase!.auth.updateUser({ password });
    if (u.error) { setMsg({ text: niceError(u.error.message) }); return; }
    success();
    router.back();
  });

  if (!supabase) {
    return (
      <Sheet title="Sincronización">
        <Txt v="body">La conexión con la nube todavía no está configurada en esta versión.</Txt>
      </Sheet>
    );
  }

  const isReset = mode === 'reset' || mode === 'reset-code';
  const title = mode === 'in' ? 'Iniciar sesión' : mode === 'up' ? 'Crear cuenta' : 'Recuperar contraseña';

  return (
    <Sheet title={title}>
      {!isReset && (
        <Segmented
          options={[{ value: 'in', label: 'Tengo cuenta' }, { value: 'up', label: 'Soy nuevo' }]}
          value={mode as 'in' | 'up'}
          onChange={go}
        />
      )}

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="tu@email.com"
        editable={mode !== 'reset-code'}
      />

      {mode === 'reset-code' && (
        <Field
          label="Código del email"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={8}
          style={{ fontSize: 22, letterSpacing: 4, fontVariant: ['tabular-nums'] }}
        />
      )}

      {mode !== 'reset' && (
        <Field
          label={mode === 'reset-code' ? 'Nueva contraseña' : 'Contraseña'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          textContentType={mode === 'in' ? 'password' : 'newPassword'}
          placeholder="Mínimo 8 caracteres"
          returnKeyType="go"
          onSubmitEditing={mode === 'reset-code' ? confirmReset : signInOrUp}
        />
      )}

      {msg && <Txt v="small" color={msg.ok ? t.pos : t.neg}>{msg.text}</Txt>}

      {mode === 'in' || mode === 'up' ? (
        <Button title={busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'} onPress={signInOrUp} disabled={busy} />
      ) : mode === 'reset' ? (
        <Button title={busy ? 'Enviando…' : 'Enviarme un código'} onPress={sendResetCode} disabled={busy} />
      ) : (
        <Button title={busy ? 'Un momento…' : 'Cambiar contraseña y entrar'} onPress={confirmReset} disabled={busy} />
      )}

      <View style={{ alignItems: 'center', gap: 14, marginTop: 4 }}>
        {mode === 'in' && (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => go('reset')}>
            <Txt v="small" color={t.accent} style={{ fontWeight: '600' }}>He olvidado mi contraseña</Txt>
          </Pressable>
        )}
        {mode === 'reset-code' && (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={sendResetCode} disabled={busy}>
            <Txt v="small" color={t.accent} style={{ fontWeight: '600' }}>Enviar otro código</Txt>
          </Pressable>
        )}
        {isReset && (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => go('in')}>
            <Txt v="small" color={t.accent} style={{ fontWeight: '600' }}>Volver a iniciar sesión</Txt>
          </Pressable>
        )}
      </View>

      <Txt v="small" style={{ textAlign: 'center' }}>
        Tus datos solo los ves tú: cada usuario tiene su propio espacio aislado en la base de datos. Puedes borrar tus datos o tu cuenta en cualquier momento desde Personalizar.
      </Txt>
    </Sheet>
  );
}
