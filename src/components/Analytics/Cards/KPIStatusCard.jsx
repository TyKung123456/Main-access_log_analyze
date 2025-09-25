import React from 'react';

const KPIStatusCard = ({ freshness, kpiDelta, bands }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">อัปเดตล่าสุด</div>
          <div className="text-sm text-gray-800">{freshness.last ? new Date(freshness.last).toLocaleString('th-TH') : '-'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">อัตราถูกปฏิเสธ (7 วัน)</div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">{kpiDelta.curRate}%</div>
            <div className={`text-sm ${kpiDelta.delta>0 ? 'text-red-600' : kpiDelta.delta<0 ? 'text-emerald-600' : 'text-gray-600'}`}>
              {kpiDelta.delta>0 ? '▲' : kpiDelta.delta<0 ? '▼' : '•'} {Math.abs(kpiDelta.delta)}% เทียบช่วงก่อน
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">ระดับความเสี่ยงผู้ใช้</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">ต่ำ {bands.low}</span>
            <span className="text-yellow-700">กลาง {bands.mid}</span>
            <span className="text-red-700">สูง {bands.high}</span>
            <span className="text-gray-400 ml-auto">รวม {bands.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIStatusCard;

