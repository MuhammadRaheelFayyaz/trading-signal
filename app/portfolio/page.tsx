'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { assets } from '@/app/data'
import { ActiveTrade } from '@/app/types'


export default function PortfolioPage() {
  const router = useRouter()
  const [trades, setTrades] = useState<ActiveTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createClient()

  const [form, setForm] = useState({
    symbol: assets[0],
    type: 'long',
    entry_price: '',
    quantity: '',
    entry_date: '',
    notes: ''
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm || closingId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showForm, closingId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else {
        setToken(session.access_token)
        fetchActiveTrades()
      }
    })
  }, [])



  const fetchActiveTrades = async () => {
 
    const res = await fetch('/api/trades?status=active', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setTrades(data.trades || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.entry_date) {
      alert('Please select entry date')
      return
    }
    setIsSubmitting(true)
    
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        entry_price: parseFloat(form.entry_price),
        quantity: parseFloat(form.quantity),
        entry_date: new Date(form.entry_date).toISOString()
      })
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ symbol: assets[0], type: 'long', entry_price: '', quantity: '', entry_date: '', notes: '' })
      fetchActiveTrades()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add trade')
    }
    setIsSubmitting(false)
  }

  const handleClose = async () => {
    if (!closingId) return
    if (!exitPrice || !exitDate) {
      alert('Please enter exit price and date')
      return
    }
    setIsSubmitting(true)
  
    const res = await fetch(`/api/trades/close/${closingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exit_price: parseFloat(exitPrice), exit_date: new Date(exitDate).toISOString() })
    })
    if (res.ok) {
      setClosingId(null)
      setExitPrice('')
      setExitDate('')
      fetchActiveTrades()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to close trade')
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this active trade?')) return
    await fetch(`/api/trades?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchActiveTrades()
  }

  if (loading) return <div className="text-center py-8">Loading portfolio...</div>

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Active Trades</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md">
          + Add Trade
        </button>
      </div>

      {/* Active Trades Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Entry Price</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Entry Date</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trades.map(trade => (
              <tr key={trade.id}>
                <td className="px-4 py-3">{trade.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${trade.type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-4 py-3">{trade.entry_price}</td>
                <td className="px-4 py-3">{trade.quantity}</td>
                <td className="px-4 py-3">{new Date(trade.entry_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 max-w-xs truncate">{trade.notes}</td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => { setClosingId(trade.id); setExitPrice(''); setExitDate(''); }} className="text-green-600 hover:underline">
                    Close
                  </button>
                  <button onClick={() => handleDelete(trade.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8">No active trades.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Trade Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Trade</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Symbol</label>
                <select
                  value={form.symbol}
                  onChange={e => setForm({ ...form, symbol: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {assets.map(asset => (
                    <option key={asset} value={asset}>{asset}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as 'long' | 'short' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.entry_price}
                  onChange={e => setForm({ ...form, entry_price: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Quantity</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Entry Date</label>
                <input
                  type="datetime-local"
                  required
                  value={form.entry_date}
                  onChange={e => setForm({ ...form, entry_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Trade Modal */}
      {closingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Close Trade</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={e => setExitPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Exit Date</label>
                <input
                  type="datetime-local"
                  value={exitDate}
                  onChange={e => setExitDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setClosingId(null)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
                  {isSubmitting ? 'Closing...' : 'Close Trade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}