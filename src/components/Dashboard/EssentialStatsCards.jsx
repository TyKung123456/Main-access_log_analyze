import React, { useMemo } from 'react';
import { Users, MapPin, ShieldClose, BarChart3 } from 'lucide-react';

const Card = ({ title, value, accent = 'blue', Icon }) => {
  const colorMap = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };
  const color = colorMap[accent] || colorMap.blue;
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 ring-1 ring-black/5 flex items-center gap-4">
      {Icon && (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50">
          <Icon className={`${color} w-5 h-5`} />
        </div>
      )}
      <div>
        <div className="text-xs font-medium text-gray-600 tracking-wide">{title}</div>
        <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  );
};

const EssentialStatsCards = ({ stats = {}, logData = [] }) => {
  const data = useMemo(() => {
    const total = (
      stats.total_records ?? stats.totalAccess ?? stats.total ?? logData.length ?? 0
    ) || 0;
    const denied = (
      stats.denied_count ?? stats.deniedAccess ?? stats.denied ??
      (Array.isArray(logData) ? logData.filter(l => (l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED')).length : 0)
    ) || 0;
    const deniedRate = total > 0 ? ((denied / total) * 100) : 0;
    const unique = (
      stats.uniqueUsers ?? stats.unique_users ?? stats.unique_cards ?? stats.unique_locations ?? 0
    );
    const uniqueLocations = (
      stats.unique_locations ?? (Array.isArray(logData) ? new Set(logData.map(l => (l.location || l.door))).size : 0)
    ) || 0;
    return {
      total,
      deniedRate: Math.round(deniedRate * 10) / 10,
      unique,
      uniqueLocations,
    };
  }, [stats, logData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="การเข้าถึงทั้งหมด" value={data.total.toLocaleString('th-TH')} accent="blue" Icon={BarChart3} />
      <Card title="อัตราปฏิเสธ (%)" value={`${data.deniedRate}%`} accent="red" Icon={ShieldClose} />
      <Card title="ผู้ใช้ที่ไม่ซ้ำ" value={(data.unique || 0).toLocaleString('th-TH')} accent="purple" Icon={Users} />
      <Card title="สถานที่ทั้งหมด" value={(data.uniqueLocations || 0).toLocaleString('th-TH')} accent="green" Icon={MapPin} />
    </div>
  );
};

export default EssentialStatsCards;
