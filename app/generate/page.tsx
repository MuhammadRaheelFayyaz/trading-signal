'use client'

import { useState, useEffect } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { SignalResult, Signal } from '@/app/types'
import { assets, timeFrames, strategies } from '@/app/data'
import SignalCard from '@/app/components/SignalCard'
import SignalGeneratorForm from '@/app/components/SignalGeneratorForm'
import GeneratedSignalDisplay from '@/app/components/GeneratedSignalDisplay'
import SignalsListStatus from '@/app/components/SignalsListStatus'

export default function GeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [signal, setSignal] = useState<SignalResult | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [savedSignals, setSavedSignals] = useState<Signal[]>([])
  const [fetchingSignals, setFetchingSignals] = useState(false)
  const [filterStrategy, setFilterStrategy] = useState<string>('all')
  const supabase = createClient()
  const [formData, setFormData] = useState({
    symbol: 'EUR/USD',
    timeframe: '1h',
    rrRatio: 2,
    strategy: 'demand_supply'
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/signin')
        return
      }
      setUser(session.user)
      fetchSavedSignals()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/signin')
      } else {
        setUser(session.user)
        fetchSavedSignals()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

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
    if (!user) return
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
        setSignal(null)
        fetchSavedSignals()
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

  const filteredSignals = filterStrategy === 'all'
    ? savedSignals
    : savedSignals.filter(s => s.strategy === filterStrategy)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Generate Trading Signal</h1>

      <SignalGeneratorForm
        formData={formData}
        setFormData={setFormData}
        handleGenerateSignal={handleGenerateSignal}
        generating={generating}
        currencyPairs={assets}
        timeFrames={timeFrames}
        strategies={strategies}
      />

      <GeneratedSignalDisplay
        signal={signal}
        currentPrice={currentPrice}
        loading={loading}
        user={user}
        onSave={handleSaveSignal}
      />

      {/* Saved Signals Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">My Saved Signals</h2>
          <div>
            <label className="text-sm text-gray-600 mr-2">Filter by strategy:</label>
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Strategies</option>
              {strategies.map(strat => (
                <option key={strat} value={strat}>
                  {strat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            {filterStrategy === 'all'
              ? 'No saved signals yet. Generate and save one above.'
              : `No saved signals for the selected strategy.`}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onDelete={handleDeleteSignal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}