import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';

const SuspiciousUsersCard = ({
  topListType,
  setTopListType,
  showAllSuspects,
  setShowAllSuspects,
  suspiciousUsers = [],
  topLists = { denied: [], off_hours: [], multiple_attempts: [] },
  onExplainUser,
  loading = false,
}) => {
  return (
    <Card className="rounded-2xl border-gray-200 shadow-sm h-full flex flex-col">
      <CardHeader className="p-4 pb-0 flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-900">Top 10 ผู้ใช้น่าสงสัย</CardTitle>
        <div className="text-xs flex items-center gap-2">
          <select
            value={topListType}
            onChange={(e)=>setTopListType(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs"
            title="เลือกกลุ่ม Top 10"
          >
            <option value="suspicious">คะแนนสงสัย</option>
            <option value="denied">ปฏิเสธ</option>
            <option value="off_hours">นอกเวลา</option>
            <option value="multiple_attempts">พยายามหลายครั้ง</option>
          </select>
          {topListType === 'suspicious' && (
            <button
              className="border rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50"
              onClick={()=>setShowAllSuspects(s=>!s)}
            >{showAllSuspects ? 'เฉพาะ Top 10' : 'แสดงทั้งหมด'}</button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 min-h-0">
        <ul className="divide-y h-full overflow-y-auto">
          {(() => {
            if (loading) return (<li className="py-3 text-sm text-gray-500">กำลังโหลด...</li>);
            if (topListType === 'suspicious') {
              const list = showAllSuspects ? suspiciousUsers : suspiciousUsers.slice(0,10);
              return (
                (list.length === 0) ? (
                  <li className="py-3 text-sm text-gray-500">ไม่มีข้อมูล</li>
                ) : list.map((u, idx) => (
                  <li key={idx} className="py-2 text-sm flex justify-between items-center">
                    <button
                      className="min-w-0 text-left"
                      onClick={() => onExplainUser?.(u)}
                      title="อธิบายคะแนน"
                    >
                      <div className="font-medium text-gray-900 truncate">{idx+1}. {u.user}</div>
                      <div className="text-xs text-gray-600 truncate">ปฏิเสธ {u.counts?.denied || 0} / รวม {u.counts?.total || 0} • นอกเวลา {u.counts?.offHours || 0} • ล่าสุด {u.lastTime ? new Date(u.lastTime).toLocaleString('th-TH',{hour:'2-digit',minute:'2-digit'}) : '-'}</div>
                    </button>
                    <div className="text-blue-600 font-semibold" title="คะแนนรวม">{u.score}%</div>
                  </li>
                ))
              );
            }
            const items = topListType === 'denied' ? topLists.denied : topListType === 'off_hours' ? topLists.off_hours : topLists.multiple_attempts;
            return (
              items.length === 0 ? (
                <li className="py-3 text-sm text-gray-500">ไม่มีข้อมูล</li>
              ) : items.map(([user,count], idx) => (
                <li key={idx} className="py-2 text-sm flex items-center justify-between">
                  <div className="truncate min-w-0">
                    <span className="mr-2 text-gray-500">{idx+1}.</span>
                    <span className="font-medium text-gray-900 truncate inline-block max-w-[14rem]" title={user}>{user}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{count.toLocaleString('th-TH')}</span>
                </li>
              ))
            );
          })()}
        </ul>
      </CardContent>
    </Card>
  );
};

export default SuspiciousUsersCard;

