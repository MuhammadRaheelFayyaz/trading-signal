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
  const rawEntryTime = signal.entryTime;
  if (!rawEntryTime) return;
  const entryTime = new Date(rawEntryTime).getTime();
  if (isNaN(entryTime)) return;

  const interval = mapTimeframeToInterval('1min');
  const startDate = new Date(entryTime).toISOString();
  const endDate = new Date().toISOString();
  const url = `https://api.twelvedata.com/time_series?symbol=${signal.symbol}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&apikey=${TWELVEDATA_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values) return;

    let entryHit = false;

    for (const bar of data.values) { 
      const high = parseFloat(bar.high);
      const low = parseFloat(bar.low);

      // 1. WAIT -> ACTIVE: entry price hit
      if (signal.status === 'wait') {
        if ((signal.direction === 'long' && high >= signal.entry_price) ||
            (signal.direction === 'short' && low <= signal.entry_price)) {
          await supabaseAdmin
            .from('signals')
            .update({ status: 'active', entryTime: new Date().toISOString() })
            .eq('id', signal.id);
          entryHit = true;
        }
      }

      // 2. ACTIVE -> WIN/LOSS: TP or SL hit
      const currentStatus = entryHit ? 'active' : signal.status;
      if (currentStatus === 'active') {
        const newEntryTime = new Date().toISOString();
        if (signal.direction === 'long') {
          if (high >= signal.take_profit) {
            await supabaseAdmin
              .from('signals')
              .update({ status: 'win', outcome: 'win', entryTime: newEntryTime })
              .eq('id', signal.id);
            return;
          }
          if (low <= signal.stop_loss) {
            await supabaseAdmin
              .from('signals')
              .update({ status: 'loss', outcome: 'loss', entryTime: newEntryTime })
              .eq('id', signal.id);
            return;
          }
        } else { // short
          if (low <= signal.take_profit) {
            await supabaseAdmin
              .from('signals')
              .update({ status: 'win', outcome: 'win', entryTime: newEntryTime })
              .eq('id', signal.id);
            return;
          }
          if (high >= signal.stop_loss) {
            await supabaseAdmin
              .from('signals')
              .update({ status: 'loss', outcome: 'loss', entryTime: newEntryTime })
              .eq('id', signal.id);
            return;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error validating signal ${signal.id}:`, error);
  }
}

export async function GET(req: Request) {
  try {
    // Process only signals that are still waiting or active
    const { data: signals, error } = await supabaseAdmin
      .from('signals')
      .select('*')
      .in('status', ['wait', 'active']);

    if (error) throw error;

    for (const signal of signals) {
      await validateSignalOutcome(signal);
    }

    return NextResponse.json({ message: `Processed ${signals.length} signals.` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}