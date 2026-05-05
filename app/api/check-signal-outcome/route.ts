import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;

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
  // Use entryTime if available, otherwise fallback to created_at
  const rawEntryTime = signal.entryTime || signal.created_at;
  if (!rawEntryTime) return null;
  const entryTime = new Date(rawEntryTime).getTime();
  if (isNaN(entryTime)) return null;

  const interval = mapTimeframeToInterval('15mint');
  const startDate = new Date(entryTime).toISOString();
  const endDate = new Date().toISOString();
  const url = `https://api.twelvedata.com/time_series?symbol=${signal.symbol}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&apikey=${TWELVEDATA_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values) return null;

    let entryHit = false;

    for (const bar of data.values) {
      // Parse bar.datetime as UTC (Twelve Data returns without 'Z')
      const barTime = new Date(bar.datetime.replace(' ', 'T') + 'Z').getTime();
      if (barTime <= entryTime) continue; // skip bars at or before signal creation

      const high = parseFloat(bar.high);
      const low = parseFloat(bar.low);

      if (!entryHit) {
        if (signal.direction === 'long' && high >= signal.entry_price) {
          entryHit = true;
          continue;
        }
        if (signal.direction === 'short' && low <= signal.entry_price) {
          entryHit = true;
          continue;
        }
      }

      if (entryHit) {
        if (signal.direction === 'long') {
          if (high >= signal.take_profit) return 'win';
          if (low <= signal.stop_loss) return 'loss';
        } else {
          if (low <= signal.take_profit) return 'win';
          if (high >= signal.stop_loss) return 'loss';
        }
      }
    }
    return null;
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
      .is('outcome', null);

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