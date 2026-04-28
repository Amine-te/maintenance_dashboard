'use client';
import { useState } from 'react';

interface TimelineSegment {
  start: number;
  end: number;
  state: string;
  defect?: string;
  segment_id?: number;
}

const STATE_COLORS: Record<string, string> = {
  running: '#22c55e',
  repair: '#f97316',
  failure: '#ef4444',
};

const STATE_GLOW: Record<string, string> = {
  running: 'rgba(34, 197, 94, 0.3)',
  repair: 'rgba(249, 115, 22, 0.3)',
  failure: 'rgba(239, 68, 73, 0.5)',
};

const DEFECT_LABELS: Record<string, string> = {
  overheating: '🔥 Overheating',
  bearing_misalignment: '⚙️ Bearing',
  wear: '🔧 Wear',
  unclassified: '❓ Unclassified',
};

interface Props {
  data: any[];
}

export default function EngineTimeline({ data }: Props) {
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!data || data.length === 0) return null;

  // Build segments from consecutive rows with the same state
  const segments: TimelineSegment[] = [];
  let currentState = data[0].machine_state;
  let currentDefect = data[0].defect_type;
  let currentSegId = data[0].segment_id;
  let segStart = data[0].virtual_cycle;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.machine_state !== currentState || row.segment_id !== currentSegId) {
      // Close the previous segment
      segments.push({ start: segStart, end: data[i - 1].virtual_cycle, state: currentState, defect: currentDefect, segment_id: currentSegId });
      
      // If the closed segment was running and ended in a failure, insert a 1-cycle failure marker
      const prevRow = data[i - 1];
      if ((prevRow.is_failure_end === true || prevRow.is_failure_end === 'True') && currentState === 'running') {
        segments.push({ start: prevRow.virtual_cycle, end: prevRow.virtual_cycle + 1, state: 'failure', defect: currentDefect, segment_id: currentSegId });
      }
      
      // Start the new segment
      currentState = row.machine_state;
      currentDefect = row.defect_type;
      currentSegId = row.segment_id;
      segStart = row.virtual_cycle;
    }
  }
  
  // Close the final segment
  segments.push({ start: segStart, end: data[data.length - 1].virtual_cycle, state: currentState, defect: currentDefect, segment_id: currentSegId });
  const lastRow = data[data.length - 1];
  if ((lastRow.is_failure_end === true || lastRow.is_failure_end === 'True') && currentState === 'running') {
    segments.push({ start: lastRow.virtual_cycle, end: lastRow.virtual_cycle + 1, state: 'failure', defect: currentDefect, segment_id: currentSegId });
  }

  const minCycle = data[0].virtual_cycle;
  const maxCycle = data[data.length - 1].virtual_cycle;
  const totalSpan = maxCycle - minCycle || 1;

  const runningCycles = segments.filter(s => s.state === 'running').reduce((a, s) => a + (s.end - s.start), 0);
  const repairCycles = segments.filter(s => s.state === 'repair').reduce((a, s) => a + (s.end - s.start), 0);
  const failureCount = segments.filter(s => s.state === 'failure').length;
  const uptimePct = totalSpan > 0 ? ((runningCycles / totalSpan) * 100).toFixed(1) : '0';

  // Generate tick marks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(minCycle + (totalSpan / tickCount) * i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { label: 'Uptime', value: `${uptimePct}%`, color: '#22c55e' },
          { label: 'Running', value: `${runningCycles} cyc`, color: '#22c55e' },
          { label: 'Repair', value: `${repairCycles} cyc`, color: '#f97316' },
          { label: 'Failures', value: `${failureCount}`, color: '#ef4444' },
        ].map(pill => (
          <div key={pill.label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            border: `1px solid ${pill.color}22`,
            background: `${pill.color}08`,
            fontSize: '0.75rem',
          }}>
            <span style={{ color: pill.color, fontWeight: 600 }}>{pill.value}</span>
            <span style={{ color: '#666' }}>{pill.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline Track */}
      <div style={{ position: 'relative' }}>
        {/* Background Track */}
        <div style={{
          height: '40px',
          background: 'linear-gradient(to bottom, #0a0a0a, #050505)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #1a1a1a',
        }}>
          {/* Segments */}
          {segments.map((seg, i) => {
            const left = ((seg.start - minCycle) / totalSpan) * 100;
            const rawWidth = ((seg.end - seg.start) / totalSpan) * 100;
            const width = Math.max(rawWidth, 0.3) - 0.15;
            const isHovered = hoveredSeg === i;
            const color = STATE_COLORS[seg.state] || '#666';

            return (
              <div
                key={i}
                onMouseEnter={(e) => {
                  setHoveredSeg(i);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parent = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (parent) {
                    setTooltipPos({ x: rect.left - parent.left + rect.width / 2, y: -8 });
                  }
                }}
                onMouseLeave={() => setHoveredSeg(null)}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  top: '6px',
                  bottom: '6px',
                  backgroundColor: color,
                  borderRadius: '3px',
                  opacity: isHovered ? 1 : 0.75,
                  boxShadow: isHovered ? `0 0 12px ${STATE_GLOW[seg.state]}` : 'none',
                  transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
                  cursor: 'pointer',
                  zIndex: isHovered ? 10 : 1,
                }}
              />
            );
          })}

          {/* Tooltip */}
          {hoveredSeg !== null && segments[hoveredSeg] && (
            <div style={{
              position: 'absolute',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)',
              background: '#141414',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.7rem',
              color: '#fff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: STATE_COLORS[segments[hoveredSeg].state],
                  display: 'inline-block',
                }} />
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {segments[hoveredSeg].state}
                </span>
              </div>
              <div style={{ color: '#888' }}>
                Cycles {segments[hoveredSeg].start} → {segments[hoveredSeg].end}
                <span style={{ marginLeft: '8px', color: '#555' }}>
                  ({segments[hoveredSeg].end - segments[hoveredSeg].start} cyc)
                </span>
              </div>
              {segments[hoveredSeg].defect && segments[hoveredSeg].state !== 'running' && (
                <div style={{ color: '#aaa', marginTop: '2px' }}>
                  {DEFECT_LABELS[segments[hoveredSeg].defect!] || segments[hoveredSeg].defect}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tick Marks */}
        <div style={{ position: 'relative', height: '18px', marginTop: '4px' }}>
          {ticks.map((tick, i) => {
            const left = ((tick - minCycle) / totalSpan) * 100;
            return (
              <div key={i} style={{ position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '4px', background: '#333' }} />
                <span style={{ fontSize: '0.6rem', color: '#444', marginTop: '1px' }}>{tick}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.7rem' }}>
        {(['running', 'repair', 'failure'] as const).map(state => (
          <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px', height: '6px',
              borderRadius: '3px', background: STATE_COLORS[state],
              boxShadow: `0 0 6px ${STATE_GLOW[state]}`,
            }} />
            <span style={{ color: '#888', textTransform: 'capitalize' }}>{state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
