'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getAccessToken } from '@/app/lib/supabaseClient'

export default function ContactPage() {
  const router = useRouter()
  const [strategyName, setStrategyName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = await getAccessToken()
    if (!token) {
      router.push('/signin')
      return
    }
    setSubmitting(true)
    setMessage('')
    const res = await fetch('/api/admin/strategy-requests/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ strategyName, description })
    })
    const data = await res.json()
    if (res.ok) {
      setMessage('Request submitted successfully! Admin will review it.')
      setStrategyName('')
      setDescription('')
    } else {
      setMessage(data.error || 'Failed to submit request')
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">Suggest a New Strategy</h1>
      <p className="text-center text-gray-600 mb-8">
        Have a trading strategy you'd like to see added? Describe it below and we'll review it.
      </p>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Strategy Name</label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            required
            placeholder="e.g., EMA Crossover Strategy"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            placeholder="Describe how the strategy works, entry/exit rules, indicators used, etc."
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
        {message && <p className="text-center text-sm text-gray-600">{message}</p>}
      </form>
    </div>
  )
}