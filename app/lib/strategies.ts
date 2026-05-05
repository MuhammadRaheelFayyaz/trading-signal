import { Candle, SignalResult } from '@/app/types'

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  const trValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trValues.push(tr);
  }
  const sum = trValues.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Check if a candle is a strong bullish reversal (large body, small upper wick)
function isStrongBullish(candle: Candle, avgBody: number): boolean {
  const body = candle.close - candle.open;
  if (body <= 0) return false;
  const upperWick = candle.high - candle.close;
  const bodyRatio = body / avgBody;
  return bodyRatio > 1.5 && upperWick < body * 0.3;
}

// Check for strong bearish reversal
function isStrongBearish(candle: Candle, avgBody: number): boolean {
  const body = candle.open - candle.close;
  if (body <= 0) return false;
  const lowerWick = candle.low - candle.close;
  const bodyRatio = body / avgBody;
  return bodyRatio > 1.5 && lowerWick < body * 0.3;
}

// Find demand zone from a strong bullish candle index
// Zone is defined by the base candles immediately to the left (up to 5 candles, break when a candle breaks pattern)
function findDemandZone(candles: Candle[], strongIdx: number, avgBody: number): {
  upper: number;   // highest body top (max close/open) of base
  lower: number;   // lowest low of base
  baseCount: number;
  fresh: boolean;
} | null {
  if (strongIdx < 1) return null;
  // Collect base candles to the left until price breaks lower or pattern changes
  let baseCandles: Candle[] = [];
  let i = strongIdx - 1;
  let lowestLow = candles[strongIdx].low;
  while (i >= 0 && i >= strongIdx - 10) {
    baseCandles.push(candles[i]);
    if (candles[i].low < lowestLow) lowestLow = candles[i].low;
    // Stop if we find a candle that closes below the current lowest low (breakdown)
    if (candles[i].close < lowestLow) {
      baseCandles.pop();
      break;
    }
    // Also stop if base becomes too many (max 5)
    if (baseCandles.length >= 5) break;
    i--;
  }
  if (baseCandles.length === 0) return null;
  const upper = Math.max(...baseCandles.map(c => Math.max(c.open, c.close)));
  const lower = Math.min(...baseCandles.map(c => c.low));
  if (upper <= lower) return null;
  const baseCount = baseCandles.length;
  // Check freshness: has price returned to this zone after the strong candle?
  let fresh = true;
  for (let j = strongIdx + 1; j < candles.length; j++) {
    if (candles[j].low <= upper && candles[j].high >= lower) {
      fresh = false;
      break;
    }
  }
  return { upper, lower, baseCount, fresh };
}

// Find supply zone from a strong bearish candle
function findSupplyZone(candles: Candle[], strongIdx: number, avgBody: number): {
  lower: number;   // lowest body bottom (min open/close) of base
  upper: number;   // highest high of base
  baseCount: number;
  fresh: boolean;
} | null {
  if (strongIdx < 1) return null;
  let baseCandles: Candle[] = [];
  let i = strongIdx - 1;
  let highestHigh = candles[strongIdx].high;
  while (i >= 0 && i >= strongIdx - 10) {
    baseCandles.push(candles[i]);
    if (candles[i].high > highestHigh) highestHigh = candles[i].high;
    if (candles[i].close > highestHigh) {
      baseCandles.pop();
      break;
    }
    if (baseCandles.length >= 5) break;
    i--;
  }
  if (baseCandles.length === 0) return null;
  const lower = Math.min(...baseCandles.map(c => Math.min(c.open, c.close)));
  const upper = Math.max(...baseCandles.map(c => c.high));
  if (upper <= lower) return null;
  const baseCount = baseCandles.length;
  let fresh = true;
  for (let j = strongIdx + 1; j < candles.length; j++) {
    if (candles[j].high >= lower && candles[j].low <= upper) {
      fresh = false;
      break;
    }
  }
  return { lower, upper, baseCount, fresh };
}

// Calculate average body size over recent candles
function getAverageBodySize(candles: Candle[], lookback: number = 20): number {
  let sum = 0;
  const len = Math.min(lookback, candles.length);
  for (let i = candles.length - len; i < candles.length; i++) {
    sum += Math.abs(candles[i].close - candles[i].open);
  }
  return sum / len;
}

export function demandSupplyStrategy(candles: Candle[], rrRatio: number): SignalResult {
  if (candles.length < 30) {
    return {
      direction: 'long',
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      explanation: 'Insufficient data (need at least 30 candles).'
    };
  }
  const atr = calculateATR(candles, 14);
  const avgBody = getAverageBodySize(candles, 20);
  const currentPrice = candles[candles.length - 1].close;

  const demandZones: any[] = [];
  const supplyZones: any[] = [];

  // Scan for strong candles that could define a zone
  for (let i = 0; i < candles.length - 2; i++) {
    const candle = candles[i];
    if (isStrongBullish(candle, avgBody) && candle.low < currentPrice) {
      const zone = findDemandZone(candles, i, avgBody);
      if (zone && zone.fresh && currentPrice > zone.upper) {
        demandZones.push({ ...zone, idx: i, distanceToPrice: currentPrice - zone.upper });
      }
    }
    if (isStrongBearish(candle, avgBody) && candle.high > currentPrice) {
      const zone = findSupplyZone(candles, i, avgBody);
      if (zone && zone.fresh && currentPrice < zone.lower) {
        supplyZones.push({ ...zone, idx: i, distanceToPrice: zone.lower - currentPrice });
      }
    }
  }

  // Sort by distance to price (closest first)
  demandZones.sort((a, b) => a.distanceToPrice - b.distanceToPrice);
  supplyZones.sort((a, b) => a.distanceToPrice - b.distanceToPrice);

  // Take nearest demand zone if exists and price is above zone upper
  if (demandZones.length > 0) {
    const zone = demandZones[0];
    // Entry: just above the zone upper boundary
    const entry = zone.upper + atr * 0.1;
    const stopLoss = zone.lower - atr * 0.3;
    const risk = entry - stopLoss;
    const takeProfit = entry + risk * rrRatio;
    const explanation = `DEMAND ZONE | Zone: ${zone.lower.toFixed(5)} - ${zone.upper.toFixed(5)} | Base candles: ${zone.baseCount} | Distance: ${zone.distanceToPrice.toFixed(5)} | Entry: ${entry.toFixed(5)} | SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`;
    return { direction: 'long', entry, stopLoss, takeProfit, explanation };
  }

  // Nearest supply zone
  if (supplyZones.length > 0) {
    const zone = supplyZones[0];
    const entry = zone.lower - atr * 0.1;
    const stopLoss = zone.upper + atr * 0.3;
    const risk = stopLoss - entry;
    const takeProfit = entry - risk * rrRatio;
    const explanation = `SUPPLY ZONE | Zone: ${zone.lower.toFixed(5)} - ${zone.upper.toFixed(5)} | Base candles: ${zone.baseCount} | Distance: ${zone.distanceToPrice.toFixed(5)} | Entry: ${entry.toFixed(5)} | SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`;
    return { direction: 'short', entry, stopLoss, takeProfit, explanation };
  }

  // No zones found
  return {
    direction: 'long',
    entry: 0,
    stopLoss: 0,
    takeProfit: 0,
    explanation: `No valid demand/supply zones detected. Try a different instrument or timeframe.`
  };
}