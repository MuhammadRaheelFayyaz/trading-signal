'use client'

import { useEffect, useState } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { assets } from '@/app/data'

interface StrategySymbolStat {
  strategy: string
  symbol: string
  wins: number
  total: number
  successRate: number
}

export default function SuccessRatioPage() {
  const router = useRouter()
  const [allStats, setAllStats] = useState<StrategySymbolStat[]>([])
  const [filteredStats, setFilteredStats] = useState<StrategySymbolStat[]>([])
  const [selectedAsset, setSelectedAsset] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else {
          setToken(session.access_token)
          fetchStats()
        }
    })
  }, [])

  const fetchStats = async () => {
    
    const res = await fetch('/api/success-ratio', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    const statsData = data.data ?? []
    setAllStats(statsData)
    // Initially show all stats (no filter)
    setFilteredStats(statsData)
    setLoading(false)
  }

  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset)
    if (asset === 'all') {
      setFilteredStats(allStats)
    } else {
      setFilteredStats(allStats.filter(s => s.symbol === asset))
    }
  }

  if (loading) return <div className="text-center py-8">Loading statistics...</div>

  // Get unique assets from the data for dropdown (or use the imported assets list)
  const uniqueAssets = [...new Set(allStats.map(s => s.symbol))].sort()

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Strategy Performance by Asset</h1>

      {/* Asset Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Asset</label>
        <select
          value={selectedAsset}
          onChange={(e) => handleAssetChange(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="all">All Assets</option>
          {uniqueAssets.map(asset => (
            <option key={asset} value={asset}>{asset}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency Pair / Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No completed signals for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStats.map((stat, idx) => (
                  <tr key={`${stat.strategy}-${stat.symbol}-${idx}`}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{stat.strategy}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{stat.symbol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">{stat.wins}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{stat.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">
                      {stat.successRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}