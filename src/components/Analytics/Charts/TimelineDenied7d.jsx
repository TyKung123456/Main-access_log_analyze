import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const TimelineDenied7d = ({ logData = [], onSelect }) => {
  const data = useMemo(() => {
    const keyLocal = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`; // local-date key (avoids timezone shifting)
    };
    const MAX_POINTS = 365; // cap points for performance
    let minD = null, maxD = null;
    (logData||[]).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return; const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (!minD || d < minD) minD = d; if (!maxD || d > maxD) maxD = d;
    });
    if (!minD || !maxD) {
      const now = new Date();
      minD = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6);
      maxD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const totalDays = Math.max(1, Math.round((maxD - minD)/(1000*60*60*24)) + 1);
    const days = [];
    for (let i=0;i<totalDays;i++) {
      const d = new Date(minD); d.setDate(minD.getDate()+i);
      days.push({ key: keyLocal(d), label: d.toLocaleDateString('th-TH', { month:'short', day:'2-digit' }), denied: 0 });
    }
    const map = new Map(days.map(d=>[d.key, d]));
    (logData||[]).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return; const key = keyLocal(dt);
      const allowStr = (typeof l.allow === 'string') ? l.allow.toLowerCase() : null;
      const denied = (l.allow === false)
        || (l.allow === 0)
        || (allowStr && ['false','f','0','no'].includes(allowStr))
        || l.status === 'denied'
        || l.accessResult === 'DENIED';
      if (denied && map.has(key)) map.get(key).denied += 1;
    });
    // Aggregate if too many points (group by bins)
    if (days.length > MAX_POINTS) {
      const binSize = Math.ceil(days.length / MAX_POINTS);
      const agg = [];
      for (let i=0;i<days.length;i+=binSize) {
        const end = Math.min(i+binSize-1, days.length-1);
        const sum = days.slice(i, end+1).reduce((s,d)=>s+d.denied,0);
        const label = days[i].label === days[end].label ? days[i].label : `${days[i].label}–${days[end].label}`;
        agg.push({ label, denied: sum });
      }
      return agg;
    }
    return days;
  }, [logData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900">Timeline เหตุการณ์ปฏิเสธ (รายวัน)</div>
        <div className="text-xs text-gray-500">คลิกจุดเพื่อดูรายละเอียด</div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }} onClick={(st)=> onSelect?.(st?.activeLabel)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
            <Tooltip formatter={(v)=>Number(v).toLocaleString('th-TH')} />
            <Legend />
            <Line type="monotone" dataKey="denied" name="ปฏิเสธ" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TimelineDenied7d;
