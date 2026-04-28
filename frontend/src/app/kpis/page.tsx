'use client';
import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e', '#a855f7'];

export default function KPIsPage() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [faultData, setFaultData] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);

  // Filters
  const [minAvailability, setMinAvailability] = useState(0);
  const [faultFilter, setFaultFilter] = useState('all');
  const [kpiMetric, setKpiMetric] = useState<'MTBF_cycles' | 'MTTR_cycles' | 'MTU_cycles'>('MTBF_cycles');

  useEffect(() => {
    fetch('http://localhost:8000/api/kpis/')
      .then(res => res.json())
      .then(setKpiData)
      .catch(console.error);

    fetch('http://localhost:8000/api/faults/distribution')
      .then(res => res.json())
      .then(d => {
        const formatted = Object.keys(d).map(key => ({ name: key, value: d[key] }));
        setFaultData(formatted);
      })
      .catch(console.error);

    fetch('http://localhost:8000/api/faults/')
      .then(res => res.json())
      .then(setAllEvents)
      .catch(console.error);
  }, []);

  if (!kpiData) return <div style={{ padding: '32px' }}><p>Loading KPIs...</p></div>;

  // Build a map of engine -> defect types from events
  const engineDefects: Record<number, Set<string>> = {};
  allEvents.forEach((ev: any) => {
    if (!engineDefects[ev.engine_id]) engineDefects[ev.engine_id] = new Set();
    engineDefects[ev.engine_id].add(ev.defect_type);
  });

  // Apply filters
  let filteredEngines = kpiData.engine_kpis.filter(
    (e: any) => e.availability_pct >= minAvailability
  );

  if (faultFilter !== 'all') {
    const enginesWithFault = new Set(
      Object.entries(engineDefects)
        .filter(([_, defects]) => defects.has(faultFilter))
        .map(([id, _]) => Number(id))
    );
    filteredEngines = filteredEngines.filter((e: any) => enginesWithFault.has(e.engine_id));
  }

  // Compute filtered fleet stats
  const n = filteredEngines.length;
  const fMtbf = n ? filteredEngines.reduce((a: number, c: any) => a + c.MTBF_cycles, 0) / n : 0;
  const fMttr = n ? filteredEngines.reduce((a: number, c: any) => a + c.MTTR_cycles, 0) / n : 0;
  const fMtu = n ? filteredEngines.reduce((a: number, c: any) => a + c.MTU_cycles, 0) / n : 0;
  const fAvail = n ? filteredEngines.reduce((a: number, c: any) => a + c.availability_pct, 0) / n : 0;
  const fFailures = filteredEngines.reduce((a: number, c: any) => a + c.n_failure_cycles, 0);

  // Metric labels
  const metricLabels: Record<string, string> = {
    MTBF_cycles: 'MTBF',
    MTTR_cycles: 'MTTR',
    MTU_cycles: 'MTU',
  };

  const metricColors: Record<string, string> = {
    MTBF_cycles: '#3b82f6',
    MTTR_cycles: '#f97316',
    MTU_cycles: '#06b6d4',
  };

  return (
    <>
      <h1>KPIs & Analytics</h1>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div>
          <label>Availability:</label>
          <select value={minAvailability} onChange={e => setMinAvailability(Number(e.target.value))}>
            <option value={0}>All</option>
            <option value={80}>&gt; 80%</option>
            <option value={90}>&gt; 90%</option>
            <option value={95}>&gt; 95%</option>
          </select>
        </div>
        <div>
          <label>Fault Type:</label>
          <select value={faultFilter} onChange={e => setFaultFilter(e.target.value)}>
            <option value="all">All Faults</option>
            <option value="overheating">Overheating</option>
            <option value="bearing_misalignment">Bearing Misalignment</option>
            <option value="wear">Wear</option>
            <option value="unclassified">Unclassified</option>
          </select>
        </div>
        <div>
          <label>Bar Chart Metric:</label>
          <select value={kpiMetric} onChange={e => setKpiMetric(e.target.value as any)}>
            <option value="MTBF_cycles">MTBF</option>
            <option value="MTTR_cycles">MTTR</option>
            <option value="MTU_cycles">MTU</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {n} / {kpiData.engine_kpis.length} engines
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Mean MTBF</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>
            {fMtbf.toFixed(1)}<span className="stat-unit">cyc</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mean MTTR</div>
          <div className="stat-value" style={{ color: '#f97316' }}>
            {fMttr.toFixed(1)}<span className="stat-unit">cyc</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mean MTU</div>
          <div className="stat-value" style={{ color: '#06b6d4' }}>
            {fMtu.toFixed(1)}<span className="stat-unit">cyc</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Availability</div>
          <div className="stat-value" style={{ color: fAvail >= 90 ? '#22c55e' : '#ef4444' }}>
            {fAvail.toFixed(1)}<span className="stat-unit">%</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Failures</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {fFailures}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: '16px' }}>

        {/* Bar Chart */}
        <div className="chart-container" style={{ flex: 2 }}>
          <div className="chart-header">
            <h2>{metricLabels[kpiMetric]} per Engine</h2>
          </div>
          <div style={{ height: '300px' }}>
            {n > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredEngines}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="engine_id" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#fff', fontSize: '0.8rem' }} />
                  <Bar dataKey={kpiMetric} fill={metricColors[kpiMetric]} radius={[3, 3, 0, 0]} name={metricLabels[kpiMetric]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p>No data</p>}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="chart-container" style={{ flex: 1 }}>
          <div className="chart-header">
            <h2>Fault Distribution</h2>
          </div>
          <div style={{ height: '300px' }}>
            {faultData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={faultData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                    {faultData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p>Loading...</p>}
          </div>
        </div>
      </div>

      {/* Availability Distribution */}
      <div className="chart-container" style={{ minHeight: '300px' }}>
        <div className="chart-header">
          <h2>Availability Distribution per Engine</h2>
        </div>
        <div style={{ height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredEngines}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="engine_id" stroke="#666" tick={{ fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#fff', fontSize: '0.8rem' }} />
              <Bar
                dataKey="availability_pct"
                name="Availability %"
                radius={[3, 3, 0, 0]}
              >
                {filteredEngines.map((entry: any, index: number) => (
                  <Cell key={`avail-${index}`} fill={entry.availability_pct >= 95 ? '#22c55e' : entry.availability_pct >= 85 ? '#eab308' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
