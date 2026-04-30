'use client'

import { useEffect, useState } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface Signal {
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

export default function Signals() {
  const router = useRouter()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/signin')
      } else {
        fetchSignals()
      }
    })
  }, [])

  const fetchSignals = async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/get-signals', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.signals) {
        setSignals(data.signals)
      }
    } catch (error) {
      console.error('Error fetching signals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (signalId: string) => {
    if (!confirm('Are you sure you want to delete this signal?')) return
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/delete-signal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ signalId })
      })
      if (response.ok) {
        setSignals(signals.filter(s => s.id !== signalId))
      } else {
        alert('Failed to delete signal')
      }
    } catch (error) {
      alert('Error deleting signal')
    }
  }

  const handleOutcome = async (signalId: string, outcome: 'win' | 'loss') => {
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/update-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ signalId, outcome })
      })
      if (response.ok) {
        setSignals(signals.map(s => s.id === signalId ? { ...s, outcome } : s))
      } else {
        alert('Failed to update outcome')
      }
    } catch (error) {
      alert('Error updating outcome')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading signals...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Signals</h1>
      {signals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">No signals saved yet.</p>
          <button onClick={() => router.push('/')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Generate a Signal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => (
            <div key={signal.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{signal.symbol}</h3>
                  <p className="text-sm text-gray-500">
                    {signal.timeframe} • {signal.strategy.replace('_', ' ')} • 1:{signal.rr_ratio}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {signal.is_valid ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Valid</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Expired</span>
                  )}
                  {signal.outcome === 'win' && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Win</span>}
                  {signal.outcome === 'loss' && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Loss</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-gray-500">Direction</p><p className={`font-bold ${signal.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>{signal.direction.toUpperCase()}</p></div>
                <div><p className="text-xs text-gray-500">Entry</p><p className="font-mono">{signal.entry_price.toFixed(5)}</p></div>
                <div><p className="text-xs text-gray-500">Stop Loss</p><p className="font-mono text-red-600">{signal.stop_loss.toFixed(5)}</p></div>
                <div><p className="text-xs text-gray-500">Take Profit</p><p className="font-mono text-green-600">{signal.take_profit.toFixed(5)}</p></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  Created: {new Date(signal.created_at).toLocaleString()}<br />
                  Expires: {new Date(signal.expires_at).toLocaleString()}
                </div>
                <div className="flex space-x-2">
                  {!signal.outcome && (
                    <>
                      <button onClick={() => handleOutcome(signal.id, 'win')} className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm">Mark Win</button>
                      <button onClick={() => handleOutcome(signal.id, 'loss')} className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm">Mark Loss</button>
                    </>
                  )}
                  <button onClick={() => handleDelete(signal.id)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}