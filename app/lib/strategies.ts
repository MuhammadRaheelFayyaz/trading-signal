// lib/strategies.ts
interface Candle {
  open: number
  high: number
  low: number
  close: number
  timestamp: Date
}

interface SignalResult {
  direction: 'long' | 'short'
  entry: number
  stopLoss: number
  takeProfit: number
  explanation: string
}

// Helper: Calculate ATR (Average True Range)
function calculateATR(candles: Candle[], period: number = 14): number {
  const trValues: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trValues.push(tr)
  }
  if (trValues.length < period) return trValues.reduce((a, b) => a + b, 0) / trValues.length
  const atrSlice = trValues.slice(trValues.length - period)
  return atrSlice.reduce((a, b) => a + b, 0) / period
}

// Helper: Find swing highs and lows
function findSwingPoints(candles: Candle[], lookback: number = 5): { highs: number[]; lows: number[] } {
  const highs: number[] = []
  const lows: number[] = []
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true
    let isSwingLow = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (candles[j].high >= candles[i].high) isSwingHigh = false
      if (candles[j].low <= candles[i].low) isSwingLow = false
    }
    if (isSwingHigh) highs.push(candles[i].high)
    if (isSwingLow) lows.push(candles[i].low)
  }
  return { highs, lows }
}

// Strategy 1: Support & Resistance
export function supportResistanceStrategy(candles: Candle[], rrRatio: number): SignalResult {
  const atr = calculateATR(candles, 14)
  const { highs, lows } = findSwingPoints(candles, 5)
  const currentPrice = candles[candles.length - 1].close
  
  // Find nearest support and resistance
  const nearestSupport = Math.max(...lows.filter(l => l < currentPrice))
  const nearestResistance = Math.min(...highs.filter(h => h > currentPrice))
  
  // Determine bias using 50-period SMA
  const sma50 = candles.slice(-50).reduce((sum, c) => sum + c.close, 0) / 50
  const trendUp = currentPrice > sma50
  
  if (trendUp && currentPrice - nearestSupport < atr) {
    // Long signal: price near support
    const entry = currentPrice
    const stopLoss = nearestSupport - atr * 0.5
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price near support at ${nearestSupport.toFixed(5)} with uptrend bias.`
    }
  } else if (!trendUp && nearestResistance - currentPrice < atr) {
    // Short signal: price near resistance
    const entry = currentPrice
    const stopLoss = nearestResistance + atr * 0.5
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price near resistance at ${nearestResistance.toFixed(5)} with downtrend bias.`
    }
  }
  
  // Default signal based on trend
  if (trendUp) {
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1.5
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Trend is up, default long signal.`
    }
  } else {
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1.5
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Trend is down, default short signal.`
    }
  }
}

// Strategy 2: Demand & Supply Zones
// In lib/strategies.ts

// Add this helper to compute average body size
function getAverageBodySize(candles: Candle[], lookback: number = 20): number {
  let sum = 0;
  const len = Math.min(lookback, candles.length);
  for (let i = candles.length - len; i < candles.length; i++) {
    sum += Math.abs(candles[i].close - candles[i].open);
  }
  return sum / len;
}

// Helper to determine if a candle is a strong bullish candle
function isStrongBullish(candle: Candle, avgBody: number): boolean {
  const body = candle.close - candle.open;
  if (body <= 0) return false;
  const upperWick = candle.high - candle.close;
  const bodyRatio = body / avgBody;
  return bodyRatio > 1.5 && upperWick < body * 0.3;
}

// Helper for strong bearish candle
function isStrongBearish(candle: Candle, avgBody: number): boolean {
  const body = candle.open - candle.close;
  if (body <= 0) return false;
  const lowerWick = candle.close - candle.low;
  const bodyRatio = body / avgBody;
  return bodyRatio > 1.5 && lowerWick < body * 0.3;
}

// Find base candles to the left of a given index (excluding the strong candle)
function findBaseCandles(candles: Candle[], rightIdx: number): Candle[] {
  const baseCandles: Candle[] = [];
  // Look left from rightIdx-1 up to max 15 candles
  for (let i = rightIdx - 1; i >= 0 && i >= rightIdx - 15; i--) {
    const c = candles[i];
    if (baseCandles.length === 0) {
      baseCandles.push(c);
      continue;
    }
    // If current candle's low is lower than the current lowest low of base, it might break consolidation - but we continue to capture the full base
    // According to definition: the base is a consolidation area. We'll take all consecutive candles that don't show a strong breakout.
    // A simple approach: include candles until we see a large directional candle that breaks the range.
    const currentLow = Math.min(...baseCandles.map(b => b.low));
    const currentHigh = Math.max(...baseCandles.map(b => b.high));
    // If this candle extends the range significantly (e.g., 2x ATR), stop.
    const atr = calculateATR(candles.slice(0, candles.length), 14);
    if (Math.abs(c.high - currentHigh) > atr || Math.abs(c.low - currentLow) > atr) {
      break;
    }
    baseCandles.push(c);
  }
  return baseCandles;
}

// Compute demand zone from base candles
function getDemandZoneFromBase(baseCandles: Candle[]): { upper: number; lower: number } | null {
  if (baseCandles.length === 0) return null;
  const upper = Math.max(...baseCandles.map(c => Math.max(c.open, c.close))); // highest body top
  const lower = Math.min(...baseCandles.map(c => c.low)); // lowest wick bottom
  if (upper <= lower) return null;
  return { upper, lower };
}

// Compute supply zone from base candles
function getSupplyZoneFromBase(baseCandles: Candle[]): { lower: number; upper: number } | null {
  if (baseCandles.length === 0) return null;
  const lower = Math.min(...baseCandles.map(c => Math.min(c.open, c.close))); // lowest body bottom
  const upper = Math.max(...baseCandles.map(c => c.high)); // highest wick top
  if (upper <= lower) return null;
  return { lower, upper };
}

// Check if a zone has been tested (touched) after the strong candle index
function isZoneTested(candles: Candle[], strongIdx: number, zoneLow: number, zoneHigh: number): boolean {
  for (let i = strongIdx + 1; i < candles.length; i++) {
    const c = candles[i];
    if (c.low <= zoneHigh && c.high >= zoneLow) { // price intersected zone
      return true;
    }
  }
  return false;
}

// Main strategy
export function demandSupplyStrategy(candles: Candle[], rrRatio: number): SignalResult {
  const currentPrice = candles[candles.length - 1].close;
  const atr = calculateATR(candles, 14);
  const avgBody = getAverageBodySize(candles, 20);
  
  let bestLongSignal: SignalResult | null = null;
  let bestLongScore = -Infinity;
  let bestShortSignal: SignalResult | null = null;
  let bestShortScore = -Infinity;

  // Scan for strong bullish candles (demand zone right boundary)
  for (let i = 0; i < candles.length - 2; i++) {
    const candle = candles[i];
    if (!isStrongBullish(candle, avgBody)) continue;
    // Strong bullish must be below current price (zone is below current)
    if (candle.low >= currentPrice) continue;
    
    const baseCandles = findBaseCandles(candles, i);
    if (baseCandles.length === 0) continue;
    const zone = getDemandZoneFromBase(baseCandles);
    if (!zone) continue;
    
    const strength = baseCandles.length <= 3 ? 'strong' : 'weak';
    const tested = isZoneTested(candles, i, zone.lower, zone.upper);
    const freshness = tested ? 'tested' : 'fresh';
    
    // Score: fresh > tested, strong > weak, and zone not too far
    let score = 0;
    if (freshness === 'fresh') score += 100;
    if (strength === 'strong') score += 50;
    // Distance from current price to zone upper (entry zone)
    const distance = currentPrice - zone.upper;
    if (distance > 0 && distance < atr * 5) score += (100 - (distance / atr) * 20);
    else if (distance < 0) score = -Infinity; // price already above zone? Actually demand zone is below current, so distance positive.
    
    if (score > bestLongScore) {
      bestLongScore = score;
      const entry = zone.upper + atr * 0.1;
      const stopLoss = zone.lower - atr * 0.3;
      const risk = entry - stopLoss;
      const takeProfit = entry + risk * rrRatio;
      bestLongSignal = {
        direction: 'long',
        entry,
        stopLoss,
        takeProfit,
        explanation: `Demand zone (${strength}, ${freshness}) | Base candles: ${baseCandles.length} | Entry: ${entry.toFixed(5)} | SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`
      };
    }
  }
  
  // Scan for strong bearish candles (supply zone right boundary)
  for (let i = 0; i < candles.length - 2; i++) {
    const candle = candles[i];
    if (!isStrongBearish(candle, avgBody)) continue;
    if (candle.high <= currentPrice) continue; // supply zone must be above current
    
    const baseCandles = findBaseCandles(candles, i);
    if (baseCandles.length === 0) continue;
    const zone = getSupplyZoneFromBase(baseCandles);
    if (!zone) continue;
    
    const strength = baseCandles.length <= 3 ? 'strong' : 'weak';
    const tested = isZoneTested(candles, i, zone.lower, zone.upper);
    const freshness = tested ? 'tested' : 'fresh';
    
    let score = 0;
    if (freshness === 'fresh') score += 100;
    if (strength === 'strong') score += 50;
    const distance = zone.lower - currentPrice;
    if (distance > 0 && distance < atr * 5) score += (100 - (distance / atr) * 20);
    else if (distance < 0) score = -Infinity;
    
    if (score > bestShortScore) {
      bestShortScore = score;
      const entry = zone.lower - atr * 0.1;
      const stopLoss = zone.upper + atr * 0.3;
      const risk = stopLoss - entry;
      const takeProfit = entry - risk * rrRatio;
      bestShortSignal = {
        direction: 'short',
        entry,
        stopLoss,
        takeProfit,
        explanation: `Supply zone (${strength}, ${freshness}) | Base candles: ${baseCandles.length} | Entry: ${entry.toFixed(5)} | SL: ${stopLoss.toFixed(5)} | TP: ${takeProfit.toFixed(5)}`
      };
    }
  }
  
  // Choose the best signal (higher score)
  if (bestLongScore > bestShortScore && bestLongSignal) {
    return bestLongSignal;
  } else if (bestShortScore > bestLongScore && bestShortSignal) {
    return bestShortSignal;
  } else if (bestLongSignal && bestShortSignal && bestLongScore === bestShortScore) {
    // Tie: prefer long? Or whichever comes first? We'll return long.
    return bestLongSignal;
  } else if (bestLongSignal) {
    return bestLongSignal;
  } else if (bestShortSignal) {
    return bestShortSignal;
  } else {
    // No valid zone found
    const neutralEntry = currentPrice;
    const neutralStop = currentPrice - atr * 2;
    const neutralTP = currentPrice + atr * 2;
    return {
      direction: 'long',
      entry: neutralEntry,
      stopLoss: neutralStop,
      takeProfit: neutralTP,
      explanation: '⚠️ No valid demand/supply zone found. Please wait for a clear zone to form.'
    };
  }
}







// Strategy 3: RSI Oversold/Overbought
export function rsiStrategy(candles: Candle[], rrRatio: number): SignalResult {
  // Calculate RSI (14-period)
  const closes = candles.map(c => c.close)
  let gains = 0, losses = 0
  for (let i = 1; i <= 14; i++) {
    const diff = closes[closes.length - i] - closes[closes.length - i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  let avgGain = gains / 14
  let avgLoss = losses / 14
  let rs = avgGain / avgLoss
  let rsi = 100 - (100 / (1 + rs))
  
  const currentPrice = candles[candles.length - 1].close
  const atr = calculateATR(candles, 14)
  
  if (rsi < 30) {
    // Oversold - Long signal
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1.2
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `RSI at ${rsi.toFixed(1)} (oversold). Expecting reversal up.`
    }
  } else if (rsi > 70) {
    // Overbought - Short signal
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1.2
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `RSI at ${rsi.toFixed(1)} (overbought). Expecting reversal down.`
    }
  }
  
  // Neutral - follow 20-period SMA trend
  const sma20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20
  if (currentPrice > sma20) {
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `RSI neutral (${rsi.toFixed(1)}), following uptrend.`
    }
  } else {
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `RSI neutral (${rsi.toFixed(1)}), following downtrend.`
    }
  }
}

// Strategy 4: Bollinger Bands
export function bollingerStrategy(candles: Candle[], rrRatio: number): SignalResult {
  const closes = candles.map(c => c.close)
  const period = 20
  const sma = closes.slice(-period).reduce((sum, p) => sum + p, 0) / period
  const squaredDiffs = closes.slice(-period).map(p => Math.pow(p - sma, 2))
  const stdDev = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / period)
  const upperBand = sma + 2 * stdDev
  const lowerBand = sma - 2 * stdDev
  
  const currentPrice = closes[closes.length - 1]
  const atr = calculateATR(candles, 14)
  
  if (currentPrice <= lowerBand) {
    // Price touched lower band - Long signal
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price at lower Bollinger Band (${lowerBand.toFixed(5)}). Contrarian long.`
    }
  } else if (currentPrice >= upperBand) {
    // Price touched upper band - Short signal
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price at upper Bollinger Band (${upperBand.toFixed(5)}). Contrarian short.`
    }
  }
  
  // Default: follow squeeze direction (narrow bands indicate breakout)
  const bandwidth = (upperBand - lowerBand) / sma
  const sma50 = closes.slice(-50).reduce((sum, p) => sum + p, 0) / 50
  if (bandwidth < 0.05 && currentPrice > sma50) {
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1.2
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Bollinger squeeze, expecting upside breakout.`
    }
  } else if (bandwidth < 0.05 && currentPrice < sma50) {
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1.2
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Bollinger squeeze, expecting downside breakout.`
    }
  } else {
    // Follow trend
    if (currentPrice > sma50) {
      const entry = currentPrice
      const stopLoss = currentPrice - atr * 1
      const risk = entry - stopLoss
      const takeProfit = entry + risk * rrRatio
      return {
        direction: 'long',
        entry,
        stopLoss,
        takeProfit,
        explanation: `Inside bands, following uptrend.`
      }
    } else {
      const entry = currentPrice
      const stopLoss = currentPrice + atr * 1
      const risk = stopLoss - entry
      const takeProfit = entry - risk * rrRatio
      return {
        direction: 'short',
        entry,
        stopLoss,
        takeProfit,
        explanation: `Inside bands, following downtrend.`
      }
    }
  }
}

// Main strategy selector
export function generateSignal(strategy: string, candles: Candle[], rrRatio: number): SignalResult {
  switch (strategy) {
    case 'support_resistance':
      return supportResistanceStrategy(candles, rrRatio)
    case 'demand_supply':
      return demandSupplyStrategy(candles, rrRatio)
    case 'rsi':
      return rsiStrategy(candles, rrRatio)
    case 'bollinger':
      return bollingerStrategy(candles, rrRatio)
    default:
      return supportResistanceStrategy(candles, rrRatio)
  }
}