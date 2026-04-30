'use client'

import { useState, useEffect } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface SignalResult {
  direction: 'long' | 'short'
  entry: number
  stopLoss: number
  takeProfit: number
  explanation: string
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [signal, setSignal] = useState<SignalResult | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const [formData, setFormData] = useState({
    symbol: 'EUR/USD',
    timeframe: '1h',
    rrRatio: 2,
    strategy: 'support_resistance'
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleGenerateSignal = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/generate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol,
          interval: formData.timeframe,
          strategy: formData.strategy,
          rrRatio: formData.rrRatio
        })
      })

      const data = await response.json()
      if (data.success) {
        setSignal(data.signal)
        setCurrentPrice(data.currentPrice)
      } else {
        alert(data.error || 'Failed to generate signal')
      }
    } catch (error) {
      alert('Error generating signal')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveSignal = async () => {
    if (!user) {
      alert('Please login to save signals')
      router.push('/signin')
      return
    }

    if (!signal) {
      alert('No signal generated yet')
      return
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        alert('Session expired. Please sign in again.')
        router.push('/signin')
        return
      }

      const response = await fetch('/api/save-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          timeframe: formData.timeframe,
          rrRatio: formData.rrRatio,
          strategy: formData.strategy,
          direction: signal.direction,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('Signal saved successfully!')
      } else {
        alert(data.error || 'Failed to save signal')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Error saving signal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Trading Signal Generator</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="USD/JPY">USD/JPY</option>
              <option value="AUD/USD">AUD/USD</option>
              <option value="USD/CAD">USD/CAD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="1min">1 Minute</option>
              <option value="5min">5 Minutes</option>
              <option value="15min">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk-Reward Ratio</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="5"
              value={formData.rrRatio}
              onChange={(e) => setFormData({ ...formData, rrRatio: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">1:{formData.rrRatio}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
            <select
              value={formData.strategy}
              onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="support_resistance">Support & Resistance</option>
              <option value="demand_supply">Demand & Supply Zones</option>
              <option value="rsi">RSI (Oversold/Overbought)</option>
              <option value="bollinger">Bollinger Bands</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateSignal}
          disabled={generating}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Signal'}
        </button>
      </div>

      {signal && currentPrice && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Signal</h2>
          <div className="space-y-3">
            <p><strong>Direction:</strong> <span className={`font-bold ${signal.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>{signal.direction.toUpperCase()}</span></p>
            <p><strong>Current Price:</strong> {currentPrice.toFixed(5)}</p>
            <p><strong>Entry Point:</strong> {signal.entry.toFixed(5)}</p>
            <p><strong>Stop Loss:</strong> {signal.stopLoss.toFixed(5)}</p>
            <p><strong>Take Profit:</strong> {signal.takeProfit.toFixed(5)}</p>
            <p><strong>Risk/Reward:</strong> 1:{formData.rrRatio}</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600"><strong>Strategy Insight:</strong> {signal.explanation}</p>
            </div>
          </div>

          <button
            onClick={handleSaveSignal}
            disabled={loading || !user}
            className="mt-6 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Signal'}
          </button>
          {!user && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              You need to <button onClick={() => router.push('/signin')} className="text-blue-600 underline">sign in</button> to save signals
            </p>
          )}
        </div>
      )}
    </div>
  )
}