'use client'
import { SignalResult } from '@/app/types'


interface GeneratedSignalDisplayProps {
  signal: SignalResult | null
  currentPrice: number | null
  loading: boolean
  user: any
  onSave: () => void
}

export default function GeneratedSignalDisplay({
  signal,
  currentPrice,
  loading,
  user,
  onSave
}: GeneratedSignalDisplayProps) {
  if (!signal || !currentPrice) return null

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Generated Signal</h2>
      <div className="space-y-3">
        <p>
          <strong>Direction:</strong>{' '}
          <span
            className={`font-bold ${
              signal.direction === 'long' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {signal.direction.toUpperCase()}
          </span>
        </p>
        <p>
          <strong>Current Price:</strong> {currentPrice.toFixed(5)}
        </p>
        <p>
          <strong>Entry:</strong> {signal.entry.toFixed(5)}
        </p>
        <p>
          <strong>Stop Loss:</strong> {signal.stopLoss.toFixed(5)}
        </p>
        <p>
          <strong>Take Profit:</strong> {signal.takeProfit.toFixed(5)}
        </p>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">{signal.explanation}</p>
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={loading || !user}
        className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Signal'}
      </button>
      {!user && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Sign in to save signals
        </p>
      )}
    </div>
  )
}