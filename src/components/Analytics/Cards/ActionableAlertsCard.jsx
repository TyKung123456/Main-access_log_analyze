import React, { useMemo } from 'react';

const ActionableAlertsCard = ({ logData = [], onInspect }) => {
  const alerts = useMemo(() => {
    const items = [];

    // Helper
    const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

    // Off-hours suspicious (Server/Data rooms)
    (logData||[]).forEach(l => {
      const raw = l.dateTime || l.accessTime; if (!raw) return;
      const dt = new Date(raw); if (isNaN(dt)) return;
      const h = dt.getHours();
      const isOff = (h >= 22 || h <= 6);
      const loc = (l.location || l.door || '').toString();
      if (isOff && /server|data/i.test(loc)) {
        items.push({
          type: 'SUSPICIOUS_ACCESS',
          severity: 'high',
          message: `เข้าพื้นที่สำคัญนอกเวลา — ${loc}`,
          time: dt,
          meta: { location: loc }
        });
      }
    });

    // Card used after termination/expired
    (logData||[]).forEach(l => {
      const reason = (l.reason || '').toString().toLowerCase();
      const raw = l.dateTime || l.accessTime; if (!raw) return; const dt = new Date(raw); if (isNaN(dt)) return;
      if (reason.includes('terminate') || reason.includes('expired') || reason.includes('inactive')) {
        items.push({
          type: 'TERMINATED_CARD',
          severity: 'medium',
          message: `บัตรหมดอายุ/ยกเลิกแล้วยังพยายามใช้ — ${l.cardName || l.cardNumber || ''}`,
          time: dt,
          meta: { user: l.cardName || l.cardNumber }
        });
      }
    });

    // Door held open
    (logData||[]).forEach(l => {
      const reason = (l.reason || '').toString().toLowerCase();
      const raw = l.dateTime || l.accessTime; if (!raw) return; const dt = new Date(raw); if (isNaN(dt)) return;
      if (reason.includes('door') && (reason.includes('held') || reason.includes('open'))) {
        items.push({
          type: 'DOOR_HELD_OPEN',
          severity: 'medium',
          message: `ประตูเปิดค้าง — ${l.location || l.door || ''}`,
          time: dt,
          meta: { location: l.location || l.door }
        });
      }
    });

    // Duplicate card usage within 5 minutes at different locations
    const byUser = new Map();
    (logData||[]).forEach(l => {
      const raw = l.dateTime || l.accessTime; if (!raw) return;
      const dt = new Date(raw); if (isNaN(dt)) return;
      const user = l.cardName || l.cardNumber || 'Unknown';
      const loc = l.location || l.door || '';
      const arr = byUser.get(user) || [];
      arr.push({ time: dt, location: loc });
      byUser.set(user, arr);
    });
    for (const [user, arr] of byUser.entries()) {
      arr.sort((a,b)=>a.time-b.time);
      for (let i=1;i<arr.length;i++) {
        const diff = (arr[i].time - arr[i-1].time)/(1000*60);
        if (diff <= 5 && (arr[i].location||'') !== (arr[i-1].location||'')) {
          items.push({
            type: 'DUPLICATE_USAGE',
            severity: 'high',
            message: `บัตรใช้หลายจุดในเวลาใกล้กัน — ${user}`,
            time: arr[i].time,
            meta: { user, locations: [arr[i-1].location, arr[i].location] }
          });
        }
      }
    }

    items.sort((a,b)=> b.time - a.time);
    return items.slice(0, 8);
  }, [logData]);

  const badge = (sev) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${
      sev==='high' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>{sev==='high' ? 'สูง' : 'กลาง'}</span>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-rose-50 to-white border-gray-200 flex items-center justify-between">
        <div className="font-semibold text-gray-900">การแจ้งเตือนที่ต้องดำเนินการ</div>
      </div>
      <div className="p-4">
        {alerts.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่มีแจ้งเตือน</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map((a, idx) => (
              <li key={idx} className="py-2 flex items-start gap-3">
                {badge(a.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate" title={a.message}>{a.message}</div>
                  <div className="text-xs text-gray-500">{a.time.toLocaleString('th-TH')}</div>
                </div>
                <button
                  onClick={() => onInspect?.(a)}
                  className="text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50"
                >ตรวจสอบ</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActionableAlertsCard;

