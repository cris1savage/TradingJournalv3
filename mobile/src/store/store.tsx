import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';
import { buildTheme, type Theme } from '@/lib/theme';
import { syncWidget } from '@/lib/widget-sync';
import { fetchFx } from '@/lib/fx';
import { dropLocal, removeAllShots, removeShots, uploadShot } from '@/lib/shots';
import { DEFAULT_PREFS, type Account, type DayNote, type Movement, type Prefs } from '@/lib/types';
import { addDays, today, uuid } from '@/lib/format';

const KEY = 'tj.state.v1';

type Data = { accounts: Account[]; moves: Movement[]; notes: DayNote[] };
const EMPTY: Data = { accounts: [], moves: [], notes: [] };
/** Cambios que no se pudieron subir (sin conexión): se reintentan antes de cada descarga. */
type Pending = { acc: string[]; mov: string[]; note: string[]; delAcc: string[]; delMov: string[] };
const NO_PENDING: Pending = { acc: [], mov: [], note: [], delAcc: [], delMov: [] };
const hasPending = (p: Pending) => Object.values(p).some((x) => x.length > 0);
/** owner: id del usuario al que pertenece la copia local (para no mezclar datos entre usuarios). */
type Persisted = Data & { prefs: Prefs; owner?: string | null; pending?: Pending };

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
  addMoves: (ms: Omit<Movement, 'id'>[], opts?: { imported?: boolean }) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/* ---- mapeo app <-> tablas de Supabase ---- */
const toRowAccount = (a: Account, user: string) => ({
  id: a.id, user_id: user, name: a.name, broker: a.broker, market: a.market, kind: a.kind,
  initial_capital: a.initial, color: a.color,
  daily_loss_limit: a.dailyLossLimit ?? null, max_drawdown: a.maxDrawdown ?? null, profit_target: a.profitTarget ?? null,
  status: a.status ?? 'activa', currency: a.currency ?? 'USD', drawdown_type: a.drawdownType ?? 'static',
  risk_per_trade_pct: a.riskPct ?? null, max_trades_per_day: a.maxTradesPerDay ?? null, min_trading_days: a.minTradingDays ?? null,
  withdraw_trigger_pct: a.withdrawTriggerPct ?? null, withdraw_pct: a.withdrawPct ?? null,
});
const toRowMove = (m: Movement, user: string) => ({
  id: m.id, user_id: user, account_id: m.acc, date: m.date, type: m.type, amount: m.amount, note: m.note,
  symbol: m.symbol || null, side: m.side ?? null, lots: m.lots ?? null, entry_price: m.entry ?? null, exit_price: m.exit ?? null,
  stop_loss: m.sl ?? null, take_profit: m.tp ?? null, risk_amount: m.risk ?? null, setup: m.setup || null, emotion: m.emotion ?? null,
  followed_plan: m.followedPlan ?? null, rating: m.rating ?? null, shot_path: m.shot ?? null,
});
const num = (v: unknown) => (v == null ? null : Number(v));
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
  withdrawTriggerPct: r.withdraw_trigger_pct == null ? null : Number(r.withdraw_trigger_pct),
  withdrawPct: r.withdraw_pct == null ? null : Number(r.withdraw_pct),
});
const fromRowNote = (r: Row): DayNote => ({ date: r.date, plan: r.plan ?? '', review: r.review ?? '', mood: r.mood ?? null, followed: r.followed ?? null });
const fromRowMove = (r: Row): Movement => ({
  id: r.id, acc: r.account_id, date: r.date, type: r.type, amount: Number(r.amount), note: r.note ?? '',
  symbol: r.symbol ?? null, side: r.side ?? null, lots: num(r.lots), entry: num(r.entry_price), exit: num(r.exit_price),
  sl: num(r.stop_loss), tp: num(r.take_profit), risk: num(r.risk_amount), setup: r.setup ?? null, emotion: r.emotion ?? null,
  followedPlan: r.followed_plan ?? null, rating: r.rating ?? null, shot: r.shot_path ?? null,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e));

function fail(title: string, e: unknown) {
  Alert.alert(title, `${errMsg(e)}\n\nComprueba tu conexión y vuelve a intentarlo.`);
}

/** Error de la base de datos (dato no válido) frente a error de red: los primeros no se arreglan reintentando. */
const isDbError = (e: unknown) => {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code ?? '') : '';
  return /^[0-9A-Z]{5}$/.test(code) || code.startsWith('PGRST');
};

let offlineWarned = false;
/** Sin conexión: se guarda en el iPhone y se sube luego. Solo se avisa una vez por sesión. */
function queued(e: unknown) {
  if (isDbError(e)) { fail('No se pudo guardar en la nube', e); return; }
  if (offlineWarned) return;
  offlineWarned = true;
  Alert.alert('Guardado en el iPhone', 'Ahora mismo no hay conexión con la nube. Tus cambios están guardados y se subirán solos cuando vuelvas a tener conexión.');
}

/** Descarga una tabla entera por páginas (Supabase devuelve como máximo 1000 filas por petición). */
async function fetchAll(table: string, order: string[]): Promise<Row[]> {
  const out: Row[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = supabase!.from(table).select('*');
    for (const o of order) q = q.order(o);
    const r = await q.range(from, from + size - 1);
    if (r.error) throw r.error;
    out.push(...(r.data ?? []));
    if ((r.data ?? []).length < size) return out;
  }
}

/** Pausa tras pérdidas: al llegar a N operaciones perdidas hoy (entre todas las cuentas) se activa la pausa. */
function withLoss(p: Prefs, isLossToday: boolean): Prefs {
  if (!isLossToday) return p;
  const t = today();
  const n = (p.lossToday?.date === t ? p.lossToday.n : 0) + 1;
  const next = { ...p, lossToday: { date: t, n } };
  if (!p.lossPause || (p.pausedUntil && p.pausedUntil > t) || p.pauseSkip === t) return next;
  return n >= p.lossPause.losses ? { ...next, pausedUntil: addDays(t, Math.max(1, p.lossPause.days)) } : next;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(EMPTY);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [owner, setOwner] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPendingState] = useState<Pending>(NO_PENDING);
  const dataRef = useRef(data);
  const pendingRef = useRef<Pending>(NO_PENDING);
  const sessionRef = useRef<string | null>(null);
  const ownerRef = useRef<string | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    ownerRef.current = owner;
  }, [owner]);

  const setPending = useCallback((f: (p: Pending) => Pending) => {
    pendingRef.current = f(pendingRef.current);
    setPendingState(pendingRef.current);
  }, []);
  /** Si el movimiento trae una foto del iPhone, la sube y devuelve el movimiento con su ruta en la nube. */
  const attachShot = useCallback(async (m: Movement, uid: string): Promise<Movement> => {
    if (!m.shotLocal) return m;
    try {
      const path = await uploadShot(uid, m.id, m.shotLocal);
      dropLocal(m.shotLocal);
      const done = { ...m, shot: path, shotLocal: null };
      setData((d) => ({ ...d, moves: d.moves.map((x) => (x.id === m.id ? { ...x, shot: path, shotLocal: null } : x)) }));
      return done;
    } catch {
      return m; // sin conexión: se sube en la próxima sincronización
    }
  }, []);

  const mark = useCallback((k: keyof Pending, id: string) => setPending((p) => ({ ...p, [k]: p[k].includes(id) ? p[k] : [...p[k], id] })), [setPending]);
  const unmark = useCallback((k: keyof Pending, ids: string[]) => setPending((p) => ({ ...p, [k]: p[k].filter((x) => !ids.includes(x)) })), [setPending]);

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
        if (saved.pending) { pendingRef.current = { ...NO_PENDING, ...saved.pending }; setPendingState(pendingRef.current); }
      }
      setReady(true);
    })();
  }, []);

  // cambios de divisa: se actualizan una vez al día
  useEffect(() => {
    if (!ready) return;
    const t = today();
    if (prefs.fx?.at && prefs.fx.at >= addDays(t, -1)) return;
    fetchFx().then((fx) => { if (fx) setPrefsState((p) => ({ ...p, fx })); });
  }, [ready, prefs.fx?.at]);

  // persistencia
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...data, prefs, owner, pending })).catch(() => {});
    syncWidget(data.accounts, data.moves, prefs);
  }, [data, prefs, owner, pending, ready]);

  const userId = session?.user.id;

  /** Sube lo pendiente. Lanza error si sigue sin haber conexión (así no se pisa nada al descargar). */
  const flush = useCallback(async (uid: string) => {
    if (!supabase || !hasPending(pendingRef.current)) return;
    const p = pendingRef.current, d = dataRef.current;
    const step = async (k: keyof Pending, run: () => PromiseLike<{ error: unknown }>, ids: string[]) => {
      if (!ids.length) return;
      const r = await run();
      if (r.error && !isDbError(r.error)) throw r.error;
      if (r.error) fail('Un cambio no se pudo subir a la nube', r.error);
      unmark(k, ids); // subido, o rechazado por la base de datos (no se arregla reintentando)
    };
    const accs = d.accounts.filter((a) => p.acc.includes(a.id));
    await step('acc', () => supabase!.from('accounts').upsert(accs.map((a) => ({ ...toRowAccount(a, uid), created_at: a.created }))), p.acc);
    const movs: Movement[] = [];
    for (const m of d.moves.filter((x) => p.mov.includes(x.id))) {
      const done = await attachShot(m, uid);
      if (done.shotLocal) throw new Error('Sin conexión para subir la foto');
      movs.push(done);
    }
    await step('mov', () => supabase!.from('movements').upsert(movs.map((m) => toRowMove(m, uid))), p.mov);
    const notes = d.notes.filter((n) => p.note.includes(n.date));
    await step('note', () => supabase!.from('day_notes').upsert(notes.map((n) => ({ user_id: uid, date: n.date, plan: n.plan, review: n.review, mood: n.mood, followed: n.followed, updated_at: new Date().toISOString() }))), p.note);
    await step('delMov', () => supabase!.from('movements').delete().in('id', p.delMov), p.delMov);
    await step('delAcc', () => supabase!.from('accounts').delete().in('id', p.delAcc), p.delAcc);
  }, [unmark, attachShot]);

  const pull = useCallback(async (uid: string) => {
    if (!supabase) return;
    await flush(uid);
    const [accRows, movRows] = await Promise.all([fetchAll('accounts', ['created_at', 'id']), fetchAll('movements', ['date', 'id'])]);
    // las notas son opcionales: si fallan, se mantienen las del iPhone
    let noteRows: Row[] | null = null;
    try { noteRows = await fetchAll('day_notes', ['date']); } catch {}
    // si mientras tanto se ha cerrado sesión o ha entrado otro usuario, no se guarda nada
    if (sessionRef.current !== uid) return;
    setData((d) => {
      // lo que se ha apuntado durante la descarga y aún no está subido se conserva
      const p = pendingRef.current;
      const accounts = accRows.map(fromRowAccount);
      const moves = movRows.map(fromRowMove);
      const aIds = new Set(accounts.map((a) => a.id)), mIds = new Set(moves.map((m) => m.id));
      return {
        accounts: [...accounts.filter((a) => !p.delAcc.includes(a.id)), ...d.accounts.filter((a) => p.acc.includes(a.id) && !aIds.has(a.id))],
        moves: [...moves.filter((m) => !p.delMov.includes(m.id)), ...d.moves.filter((m) => p.mov.includes(m.id) && !mIds.has(m.id))],
        notes: noteRows ? noteRows.map(fromRowNote) : d.notes,
      };
    });
  }, [flush]);

  // al iniciar sesión: la nube es la fuente de verdad. La copia local de otro usuario se descarta.
  const syncAfterLogin = useCallback(async (uid: string) => {
    if (!supabase) return;
    setSyncing(true);
    if (ownerRef.current && ownerRef.current !== uid) {
      // otro usuario en este iPhone: se descarta la copia local y sus ajustes personales
      setData(EMPTY);
      dataRef.current = EMPTY;
      setPending(() => NO_PENDING);
      setPrefsState((p) => ({ ...p, pausedUntil: null, pauseSkip: null, lossToday: null, lastAcc: null, monthlyGoal: null }));
    }
    ownerRef.current = uid;
    setOwner(uid);
    try {
      await pull(uid);
    } catch (e) {
      fail('No se pudieron cargar tus datos', e);
    } finally {
      setSyncing(false);
    }
  }, [pull, setPending]);

  useEffect(() => {
    if (!supabase || !ready) return;
    let synced: string | null = null;
    const sync = (uid: string) => { if (synced === uid) return; synced = uid; syncAfterLogin(uid); };
    supabase.auth.getSession().then(({ data: d }) => {
      sessionRef.current = d.session?.user.id ?? null;
      setSession(d.session);
      setAuthReady(true);
      // sin sesión (p. ej. sin cobertura al abrir) no se borra nada: solo al cerrar sesión de verdad
      if (d.session) sync(d.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      sessionRef.current = s?.user.id ?? null;
      setSession(s);
      if (s && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) sync(s.user.id);
      if (event === 'SIGNED_OUT') {
        synced = null;
        setData(EMPTY);
        dataRef.current = EMPTY;
        setPending(() => NO_PENDING);
        ownerRef.current = null;
        setOwner(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [ready, syncAfterLogin, setPending]);

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
      mark('acc', acc.id);
      const row = existing ? toRowAccount(acc, userId) : { ...toRowAccount(acc, userId), created_at: new Date().toISOString() };
      const r = await supabase.from('accounts').upsert(row);
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('acc', [acc.id]);
    }
    return acc.id;
  }, [userId, mark, unmark]);

  const deleteAccount = useCallback(async (id: string) => {
    setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id), moves: d.moves.filter((m) => m.acc !== id) }));
    if (supabase && userId) {
      const accMoves = dataRef.current.moves.filter((m) => m.acc === id);
      const movIds = accMoves.map((m) => m.id);
      accMoves.forEach((m) => dropLocal(m.shotLocal));
      removeShots(accMoves.map((m) => m.shot)).catch(() => {});
      unmark('acc', [id]);
      unmark('mov', movIds);
      mark('delAcc', id);
      const r = await supabase.from('accounts').delete().eq('id', id);
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('delAcc', [id]);
    }
  }, [userId, mark, unmark]);

  const addMove = useCallback(async (input: Omit<Movement, 'id'>) => {
    const m: Movement = { ...input, id: uuid() };
    setData((d) => ({ ...d, moves: [...d.moves, m] }));
    setPrefsState((p) => withLoss({ ...p, lastAcc: m.acc }, m.type === 'perdida' && m.date === today()));
    const acc = dataRef.current.accounts.find((a) => a.id === m.acc);
    if (supabase && userId && !acc?.sample) {
      mark('mov', m.id);
      const up = await attachShot(m, userId);
      if (up.shotLocal) { queued(new Error('offline')); return; }
      const r = await supabase.from('movements').insert(toRowMove(up, userId));
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('mov', [m.id]);
    }
  }, [userId, mark, unmark, attachShot]);

  const addMoves = useCallback(async (inputs: Omit<Movement, 'id'>[], opts?: { imported?: boolean }) => {
    if (!inputs.length) return;
    const ms: Movement[] = inputs.map((x) => ({ ...x, id: uuid() }));
    setData((d) => ({ ...d, moves: [...d.moves, ...ms] }));
    // un mismo trade copiado en varias cuentas cuenta como una sola pérdida; lo importado no cuenta
    const loss = !opts?.imported && ms.some((m) => m.type === 'perdida' && m.date === today());
    setPrefsState((p) => withLoss({ ...p, lastAcc: inputs[inputs.length - 1].acc }, loss));
    if (supabase && userId) {
      const ids = ms.map((m) => m.id);
      ids.forEach((id) => mark('mov', id));
      // por lotes, para no mandar miles de filas en una sola petición
      let failed: unknown = null;
      for (let i = 0; i < ms.length; i += 500) {
        const chunk = ms.slice(i, i + 500);
        const r = await supabase.from('movements').insert(chunk.map((m) => toRowMove(m, userId)));
        if (r.error) { failed = r.error; if (!isDbError(r.error)) break; }
        if (!r.error || isDbError(r.error)) unmark('mov', chunk.map((m) => m.id));
      }
      if (failed) queued(failed);
    }
  }, [userId, mark, unmark]);

  const saveNote = useCallback(async (n: DayNote) => {
    setData((d) => ({ ...d, notes: [...d.notes.filter((x) => x.date !== n.date), n] }));
    if (supabase && userId) {
      mark('note', n.date);
      const r = await supabase.from('day_notes').upsert({ user_id: userId, date: n.date, plan: n.plan, review: n.review, mood: n.mood, followed: n.followed, updated_at: new Date().toISOString() });
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('note', [n.date]);
    }
  }, [userId, mark, unmark]);

  const updateMove = useCallback(async (m: Movement) => {
    const before = dataRef.current.moves.find((x) => x.id === m.id);
    const becameLoss = m.type === 'perdida' && m.date === today() && !(before?.type === 'perdida' && before.date === m.date);
    setPrefsState((p) => withLoss(p, becameLoss));
    setData((d) => ({ ...d, moves: d.moves.map((x) => (x.id === m.id ? { ...m, sample: x.sample } : x)) }));
    const acc = dataRef.current.accounts.find((a) => a.id === m.acc);
    if (supabase && userId && !acc?.sample) {
      mark('mov', m.id);
      // foto quitada o cambiada: se borra la anterior de la nube
      if (before?.shot && (!m.shot || m.shotLocal)) removeShots([before.shot]).catch(() => {});
      const up = await attachShot(m, userId);
      if (up.shotLocal) { queued(new Error('offline')); return; }
      const r = await supabase.from('movements').upsert(toRowMove(up, userId));
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('mov', [m.id]);
    }
  }, [userId, mark, unmark, attachShot]);

  const deleteMove = useCallback(async (id: string) => {
    const gone = dataRef.current.moves.find((m) => m.id === id);
    dropLocal(gone?.shotLocal);
    if (gone?.shot) removeShots([gone.shot]).catch(() => {});
    setData((d) => ({ ...d, moves: d.moves.filter((m) => m.id !== id) }));
    if (supabase && userId) {
      unmark('mov', [id]);
      mark('delMov', id);
      const r = await supabase.from('movements').delete().eq('id', id);
      if (r.error) queued(r.error);
      if (!r.error || isDbError(r.error)) unmark('delMov', [id]);
    }
  }, [userId, mark, unmark]);

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
    try { await pull(userId); } catch (e) { fail('No se pudo actualizar', e); } finally { setSyncing(false); }
  }, [pull, userId]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    if (hasPending(pendingRef.current) && userId) {
      // último intento de subir lo pendiente antes de borrar la copia del iPhone
      try { await flush(userId); } catch {}
    }
    // 'local' cierra la sesión aunque no haya conexión
    await supabase.auth.signOut({ scope: 'local' });
    setData(EMPTY); // no dejar datos del usuario en el dispositivo
  }, [flush, userId]);

  const deleteCloudAccount = useCallback(async () => {
    if (!supabase) return;
    // las fotos no se borran solas con la cuenta: primero se borran del almacén
    if (userId) { try { await removeAllShots(userId); } catch {} }
    dataRef.current.moves.forEach((m) => dropLocal(m.shotLocal));
    const r = await supabase.rpc('delete_user');
    if (r.error) { fail('No se pudo eliminar la cuenta', r.error); return; }
    await supabase.auth.signOut({ scope: 'local' });
    setData(EMPTY);
  }, [userId]);

  // Borra cuentas y movimientos de la nube, pero mantiene el usuario
  const deleteCloudData = useCallback(async () => {
    if (!supabase || !userId) return false;
    const r = await supabase.from('accounts').delete().eq('user_id', userId);
    if (r.error) { fail('No se pudieron borrar los datos', r.error); return false; }
    try { await removeAllShots(userId); } catch {}
    dataRef.current.moves.forEach((m) => dropLocal(m.shotLocal));
    const n = await supabase.from('day_notes').delete().eq('user_id', userId);
    if (n.error) { fail('No se pudieron borrar las notas', n.error); return false; }
    setPending(() => NO_PENDING);
    setData(EMPTY);
    return true;
  }, [userId, setPending]);

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
