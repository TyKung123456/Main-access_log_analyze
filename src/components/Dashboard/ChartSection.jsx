// src/components/Dashboard/ChartSection.jsx - Interactive Charts
import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ChartSection = ({ logData = [] }) => {
  // สร้างข้อมูลสำหรับกราฟต่างๆ
  const chartData = useMemo(() => {
    if (!logData || logData.length === 0) {
      return {
        hourlyData: [],
        dailyData: [],
        locationData: [],
        deviceData: [],
        statusData: [],
        weeklyData: []
      };
    }

    // ข้อมูลรายชั่วโมง
    const hourlyStats = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { hour: i, total: 0, success: 0, denied: 0 };
    }

    // ข้อมูลรายวัน (7 วันล่าสุด)
    const dailyStats = {};
    const weeklyStats = {};
    const locationStats = {};
    const deviceStats = {};
    let totalSuccess = 0;
    let totalDenied = 0;

    logData.forEach(log => {
      try {
        // วิเคราะห์เวลา
        if (log.dateTime) {
          const date = new Date(log.dateTime);
          if (!isNaN(date.getTime())) {
            const hour = date.getHours();
            const dayKey = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('th-TH', { weekday: 'short' });

            // รายชั่วโมง
            if (hourlyStats[hour]) {
              hourlyStats[hour].total++;
              if (log.allow === true || log.allow === 1) {
                hourlyStats[hour].success++;
              } else {
                hourlyStats[hour].denied++;
              }
            }

            // รายวัน
            if (!dailyStats[dayKey]) {
              dailyStats[dayKey] = {
                date: dayKey,
                day: dayName,
                total: 0,
                success: 0,
                denied: 0
              };
            }
            dailyStats[dayKey].total++;
            if (log.allow === true || log.allow === 1) {
              dailyStats[dayKey].success++;
            } else {
              dailyStats[dayKey].denied++;
            }

            // รายสัปดาห์
            if (!weeklyStats[dayName]) {
              weeklyStats[dayName] = { day: dayName, total: 0, success: 0, denied: 0 };
            }
            weeklyStats[dayName].total++;
            if (log.allow === true || log.allow === 1) {
              weeklyStats[dayName].success++;
            } else {
              weeklyStats[dayName].denied++;
            }
          }
        }

        // วิเคราะห์สถานที่
        const location = log.location || log.Location;
        if (location) {
          if (!locationStats[location]) {
            locationStats[location] = { name: location, total: 0, success: 0, denied: 0 };
          }
          locationStats[location].total++;
          if (log.allow === true || log.allow === 1) {
            locationStats[location].success++;
          } else {
            locationStats[location].denied++;
          }
        }

        // วิเคราะห์อุปกรณ์
        const device = log.device || log.Device;
        if (device) {
          if (!deviceStats[device]) {
            deviceStats[device] = { name: device, total: 0, success: 0, denied: 0 };
          }
          deviceStats[device].total++;
          if (log.allow === true || log.allow === 1) {
            deviceStats[device].success++;
          } else {
            deviceStats[device].denied++;
          }
        }

        // นับสถานะรวม
        if (log.allow === true || log.allow === 1) {
          totalSuccess++;
        } else {
          totalDenied++;
        }
      } catch (error) {
        console.warn('Error processing log for charts:', error);
      }
    });

    return {
      hourlyData: Object.values(hourlyStats).map(h => ({
        ...h,
        time: `${h.hour.toString().padStart(2, '0')}:00`
      })),
      dailyData: Object.values(dailyStats)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
      weeklyData: Object.values(weeklyStats),
      locationData: Object.values(locationStats)
        .sort((a, b) => b.total - a.total),
      deviceData: Object.values(deviceStats)
        .sort((a, b) => b.total - a.total),
      statusData: [
        { name: 'สำเร็จ', value: totalSuccess, color: '#10B981' },
        { name: 'ปฏิเสธ', value: totalDenied, color: '#EF4444' }
      ]
    };
  }, [logData]);

  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    purple: '#8B5CF6'
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!logData || logData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">ไม่มีข้อมูลสำหรับแสดงกราฟ</h3>
          <p className="text-gray-600">กรุณาอัปโหลดข้อมูล access log เพื่อดูกราฟสถิติ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 กราฟสถิติการใช้งาน</h2>
          <p className="text-gray-600 mt-1">
            แสดงข้อมูลในรูปแบบกราฟเพื่อการวิเคราะห์ที่ง่ายขึ้น
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Access Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            🕐 การเข้าถึงรายชั่วโมง
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="success" stackId="a" fill={COLORS.success} name="สำเร็จ" />
              <Bar dataKey="denied" stackId="a" fill={COLORS.danger} name="ปฏิเสธ" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Access Trend */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            📅 แนวโน้มการเข้าถึงรายวัน
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={3} name="รวมทั้งหมด" />
              <Line type="monotone" dataKey="success" stroke={COLORS.success} strokeWidth={2} name="สำเร็จ" />
              <Line type="monotone" dataKey="denied" stroke={COLORS.danger} strokeWidth={2} name="ปฏิเสธ" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Location Access Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            🏢 การเข้าถึงตามสถานที่
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.locationData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill={COLORS.primary} name="การเข้าถึงทั้งหมด" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            🥧 สัดส่วนสถานะการเข้าถึง
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center mt-4 space-x-4">
            {chartData.statusData.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {entry.name}: {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device Usage Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          🔧 การใช้งานอุปกรณ์
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData.deviceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }} height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="success" stackId="a" fill={COLORS.success} name="สำเร็จ" />
            <Bar dataKey="denied" stackId="a" fill={COLORS.danger} name="ปฏิเสธ" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Pattern Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          📊 รูปแบบการใช้งานรายสัปดาห์
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="total" fill={COLORS.info} name="รวมทั้งหมด" />
            <Bar dataKey="success" fill={COLORS.success} name="สำเร็จ" />
            <Bar dataKey="denied" fill={COLORS.danger} name="ปฏิเสธ" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 สรุปข้อมูลกราฟ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {chartData.hourlyData.reduce((sum, h) => sum + h.total, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">การเข้าถึงรวมทั้งวัน</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {chartData.locationData.length}
            </div>
            <div className="text-sm text-gray-600">สถานที่ที่มีการใช้งาน</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {chartData.deviceData.length}
            </div>
            <div className="text-sm text-gray-600">อุปกรณ์ที่มีการใช้งาน</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {chartData.dailyData.length}
            </div>
            <div className="text-sm text-gray-600">วันที่มีข้อมูล</div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          📊 กราฟทั้งหมดสร้างจากข้อมูลจริง {logData.length.toLocaleString()} รายการ | 
          🔄 อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงข้อมูล
        </div>
      </div>
    </div>
  );
};

export default ChartSection;