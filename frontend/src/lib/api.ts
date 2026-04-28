const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type PredictiveMetadata = {
  expected_window_size: number;
  expected_features: string[];
  feature_count: number;
};

export type PredictiveResponse = {
  predicted_rul: number;
  predicted_rul_scaled: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  recommendation: string;
  model_path: string;
  expected_window_size: number;
  expected_features: string[];
};

export type TimeseriesRow = Record<string, unknown>;

export async function fetchPredictiveMetadata(): Promise<PredictiveMetadata> {
  const res = await fetch(`${API_BASE_URL}/api/predictive/metadata`);
  if (!res.ok) throw new Error('Failed to fetch predictive metadata.');
  return res.json();
}

export async function fetchTimeseriesForEngine(engineId: number, limit = 2000): Promise<TimeseriesRow[]> {
  const res = await fetch(`${API_BASE_URL}/api/timeseries/${engineId}?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch engine time-series.');
  return res.json();
}

export async function predictRul(sequence: number[][]): Promise<PredictiveResponse> {
  const res = await fetch(`${API_BASE_URL}/api/predictive/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail ?? 'Prediction request failed.');
  }
  return body;
}

export async function sendChatMessage(message: string): Promise<{ reply: string; context_available: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail ?? 'Chatbot request failed.');
  }
  return body;
}
