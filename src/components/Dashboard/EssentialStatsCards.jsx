import React, { useMemo } from 'react';
import { Users, MapPin, ShieldClose, BarChart3 } from 'lucide-react';

const Card = ({ id, dataKey, title, value, accent = 'blue', Icon }) => {
  const colorMap = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };
  const color = colorMap[accent] || colorMap.blue;
  return (
    <div
      id={id}
      data-kpi={dataKey}
      className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 ring-1 ring-black/5 flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-[1px] cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        const card = e.currentTarget;
        // Spotlight the card
        card.classList.remove('jump-pop');
        void card.offsetWidth;
        card.classList.add('jump-pop');
        // Bounce the number
        const val = card.querySelector('.kpi-value');
        if (val) {
          val.classList.remove('kpi-bounce');
          void val.offsetWidth;
          val.classList.add('kpi-bounce');
          setTimeout(() => val.classList.remove('kpi-bounce'), 1000);
        }
        setTimeout(() => card.classList.remove('jump-pop'), 1200);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50">
          <Icon className={`${color} w-5 h-5`} />
        </div>
      )}
      <div>
        <div className="text-xs font-medium text-gray-600 tracking-wide">{title}</div>
        <div className={`text-2xl font-semibold ${color}`}><span className="kpi-value inline-block">{value}</span></div>
      </div>
    </div>
  );
};

const EssentialStatsCards = ({ stats = {}, logData = [] }) => {
  const data = useMemo(() => {
    const total = (
      stats.total_records ?? stats.totalAccess ?? stats.total ?? (Array.isArray(logData) ? logData.length : 0) ?? 0
    ) || 0;
    const denied = (
      stats.denied_count ?? stats.deniedAccess ?? stats.denied ??
      (Array.isArray(logData) ? logData.filter(l => (l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED')).length : 0)
    ) || 0;
    // Unique users overall (union of IN/OUT)
    const uniqueUsers = (() => {
      try {
        return (Array.isArray(logData) ? new Set(logData.map(l => (l.cardName || l.cardNumber)).filter(Boolean)).size : 0);
      } catch { return 0; }
    })();
    const uniqueLocations = (
      stats.unique_locations ?? (Array.isArray(logData) ? new Set(logData.map(l => (l.location || l.door))).size : 0)
    ) || 0;
    return { total, denied, uniqueUsers, uniqueLocations };
  }, [stats, logData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card id="kpi-total" dataKey="total" title="การเข้าถึงทั้งหมด" value={data.total.toLocaleString('th-TH')} accent="blue" Icon={BarChart3} />
      {/* เปลี่ยนเป็นจำนวนแทนเปอร์เซ็นต์ตามคำขอ */}
      <Card id="kpi-denied" dataKey="denied" title="ถูกปฏิเสธ" value={(data.denied || 0).toLocaleString('th-TH')} accent="red" Icon={ShieldClose} />
      <Card id="kpi-uniqueUsers" dataKey="uniqueUsers" title="ผู้ใช้" value={(data.uniqueUsers || 0).toLocaleString('th-TH')} accent="green" Icon={Users} />
      <Card id="kpi-locations" dataKey="locations" title="สถานที่ทั้งหมด" value={(data.uniqueLocations || 0).toLocaleString('th-TH')} accent="blue" Icon={MapPin} />
    </div>
  );
};

export default EssentialStatsCards;
