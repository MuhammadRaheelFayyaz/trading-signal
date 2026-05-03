import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">TradeSignal Pro</h1>
        <p className="text-xl text-gray-600">AI-powered trading signals for forex, crypto & commodities</p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-xl font-semibold mb-2">Multiple Strategies</h2>
          <p className="text-gray-600">Support & Resistance, Demand & Supply, RSI, Bollinger Bands</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h2 className="text-xl font-semibold mb-2">Risk‑Reward Control</h2>
          <p className="text-gray-600">Set your own RR ratio for every signal</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">📈</div>
          <h2 className="text-xl font-semibold mb-2">Track Performance</h2>
          <p className="text-gray-600">Save signals, auto‑validate wins/losses, view success ratios by asset</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div><div className="font-bold text-blue-600 text-2xl">1</div><p>Select asset, timeframe & strategy</p></div>
          <div><div className="font-bold text-blue-600 text-2xl">2</div><p>Generate signal with entry, SL & TP</p></div>
          <div><div className="font-bold text-blue-600 text-2xl">3</div><p>Save signal & track automatically</p></div>
          <div><div className="font-bold text-blue-600 text-2xl">4</div><p>Analyse success per strategy/asset</p></div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
          Get Started – Free
        </Link>
        <p className="text-gray-500 mt-3 text-sm">No credit card required</p>
      </div>
    </div>
  )
}