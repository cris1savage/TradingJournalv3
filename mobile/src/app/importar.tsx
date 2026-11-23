import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Button, Card, Chips, Divider, Row, success, Txt } from '@/components/ui';
import { money } from '@/lib/format';
import { decodeReport, parseMt5Report, type ImportedMove } from '@/lib/mt5';
import { isArchived, MOVE_TYPES } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Importar() {
  const { accounts, moves, addMoves, prefs, theme: t } = useStore();
  const active = accounts.filter((a) => !isArchived(a));
  const [accId, setAccId] = useState(prefs.lastAcc && active.some((a) => a.id === prefs.lastAcc) ? prefs.lastAcc : active[0]?.id ?? '');
  const acc = active.find((a) => a.id === accId);
  const [fileName, setFileName] = useState<string>();
  const [parsed, setParsed] = useState<ImportedMove[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // movimientos que ya estaban (por número de posición de MT5) no se duplican
  const { fresh, dupes } = useMemo(() => {
    if (!parsed) return { fresh: [], dupes: 0 };
    const keyOf = (note: string) => note.match(/(MT5 (?:#\d+|balance .+))$/)?.[1];
    const existing = new Set(moves.filter((m) => m.acc === accId).map((m) => keyOf(m.note)).filter(Boolean));
    const fresh = parsed.filter((p) => !existing.has(p.key));
    return { fresh, dupes: parsed.length - fresh.length };
  }, [parsed, moves, accId]);

  const totals = useMemo(() => {
    const sum = (types: string[]) => fresh.filter((m) => types.includes(m.type)).reduce((s, m) => s + (m.type === 'perdida' || m.type === 'retiro' ? -m.amount : m.amount), 0);
    return {
      trades: fresh.filter((m) => m.type === 'ganancia' || m.type === 'perdida').length,
      pnl: sum(['ganancia', 'perdida']),
      deposits: sum(['deposito']),
      withdrawals: sum(['retiro']),
    };
  }, [fresh]);

  const pick = async () => {
    setError(undefined);
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/html', 'public.html', '*/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    setBusy(true);
    try {
      const asset = r.assets[0];
      const bytes = await new File(asset.uri).bytes();
      const result = parseMt5Report(decodeReport(bytes));
      setFileName(asset.name);
      if (!result.moves.length) {
        setParsed(null);
        setError('No hemos encontrado operaciones en este archivo. Usa el informe de MT5 en formato HTML (Historial → clic derecho → Informe → HTML).');
      } else {
        setParsed(result.moves);
      }
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!acc || !fresh.length) return;
    setBusy(true);
    await addMoves(fresh.map((m) => ({ acc: acc.id, date: m.date, type: m.type, amount: m.amount, note: m.note })), { imported: true });
    setBusy(false);
    success();
    router.back();
  };

  const p = { ...prefs, cur: acc?.currency ?? 'USD' };

  return (
    <Sheet title="Importar de MT5">
      <View style={{ gap: 8 }}>
        <Txt v="label">Cuenta de destino</Txt>
        <Chips options={active.map((a) => ({ value: a.id, label: a.name, color: a.color }))} value={accId} onChange={setAccId} />
      </View>

      <Card style={{ gap: 8 }}>
        <Txt v="h2">Cómo sacarlo de MT5</Txt>
        <Txt v="small">1. En MT5, pestaña Historial → clic derecho → Informe.</Txt>
        <Txt v="small">2. Guárdalo como HTML.</Txt>
        <Txt v="small">3. Pásalo al iPhone (AirDrop, email o Archivos) y elígelo aquí.</Txt>
        <Txt v="small">Funciona con Axi y con cualquier broker o prop firm que use MT5.</Txt>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={pick}
        disabled={busy}
        style={({ pressed }) => ({ minHeight: 96, borderRadius: Math.min(t.r, 16), borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, opacity: pressed ? 0.6 : 1 })}>
        {busy ? <ActivityIndicator color={t.accent} /> : <Icon name="file" size={24} color={t.muted} />}
        <Txt v="body" style={{ fontWeight: '700', textAlign: 'center' }}>{fileName ?? 'Elegir el informe de MT5'}</Txt>
        {parsed && <Txt v="small">{parsed.length} movimientos encontrados · toca para cambiar</Txt>}
      </Pressable>

      {error && <Txt v="small" color={t.neg}>{error}</Txt>}

      {parsed && (
        <Card style={{ paddingVertical: 4 }}>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
            <Txt v="body">{totals.trades} operaciones (neto)</Txt>
            <Txt v="num" color={totals.pnl >= 0 ? t.pos : t.neg}>{money(totals.pnl, p, { signed: true })}</Txt>
          </Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
            <Txt v="body">Depósitos</Txt>
            <Txt v="num" color={t.accent}>{money(totals.deposits, p, { signed: true })}</Txt>
          </Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
            <Txt v="body">Retiros</Txt>
            <Txt v="num" color={t.muted}>{money(totals.withdrawals, p, { signed: true })}</Txt>
          </Row>
          {dupes > 0 && (
            <>
              <Divider />
              <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
                <Txt v="body">Ya estaban en la app</Txt>
                <Txt v="small">{dupes} (se omiten)</Txt>
              </Row>
            </>
          )}
        </Card>
      )}

      {parsed && fresh.length > 0 && (
        <View style={{ gap: 4 }}>
          <Txt v="label">Primeros movimientos</Txt>
          {fresh.slice(0, 5).map((m) => (
            <Row key={m.key} style={{ justifyContent: 'space-between' }}>
              <Txt v="small" numberOfLines={1} style={{ flex: 1 }}>{m.date} · {m.note}</Txt>
              <Txt v="small" color={m.type === 'perdida' || m.type === 'retiro' ? t.neg : t.pos}>{MOVE_TYPES[m.type].label}</Txt>
            </Row>
          ))}
        </View>
      )}

      <Txt v="small" style={{ fontSize: 12 }}>Solo lectura: la app nunca se conecta a tu cuenta de trading ni opera por ti. Cada posición cerrada se guarda como una ganancia o pérdida neta (beneficio + comisión + swap).</Txt>
      <Button
        title={busy ? 'Importando…' : fresh.length ? `Importar ${fresh.length} movimientos en ${acc?.name ?? ''}` : 'Importar'}
        onPress={doImport}
        disabled={busy || !fresh.length || !acc}
      />
    </Sheet>
  );
}
