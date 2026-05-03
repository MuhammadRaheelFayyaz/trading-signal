'use client'

import { SignalGeneratorFormProps } from "@/app/types"


export default function SignalGeneratorForm({
  formData,
  setFormData,
  handleGenerateSignal,
  generating,
  currencyPairs,
  timeFrames,
  strategies
}: SignalGeneratorFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
          <select
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {currencyPairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
          <select
            value={formData.timeframe}
            onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {timeFrames.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Risk-Reward Ratio</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="5"
            value={formData.rrRatio}
            onChange={(e) => setFormData({ ...formData, rrRatio: parseFloat(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">1:{formData.rrRatio}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
          <select
            value={formData.strategy}
            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {strategies.map(strategy => (
              <option key={strategy} value={strategy}>
                {strategy.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={handleGenerateSignal}
        disabled={generating}
        className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? 'Generating...' : 'Generate Signal'}
      </button>
    </div>
  )
}