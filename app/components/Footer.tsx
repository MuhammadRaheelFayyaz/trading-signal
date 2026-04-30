export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">TradeSignal Pro</h3>
            <p className="text-sm text-gray-300">
              Professional trading signals powered by advanced technical analysis strategies.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Strategies</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>Support & Resistance</li>
              <li>Demand & Supply Zones</li>
              <li>RSI Oversold/Overbought</li>
              <li>Bollinger Bands</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Data Source</h3>
            <p className="text-sm text-gray-300">
              Real-time market data provided by Twelve Data API.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              © {new Date().getFullYear()} TradeSignal Pro. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}