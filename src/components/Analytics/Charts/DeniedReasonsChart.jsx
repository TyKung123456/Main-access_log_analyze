import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// สีที่ออกแบบให้ดูสบายตาและแยกแยะได้ง่าย
const COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red  
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// Helper functions
const categorizeReason = (reason) => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('card') || reasonLower.includes('บัตร')) return 'บัตร/การ์ด';
  if (reasonLower.includes('time') || reasonLower.includes('เวลา')) return 'เวลา';
  if (reasonLower.includes('access') || reasonLower.includes('สิทธิ์')) return 'สิทธิ์การเข้าถึง';
  if (reasonLower.includes('door') || reasonLower.includes('ประตู')) return 'ประตู/อุปกรณ์';
  if (reasonLower.includes('user') || reasonLower.includes('ผู้ใช้')) return 'ผู้ใช้งาน';
  return 'อื่นๆ';
};

const getSeverityLevel = (reason) => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('security') || reasonLower.includes('unauthorized')) return 'สูง';
  if (reasonLower.includes('expired') || reasonLower.includes('invalid')) return 'กลาง';
  return 'ต่ำ';
};

const DeniedReasonsChart = ({ data = [], loading = false }) => {
  const isEmptyish = (v) => {
    if (v === undefined || v === null) return true;
    const s = String(v).trim().toLowerCase();
    return s === '' || ['ไม่ระบุ', 'n/a', 'na', '-', '—', 'unspecified', 'not specified'].includes(s);
  };
  const [viewMode, setViewMode] = useState('pie'); // 'pie' หรือ 'bar'

  // ปรับปรุงการประมวลผลข้อมูลให้กระชับขึ้น
  const { processedData, totalDeniedAll, topReason } = useMemo(() => {
    const reasonCounts = {};

    (data || []).forEach(item => {
      const denied = (item.allow === false) || item.status === 'denied' || item.accessResult === 'DENIED';
      if (denied && !isEmptyish(item.reason)) {
        const r = String(item.reason).trim();
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      }
    });

    const all = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        name: reason,
        value: count,
        shortName: reason.length > 25 ? reason.substring(0, 25) + '...' : reason,
        category: categorizeReason(reason),
        severity: getSeverityLevel(reason)
      }))
      .sort((a, b) => b.value - a.value);

    const totalDeniedAll = all.reduce((sum, it) => sum + it.value, 0);
    const processedData = all.slice(0, 8);
    const topReason = all[0] || null;
    return { processedData, totalDeniedAll, topReason };
  }, [data]);

  // Custom tooltip ที่ดูสะอาดขึ้น
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const denom = totalDeniedAll || 1;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{data.payload.name}</p>
          <p className="text-sm text-gray-600">
            จำนวน: <span className="font-semibold text-blue-600">{data.value}</span> ครั้ง
          </p>
          <p className="text-xs text-gray-500">
            {((data.value / denom) * 100).toFixed(1)}% ของทั้งหมด
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header ที่เรียบง่าย */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">เหตุผลการปฏิเสธ</h3>
            <p className="text-sm text-gray-600 mt-1">รวม {totalDeniedAll.toLocaleString('th-TH')} ครั้ง</p>
          </div>

          {/* Toggle view mode */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'pie'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              วงกลม
            </button>
            <button
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'bar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              แท่ง
            </button>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {processedData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">ไม่มีข้อมูลการปฏิเสธ</p>
            </div>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'pie' ? (
                <PieChart>
                  <Pie
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {processedData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="shortName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                    stroke="#6b7280"
                  />
                  <YAxis fontSize={12} stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                  >
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend สำหรับ Pie Chart */}
        {processedData.length > 0 && viewMode === 'pie' && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {processedData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate" title={item.name}>
                    {item.shortName}
                  </span>
                  <span className="text-gray-500 ml-auto">
                    {(((item.value) / (totalDeniedAll || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {processedData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {processedData.length}
                </div>
                <div className="text-xs text-gray-600">ประเภทเหตุผล</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {topReason?.value || 0}
                </div>
                <div className="text-xs text-gray-600">สาเหตุหลัก{topReason ? `: ${topReason.name}` : ''}</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-lg font-semibold text-red-600">
                  {totalDeniedAll.toLocaleString('th-TH')}
                </div>
                <div className="text-xs text-gray-600">ปฏิเสธทั้งหมด</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeniedReasonsChart;
