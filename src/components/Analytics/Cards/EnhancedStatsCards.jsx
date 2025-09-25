import React, { useMemo } from 'react';

const EnhancedStatsCards = ({ logData = [] }) => {
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  const yesterdayKey = yesterday.toISOString().slice(0,10);

  const metrics = useMemo(() => {
    // 1) Denied today vs yesterday
    let deniedToday = 0, deniedYesterday = 0;
    // 2) After-hours across all time: events + unique users
    let afterHoursEventsAll = 0; const afterHoursUsers = new Set();
    const now = new Date();
    // 3) Doors with frequent issues across all time (>=3)
    const issuesByDoor = new Map();
    // 4) Abnormal card usage across all time: duplicate usage at different locations within 5 minutes (unique cards)
    const eventsByUser = new Map();

    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return;
      const key = dt.toISOString().slice(0,10);
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      const user = l.cardName || l.cardNumber || '';
      const location = (l.location || l.door || '').toString();
      const reason = (l.reason || '').toString().toLowerCase();

      // 1) denied per day
      if (key === todayKey && denied) deniedToday++;
      if (key === yesterdayKey && denied) deniedYesterday++;

      // 2) after-hours all time
      const h = dt.getHours();
      if (h >= 22 || h <= 6) {
        afterHoursEventsAll++;
        if (user) afterHoursUsers.add(user);
      }

      // 3) issues per door (all time)
      const door = location;
      const isIssue = (
        reason.includes('error') || reason.includes('timeout') ||
        (reason.includes('door') && (reason.includes('held') || reason.includes('forced') || reason.includes('open')))
      );
      if (door && isIssue) {
        issuesByDoor.set(door, (issuesByDoor.get(door) || 0) + 1);
      }
      // 4) build user sequence (all time)
      const arr = eventsByUser.get(user) || [];
      arr.push({ time: dt, location: door });
      eventsByUser.set(user, arr);
    });

    const deniedDelta = deniedToday - deniedYesterday; // red if > 0

    let abnormalCards = 0; // unique users with duplicate usage
    for (const [user, arr] of eventsByUser.entries()) {
      if (!user) continue;
      arr.sort((a,b)=>a.time-b.time);
      let flagged = false;
      for (let i=1;i<arr.length;i++) {
        const diff = (arr[i].time - arr[i-1].time)/(1000*60);
        if (diff <= 5 && arr[i].location && arr[i-1].location && arr[i].location !== arr[i-1].location) {
          flagged = true; break;
        }
      }
      if (flagged) abnormalCards++;
    }

    const problematicDoors = Array.from(issuesByDoor.values()).filter(v => v >= 3).length;

    return {
      deniedToday,
      deniedDelta,
      afterHoursEventsAll,
      afterHoursUsers: afterHoursUsers.size,
      problematicDoors,
      abnormalCards,
    };
  }, [logData]);

  const Card = ({ title, children, tone = 'default' }) => (
    <div className={`rounded-2xl border shadow-sm ring-1 ring-black/5 p-4 ${tone==='warn'?'border-amber-200 bg-amber-50/50': tone==='danger'?'border-red-200 bg-red-50/50':'border-gray-200 bg-white'}`}>
      <div className="text-xs text-gray-600 mb-1">{title}</div>
      {children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="การเข้าถึงที่ปฏิเสธวันนี้" tone={metrics.deniedDelta>0?'danger':'default'}>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-gray-900">{metrics.deniedToday.toLocaleString('th-TH')}</div>
          <div className={`text-sm ${metrics.deniedDelta>0?'text-red-600':metrics.deniedDelta<0?'text-emerald-600':'text-gray-600'}`}>
            {metrics.deniedDelta>0?'▲':metrics.deniedDelta<0?'▼':'•'} {Math.abs(metrics.deniedDelta).toLocaleString('th-TH')} เทียบเมื่อวาน
          </div>
        </div>
      </Card>
      <Card title="การเข้าถึงนอกเวลาทำการ (ทั้งหมด)">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-900">{metrics.afterHoursEventsAll.toLocaleString('th-TH')}</div>
          <div className="px-2 py-0.5 rounded text-xs border bg-white">ผู้เกี่ยวข้อง {metrics.afterHoursUsers}</div>
        </div>
      </Card>
      <Card title="ประตูที่มีปัญหา (7 วัน)">
        <div className="text-2xl font-bold text-gray-900">{metrics.problematicDoors.toLocaleString('th-TH')}</div>
      </Card>
      <Card title="การใช้บัตรผิดปกติ (7 วัน)">
        <div className="text-2xl font-bold text-gray-900">{metrics.abnormalCards.toLocaleString('th-TH')}</div>
      </Card>
    </div>
  );
};

export default EnhancedStatsCards;
