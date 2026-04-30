'use client'

import { useEffect, useState } from 'react'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface SuccessData {
  success_ratio: number
  wins: number
  losses: number
  total_signals: number
}

export default function SuccessRatio() {
  const router = useRouter()
  const [data, setData] = useState<SuccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/signin')
      else fetchSuccessRatio()
    })
  }, [])

  const fetchSuccessRatio = async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/success-ratio', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success_ratio !== undefined) setData(result)
    } catch (error) {
      console.error('Error fetching success ratio:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-8">Loading statistics...</div>
  if (!data || data.total_signals === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-4">Success Ratio</h1>
          <p className="text-gray-600 mb-4">No completed signals yet.</p>
          <button onClick={() => router.push('/signals')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">View My Signals</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Success Ratio</h1>
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-blue-600 mb-2">{data.success_ratio.toFixed(1)}%</div>
          <p className="text-gray-600">Success Rate</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center border-t pt-6">
          <div><div className="text-2xl font-bold text-green-600">{data.wins}</div><p className="text-sm text-gray-500">Wins</p></div>
          <div><div className="text-2xl font-bold text-red-600">{data.losses}</div><p className="text-sm text-gray-500">Losses</p></div>
          <div><div className="text-2xl font-bold text-gray-700">{data.total_signals}</div><p className="text-sm text-gray-500">Total Signals</p></div>
        </div>
        <div className="mt-6 bg-gray-100 rounded-full h-4 overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${data.success_ratio}%` }} />
        </div>
      </div>
    </div>
  )
}