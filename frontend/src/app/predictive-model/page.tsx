'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchPredictiveMetadata, fetchTimeseriesForEngine, predictRul, type PredictiveMetadata, type PredictiveResponse } from '@/lib/api';

export default function PredictiveModelPage() {
  const [engineId, setEngineId] = useState('');
  const [loadedEngineId, setLoadedEngineId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<PredictiveResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [metadata, setMetadata] = useState<PredictiveMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sequenceRows, setSequenceRows] = useState(0);
  const [runningRows, setRunningRows] = useState<Record<string, unknown>[]>([]);
  const [cutoffIndex, setCutoffIndex] = useState<number>(-1);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  useEffect(() => {
    fetchPredictiveMetadata()
      .then(setMetadata)
      .catch((err: Error) => setError(err.message));
  }, []);

  const modelStatus = useMemo(() => (metadata ? 'Ready' : 'Waiting for metadata'), [metadata]);

  const loadSeriesForEngine = async (engineNumber: number) => {
    if (!metadata) throw new Error('Model metadata is unavailable.');
    setIsLoadingSeries(true);
    setError(null);
    setPrediction(null);

    try {
      const rows = await fetchTimeseriesForEngine(engineNumber);
      const onlyRunning = rows.filter((row) => row.machine_state === 'running');
      setRunningRows(onlyRunning);
      setCutoffIndex(Math.max(onlyRunning.length - 1, -1));
      setLoadedEngineId(engineNumber);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load engine time-series.';
      setRunningRows([]);
      setCutoffIndex(-1);
      setLoadedEngineId(null);
      setError(message);
      throw err;
    } finally {
      setIsLoadingSeries(false);
    }
  };

  const cutoffCycle = useMemo(() => {
    if (cutoffIndex < 0 || cutoffIndex >= runningRows.length) return null;
    const cycle = Number(runningRows[cutoffIndex]?.cycle);
    return Number.isFinite(cycle) ? cycle : null;
  }, [cutoffIndex, runningRows]);

  const handlePredict = async () => {
    if (!metadata) {
      setError('Model metadata is unavailable.');
      return;
    }
    setError(null);
    setPrediction(null);
    setIsPredicting(true);

    try {
      const engineNumber = Number(engineId);
      if (!Number.isFinite(engineNumber) || engineId.trim() === '') {
        throw new Error('Please enter a valid engine id.');
      }

      if (loadedEngineId !== engineNumber) {
        await loadSeriesForEngine(engineNumber);
      }

      if (runningRows.length === 0 || cutoffIndex < 0) {
        throw new Error('No running time-series loaded for this engine.');
      }

      const seriesUpToCutoff = runningRows.slice(0, cutoffIndex + 1);
      const sequence = seriesUpToCutoff
        .map((row) => metadata.expected_features.map((feature) => Number(row[feature])))
        .filter((values) => values.every((v) => Number.isFinite(v)));

      if (sequence.length === 0) {
        throw new Error('No valid sequence could be built for this cutoff point.');
      }

      setSequenceRows(sequence.length);
      const response = await predictRul(sequence);
      setPrediction(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Prediction failed.';
      setError(message);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <>
      <h1>Remaining Useful Life Prediction</h1>
      <p>This module uses your trained LSTM model to estimate cycles remaining before failure.</p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
        {/* Inference Panel */}
        <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
          <h2 style={{ marginBottom: '16px' }}>Run Inference</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Engine ID</label>
              <input
                type="number"
                value={engineId}
                onChange={e => setEngineId(e.target.value)}
                placeholder="e.g. 5"
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={() => {
                const engineNumber = Number(engineId);
                if (!Number.isFinite(engineNumber) || engineId.trim() === '') {
                  setError('Please enter a valid engine id.');
                  return;
                }
                void loadSeriesForEngine(engineNumber);
              }}
              disabled={!engineId || isLoadingSeries}
              style={{
                padding: '10px',
                backgroundColor: (!engineId || isLoadingSeries) ? '#1a1a1a' : 'var(--bg-elevated)',
                color: (!engineId || isLoadingSeries) ? '#666' : 'var(--text-primary)',
                fontWeight: 600,
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: (!engineId || isLoadingSeries) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-main)',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isLoadingSeries ? 'Loading series...' : 'Load Engine Series'}
            </button>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cutoff point (predict at a chosen cycle)
              </label>
              <input
                type="range"
                min={Math.max(0, metadata?.expected_window_size ? metadata.expected_window_size - 1 : 0)}
                max={Math.max(0, runningRows.length - 1)}
                value={Math.max(0, cutoffIndex)}
                onChange={(e) => setCutoffIndex(Number(e.target.value))}
                disabled={runningRows.length === 0}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{runningRows.length > 0 ? `Index: ${cutoffIndex}` : 'No series loaded'}</span>
                <span>{cutoffCycle !== null ? `Cycle: ${cutoffCycle}` : ''}</span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tip: move the slider left to predict earlier in the engine lifecycle (higher RUL), right for later (lower RUL).
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={!engineId || isPredicting || isLoadingSeries || runningRows.length === 0 || cutoffIndex < 0}
              style={{
                padding: '10px',
                backgroundColor: (!engineId || isPredicting || isLoadingSeries || runningRows.length === 0 || cutoffIndex < 0) ? '#1a1a1a' : '#3b82f6',
                color: (!engineId || isPredicting || isLoadingSeries || runningRows.length === 0 || cutoffIndex < 0) ? '#666' : '#000',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: (!engineId || isPredicting) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-main)',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isPredicting ? 'Running...' : 'Predict RUL'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: '16px', color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>
          )}

          {prediction && (
            <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #22c55e', borderRadius: '8px', background: 'rgba(34,197,94,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Prediction Result</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {prediction.predicted_rul} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>cycles remaining</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Risk: <span style={{ textTransform: 'uppercase' }}>{prediction.risk_level}</span> (score {prediction.risk_score}) — {prediction.recommendation}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Model output (scaled): {prediction.predicted_rul_scaled}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Source rows: {sequenceRows}
              </div>
            </div>
          )}
        </div>

        {/* Model Info Panel */}
        <div className="card" style={{ flex: 1 }}>
          <h2 style={{ marginBottom: '16px' }}>Model Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</span>
              <span style={{ color: metadata ? '#22c55e' : '#eab308', fontSize: '0.85rem' }}>{modelStatus}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Training Data</span>
              <span style={{ fontSize: '0.85rem' }}>FD001 train_raw.txt (20,631 rows)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Target</span>
              <span style={{ fontSize: '0.85rem' }}>Remaining Useful Life (RUL)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Architecture</span>
              <span style={{ fontSize: '0.85rem' }}>LSTM (windowed sequence)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Evaluation Metric</span>
              <span style={{ fontSize: '0.85rem' }}>RMSE / MAE</span>
            </div>
            {metadata && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Window: {metadata.expected_window_size} | Features: {metadata.feature_count}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
