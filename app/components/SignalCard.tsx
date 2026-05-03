'use client'
import { Signal } from '@/app/types'

interface SignalCardProps {
  signal: Signal
  onDelete: (id: string) => void
}

export default function SignalCard({ signal, onDelete }: SignalCardProps) {
  const s = signal

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">{s.symbol}</h3>
          <p className="text-sm text-gray-500">
            {s.timeframe} • {s.strategy.replace(/_/g, ' ')} • 1:{s.rr_ratio}
          </p>
        </div>
        <div className="flex space-x-2">
          {!s.outcome && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Active
            </span>
          )}
          {s.outcome === 'win' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Win
            </span>
          )}
          {s.outcome === 'loss' && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
              Loss
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Direction:</span>{' '}
          <span
            className={`font-bold ${
              s.direction === 'long' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {s.direction.toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Entry:</span> {s.entry_price.toFixed(5)}
        </div>
        <div>
          <span className="text-gray-500">Stop:</span>{' '}
          <span className="text-red-600">{s.stop_loss.toFixed(5)}</span>
        </div>
        <div>
          <span className="text-gray-500">Target:</span>{' '}
          <span className="text-green-600">{s.take_profit.toFixed(5)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
        <span>Created: {new Date(s.created_at).toLocaleString()}</span>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={() => onDelete(s.id)}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  )
}