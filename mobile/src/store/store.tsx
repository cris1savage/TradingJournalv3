import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { sampleData } from '@/lib/sample';
import { supabase } from '@/lib/supabase';
import { buildTheme, type Theme } from '@/lib/theme';
import { DEFAULT_PREFS, type Account, type Movement, type Prefs } from '@/lib/types';
import { today, uuid } from '@/lib/format';

const KEY = 'tj.state.v1';

type Data = { accounts: Account[]; moves: Movement[] };
type Persisted = Data & { prefs: Prefs };

type Store = Data & {
  ready: boolean;
  prefs: Prefs;
  theme: Theme;
  session: Session | null;
  cloudEnabled: boolean;
  syncing: boolean;
  hasSample: boolean;
  setPrefs: (p: Partial<Prefs>) => void;
  saveAccount: (a: Omit<Account, 'id' | 'created'> & { id?: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addMove: (m: Omit<Movement, 'id'>) => Promise<void>;
  deleteMove: (id: string) => Promise<void>;
  clearSample: () => void;
  wipeLocal: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/* ---- mapeo app <-> tablas de Supabase ---- */
const toRowAccount = (a: Account, user: string) => ({
  id: a.id, user_id: user, name: a.name, broker: a.broker, market: a.market, kind: a.kind,
  initial_capital: a.initial, color: a.color, created_at: a.created,
});
const toRowMove = (m: Movement, user: string) => ({
  id: m.id, user_id: user, account_id: m.acc, date: m.date, type: m.type, amount: m.amount, note: m.note,
});
type Row = Record<string, any>;
const fromRowAccount = (r: Row): Account => ({
  id: r.id, name: r.name, broker: r.broker, market: r.market, kind: r.kind,
  initial: Number(r.initial_capital), color: r.color, created: String(r.created_at).slice(0, 10),
});
const fromRowMove = (r: Row): Movement => ({
  id: r.id, acc: r.account_id, date: r.date, type: r.type, amount: Number(r.amount), note: r.note ?? '',
});

function fail(title: string, e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  Alert.alert(title, `${msg}\n\nEl cambio se ha guardado en el iPhone; vuelve a sincronizar desde Personalizar.`);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>({ accounts: [], moves: [] });
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // carga inicial
  useEffect(() => {
    (async () => {
      let saved: Persisted | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        saved = raw ? JSON.parse(raw) : null;
      } catch {}
      if (saved?.accounts) {
        setData({ accounts: saved.accounts, moves: saved.moves ?? [] });
        setPrefsState({ ...DEFAULT_PREFS, ...saved.prefs });
      } else {
        setData(sampleData());
      }
      setReady(true);
    })();
  }, []);

  // persistencia
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...data, prefs })).catch(() => {});
  }, [data, prefs, ready]);

  const userId = session?.user.id;

  const pull = useCallback(async () => {
    if (!supabase) return;
    const [a, m] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('movements').select('*').order('date'),
    ]);
    if (a.error) throw a.error;
    if (m.error) throw m.error;
    setData({ accounts: (a.data ?? []).map(fromRowAccount), moves: (m.data ?? []).map(fromRowMove) });
  }, []);

  // al iniciar sesión: sube lo creado en el iPhone (sin ejemplos) y descarga todo
  const syncAfterLogin = useCallback(async (uid: string) => {
    if (!supabase) return;
    setSyncing(true);
    try {
      const local = dataRef.current;
      const accs = local.accounts.filter((a) => !a.sample);
      const ids = new Set(accs.map((a) => a.id));
      const moves = local.moves.filter((m) => !m.sample && ids.has(m.acc));
      if (accs.length) {
        const r = await supabase.from('accounts').upsert(accs.map((a) => toRowAccount(a, uid)));
        if (r.error) throw r.error;
      }
      if (moves.length) {
        const r = await supabase.from('movements').upsert(moves.map((m) => toRowMove(m, uid)));
        if (r.error) throw r.error;
      }
      await pull();
    } catch (e) {
      fail('No se pudo sincronizar', e);
    } finally {
      setSyncing(false);
    }
  }, [pull]);

  useEffect(() => {
    if (!supabase || !ready) return;
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      if (d.session) syncAfterLogin(d.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' && s) syncAfterLogin(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [ready, syncAfterLogin]);

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((old) => ({ ...old, ...p })), []);

  const saveAccount: Store['saveAccount'] = useCallback(async (input) => {
    const existing = input.id ? dataRef.current.accounts.find((a) => a.id === input.id) : undefined;
    const acc: Account = existing
      ? { ...existing, ...input, id: existing.id, sample: undefined }
      : { ...input, id: uuid(), created: today() };
    setData((d) => ({
      ...d,
      accounts: existing ? d.accounts.map((a) => (a.id === acc.id ? acc : a)) : [...d.accounts, acc],
    }));
    if (supabase && userId) {
      const r = await supabase.from('accounts').upsert(toRowAccount(acc, userId));
      if (r.error) fail('No se pudo guardar en la nube', r.error);
    }
  }, [userId]);

  const deleteAccount = useCallback(async (id: string) => {
    setData((d) => ({ accounts: d.accounts.filter((a) => a.id !== id), moves: d.moves.filter((m) => m.acc !== id) }));
    if (supabase && userId) {
      const r = await supabase.from('accounts').delete().eq('id', id);
      if (r.error) fail('No se pudo borrar en la nube', r.error);
    }
  }, [userId]);

  const addMove = useCallback(async (input: Omit<Movement, 'id'>) => {
    const m: Movement = { ...input, id: uuid() };
    setData((d) => ({ ...d, moves: [...d.moves, m] }));
    const acc = dataRef.current.accounts.find((a) => a.id === m.acc);
    if (supabase && userId && !acc?.sample) {
      const r = await supabase.from('movements').insert(toRowMove(m, userId));
      if (r.error) fail('No se pudo guardar en la nube', r.error);
    }
  }, [userId]);

  const deleteMove = useCallback(async (id: string) => {
    setData((d) => ({ ...d, moves: d.moves.filter((m) => m.id !== id) }));
    if (supabase && userId) {
      const r = await supabase.from('movements').delete().eq('id', id);
      if (r.error) fail('No se pudo borrar en la nube', r.error);
    }
  }, [userId]);

  const clearSample = useCallback(() => {
    setData((d) => {
      const accounts = d.accounts.filter((a) => !a.sample);
      const ids = new Set(accounts.map((a) => a.id));
      return { accounts, moves: d.moves.filter((m) => !m.sample && ids.has(m.acc)) };
    });
  }, []);

  const wipeLocal = useCallback(() => setData({ accounts: [], moves: [] }), []);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    setSyncing(true);
    try { await pull(); } catch (e) { fail('No se pudo actualizar', e); } finally { setSyncing(false); }
  }, [pull, userId]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setData({ accounts: [], moves: [] }); // no dejar datos del usuario en el dispositivo
  }, []);

  const deleteCloudAccount = useCallback(async () => {
    if (!supabase) return;
    const r = await supabase.rpc('delete_user');
    if (r.error) { fail('No se pudo eliminar la cuenta', r.error); return; }
    await supabase.auth.signOut();
    setData({ accounts: [], moves: [] });
  }, []);

  const value = useMemo<Store>(() => ({
    ...data,
    ready, prefs, session, syncing,
    theme: buildTheme(prefs),
    cloudEnabled: !!supabase,
    hasSample: data.accounts.some((a) => a.sample),
    setPrefs, saveAccount, deleteAccount, addMove, deleteMove, clearSample, wipeLocal, refresh, signOut, deleteCloudAccount,
  }), [data, ready, prefs, session, syncing, setPrefs, saveAccount, deleteAccount, addMove, deleteMove, clearSample, wipeLocal, refresh, signOut, deleteCloudAccount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
export const useTheme = () => useStore().theme;
