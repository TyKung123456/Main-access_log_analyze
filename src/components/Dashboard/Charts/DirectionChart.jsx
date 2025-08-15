// src/components/Dashboard/Charts/DirectionChart.jsx
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const DirectionChart = ({ data = [], loading = false, timeSeriesData = [], locationData = [] }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'trends', 'locations'

  // Enhanced data processing
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item, index) => ({
      ...item,
      name: item.direction === 'IN' ? 'เข้า' :
        item.direction === 'OUT' ? 'ออก' :
          item.directionThai || item.direction || 'ไม่ระบุ',
      value: parseInt(item.count) || parseInt(item.value) || 0,
      originalDirection: item.direction,
      id: `direction-${index}`
    })).filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Process time trends data (hourly pattern)
  const hourlyTrends = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) {
      // Generate mock hourly data for demonstration
      return Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        IN: Math.floor(Math.random() * 1000) + 200,
        OUT: Math.floor(Math.random() * 1000) + 200,
        total: 0
      })).map(item => ({
        ...item,
        total: item.IN + item.OUT,
        ratio: item.OUT > 0 ? (item.IN / item.OUT).toFixed(2) : 'N/A'
      }));
    }
    return timeSeriesData;
  }, [timeSeriesData]);

  // Process location-direction analysis
  const locationAnalysis = useMemo(() => {
    if (!locationData || locationData.length === 0) {
      // Generate mock data for demonstration
      return [
        { location: 'สำนักงานใหญ่ ชั้น 8', IN: 21500, OUT: 21575, ratio: 1.00, trend: 'balanced' },
        { location: 'สำนักงานใหญ่ ชั้น 5', IN: 15400, OUT: 15591, ratio: 1.01, trend: 'slightly_out' },
        { location: 'สำนักงานใหญ่ ชั้น 6', IN: 7200, OUT: 7517, ratio: 1.04, trend: 'out_heavy' },
        { location: 'อาคารถนนศรีอยุธยา ชั้น 6', IN: 7100, OUT: 7376, ratio: 1.04, trend: 'out_heavy' },
        { location: 'อาคารถนนศรีอยุธยา ชั้น 7', IN: 6000, OUT: 6230, ratio: 1.04, trend: 'out_heavy' }
      ];
    }
    return locationData;
  }, [locationData]);

  const COLORS = ['#1E40AF', '#059669', '#DC2626', '#7C3AED', '#EA580C'];

  // Calculate enhanced statistics
  const stats = useMemo(() => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const inData = chartData.find(item => item.originalDirection === 'IN');
    const outData = chartData.find(item => item.originalDirection === 'OUT');

    const inCount = inData?.value || 0;
    const outCount = outData?.value || 0;
    const ratio = outCount > 0 ? (inCount / outCount) : 0;
    const balance = Math.abs(inCount - outCount);
    const balancePercentage = total > 0 ? ((balance / total) * 100).toFixed(1) : 0;

    // Determine traffic pattern
    let trafficPattern = 'สมดุล';
    if (ratio < 0.9) trafficPattern = 'ออกมากกว่าเข้า';
    else if (ratio > 1.1) trafficPattern = 'เข้ามากกว่าออก';

    return {
      total, inCount, outCount, ratio: ratio.toFixed(2),
      balance, balancePercentage, trafficPattern
    };
  }, [chartData]);

  // Peak hours analysis
  const peakAnalysis = useMemo(() => {
    const sorted = [...hourlyTrends].sort((a, b) => b.total - a.total);
    const peakHour = sorted[0];
    const lowHour = sorted[sorted.length - 1];

    return { peakHour, lowHour };
  }, [hourlyTrends]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50">
        <h3 className="text-xl font-bold text-gray-800 mb-6">การวิเคราะห์ทิศทางการเข้าถึง</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent mx-auto"></div>
            </div>
            <p className="text-gray-600 font-medium">กำลังวิเคราะห์ข้อมูลทิศทาง...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50">
        <h3 className="text-xl font-bold text-gray-800 mb-6">การวิเคราะห์ทิศทางการเข้าถึง</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">ไม่มีข้อมูลทิศทาง</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50 hover:shadow-xl transition-shadow duration-300">
      {/* Header with Mode Toggle */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">การวิเคราะห์ทิศทางการเข้าถึง</h3>
            <p className="text-gray-500 text-sm">วิเคราะห์รูปแบบการเข้า-ออกและแนวโน้ม</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString('th-TH')}</div>
            <div className="text-xs text-gray-500">ครั้งทั้งหมด</div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          {[
            { id: 'overview', label: '📊 ภาพรวม', desc: 'สัดส่วนและสถิติ' },
            { id: 'trends', label: '📈 แนวโน้มรายชั่วโมง', desc: 'รูปแบบตลอดวัน' },
            { id: 'locations', label: '📍 แยกตามสถานที่', desc: 'วิเคราะห์ตามพื้นที่' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === mode.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
              title={mode.desc}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <>
          {/* Traffic Pattern Analysis */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/70 rounded-lg p-4 border border-blue-100/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">รูปแบบการจราจร</h4>
              <div className="text-lg font-bold text-blue-600">{stats.trafficPattern}</div>
              <div className="text-xs text-gray-500 mt-1">
                อัตราส่วน IN:OUT = {stats.ratio}:1
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-4 border border-green-100/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">ความไม่สมดุล</h4>
              <div className="text-lg font-bold text-green-600">{stats.balancePercentage}%</div>
              <div className="text-xs text-gray-500 mt-1">
                ส่วนต่าง {stats.balance.toLocaleString('th-TH')} ครั้ง
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white/50 rounded-lg p-4 border border-white/50 mb-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString('th-TH')} ครั้ง`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-medium">การเข้า (IN)</div>
                  <div className="text-lg font-bold text-blue-800">{stats.inCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="text-2xl">🔵</div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-600 font-medium">การออก (OUT)</div>
                  <div className="text-lg font-bold text-green-800">{stats.outCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="text-2xl">🟢</div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'trends' && (
        <div className="bg-white/50 rounded-lg p-4 border border-white/50">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">รูปแบบการเข้าถึงตลอด 24 ชั่วโมง</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-sm text-orange-600 font-medium">ช่วงเวลาเร่งด่วน</div>
                <div className="text-lg font-bold text-orange-800">
                  {peakAnalysis.peakHour?.hour} ({peakAnalysis.peakHour?.total.toLocaleString('th-TH')} ครั้ง)
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">ช่วงเวลาเงียบ</div>
                <div className="text-lg font-bold text-purple-800">
                  {peakAnalysis.lowHour?.hour} ({peakAnalysis.lowHour?.total.toLocaleString('th-TH')} ครั้ง)
                </div>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrends.slice(0, 12)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [`${value.toLocaleString('th-TH')} ครั้ง`, name === 'IN' ? 'เข้า' : 'ออก']}
                  labelFormatter={(label) => `เวลา ${label}`}
                />
                <Bar dataKey="IN" fill="#1E40AF" name="IN" radius={[2, 2, 0, 0]} />
                <Bar dataKey="OUT" fill="#059669" name="OUT" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'locations' && (
        <div className="bg-white/50 rounded-lg p-4 border border-white/50">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">การวิเคราะห์แยกตามสถานที่</h4>
          <div className="space-y-3">
            {locationAnalysis.map((location, index) => {
              const total = location.IN + location.OUT;
              const inPercentage = ((location.IN / total) * 100).toFixed(1);
              const outPercentage = ((location.OUT / total) * 100).toFixed(1);

              return (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-medium text-gray-800">{location.location}</h5>
                      <div className="text-sm text-gray-500">รวม {total.toLocaleString('th-TH')} ครั้ง</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${location.trend === 'balanced' ? 'bg-green-100 text-green-800' :
                        location.trend === 'out_heavy' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {location.trend === 'balanced' ? '⚖️ สมดุล' :
                        location.trend === 'out_heavy' ? '📤 ออกมาก' : '📥 เข้ามาก'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-blue-600 font-semibold">{location.IN.toLocaleString('th-TH')}</div>
                      <div className="text-gray-500">เข้า ({inPercentage}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600 font-semibold">{location.OUT.toLocaleString('th-TH')}</div>
                      <div className="text-gray-500">ออก ({outPercentage}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-600 font-semibold">{location.ratio}</div>
                      <div className="text-gray-500">อัตราส่วน</div>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="mt-3 flex gap-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500"
                      style={{ width: `${inPercentage}%` }}
                    ></div>
                    <div
                      className="bg-green-500"
                      style={{ width: `${outPercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectionChart;
