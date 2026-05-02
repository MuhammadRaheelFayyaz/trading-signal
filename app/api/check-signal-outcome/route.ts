import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

// Map your timeframe to Twelve Data interval
function mapTimeframeToInterval(timeframe: string): string {
  const map: Record<string, string> = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '1h': '1h',
    '4h': '4h',
    '1d': '1day'
  };
  return map[timeframe] || '1h';
}

async function validateSignalOutcome(signal: any) {
  const startDate = new Date(signal.created_at).toISOString().split('T')[0];
  const endDate = new Date(signal.expires_at).toISOString().split('T')[0];
  const interval = mapTimeframeToInterval(signal.timeframe);

  // Twelve Data expects symbols like "EUR/USD" as is
  const url = `https://api.twelvedata.com/time_series?symbol=${signal.symbol}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&apikey=${TWELVEDATA_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values) return null;

    for (const bar of data.values) {
      const high = parseFloat(bar.high);
      const low = parseFloat(bar.low);
      const close = parseFloat(bar.close);

      if (signal.direction === 'long') {
        if (high >= signal.take_profit) return 'win';
        if (low <= signal.stop_loss) return 'loss';
      } else { // short
        if (low <= signal.take_profit) return 'win';
        if (high >= signal.stop_loss) return 'loss';
      }
    }
    // If price never hit SL or TP, it's a win (closed in profit)
    return 'win';
  } catch (error) {
    console.error(`Error validating signal ${signal.id}:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { data: signals, error } = await supabaseAdmin
      .from('signals')
      .select('*')
      .is('outcome', null)
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;

    let updatedCount = 0;
    for (const signal of signals) {
      const outcome = await validateSignalOutcome(signal);
      if (outcome) {
        await supabaseAdmin
          .from('signals')
          .update({ outcome })
          .eq('id', signal.id);
        updatedCount++;
      }
    }

    return NextResponse.json({ message: `Validated ${updatedCount} signals.` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}