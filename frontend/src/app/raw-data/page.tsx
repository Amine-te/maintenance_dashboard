'use client';
import { useEffect, useState } from 'react';

const DISPLAY_COLUMNS = [
  'engine_id', 'cycle', 'virtual_cycle', 'machine_state', 'defect_type',
  'segment_id', 'segment_rul', 'is_failure_end',
  'sensor_2', 'sensor_3', 'sensor_4', 'sensor_7', 'sensor_8',
  'sensor_9', 'sensor_11', 'sensor_12', 'sensor_14', 'sensor_15',
  'sensor_17', 'sensor_20', 'sensor_21'
];

export default function RawDataPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [engineFilter, setEngineFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    let url = `http://localhost:8000/api/timeseries/raw/all?page=${page}&page_size=${pageSize}`;
    if (engineFilter) url += `&engine_id=${engineFilter}`;
    if (stateFilter) url += `&state=${stateFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(d => {
        setData(d.data || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page, engineFilter, stateFilter]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <h1>Raw Data</h1>
      <p>Browse the enriched timeseries dataset with pagination and filters.</p>

      {/* Filters */}
      <div className="filter-bar">
        <div>
          <label>Engine ID:</label>
          <input
            type="number"
            placeholder="All"
            value={engineFilter}
            onChange={e => { setEngineFilter(e.target.value); setPage(1); }}
            style={{ width: '80px' }}
          />
        </div>
        <div>
          <label>State:</label>
          <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="running">Running</option>
            <option value="repair">Repair</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {total.toLocaleString()} total rows
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {DISPLAY_COLUMNS.map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {DISPLAY_COLUMNS.map(col => (
                    <td key={col}>
                      {row[col] === null || row[col] === undefined
                        ? '—'
                        : typeof row[col] === 'number'
                          ? Number.isInteger(row[col]) ? row[col] : row[col].toFixed(2)
                          : String(row[col])
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(1)}>First</button>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</button>
      </div>
    </>
  );
}
