import React, { useMemo, useState } from 'react';

const AccessHeatmap = ({ logData = [], days, mode = 'avg' }) => {
  const [viewMode, setViewMode] = useState(mode || 'avg'); // 'avg' | 'range'

  const localKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocal = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const colorFromRatio = (ratio) => {
    const r = Math.max(0, Math.min(1, Math.sqrt(ratio || 0))); // emphasize mid-range
    // Interpolate between #e0f2fe (224,242,254) and #0369a1 (3,105,161)
    const c1 = [224, 242, 254];
    const c2 = [3, 105, 161];
    const mix = (a, b) => Math.round(a + (b - a) * r);
    const [R, G, B] = [mix(c1[0], c2[0]), mix(c1[1], c2[1]), mix(c1[2], c2[2])];
    return `rgb(${R}, ${G}, ${B})`;
  };

  const { grid, dayLabels, max, headerNote } = useMemo(() => {
    const MAX_ROWS = 365; // cap rows for performance, aggregate older days
    if (viewMode === 'avg') {
      // Average by weekday (0..6) × hour(0..23) across full range
      let minD = null, maxD = null;
      (logData||[]).forEach(l => { const raw = l.dateTime || l.accessTime; if (!raw) return; const dt = new Date(raw); if (!isNaN(dt)) { const dOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); if (!minD || dOnly < minD) minD = dOnly; if (!maxD || dOnly > maxD) maxD = dOnly; }});
      if (!minD || !maxD) { const t=new Date(); minD=new Date(t.getFullYear(),t.getMonth(),t.getDate()); maxD=new Date(minD); }
      const totalDays = Math.max(1, Math.round((maxD - minD)/(1000*60*60*24)) + 1);
      const baseWeeks = Math.floor(totalDays / 7); const remainder = totalDays % 7;
      const daysCount = Array.from({length:7}, () => baseWeeks);
      for (let i=0;i<remainder;i++) { const idx = (minD.getDay() + i) % 7; daysCount[idx] += 1; }

      const sums = Array.from({length:7}, ()=> Array.from({length:24}, ()=>0));
      (logData||[]).forEach(l=>{ const raw=l.dateTime||l.accessTime; if(!raw) return; const dt=new Date(raw); if(isNaN(dt)) return; const r=dt.getDay(); const c=dt.getHours(); sums[r][c]+=1; });
      const avgs = sums.map((row, r) => row.map(v => v / Math.max(1, daysCount[r])));
      const mx = avgs.flat().reduce((m,v)=> v>m?v:m, 0) || 1;
      const labels = Array.from({length:7}, (_,i)=>{
        const ref = new Date(2023, 0, 1 + i); // 2023-01-01 is Sunday
        return ref.toLocaleDateString('th-TH', { weekday:'short' });
      });
      return { grid: avgs, dayLabels: labels, max: mx, headerNote: 'เฉลี่ยตามวันในสัปดาห์ × 24 ชั่วโมง' };
    }

    let dayKeys = [];
    const daysWindow = viewMode === 'avg' ? null : (typeof days === 'number' && days > 0 ? days : 30);
    if (viewMode !== 'avg' && daysWindow) {
      const today = new Date();
      const start = new Date(today); start.setDate(today.getDate() - (daysWindow-1)); start.setHours(0,0,0,0);
      for (let i=0;i<daysWindow;i++) {
        const d = new Date(start); d.setDate(start.getDate()+i);
        dayKeys.push(localKey(d));
      }
    } else {
      // Use full range across dataset
      let minD = null, maxD = null;
      (logData||[]).forEach(l => {
        const raw = l.dateTime || l.accessTime; if (!raw) return; const dt = new Date(raw); if (isNaN(dt)) return;
        if (!minD || dt < minD) minD = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        if (!maxD || dt > maxD) maxD = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      });
      if (!minD || !maxD) {
        const today = new Date();
        minD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        maxD = new Date(minD);
      }
      const totalDays = Math.max(1, Math.round((maxD - minD)/(1000*60*60*24)) + 1);
      for (let i=0;i<totalDays;i++) {
        const d = new Date(minD); d.setDate(minD.getDate()+i);
        dayKeys.push(localKey(d));
      }
    }
    const matrix = dayKeys.map(() => Array.from({length:24}, () => 0));
    (logData||[]).forEach(l => {
      const raw = l.dateTime || l.accessTime; if (!raw) return; const dt = new Date(raw); if (isNaN(dt)) return;
      const key = localKey(dt); const col = dt.getHours();
      const row = dayKeys.indexOf(key); if (row === -1) return;
      matrix[row][col] += 1;
    });
    // Aggregate if too many rows
    let aggGrid = matrix;
    let aggLabels = dayKeys.map(k => {
      const d = parseLocal(k);
      return d.toLocaleDateString('th-TH', { year:'2-digit', month:'2-digit', day:'2-digit' });
    });
    if (matrix.length > MAX_ROWS) {
      const binSize = Math.ceil(matrix.length / MAX_ROWS);
      const newGrid = [];
      const newLabels = [];
      for (let startIdx = 0; startIdx < matrix.length; startIdx += binSize) {
        const endIdx = Math.min(startIdx + binSize - 1, matrix.length - 1);
        const row = Array.from({length:24}, (_,h)=>{
          let sum = 0; for (let r = startIdx; r <= endIdx; r++) sum += matrix[r][h]; return sum;
        });
        newGrid.push(row);
        const startLabel = aggLabels[startIdx];
        const endLabel = aggLabels[endIdx];
        newLabels.push(startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`);
      }
      aggGrid = newGrid;
      aggLabels = newLabels;
    }
    const mx = aggGrid.flat().reduce((m,v)=>v>m?v:m, 0) || 1;
    return { grid: aggGrid, dayLabels: aggLabels, max: mx, headerNote: 'ทั้งหมด × 24 ชั่วโมง' };
  }, [logData, days, viewMode]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-900">Heat Map การเข้าออกรายชั่วโมง</div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs text-gray-500">{headerNote}</div>
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('avg')}
              className={`px-2.5 py-1 rounded-md ${viewMode==='avg' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >เฉลี่ยตามวัน</button>
            <button
              onClick={() => setViewMode('range')}
              className={`px-2.5 py-1 rounded-md ${viewMode!=='avg' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >30 วันล่าสุด</button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(24, minmax(18px,1fr))`, gap: 6 }}>
          {/* Header hours */}
          <div></div>
          {Array.from({length:24}, (_,h) => (
            <div key={h} className="text-[10px] text-gray-500 text-center">{String(h).padStart(2,'0')}</div>
          ))}
          {/* Rows */}
          {grid.map((row, r) => (
            <React.Fragment key={r}>
              <div className="text-xs text-gray-600 text-right pr-2 leading-5 sticky left-0 bg-white">{dayLabels[r]}</div>
              {row.map((v, c) => {
                const ratio = v / (max || 1);
                const color = colorFromRatio(ratio);
                return (
                  <div key={c} className="h-5 rounded relative border border-white/40" title={`${dayLabels[r]} ${String(c).padStart(2,'0')}:00 — ${v.toLocaleString('th-TH')}`} style={{ backgroundColor: color }}>
                    {ratio >= 0.85 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow">{v}</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-gray-600">
        <span>น้อย</span>
        <div className="h-2 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, #e0f2fe 0%, #0369a1 100%)' }} />
        <span>มาก</span>
        <span className="ml-2">สูงสุด: {max?.toLocaleString?.('th-TH') || 0}</span>
      </div>
    </div>
  );
};

export default AccessHeatmap;
