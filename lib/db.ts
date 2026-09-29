// Storage layer — Upstash Redis in production, JSON files in local dev
import fs from 'fs';
import path from 'path';

const IS_PROD = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ─── Upstash Redis (Production) ───────────────────────────────────────────────
async function redisGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    const val = await redis.get<T>(key);
    return val ?? fallback;
  } catch (e) {
    console.error('Redis get error:', e);
    return fallback;
  }
}

async function redisSet<T>(key: string, value: T): Promise<void> {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    await redis.set(key, value);
  } catch (e) {
    console.error('Redis set error:', e);
  }
}

// ─── File system (Local dev) ──────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), 'data');

function fsGet<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return fallback; }
}

function fsSet<T>(file: string, data: T): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
  } catch (e) { console.error('FS write error:', e); }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function readData<T>(key: string, fallback: T): Promise<T> {
  if (IS_PROD) return redisGet(key, fallback);
  return fsGet(key + '.json', fallback);
}

export async function writeData<T>(key: string, data: T): Promise<void> {
  if (IS_PROD) { await redisSet(key, data); return; }
  fsSet(key + '.json', data);
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
export async function getAllAccounts() {
  return readData('accounts', []);
}

export async function saveAccounts(accounts: any[]) {
  return writeData('accounts', accounts);
}

export async function getAccountTrades(accountId: string) {
  const allTrades = await readData('trades', []);
  return allTrades.filter((t: any) => t.accountId === accountId);
}

export async function getAllTrades() {
  return readData('trades', []);
}

export async function saveTrades(trades: any[]) {
  return writeData('trades', trades);
}

export async function getPortfolioData() {
  return readData('portfolio', {});
}

export async function savePortfolioData(data: any) {
  return writeData('portfolio', data);
}

export async function getAlerts() {
  return readData('alerts', []);
}

export async function saveAlerts(alerts: any[]) {
  return writeData('alerts', alerts);
}

export async function getReports() {
  return readData('reports', []);
}

export async function saveReports(reports: any[]) {
  return writeData('reports', reports);
}

export async function getPrices() {
  return readData('prices', {});
}

export async function savePrices(prices: any) {
  return writeData('prices', prices);
}
