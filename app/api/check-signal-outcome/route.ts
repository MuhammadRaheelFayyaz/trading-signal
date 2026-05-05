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
  // Convert creation time to Date object
  const entryTime = new Date(signal.created_at).getTime();

  const interval = mapTimeframeToInterval(signal.timeframe);
const url = `https://api.twelvedata.com/time_series?symbol=${signal.symbol}&interval=${interval}&outputsize=500&apikey=${TWELVEDATA_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json()
    if (!data.values) return null;

    for (const bar of data.values) {
      // Parse bar timestamp (Twelve Data returns datetime like "2024-01-15 14:30:00")
      const barTime = new Date(bar.datetime).getTime();
      // Skip bars that occurred at or before signal creation
      if (barTime <= entryTime) continue;
      const high = parseFloat(bar.high);
      const low = parseFloat(bar.low);

      if (signal.direction === 'long') {
        if (high >= signal.take_profit) return 'win';
        if (low <= signal.stop_loss) return 'loss';
      } else { // short
        if (low <= signal.take_profit) {
          return 'win'};
        if (high >= signal.stop_loss) return 'loss';
      }
    }
    // No hit after entry
    return null;
  } catch (error) {
    console.error(`Error validating signal ${signal.id}:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // Only get signals that have no outcome yet (active)
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