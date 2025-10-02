import React from 'react';

const SimpleBarList = ({ data = [], maxValue, valueKey = 'value', labelKey = 'label', colorKey = 'color', rightText }) => {
  const max = Math.max(1, maxValue ?? Math.max(0, ...data.map(d => d[valueKey] || 0)));
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const v = d[valueKey] || 0;
        const pct = Math.round((v / max) * 100);
        const color = d[colorKey] || '#3b82f6';
        return (
          <li key={i} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="truncate mr-2">{d[labelKey]}</div>
              <div className="text-gray-700 whitespace-nowrap">{rightText ? rightText(d) : v.toLocaleString('th-TH')}</div>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
              <div className="h-2" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        );
      })}
      {data.length === 0 && (
        <li className="text-sm text-gray-500">ไม่มีข้อมูล</li>
      )}
    </ul>
  );
};

export default SimpleBarList;

