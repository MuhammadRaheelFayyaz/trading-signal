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
export function demandSupplyStrategy(candles: Candle[], rrRatio: number): SignalResult {
  const atr = calculateATR(candles, 14)
  const { lows, highs } = findSwingPoints(candles, 8)
  const currentPrice = candles[candles.length - 1].close
  
  // Demand zone: recent swing low, Supply zone: recent swing high
  const recentDemand = lows.length > 0 ? lows[lows.length - 1] : currentPrice - atr * 2
  const recentSupply = highs.length > 0 ? highs[highs.length - 1] : currentPrice + atr * 2
  
  const distanceToDemand = Math.abs(currentPrice - recentDemand)
  const distanceToSupply = Math.abs(currentPrice - recentSupply)
  
  if (distanceToDemand < distanceToSupply && currentPrice > recentDemand) {
    // Long: price near demand zone
    const entry = currentPrice
    const stopLoss = recentDemand - atr * 0.5
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price in demand zone at ${recentDemand.toFixed(5)}.`
    }
  } else if (distanceToSupply < distanceToDemand && currentPrice < recentSupply) {
    // Short: price near supply zone
    const entry = currentPrice
    const stopLoss = recentSupply + atr * 0.5
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `Price in supply zone at ${recentSupply.toFixed(5)}.`
    }
  }
  
  // Default: trade in direction of momentum (comparing 20 vs 50 SMA)
  const sma20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20
  const sma50 = candles.slice(-50).reduce((sum, c) => sum + c.close, 0) / 50
  
  if (sma20 > sma50) {
    const entry = currentPrice
    const stopLoss = currentPrice - atr * 1.2
    const risk = entry - stopLoss
    const takeProfit = entry + risk * rrRatio
    return {
      direction: 'long',
      entry,
      stopLoss,
      takeProfit,
      explanation: `No clear zone, following bullish momentum.`
    }
  } else {
    const entry = currentPrice
    const stopLoss = currentPrice + atr * 1.2
    const risk = stopLoss - entry
    const takeProfit = entry - risk * rrRatio
    return {
      direction: 'short',
      entry,
      stopLoss,
      takeProfit,
      explanation: `No clear zone, following bearish momentum.`
    }
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