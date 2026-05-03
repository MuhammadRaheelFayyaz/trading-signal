'use client'

import { useRouter } from 'next/navigation'

interface SignalsListStatusProps {
  isLoggedIn: boolean
  isLoading: boolean
  hasSignals: boolean
}

export default function SignalsListStatus({ isLoggedIn, isLoading, hasSignals }: SignalsListStatusProps) {
  const router = useRouter()

  if (!isLoggedIn) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">Sign in to view your saved signals.</p>
        <button onClick={() => router.push('/signin')} className="mt-2 text-blue-600 underline">
          Sign In
        </button>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading signals...</div>
  }

  if (!hasSignals) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">No saved signals yet. Generate and save one above.</p>
      </div>
    )
  }

  return null
}