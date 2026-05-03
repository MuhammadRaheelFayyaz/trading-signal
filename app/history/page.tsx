'use client'

import { useEffect, useState } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ClosedTrade } from '@/app/types'

export default function HistoryPage() {
  const router = useRouter()
  const [trades, setTrades] = useState<ClosedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else fetchClosedTrades()
    })
  }, [])

  const fetchClosedTrades = async () => {
    const token = await getAccessToken()
    if (!token) return
    let url = '/api/trades?status=closed'
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setTrades(data.trades || [])
    setLoading(false)
  }

  const applyDateFilter = async () => {
    const token = await getAccessToken()
    if (!token) return
    let startDate: string | undefined, endDate: string | undefined
    const now = new Date()
    switch (dateFilter) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
        endDate = new Date().toISOString()
        break
      case '15days':
        startDate = new Date(now.setDate(now.getDate() - 15)).toISOString()
        endDate = new Date().toISOString()
        break
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
        endDate = new Date().toISOString()
        break
      case 'yearly':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
        endDate = new Date().toISOString()
        break
      case 'custom':
        if (customStart && customEnd) {
          startDate = new Date(customStart).toISOString()
          endDate = new Date(customEnd).toISOString()
        }
        break
      default:
        fetchClosedTrades()
        return
    }
    if (startDate && endDate) {
      const token = await getAccessToken()
      const res = await fetch(`/api/trades?status=closed&startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setTrades(data.trades || [])
    } else {
      fetchClosedTrades()
    }
  }

  useEffect(() => {
    applyDateFilter()
  }, [dateFilter, customStart, customEnd])

  const exportCSV = () => {
    const headers = ['Symbol', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'PnL', 'PnL %', 'Entry Date', 'Exit Date', 'Notes']
    const rows = trades.map(t => [
      t.symbol, t.type, t.entry_price, t.exit_price, t.quantity, t.pnl, t.pnl_percent,
      new Date(t.entry_date).toLocaleString(), new Date(t.exit_date).toLocaleString(), t.notes
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trade_history_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)

  if (loading) return <div className="text-center py-8">Loading history...</div>

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trade History</h1>
        <button onClick={exportCSV} className="bg-gray-600 text-white px-4 py-2 rounded-md">Export CSV</button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Date Range</label>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">All Time</option>
            <option value="weekly">Last 7 Days</option>
            <option value="15days">Last 15 Days</option>
            <option value="monthly">Last Month</option>
            <option value="yearly">Last Year</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {dateFilter === 'custom' && (
          <>
            <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border rounded px-3 py-2" /></div>
            <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border rounded px-3 py-2" /></div>
          </>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="text-lg font-semibold">Total Realized P&L: <span className={totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}>{totalPnL.toFixed(2)}</span></div>
        <div className="text-sm text-gray-500">{trades.length} closed trades</div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Symbol</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Entry</th><th className="px-4 py-3 text-left">Exit</th><th className="px-4 py-3 text-left">Qty</th><th className="px-4 py-3 text-left">PnL</th><th className="px-4 py-3 text-left">Entry Date</th><th className="px-4 py-3 text-left">Exit Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trades.map(t => (
              <tr key={t.id}>
                <td className="px-4 py-3">{t.symbol}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${t.type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span></td>
                <td className="px-4 py-3">{t.entry_price}</td>
                <td className="px-4 py-3">{t.exit_price}</td>
                <td className="px-4 py-3">{t.quantity}</td>
                <td className={`px-4 py-3 font-semibold ${t.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.pnl.toFixed(2)} ({t.pnl_percent.toFixed(2)}%)</td>
                <td className="px-4 py-3">{new Date(t.entry_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(t.exit_date).toLocaleDateString()}</td>
              </tr>
            ))}
            {trades.length === 0 && <tr><td colSpan={8} className="text-center py-8">No closed trades yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}