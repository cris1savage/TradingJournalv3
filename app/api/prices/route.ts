import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { PriceData } from '@/lib/types';

// Símbolos comunes a monitorear
const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOGE'];
const STOCK_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY'];
const FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD', 'NQ100'];

// Simulación de datos en tiempo real (en producción, conectar a APIs reales)
function generatePriceData(symbol: string, type: 'crypto' | 'stock' | 'forex'): PriceData {
  const cachedPrices: Record<string, number> = {
    BTC: 45000, ETH: 2500, NVDA: 880, AAPL: 185, MSFT: 420, EURUSD: 1.05, XAUUSD: 2050,
  };

  const basePrice = cachedPrices[symbol] || 100;
  const change = (Math.random() - 0.5) * 2; // -1 a 1
  const currentPrice = basePrice + change;

  return {
    symbol,
    assetType: type,
    currentPrice,
    previousPrice: basePrice,
    change,
    changePercent: ((change / basePrice) * 100),
    timestamp: new Date().toISOString(),
    high24h: basePrice * 1.05,
    low24h: basePrice * 0.95,
    volume: Math.floor(Math.random() * 1000000),
  };
}

export async function GET(req: NextRequest) {

  try {
    const symbol = req.nextUrl.searchParams.get('symbol');
    const type = (req.nextUrl.searchParams.get('type') || 'crypto') as 'crypto' | 'stock' | 'forex';

    if (!symbol) {
      // Retornar todos los precios
      const prices: Record<string, PriceData> = {};

      for (const s of CRYPTO_SYMBOLS) {
        prices[s] = generatePriceData(s, 'crypto');
      }
      for (const s of STOCK_SYMBOLS) {
        prices[s] = generatePriceData(s, 'stock');
      }
      for (const s of FOREX_PAIRS) {
        prices[s] = generatePriceData(s, 'forex');
      }

      return NextResponse.json(prices);
    }

    const price = generatePriceData(symbol, type);
    return NextResponse.json(price);
  } catch (e) {
    console.error('Error fetching price:', e);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}

// Conectar a API real de Binance
export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const { symbol, source = 'binance' } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    let price: PriceData | null = null;

    if (source === 'binance') {
      // Conectar a Binance API
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`,
          { next: { revalidate: 60 } }
        );

        if (response.ok) {
          const data = await response.json();
          price = {
            symbol,
            assetType: 'crypto',
            currentPrice: parseFloat(data.lastPrice),
            previousPrice: parseFloat(data.openPrice),
            change: parseFloat(data.lastPrice) - parseFloat(data.openPrice),
            changePercent: parseFloat(data.priceChangePercent),
            timestamp: new Date().toISOString(),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume),
          };
        }
      } catch (e) {
        console.log('Binance API error, using mock data:', e);
        price = generatePriceData(symbol, 'crypto');
      }
    }

    if (!price) {
      price = generatePriceData(symbol, 'crypto');
    }

    // Cachear precio
    const prices = await readData<Record<string, PriceData>>('prices', {});
    prices[symbol] = price;
    await writeData('prices', prices);

    return NextResponse.json(price);
  } catch (e) {
    console.error('Error updating price:', e);
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
  }
}
