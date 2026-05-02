'use client'

import { useEffect, useState } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface StrategyStat {
  strategy: string
  wins: number
  total: number
  successRate: number
}

interface OverallStats {
  success_ratio: number
  wins: number
  losses: number
  total_signals: number
}

export default function SuccessRatioPage() {
  const router = useRouter()
  const [overall, setOverall] = useState<OverallStats | null>(null)
  const [strategies, setStrategies] = useState<StrategyStat[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else fetchStats()
    })
  }, [])

  const fetchStats = async () => {
    const token = await getAccessToken()
    if (!token) return
    const res = await fetch('/api/success-ratio', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setOverall(data.overall)
    setStrategies(data.per_strategy)
    setLoading(false)
  }

  if (loading) return <div className="text-center py-8">Loading statistics...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Success Ratio</h1>

      {/* Overall card */}
      {/* <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
        <div className="text-5xl font-bold text-blue-600 mb-2">
          {overall?.success_ratio.toFixed(1)}%
        </div>
        <p className="text-gray-600">Overall Success Rate</p>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div><span className="font-bold text-green-600">{overall?.wins}</span> Wins</div>
          <div><span className="font-bold text-red-600">{overall?.losses}</span> Losses</div>
          <div><span className="font-bold">{overall?.total_signals}</span> Total</div>
        </div>
      </div> */}

      {/* Per‑strategy table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Performance by Strategy</h2>
        {strategies.length === 0 ? (
          <p className="text-gray-500 text-center">No completed signals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {strategies.map((s) => (
                  <tr key={s.strategy}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{s.strategy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">{s.wins}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">
                      {s.successRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}