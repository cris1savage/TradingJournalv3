import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';
import { buildTheme, type Theme } from '@/lib/theme';
import { syncWidget } from '@/lib/widget-sync';
import { fetchFx } from '@/lib/fx';
import { DEFAULT_PREFS, type Account, type DayNote, type Movement, type Prefs } from '@/lib/types';
import { today, uuid } from '@/lib/format';

const KEY = 'tj.state.v1';

type Data = { accounts: Account[]; moves: Movement[]; notes: DayNote[] };
const EMPTY: Data = { accounts: [], moves: [], notes: [] };
const addDaysSafe = (d: string, n: number) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
/** owner: id del usuario al que pertenece la copia local (para no mezclar datos entre usuarios). */
type Persisted = Data & { prefs: Prefs; owner?: string | null };

type Store = Data & {
  ready: boolean;
  /** true cuando ya sabemos si hay sesión (evita parpadeos al abrir). */
  authReady: boolean;
  prefs: Prefs;
  theme: Theme;
  session: Session | null;
  cloudEnabled: boolean;
  syncing: boolean;
  hasSample: boolean;
  setPrefs: (p: Partial<Prefs>) => void;
  /** Crea o actualiza una cuenta y devuelve su id. */
  saveAccount: (a: Omit<Account, 'id' | 'created'> & { id?: string }) => Promise<string>;
  deleteAccount: (id: string) => Promise<void>;
  addMove: (m: Omit<Movement, 'id'>) => Promise<void>;
  deleteMove: (id: string) => Promise<void>;
  updateMove: (m: Movement) => Promise<void>;
  clearSample: () => void;
  wipeLocal: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteCloudAccount: () => Promise<void>;
  deleteCloudData: () => Promise<boolean>;
  updateProfileName: (name: string) => Promise<boolean>;
  saveNote: (n: DayNote) => Promise<void>;
  /** Guarda varios movimientos de una vez (un trade copiado en varias cuentas, o una importación). */
  addMoves: (ms: Omit<Movement, 'id'>[]) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/* ---- mapeo app <-> tablas de Supabase ---- */
const toRowAccount = (a: Account, user: string) => ({
  id: a.id, user_id: user, name: a.name, broker: a.broker, market: a.market, kind: a.kind,
  initial_capital: a.initial, color: a.color, created_at: a.created,
  daily_loss_limit: a.dailyLossLimit ?? null, max_drawdown: a.maxDrawdown ?? null, profit_target: a.profitTarget ?? null,
  status: a.status ?? 'activa', currency: a.currency ?? 'USD', drawdown_type: a.drawdownType ?? 'static',
  risk_per_trade_pct: a.riskPct ?? null, max_trades_per_day: a.maxTradesPerDay ?? null, min_trading_days: a.minTradingDays ?? null,
});
const toRowMove = (m: Movement, user: string) => ({
  id: m.id, user_id: user, account_id: m.acc, date: m.date, type: m.type, amount: m.amount, note: m.note,
});
type Row = Record<string, any>;
const fromRowAccount = (r: Row): Account => ({
  id: r.id, name: r.name, broker: r.broker, market: r.market, kind: r.kind,
  initial: Number(r.initial_capital), color: r.color, created: String(r.created_at).slice(0, 10),
  dailyLossLimit: r.daily_loss_limit == null ? null : Number(r.daily_loss_limit),
  maxDrawdown: r.max_drawdown == null ? null : Number(r.max_drawdown),
  profitTarget: r.profit_target == null ? null : Number(r.profit_target),
  status: r.status ?? 'activa', currency: r.currency ?? 'USD', drawdownType: r.drawdown_type ?? 'static',
  riskPct: r.risk_per_trade_pct == null ? null : Number(r.risk_per_trade_pct),
  maxTradesPerDay: r.max_trades_per_day ?? null, minTradingDays: r.min_trading_days ?? null,
});
const fromRowNote = (r: Row): DayNote => ({ date: r.date, plan: r.plan ?? '', review: r.review ?? '', mood: r.mood ?? null, followed: r.followed ?? null });
const fromRowMove = (r: Row): Movement => ({
  id: r.id, acc: r.account_id, date: r.date, type: r.type, amount: Number(r.amount), note: r.note ?? '',
});

function fail(title: string, e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  Alert.alert(title, `${msg}\n\nComprueba tu conexión y vuelve a intentarlo; puedes sincronizar desde Perfil.`);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(EMPTY);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [owner, setOwner] = useState<string | null>(null);
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
        // los datos de ejemplo de versiones anteriores no se conservan
        const accounts = saved.accounts.filter((a) => !a.sample);
        const ids = new Set(accounts.map((a) => a.id));
        setData({ accounts, moves: (saved.moves ?? []).filter((m) => !m.sample && ids.has(m.acc)), notes: saved.notes ?? [] });
        setPrefsState({ ...DEFAULT_PREFS, ...saved.prefs });
        setOwner(saved.owner ?? null);
      }
      setReady(true);
    })();
  }, []);

  // cambios de divisa: se actualizan una vez al día
  useEffect(() => {
    if (!ready) return;
    const t = today();
    if (prefs.fx?.at && prefs.fx.at >= addDaysSafe(t, -1)) return;
    fetchFx().then((fx) => { if (fx) setPrefsState((p) => ({ ...p, fx })); });
  }, [ready, prefs.fx?.at]);

  // persistencia
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...data, prefs, owner })).catch(() => {});
    syncWidget(data.accounts, data.moves, prefs);
  }, [data, prefs, owner, ready]);

  const userId = session?.user.id;

  const pull = useCallback(async () => {
    if (!supabase) return;
    const [a, m] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('movements').select('*').order('date'),
    ]);
    if (a.error) throw a.error;
    if (m.error) throw m.error;
    // las notas son opcionales: si la tabla aún no existe, se ignora el error
    const n = await supabase.from('day_notes').select('*');
    setData({ accounts: (a.data ?? []).map(fromRowAccount), moves: (m.data ?? []).map(fromRowMove), notes: n.error ? [] : (n.data ?? []).map(fromRowNote) });
  }, []);

  // al iniciar sesión: la nube es la fuente de verdad. La copia local de otro usuario se descarta.
  const syncAfterLogin = useCallback(async (uid: string) => {
    if (!supabase) return;
    setSyncing(true);
    setOwner((prev) => {
      if (prev && prev !== uid) setData(EMPTY);
      return uid;
    });
    try {
      await pull();
    } catch (e) {
      fail('No se pudieron cargar tus datos', e);
    } finally {
      setSyncing(false);
    }
  }, [pull]);

  useEffect(() => {
    if (!supabase || !ready) return;
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setAuthReady(true);
      if (d.session) syncAfterLogin(d.session.user.id);
      else setData(EMPTY);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' && s) syncAfterLogin(s.user.id);
      if (event === 'SIGNED_OUT') { setData(EMPTY); setOwner(null); }
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
    return acc.id;
  }, [userId]);

  const deleteAccount = useCallback(async (id: string) => {
    setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id), moves: d.moves.filter((m) => m.acc !== id) }));
    if (supabase && userId) {
      const r = await supabase.from('accounts').delete().eq('id', id);
      if (r.error) fail('No se pudo borrar en la nube', r.error);
    }
  }, [userId]);

  const addMove = useCallback(async (input: Omit<Movement, 'id'>) => {
    const m: Movement = { ...input, id: uuid() };
    setData((d) => ({ ...d, moves: [...d.moves, m] }));
    setPrefsState((p) => ({ ...p, lastAcc: m.acc }));
    const acc = dataRef.current.accounts.find((a) => a.id === m.acc);
    if (supabase && userId && !acc?.sample) {
      const r = await supabase.from('movements').insert(toRowMove(m, userId));
      if (r.error) fail('No se pudo guardar en la nube', r.error);
    }
  }, [userId]);

  const addMoves = useCallback(async (inputs: Omit<Movement, 'id'>[]) => {
    if (!inputs.length) return;
    const ms: Movement[] = inputs.map((x) => ({ ...x, id: uuid() }));
    setData((d) => ({ ...d, moves: [...d.moves, ...ms] }));
    if (supabase && userId) {
      const r = await supabase.from('movements').insert(ms.map((m) => toRowMove(m, userId)));
      if (r.error) fail('No se pudo guardar en la nube', r.error);
    }
    setPrefsState((p) => ({ ...p, lastAcc: inputs[inputs.length - 1].acc }));
  }, [userId]);

  const saveNote = useCallback(async (n: DayNote) => {
    setData((d) => ({ ...d, notes: [...d.notes.filter((x) => x.date !== n.date), n] }));
    if (supabase && userId) {
      const r = await supabase.from('day_notes').upsert({ user_id: userId, date: n.date, plan: n.plan, review: n.review, mood: n.mood, followed: n.followed, updated_at: new Date().toISOString() });
      if (r.error) fail('No se pudo guardar la nota', r.error);
    }
  }, [userId]);

  const updateMove = useCallback(async (m: Movement) => {
    setData((d) => ({ ...d, moves: d.moves.map((x) => (x.id === m.id ? { ...m, sample: x.sample } : x)) }));
    const acc = dataRef.current.accounts.find((a) => a.id === m.acc);
    if (supabase && userId && !acc?.sample) {
      const r = await supabase.from('movements').upsert(toRowMove(m, userId));
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
      return { ...d, accounts, moves: d.moves.filter((m) => !m.sample && ids.has(m.acc)) };
    });
  }, []);

  const wipeLocal = useCallback(() => setData(EMPTY), []);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    setSyncing(true);
    try { await pull(); } catch (e) { fail('No se pudo actualizar', e); } finally { setSyncing(false); }
  }, [pull, userId]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setData(EMPTY); // no dejar datos del usuario en el dispositivo
  }, []);

  const deleteCloudAccount = useCallback(async () => {
    if (!supabase) return;
    const r = await supabase.rpc('delete_user');
    if (r.error) { fail('No se pudo eliminar la cuenta', r.error); return; }
    await supabase.auth.signOut();
    setData(EMPTY);
  }, []);

  // Borra cuentas y movimientos de la nube, pero mantiene el usuario
  const deleteCloudData = useCallback(async () => {
    if (!supabase || !userId) return false;
    const r = await supabase.from('accounts').delete().eq('user_id', userId);
    if (r.error) { fail('No se pudieron borrar los datos', r.error); return false; }
    setData(EMPTY);
    return true;
  }, [userId]);

  const updateProfileName = useCallback(async (name: string) => {
    if (!supabase || !session) return false;
    const r = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (r.error) { fail('No se pudo guardar tu nombre', r.error); return false; }
    if (r.data.user) setSession((s) => (s ? { ...s, user: r.data.user! } : s));
    return true;
  }, [session]);

  const value = useMemo<Store>(() => ({
    ...data,
    ready, authReady, prefs, session, syncing,
    theme: buildTheme(prefs),
    cloudEnabled: !!supabase,
    hasSample: data.accounts.some((a) => a.sample),
    setPrefs, saveAccount, deleteAccount, addMove, deleteMove, updateMove, clearSample, wipeLocal, refresh, signOut, deleteCloudAccount, deleteCloudData, updateProfileName, saveNote, addMoves,
  }), [data, ready, authReady, prefs, session, syncing, setPrefs, saveAccount, deleteAccount, addMove, deleteMove, updateMove, clearSample, wipeLocal, refresh, signOut, deleteCloudAccount, deleteCloudData, updateProfileName, saveNote, addMoves]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
export const useTheme = () => useStore().theme;
