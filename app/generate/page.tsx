'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { assets, timeFrames } from '@/app/data'
import { SignalResult, Signal } from '@/app/types'
import SignalCard from '@/app/components/SignalCard'
import GeneratedSignalDisplay from '@/app/components/GeneratedSignalDisplay'

export default function GeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [signal, setSignal] = useState<SignalResult | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [savedSignals, setSavedSignals] = useState<Signal[]>([])
  const [fetchingSignals, setFetchingSignals] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    symbol: 'EUR/USD',
    timeframe: '1h',
    rrRatio: 2
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else {
    console.log('Session found:', session) 
        setToken(session.access_token)
        setUser(session.user); fetchSavedSignals() }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/signin')
      else { setUser(session.user); fetchSavedSignals() }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchSavedSignals = useCallback(async () => {
    setFetchingSignals(true)
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/get-signals', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.signals) setSavedSignals(data.signals)
    setFetchingSignals(false)
  }, [])

  const handleGenerateSignal = async () => {
    setGenerating(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/generate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol,
          interval: formData.timeframe,
          rrRatio: formData.rrRatio
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (data.success) {
        if (data.hasSignal && data.signal) {
          setSignal(data.signal)
          setCurrentPrice(data.currentPrice)
        } else {
          // No valid zone found – show the explanation message
          alert(data.message || 'No valid demand/supply zone found. Please try a different asset or timeframe.')
          setSignal(null)
          setCurrentPrice(null)
        }
      } else {
        alert(data.error || 'Failed to generate signal')
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') alert('Request timed out')
      else alert('Network error')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveSignal = async () => {
    console.log('Saving signal:',signal)
    if (!user) { alert('Please login'); router.push('/signin'); return }
    if (!signal) { alert('No signal generated'); return }
    setLoading(true)
   
    const res = await fetch('/api/save-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token??''}` },
      body: JSON.stringify({
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        rrRatio: formData.rrRatio,
        strategy: 'demand_supply',
        direction: signal.direction,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        entryTime: signal.entryTime   // ✅ send the timestamp
      })
    });
    const data = await res.json()
    if (data.success) {
      setSignal(null)
      fetchSavedSignals()
    } else alert(data.error || 'Failed to save')
    setLoading(false)
  }

  const handleDeleteSignal = async (id: string) => {
    if (!confirm('Delete this signal?')) return
   
    await fetch(`/api/delete-signal`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ signalId: id })
    })
    fetchSavedSignals()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Demand & Supply Signal Generator</h1>

      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <select value={formData.symbol} onChange={e => setFormData({ ...formData, symbol: e.target.value })} className="w-full border rounded px-3 py-2">
              {assets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Timeframe</label>
            <select value={formData.timeframe} onChange={e => setFormData({ ...formData, timeframe: e.target.value })} className="w-full border rounded px-3 py-2">
              {timeFrames.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Risk‑Reward Ratio</label>
            <input type="number" step="0.5" min="0.5" max="5" value={formData.rrRatio} onChange={e => setFormData({ ...formData, rrRatio: parseFloat(e.target.value) })} className="w-full border rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-1">1:{formData.rrRatio}</p>
          </div>
        </div>
        <button onClick={handleGenerateSignal} disabled={generating} className="mt-6 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {generating ? 'Generating...' : 'Generate Signal'}
        </button>
      </div>

      {/* Only show signal card if a valid signal exists */}
      {signal && signal.entry > 0 && currentPrice && (
        <GeneratedSignalDisplay
          signal={signal}
          currentPrice={currentPrice}
          loading={loading}
          user={user}
          onSave={handleSaveSignal}
        />
      )}

      {/* Saved Signals */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">My Saved Signals</h2>
        {savedSignals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">No saved signals yet.</div>
        ) : (
          <div className="space-y-4">
            {savedSignals.map(s => <SignalCard key={s.id} signal={s} onDelete={handleDeleteSignal} />)}
          </div>
        )}
      </div>
    </div>
  )
}