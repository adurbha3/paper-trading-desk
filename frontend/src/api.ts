export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export type Timeframe = "1m" | "5m" | "1h" | "1d";

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  buying_power: number;
  buy_presets: Record<string, number>;
  sell_presets: Record<string, number>;
}

export interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface OrderResponse {
  order_id: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  status: "filled" | "rejected";
  rejection_reason: string | null;
}

export interface AgentSignal {
  signal_id: number;
  agent_type: "momentum" | "sentiment" | "anomaly";
  source: string;
  symbol: string;
  message: string;
  confidence: number;
  timestamp: number;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

export function getSymbols(): Promise<string[]> {
  return getJson<string[]>("/api/symbols");
}

export function getCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = 200,
): Promise<Candle[]> {
  return getJson<Candle[]>(
    `/api/candles/${symbol}?timeframe=${timeframe}&limit=${limit}`,
  );
}

export function getPrice(symbol: string): Promise<{ symbol: string; price: number }> {
  return getJson(`/api/price/${symbol}`);
}

export function getPosition(symbol: string): Promise<Position> {
  return getJson<Position>(`/api/positions/${symbol}`);
}

export async function submitOrder(order: OrderRequest): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    throw new Error(`order submission failed with status ${response.status}`);
  }
  return response.json();
}

export function getAgentFeed(limit = 20): Promise<AgentSignal[]> {
  return getJson<AgentSignal[]>(`/api/agent-feed?generate=true&limit=${limit}`);
}
