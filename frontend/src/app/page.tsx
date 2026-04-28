'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import EngineTimeline from '@/components/EngineTimeline';

const SENSORS: Record<string, { color: string; label: string; unit: string }> = {
  sensor_1:  { color: '#94a3b8', label: 'T2 — Fan Inlet Temp',              unit: '°R' },
  sensor_2:  { color: '#3b82f6', label: 'T24 — LPC Outlet Temp',            unit: '°R' },
  sensor_3:  { color: '#06b6d4', label: 'T30 — HPC Outlet Temp',            unit: '°R' },
  sensor_4:  { color: '#22c55e', label: 'T50 — LPT Outlet Temp',            unit: '°R' },
  sensor_5:  { color: '#10b981', label: 'P2 — Fan Inlet Pressure',          unit: 'psia' },
  sensor_6:  { color: '#8b5cf6', label: 'P15 — Bypass Duct Pressure',       unit: 'psia' },
  sensor_7:  { color: '#eab308', label: 'Nf — Physical Fan Speed',          unit: 'rpm' },
  sensor_8:  { color: '#f97316', label: 'Nc — Physical Core Speed',         unit: 'rpm' },
  sensor_9:  { color: '#ef4444', label: 'epr — Engine Pressure Ratio',      unit: '—' },
  sensor_10: { color: '#d946ef', label: 'Phi — Static Pressure (Ps30)',      unit: 'psia' },
  sensor_11: { color: '#a855f7', label: 'htBleed — Enthalpy at Bleed',      unit: '—' },
  sensor_12: { color: '#ec4899', label: 'NRf — Corrected Fan Speed',        unit: 'rpm' },
  sensor_13: { color: '#f43f5e', label: 'NRc — Corrected Core Speed',       unit: 'rpm' },
  sensor_14: { color: '#14b8a6', label: 'W31 — HPT Coolant Bleed',          unit: 'lbm/s' },
  sensor_15: { color: '#84cc16', label: 'BPR — Bypass Ratio',               unit: '—' },
  sensor_16: { color: '#a3e635', label: 'Sensor 16 — Unknown',              unit: '—' },
  sensor_17: { color: '#facc15', label: 'farB — Burner Fuel-Air Ratio',     unit: '—' },
  sensor_18: { color: '#fbbf24', label: 'Sensor 18 — Unknown',              unit: '—' },
  sensor_19: { color: '#f59e0b', label: 'Sensor 19 — Unknown',              unit: '—' },
  sensor_20: { color: '#fb923c', label: 'BldW — Bleed Enthalpy',            unit: '—' },
  sensor_21: { color: '#f87171', label: 'W32 — HPT Coolant Bleed',          unit: 'lbm/s' },
};

const ALL_SENSORS = Object.keys(SENSORS);

export default function HomePage() {
  const [engineList, setEngineList] = useState<any[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<number | null>(null);
  const [allData, setAllData] = useState<any[]>([]);      // full data incl. repair rows — for timeline
  const [chartData, setChartData] = useState<any[]>([]);   // running-only — for sensor chart
  const [activeSensors, setActiveSensors] = useState<string[]>(['sensor_2', 'sensor_7', 'sensor_11', 'sensor_14']);
  const [loading, setLoading] = useState(true);
  const [engineInfo, setEngineInfo] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/kpis/')
      .then(res => res.json())
      .then(d => {
        if (d.engine_kpis) {
          setEngineList(d.engine_kpis);
          if (d.engine_kpis.length > 0) {
            setSelectedEngine(d.engine_kpis[0].engine_id);
            setEngineInfo(d.engine_kpis[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEngine) return;
    fetch(`http://localhost:8000/api/timeseries/${selectedEngine}?limit=2000`)
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d)) {
          setAllData(d);
          const running = d.filter((r: any) => r.machine_state === 'running');
          setChartData(running);
        } else {
          setAllData([]);
          setChartData([]);
        }
      })
      .catch(console.error);

    const eng = engineList.find(e => e.engine_id === selectedEngine);
    if (eng) setEngineInfo(eng);
  }, [selectedEngine, engineList]);

  const toggleSensor = (s: string) => {
    setActiveSensors(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  return (
    <>
      <h1>Data Explorer</h1>

      <div className="split-pane">
        {/* Engine Fleet Sidebar */}
        <div className="pane-sidebar card">
          <h3 style={{ marginBottom: '12px' }}>Engine Fleet</h3>
          <div className="scroll-area">
            {loading ? <p>Loading...</p> : engineList.map(engine => (
              <button
                key={engine.engine_id}
                onClick={() => setSelectedEngine(engine.engine_id)}
                className={`engine-btn ${selectedEngine === engine.engine_id ? 'active' : ''}`}
              >
                <span>Engine #{engine.engine_id}</span>
                <span
                  className="status-dot"
                  style={{ backgroundColor: engine.availability_pct >= 90 ? 'var(--accent-green)' : engine.availability_pct >= 80 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="pane-main" style={{ gap: '16px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Engine Quick Stats */}
          {engineInfo && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">MTBF</div>
                <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                  {engineInfo.MTBF_cycles}<span className="stat-unit">cyc</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">MTTR</div>
                <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
                  {engineInfo.MTTR_cycles}<span className="stat-unit">cyc</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">MTU</div>
                <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                  {engineInfo.MTU_cycles}<span className="stat-unit">cyc</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Availability</div>
                <div className="stat-value" style={{ color: engineInfo.availability_pct >= 90 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {engineInfo.availability_pct}<span className="stat-unit">%</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Failures</div>
                <div className="stat-value">
                  {engineInfo.n_failure_cycles}
                </div>
              </div>
            </div>
          )}

          {/* Engine State Timeline */}
          <div className="card">
            <h2 style={{ marginBottom: '12px' }}>State Timeline — Engine #{selectedEngine}</h2>
            <EngineTimeline data={allData} />
          </div>

          {/* Sensor Selector */}
          <div className="sensor-tabs">
            {ALL_SENSORS.map(s => (
              <button
                key={s}
                className={`sensor-tab ${activeSensors.includes(s) ? 'active' : ''}`}
                onClick={() => toggleSensor(s)}
                style={activeSensors.includes(s) ? { background: SENSORS[s].color, borderColor: SENSORS[s].color } : {}}
              >
                {SENSORS[s].label.split('—')[0].trim()}
              </button>
            ))}
          </div>

          {/* Individual Sensor Charts Grid */}
          {chartData.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {activeSensors.map(s => (
                <div key={s} className="chart-container" style={{ height: '220px' }}>
                  <div className="chart-header" style={{ marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: SENSORS[s].color, display: 'inline-block' }} />
                      {SENSORS[s].label}
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{SENSORS[s].unit}</span>
                  </div>
                  <div className="chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="cycle" stroke="#666" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 9 }} width={50} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#fff', fontSize: '0.75rem' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, `${SENSORS[s].label} (${SENSORS[s].unit})`]}
                        />
                        <Line
                          type="monotone"
                          dataKey={s}
                          stroke={SENSORS[s].color}
                          dot={false}
                          strokeWidth={1.5}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <p>Select an engine to view its sensor data</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
