import React, { useMemo, useState, useMemo as useMemoAlias } from 'react';

const ReviewTable = ({ logData = [], onInspect, caseField = 'caseName', enableCaseHighlight = true }) => {
  const [caseQuery, setCaseQuery] = useState('');
  const rows = useMemo(() => {
    const items = [];
    const byUser = new Map();

    (logData||[]).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return; // use all time
      const user = l.cardName || l.cardNumber || 'Unknown';
      const loc = l.location || l.door || '-';
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      const reason = (l.reason || '').toString().toLowerCase();

      const arr = byUser.get(user) || [];
      arr.push({ time: dt, location: loc, denied, reason });
      byUser.set(user, arr);
    });

    // Rule: 3 denials by same person
    for (const [user, arr] of byUser.entries()) {
      const denials = arr.filter(a=>a.denied);
      if (denials.length >= 3) {
        const last = denials[denials.length-1];
        items.push({ time: last.time, user, event: 'ปฏิเสธ 3 ครั้งขึ้นไป', risk: 'สูง', meta: { user } });
      }
      // Multi-location within 5 minutes
      arr.sort((a,b)=>a.time-b.time);
      for (let i=1;i<arr.length;i++) {
        const diff = (arr[i].time - arr[i-1].time)/(1000*60);
        if (diff <= 5 && arr[i].location !== arr[i-1].location) {
          items.push({ time: arr[i].time, user, event: 'หลายพื้นที่ภายใน 5 นาที', risk: 'สูง', meta: { user } });
          break;
        }
      }
    }

    // Off-hours usage
    for (const [user, arr] of byUser.entries()) {
      for (const a of arr) {
        const h = a.time.getHours();
        if (h>=22 || h<=6) { items.push({ time: a.time, user, event: 'ใช้นอกเวลาที่กำหนด', risk: 'กลาง', meta: { user } }); break; }
      }
    }

    // Reported lost
    for (const [user, arr] of byUser.entries()) {
      const hit = arr.find(a => a.reason.includes('lost') || a.reason.includes('stolen'));
      if (hit) items.push({ time: hit.time, user, event: 'บัตรถูกรายงานหาย', risk: 'สูง', meta: { user } });
    }

    items.sort((a,b)=> b.time - a.time);
    return items.slice(0, 10);
  }, [logData]);

  // Derive case names if available
  const caseNames = useMemo(() => {
    const set = new Set();
    (logData || []).forEach((l) => {
      const name = l?.[caseField];
      if (name) set.add(String(name));
    });
    return Array.from(set).sort();
  }, [logData, caseField]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-white border-gray-200 flex items-center justify-between gap-3">
        <div className="font-semibold text-gray-900">รายการต้องตรวจสอบ (10 ล่าสุด)</div>
        <div className="flex items-center gap-2">
          <input
            value={caseQuery}
            onChange={(e) => setCaseQuery(e.target.value)}
            placeholder="ค้นหาชื่อเคส"
            className="h-8 w-44 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {caseNames.length > 0 && (
            <select
              value={caseQuery}
              onChange={(e) => setCaseQuery(e.target.value)}
              className="h-8 rounded-md border border-gray-300 px-2 text-sm bg-white"
            >
              <option value="">ทั้งหมด</option>
              {caseNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2 whitespace-nowrap">เวลา</th>
              <th className="text-left px-4 py-2">ผู้ใช้</th>
              {enableCaseHighlight && <th className="text-left px-4 py-2">ชื่อเคส</th>}
              <th className="text-left px-4 py-2">เหตุการณ์</th>
              <th className="text-left px-4 py-2">ความเสี่ยง</th>
              <th className="text-right px-4 py-2">การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 py-6">ไม่มีรายการ</td>
              </tr>
            ) : rows
              .filter((r) => {
                if (!caseQuery) return true;
                const name = (r.meta?.[caseField] || '').toString();
                return name.toLowerCase().includes(caseQuery.toLowerCase());
              })
              .map((r, i) => (
                <tr key={i} className={"border-t odd:bg-white even:bg-gray-50"}>
                  <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{r.time.toLocaleString('th-TH')}</td>
                  <td className="px-4 py-2 text-gray-900">{r.user}</td>
                  {enableCaseHighlight && (
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center max-w-[240px] gap-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-medium ring-1 ring-blue-200">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span className="truncate" title={r.meta?.[caseField] || '-'}>{r.meta?.[caseField] || '-'}</span>
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-2 text-gray-700">{r.event}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${r.risk==='สูง'?'bg-red-50 text-red-700 border-red-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.risk}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="px-2 py-1 rounded-md border bg-white hover:bg-gray-50 text-xs" onClick={()=>onInspect?.(r)}>ดูรายละเอียด</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewTable;
