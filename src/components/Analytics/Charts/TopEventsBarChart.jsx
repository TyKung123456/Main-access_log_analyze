import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981','#8b5cf6','#f97316','#06b6d4','#84cc16','#ec4899','#22c55e'];

const TopEventsBarChart = ({ logData = [], onSelect }) => {
  const data = useMemo(() => {
    const map = new Map();
    const add = (k) => map.set(k, (map.get(k)||0) + 1);

    (logData||[]).forEach(l => {
      const reason = (l.reason || '').toString().toLowerCase();
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      const hour = dt && !isNaN(dt) ? dt.getHours() : null;
      if (denied) add('การเข้าถึงถูกปฏิเสธ');
      if (reason.includes('expired') || reason.includes('terminate') || reason.includes('inactive')) add('บัตรหมดอายุ/ยกเลิก');
      if (reason.includes('unauthorized') || reason.includes('forbidden')) add('เข้าพื้นที่ไม่ได้รับอนุญาต');
      if (hour !== null && (hour >= 22 || hour <= 6)) add('เข้านอกเวลาทำการ');
      if (reason.includes('door') && (reason.includes('held') || reason.includes('open'))) add('ประตูเปิดค้าง');
      if (reason.includes('lost') || reason.includes('stolen')) add('บัตรถูกแจ้งหาย');
    });

    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    return arr.sort((a,b)=> b.value - a.value).slice(0,10);
  }, [logData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900">Top 10 เหตุการณ์ที่ต้องสนใจ</div>
        <div className="text-xs text-gray-500">คลิกเพื่อดูรายละเอียด</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-20} textAnchor="end" height={40} fontSize={12} stroke="#6b7280" />
            <YAxis fontSize={12} stroke="#6b7280" allowDecimals={false} />
            <Tooltip formatter={(v)=>Number(v).toLocaleString('th-TH')} />
            <Bar dataKey="value" radius={[4,4,0,0]} onClick={(d)=> onSelect?.(d)}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopEventsBarChart;
