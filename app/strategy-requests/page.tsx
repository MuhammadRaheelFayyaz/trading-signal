'use client'

import { useEffect, useState } from 'react'
import { getAccessToken } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface StrategyRequest {
  id: string
  user_email: string
  strategy_name: string
  description: string
  status: string
  created_at: string
}

export default function StrategyRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<StrategyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const token = await getAccessToken()
    if (!token) {
      router.push('/signin')
      return
    }
    const res = await fetch('/api/admin/strategy-requests', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('Fetch strategy requests response:', res)
    if (!res.ok) {
      router.push('/')
      return
    }
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  const updateStatus = async (requestId: string, newStatus: string) => {
    setUpdating(requestId)
    const token = await getAccessToken()
    const res = await fetch('/api/admin/strategy-requests', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId, status: newStatus })
    })
    if (res.ok) {
      setRequests(prev =>
        prev.map(r => (r.id === requestId ? { ...r, status: newStatus } : r))
      )
    } else {
      alert('Failed to update status')
    }
    setUpdating(null)
  }

  if (loading) return <div className="text-center py-8">Loading requests...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Strategy Requests</h1>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map(req => (
              <tr key={req.id}>
                <td className="px-6 py-4 whitespace-nowrap">{req.user_email}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{req.strategy_name}</td>
                <td className="px-6 py-4 max-w-md truncate">{req.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    req.status === 'implemented' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <select
                    value={req.status}
                    onChange={(e) => updateStatus(req.id, e.target.value)}
                    disabled={updating === req.id}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="implemented">Implemented</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8">No strategy requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}