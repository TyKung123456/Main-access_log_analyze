// src/components/Dashboard/Charts/HourlyTrendChart.jsx
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const HourlyTrendChart = ({ data = [], loading = false }) => {
  // State สำหรับเลือกดูเส้น
  const [visibleLines, setVisibleLines] = useState({
    count: true,
    success: true,
    denied: true
  });

  // Safe data handling
  const chartData = Array.isArray(data) && data.length > 0 ? data :
    Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      hourThai: `${hour.toString().padStart(2, '0')}:00 น.`,
      count: 0,
      success: 0,
      denied: 0
    }));

  // หาค่าสูงสุดในข้อมูลเพื่อใช้ปรับ domain (เฉพาะเส้นที่แสดง)
  const maxValue = Math.max(
    ...chartData.map(item => Math.max(
      visibleLines.count ? (parseInt(item.count) || 0) : 0,
      visibleLines.success ? (parseInt(item.success) || 0) : 0,
      visibleLines.denied ? (parseInt(item.denied) || 0) : 0
    ))
  );

  // คำนวณสถิติสำหรับแสดงผล
  const totalCount = chartData.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);
  const totalSuccess = chartData.reduce((sum, item) => sum + (parseInt(item.success) || 0), 0);
  const totalDenied = chartData.reduce((sum, item) => sum + (parseInt(item.denied) || 0), 0);
  const successRate = totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0;

  // ฟังก์ชันสำหรับ toggle การแสดงเส้น
  const toggleLine = (lineKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-sm border border-blue-100/50">
        <h3 className="text-xl font-bold text-gray-800 mb-6">การเข้าถึงตามช่วงเวลา (24 ชั่วโมง)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent mx-auto"></div>
            </div>
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลกราฟ...</p>
            <p className="text-gray-400 text-sm mt-1">โปรดรอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50 hover:shadow-xl transition-shadow duration-300">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">การเข้าถึงตามช่วงเวลา (24 ชั่วโมง)</h3>
            <p className="text-gray-500 text-sm">วิเคราะห์แนวโน้มการใช้งานตลอด 24 ชั่วโมง</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{totalCount.toLocaleString('th-TH')}</div>
            <div className="text-xs text-gray-500">ครั้งทั้งหมด</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100/50">
            <div className="text-lg font-semibold text-green-600">{successRate}%</div>
            <div className="text-xs text-gray-500">อัตราสำเร็จ</div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-green-100/50">
            <div className="text-lg font-semibold text-green-600">{totalSuccess.toLocaleString('th-TH')}</div>
            <div className="text-xs text-gray-500">เข้าถึงสำเร็จ</div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-red-100/50">
            <div className="text-lg font-semibold text-red-500">{totalDenied.toLocaleString('th-TH')}</div>
            <div className="text-xs text-gray-500">ถูกปฏิเสธ</div>
          </div>
        </div>
      </div>

      {chartData.every(item => (parseInt(item.count) || 0) === 0) ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">ไม่มีข้อมูลการเข้าถึง</p>
            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนช่วงเวลาหรือตัวกรองข้อมูล</p>
          </div>
        </div>
      ) : (
        <div className="h-64 bg-white/50 rounded-lg p-4 border border-white/50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                strokeOpacity={0.6}
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#e2e8f0' }}
                interval={1}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.1) : 100]}
                tickFormatter={(value) => value.toLocaleString('th-TH')}
              />

              <Tooltip
                formatter={(value, name) => [
                  `${value.toLocaleString('th-TH')} ครั้ง`,
                  name === 'count' ? 'การเข้าถึงทั้งหมด' :
                    name === 'success' ? 'เข้าถึงสำเร็จ' :
                      name === 'denied' ? 'ถูกปฏิเสธ' : name
                ]}
                labelFormatter={(label) => `🕐 เวลา ${label} น.`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  fontSize: '14px'
                }}
                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              />

              {/* เส้นกราฟ - แสดงเฉพาะที่เลือก */}
              {visibleLines.count && (
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={4}
                  strokeOpacity={1}
                  dot={{ fill: '#3B82F6', strokeWidth: 0, r: 6, fillOpacity: 1 }}
                  activeDot={{
                    r: 10,
                    stroke: '#3B82F6',
                    strokeWidth: 3,
                    fill: '#ffffff',
                    filter: 'drop-shadow(0px 2px 4px rgba(59, 130, 246, 0.3))'
                  }}
                  name="count"
                  connectNulls={false}
                />
              )}

              {visibleLines.success && (
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#10B981"
                  strokeWidth={4}
                  strokeOpacity={1}
                  strokeDasharray="0"
                  dot={{ fill: '#10B981', strokeWidth: 0, r: 5, fillOpacity: 1 }}
                  activeDot={{
                    r: 8,
                    stroke: '#10B981',
                    strokeWidth: 3,
                    fill: '#ffffff',
                    filter: 'drop-shadow(0px 2px 4px rgba(16, 185, 129, 0.3))'
                  }}
                  name="success"
                />
              )}

              {visibleLines.denied && (
                <Line
                  type="monotone"
                  dataKey="denied"
                  stroke="#EF4444"
                  strokeWidth={3}
                  strokeOpacity={1}
                  strokeDasharray="8 4"
                  dot={{ fill: '#EF4444', strokeWidth: 0, r: 4, fillOpacity: 1 }}
                  activeDot={{
                    r: 7,
                    stroke: '#EF4444',
                    strokeWidth: 3,
                    fill: '#ffffff',
                    filter: 'drop-shadow(0px 2px 4px rgba(239, 68, 68, 0.3))'
                  }}
                  name="denied"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interactive Legend */}
      <div className="flex justify-center mt-6 space-x-8">
        <div
          className={`flex items-center group cursor-pointer transition-all duration-200 px-3 py-2 rounded-lg ${visibleLines.count ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'
            } border`}
          onClick={() => toggleLine('count')}
        >
          <div className={`w-4 h-4 rounded-full mr-3 transition-all duration-200 ${visibleLines.count ? 'bg-blue-500 scale-110' : 'bg-gray-400'
            }`}></div>
          <span className={`text-sm font-medium transition-colors duration-200 ${visibleLines.count ? 'text-blue-700' : 'text-gray-500'
            }`}>การเข้าถึงทั้งหมด</span>
        </div>

        <div
          className={`flex items-center group cursor-pointer transition-all duration-200 px-3 py-2 rounded-lg ${visibleLines.success ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'
            } border`}
          onClick={() => toggleLine('success')}
        >
          <div className={`w-4 h-4 rounded-full mr-3 transition-all duration-200 ${visibleLines.success ? 'bg-green-500 scale-110' : 'bg-gray-400'
            }`}></div>
          <span className={`text-sm font-medium transition-colors duration-200 ${visibleLines.success ? 'text-green-700' : 'text-gray-500'
            }`}>เข้าถึงสำเร็จ</span>
        </div>

        <div
          className={`flex items-center group cursor-pointer transition-all duration-200 px-3 py-2 rounded-lg ${visibleLines.denied ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200'
            } border`}
          onClick={() => toggleLine('denied')}
        >
          <div className={`w-4 h-1 mr-3 transition-all duration-200 ${visibleLines.denied ? 'bg-red-500 scale-110' : 'bg-gray-400'
            }`} style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
          <span className={`text-sm font-medium transition-colors duration-200 ${visibleLines.denied ? 'text-red-700' : 'text-gray-500'
            }`}>ถูกปฏิเสธ</span>
        </div>
      </div>
    </div>
  );
};

export default HourlyTrendChart;
