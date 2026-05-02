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

interface SavedSignal {
  id: string
  symbol: string
  timeframe: string
  rr_ratio: number
  strategy: string
  direction: string
  entry_price: number
  stop_loss: number
  take_profit: number
  created_at: string
  expires_at: string
  outcome: 'win' | 'loss' | null
  is_valid: boolean
  is_expired: boolean
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [signal, setSignal] = useState<SignalResult | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [savedSignals, setSavedSignals] = useState<SavedSignal[]>([])
  const [fetchingSignals, setFetchingSignals] = useState(false)
  const supabase = createClient()
  const [formData, setFormData] = useState({
    symbol: 'EUR/USD',
    timeframe: '1h',
    rrRatio: 2,
    strategy: 'support_resistance'
  })

  // Check auth and fetch saved signals
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) fetchSavedSignals()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) fetchSavedSignals()
      else setSavedSignals([])
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const fetchSavedSignals = async () => {
    setFetchingSignals(true)
    try {
      const token = await getAccessToken()
      if (!token) return
      const response = await fetch('/api/get-signals', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.signals) setSavedSignals(data.signals)
    } catch (error) {
      console.error('Error fetching signals:', error)
    } finally {
      setFetchingSignals(false)
    }
  }

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
        setSignal(null) // clear generated signal
        fetchSavedSignals() // refresh the list
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

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Delete this signal?')) return
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/delete-signal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ signalId })
      })
      if (response.ok) {
        setSavedSignals(savedSignals.filter(s => s.id !== signalId))
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      alert('Error deleting')
    }
  }

  const handleUpdateOutcome = async (signalId: string, outcome: 'win' | 'loss') => {
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/update-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ signalId, outcome })
      })
      if (response.ok) {
        setSavedSignals(savedSignals.map(s =>
          s.id === signalId ? { ...s, outcome } : s
        ))
      } else {
        alert('Failed to update outcome')
      }
    } catch (error) {
      alert('Error updating outcome')
    }
  }

  const currencyPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD']
  const timeFrames = ['1min', '5min', '15min', '1h', '4h', '1d']
  const strategies = ['support_resistance', 'demand_supply', 'rsi', 'bollinger']
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Trading Signal Generator</h1>

      {/* Signal Generator Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {
                currencyPairs.map(pair => (
                  <option key={pair} value={pair}>{pair}</option>
                ))
              }
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {
                timeFrames.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))
              }
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
              {
                strategies.map(strategy => (
                  <option key={strategy} value={strategy}>
                    {strategy.replace('_', ' ')}
                  </option>
                ))
              }
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

      {/* Generated Signal Display */}
      {signal && currentPrice && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generated Signal</h2>
          <div className="space-y-3">
            <p><strong>Direction:</strong> <span className={`font-bold ${signal.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>{signal.direction.toUpperCase()}</span></p>
            <p><strong>Current Price:</strong> {currentPrice.toFixed(5)}</p>
            <p><strong>Entry:</strong> {signal.entry.toFixed(5)}</p>
            <p><strong>Stop Loss:</strong> {signal.stopLoss.toFixed(5)}</p>
            <p><strong>Take Profit:</strong> {signal.takeProfit.toFixed(5)}</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">{signal.explanation}</p>
            </div>
          </div>
          <button
            onClick={handleSaveSignal}
            disabled={loading || !user}
            className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Signal'}
          </button>
          {!user && <p className="text-xs text-gray-500 mt-2 text-center">Sign in to save signals</p>}
        </div>
      )}

      {/* Saved Signals Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">My Saved Signals</h2>
        {!user ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Sign in to view your saved signals.</p>
            <button onClick={() => router.push('/signin')} className="mt-2 text-blue-600 underline">Sign In</button>
          </div>
        ) : fetchingSignals ? (
          <div className="text-center py-8">Loading signals...</div>
        ) : savedSignals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No saved signals yet. Generate and save one above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedSignals.map((s) => (
              <div key={s.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{s.symbol}</h3>
                    <p className="text-sm text-gray-500">{s.timeframe} • {s.strategy.replace('_', ' ')} • 1:{s.rr_ratio}</p>
                  </div>
                  <div className="flex space-x-2">
                    {s.is_valid ? <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Valid</span> : <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Expired</span>}
                    {s.outcome === 'win' && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Win</span>}
                    {s.outcome === 'loss' && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Loss</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                  <div><span className="text-gray-500">Direction:</span> <span className={`font-bold ${s.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>{s.direction.toUpperCase()}</span></div>
                  <div><span className="text-gray-500">Entry:</span> {s.entry_price.toFixed(5)}</div>
                  <div><span className="text-gray-500">Stop:</span> <span className="text-red-600">{s.stop_loss.toFixed(5)}</span></div>
                  <div><span className="text-gray-500">Target:</span> <span className="text-green-600">{s.take_profit.toFixed(5)}</span></div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                  <span>Created: {new Date(s.created_at).toLocaleString()}</span>
                  <span>Expires: {new Date(s.expires_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => handleDeleteSignal(s.id)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}