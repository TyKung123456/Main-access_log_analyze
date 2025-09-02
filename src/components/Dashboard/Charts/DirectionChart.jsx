// src/components/Dashboard/Charts/DirectionChart.jsx
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const DirectionChart = ({ data = [], loading = false, timeSeriesData = [], locationData = [] }) => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'trends'

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
      return Array.from({ length: 12 }, (_, hour) => {
        const realHour = hour + 6; // Start from 6 AM to 6 PM
        return {
          hour: `${realHour.toString().padStart(2, '0')}:00`,
          IN: Math.floor(Math.random() * 800) + 200,
          OUT: Math.floor(Math.random() * 800) + 200,
          total: 0
        };
      }).map(item => ({
        ...item,
        total: item.IN + item.OUT,
        ratio: item.OUT > 0 ? (item.IN / item.OUT).toFixed(2) : 'N/A'
      }));
    }
    return timeSeriesData;
  }, [timeSeriesData]);

  // Simplified color scheme - only 2 colors needed
  const COLORS = ['#10B981', '#EF4444']; // Green for IN, Red for OUT

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
    let patternIcon = '⚖️';
    if (ratio < 0.9) {
      trafficPattern = 'ออกมากกว่าเข้า';
      patternIcon = '📤';
    } else if (ratio > 1.1) {
      trafficPattern = 'เข้ามากกว่าออก';
      patternIcon = '📥';
    }

    return {
      total, inCount, outCount, ratio: ratio.toFixed(2),
      balance, balancePercentage, trafficPattern, patternIcon
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

        {/* Simplified View Mode Selector - แค่ 2 โหมด */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          {[
            { id: 'overview', label: '📊 ภาพรวม', desc: 'สัดส่วนและสถิติ' },
            { id: 'trends', label: '📈 แนวโน้ม', desc: 'รูปแบบตลอดวัน' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === mode.id
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
          {/* Main Traffic Pattern Card */}
          <div className="bg-white/70 rounded-lg p-6 border border-blue-100/50 mb-6 text-center">
            <div className="text-4xl mb-2">{stats.patternIcon}</div>
            <h4 className="text-lg font-bold text-gray-800 mb-1">{stats.trafficPattern}</h4>
            <div className="text-sm text-gray-600">
              อัตราส่วน IN:OUT = {stats.ratio}:1 | ความไม่สมดุล {stats.balancePercentage}%
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white/50 rounded-lg p-4 border border-white/50">
              <div className="h-64">
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
                      strokeWidth={4}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value.toLocaleString('th-TH')} ครั้ง`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-emerald-600 font-medium mb-1">การเข้า (IN)</div>
                    <div className="text-3xl font-bold text-emerald-800">{stats.inCount.toLocaleString('th-TH')}</div>
                    <div className="text-sm text-emerald-600 mt-1">
                      {stats.total > 0 ? ((stats.inCount / stats.total) * 100).toFixed(1) : 0}% ของทั้งหมด
                    </div>
                  </div>
                  <div className="text-4xl">📥</div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-red-600 font-medium mb-1">การออก (OUT)</div>
                    <div className="text-3xl font-bold text-red-800">{stats.outCount.toLocaleString('th-TH')}</div>
                    <div className="text-sm text-red-600 mt-1">
                      {stats.total > 0 ? ((stats.outCount / stats.total) * 100).toFixed(1) : 0}% ของทั้งหมด
                    </div>
                  </div>
                  <div className="text-4xl">📤</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'trends' && (
        <div className="bg-white/50 rounded-lg p-4 border border-white/50">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">รูปแบบการเข้าถึงตลอดวัน</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-sm text-orange-600 font-medium mb-1">🔥 ช่วงเวลาเร่งด่วน</div>
                <div className="text-xl font-bold text-orange-800">
                  {peakAnalysis.peakHour?.hour}
                </div>
                <div className="text-sm text-orange-600">
                  {peakAnalysis.peakHour?.total.toLocaleString('th-TH')} ครั้ง
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-purple-600 font-medium mb-1">😴 ช่วงเวลาเงียบ</div>
                <div className="text-xl font-bold text-purple-800">
                  {peakAnalysis.lowHour?.hour}
                </div>
                <div className="text-sm text-purple-600">
                  {peakAnalysis.lowHour?.total.toLocaleString('th-TH')} ครั้ง
                </div>
              </div>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
                  tickLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                  axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
                  tickLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                  axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                  tickFormatter={(value) => value.toLocaleString('th-TH')}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${value.toLocaleString('th-TH')} ครั้ง`,
                    name === 'IN' ? '📥 เข้า' : '📤 ออก'
                  ]}
                  labelFormatter={(label, payload) => {
                    const total = payload?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;
                    return `🕐 เวลา ${label} (รวม: ${total.toLocaleString('th-TH')} ครั้ง)`;
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    maxWidth: '300px'
                  }}
                />
                <Bar dataKey="IN" fill="#10B981" name="IN" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OUT" fill="#EF4444" name="OUT" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex justify-center mt-4 space-x-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-emerald-500 rounded mr-2"></div>
              <span className="text-sm font-medium text-gray-700">📥 การเข้า</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-sm font-medium text-gray-700">📤 การออก</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectionChart;