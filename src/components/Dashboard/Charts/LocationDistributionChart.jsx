// src/components/Dashboard/Charts/LocationDistributionChart.jsx
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LocationDistributionChart = ({ data = [], loading = false }) => {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [hoveredLocation, setHoveredLocation] = useState(null);

  // เตรียมข้อมูลสำหรับกราฟและ dropdown - แสดงทั้งหมด
  const processedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map(item => ({
      ...item,
      locationShort: item.location && item.location.length > 15 ?
        item.location.substring(0, 15) + '...' :
        item.location || 'ไม่ระบุสถานที่',
      locationDisplay: item.location || 'ไม่ระบุสถานที่',
      count: parseInt(item.count) || 0,
      success: parseInt(item.success) || parseInt(item.successfulAccess) || 0,
      denied: parseInt(item.denied) || parseInt(item.deniedAccess) || 0
    }));
  }, [data]);

  // ข้อมูลที่จะแสดงในกราห์ตาม filter
  const chartData = useMemo(() => {
    if (selectedLocation === 'all') return processedData;
    return processedData.filter(item => item.locationDisplay === selectedLocation);
  }, [processedData, selectedLocation]);

  // คำนวณสถิติ
  const stats = useMemo(() => {
    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
    const totalSuccess = chartData.reduce((sum, item) => sum + item.success, 0);
    const totalDenied = chartData.reduce((sum, item) => sum + item.denied, 0);
    const successRate = totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0;

    return { totalCount, totalSuccess, totalDenied, successRate };
  }, [chartData]);

  // จัดการการเลือกสถานที่
  const handleLocationChange = (event) => {
    setSelectedLocation(event.target.value);
  };

  // Custom bar component สำหรับ highlight
  const CustomBar = (props) => {
    const { payload, ...rest } = props;
    const isHighlighted = hoveredLocation && payload?.locationDisplay === hoveredLocation;

    return (
      <Bar
        {...rest}
        strokeWidth={isHighlighted ? 3 : 2}
        opacity={hoveredLocation && !isHighlighted ? 0.6 : 1}
      />
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-green-50/30 p-6 rounded-xl shadow-sm border border-green-100/50">
        <h3 className="text-xl font-bold text-gray-800 mb-6">การกระจายตามสถานที่</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-green-600 rounded-full animate-spin border-t-transparent mx-auto"></div>
            </div>
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลสถานที่...</p>
            <p className="text-gray-400 text-sm mt-1">โปรดรอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-green-50/30 p-6 rounded-xl shadow-lg border border-green-100/50">
        <h3 className="text-xl font-bold text-gray-800 mb-6">การกระจายตามสถานที่</h3>
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">ไม่มีข้อมูลสถานที่</p>
            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนตัวกรองข้อมูล</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-green-50/30 p-6 rounded-xl shadow-lg border border-green-100/50 hover:shadow-xl transition-shadow duration-300">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">การกระจายตามสถานที่</h3>
            <p className="text-gray-500 text-sm">
              {selectedLocation === 'all'
                ? `สถิติการเข้าถึงทุกสถานที่ (${processedData.length} แห่ง)`
                : `สถิติการเข้าถึงสำหรับ: ${selectedLocation}`
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
            <div className="text-xs text-gray-500">อัตราสำเร็จ</div>
          </div>
        </div>

        {/* Location Filter Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">เลือกสถานที่</label>
          <select
            value={selectedLocation}
            onChange={handleLocationChange}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            <option value="all">📊 ทุกสถานที่ ({processedData.length} แห่ง)</option>
            {processedData.map((item, index) => (
              <option key={index} value={item.locationDisplay}>
                📍 {item.locationDisplay} ({item.count.toLocaleString('th-TH')} ครั้ง)
              </option>
            ))}
          </select>
        </div>


      </div>

      {/* Chart Section - เพิ่มความสูงเพื่อรองรับ label ยาว */}
      <div className="h-80 bg-white/50 rounded-lg p-4 border border-white/50">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 30, bottom: 100 }}
            onMouseEnter={(data) => setHoveredLocation(data?.activePayload?.[0]?.payload?.locationDisplay)}
            onMouseLeave={() => setHoveredLocation(null)}
            barCategoryGap="10%"
          >


            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              strokeOpacity={0.7}
              vertical={false}
            />

            <XAxis
              dataKey="locationShort"
              tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tickLine={{ stroke: '#64748b', strokeWidth: 2 }}
              axisLine={{ stroke: '#64748b', strokeWidth: 2 }}
              minTickGap={0}
              tickMargin={10}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }}
              tickLine={{ stroke: '#64748b', strokeWidth: 2 }}
              axisLine={{ stroke: '#64748b', strokeWidth: 2 }}
              tickFormatter={(value) => value.toLocaleString('th-TH')}
            />

            <Tooltip
              formatter={(value, name) => [
                `${value.toLocaleString('th-TH')} ครั้ง`,
                name === 'count' ? 'การเข้าถึงทั้งหมด' :
                  name === 'success' ? 'เข้าถึงสำเร็จ' :
                    name === 'denied' ? 'ถูกปฏิเสธ' : name
              ]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                const successRate = item?.count > 0 ? ((item.success / item.count) * 100).toFixed(1) : 0;
                return `📍 ${item?.locationDisplay || label} (อัตราสำเร็จ: ${successRate}%)`;
              }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                maxWidth: '300px',
                fontSize: '14px'
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3B82F6', strokeWidth: 2 }}
            />

            <Bar
              dataKey="count"
              fill="#1E40AF"
              name="count"
              radius={[4, 4, 0, 0]}
              stroke="#1E40AF"
              strokeWidth={0}
            />

            {chartData.some(item => item.success > 0) && (
              <Bar
                dataKey="success"
                fill="#047857"
                name="success"
                radius={[4, 4, 0, 0]}
                stroke="#047857"
                strokeWidth={0}
              />
            )}

            {chartData.some(item => item.denied > 0) && (
              <Bar
                dataKey="denied"
                fill="#DC2626"
                name="denied"
                radius={[4, 4, 0, 0]}
                stroke="#DC2626"
                strokeWidth={0}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center group cursor-pointer">
          <div className="w-4 h-4 bg-blue-700 rounded mr-3 group-hover:scale-110 transition-transform"></div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">การเข้าถึงทั้งหมด</span>
        </div>
        <div className="flex items-center group cursor-pointer">
          <div className="w-4 h-4 bg-green-700 rounded mr-3 group-hover:scale-110 transition-transform"></div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">เข้าถึงสำเร็จ</span>
        </div>
        <div className="flex items-center group cursor-pointer">
          <div className="w-4 h-4 bg-red-600 rounded mr-3 group-hover:scale-110 transition-transform"></div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">ถูกปฏิเสธ</span>
        </div>
      </div>

      {/* Location Quick Access */}
      {selectedLocation !== 'all' && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">กำลังแสดงข้อมูลสำหรับ:</p>
              <p className="text-lg font-semibold text-green-900">{selectedLocation}</p>
            </div>
            <button
              onClick={() => setSelectedLocation('all')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              แสดงทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDistributionChart;
