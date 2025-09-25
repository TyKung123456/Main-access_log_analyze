import React, { useMemo } from 'react';
import { computeSuspicionByUser } from '../../../utils/suspicionScore';

const UsersToWatchCard = ({ logData = [], onInspect }) => {
  const topUsers = useMemo(() => computeSuspicionByUser(logData, 5), [logData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-white border-gray-200 flex items-center justify-between">
        <div className="font-semibold text-gray-900">ผู้ใช้ที่ต้องติดตาม</div>
      </div>
      <div className="p-4">
        {topUsers.length === 0 ? (
          <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topUsers.map((u, idx) => (
              <li key={idx} className="py-3 flex items-start gap-3">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${u.score>=50?'bg-red-100 text-red-700':u.score>=20?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>{u.score}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{u.user}</div>
                  <div className="text-xs text-gray-500">
                    ปฏิเสธ {u.counts.denied || 0} • นอกเวลา {u.counts.offHours || 0} • จุดเข้า {u.counts.uniqueLocations || 0}
                  </div>
                </div>
                <button
                  onClick={() => onInspect?.({ type: 'USER', user: u.user })}
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

export default UsersToWatchCard;

