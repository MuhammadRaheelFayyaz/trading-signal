export interface Signal {
  id: string
  symbol: string
  timeframe: string
  rr_ratio: number
  strategy: string
  direction: string
  entry_price: number
  stop_loss: number
  take_profit: number
  created_at: string
  outcome: 'win' | 'loss' | null
}

export interface SignalResult {
  direction: 'long' | 'short'
  entry: number
  stopLoss: number
  takeProfit: number
  explanation: string,
  entryTime: string
}


// types.ts
export interface SignalGeneratorFormData {
  symbol: string
  timeframe: string
  rrRatio: number
  strategy: string
}

export interface SignalGeneratorFormProps {
  formData: SignalGeneratorFormData
  setFormData: React.Dispatch<React.SetStateAction<SignalGeneratorFormData>>
  handleGenerateSignal: () => void
  generating: boolean
  currencyPairs: string[]
  timeFrames: string[]
  strategies: string[]
}

export interface SignalCardProps {
  signal: Signal
  onDelete: (id: string) => void
}

export interface User {
  id: string
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  payment_date: string | null
  is_overdue: boolean
  days_overdue: number
}

export interface Trade {
  id: string
  symbol: string
  type: 'long' | 'short'
  entry_price: number
  quantity: number
  entry_date: string
  notes: string
}

export interface ClosedTrade {
  id: string
  symbol: string
  type: 'long' | 'short'
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  pnl_percent: number
  entry_date: string
  exit_date: string
  notes: string
}

export interface ActiveTrade {
  id: string
  symbol: string
  type: 'long' | 'short'
  entry_price: number
  quantity: number
  entry_date: string
  notes: string
}


export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: Date;
}