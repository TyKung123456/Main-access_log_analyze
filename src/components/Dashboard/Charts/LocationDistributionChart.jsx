// src/components/Dashboard/Charts/LocationDistributionChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LocationDistributionChart = ({ data = [], loading = false }) => {
  // Safe data handling with truncated labels for Thai text
  const chartData = Array.isArray(data) && data.length > 0 ? 
    data.slice(0, 10).map(item => ({
      ...item,
      locationShort: item.location && item.location.length > 25 ? 
        item.location.substring(0, 25) + '...' : 
        item.location || 'ไม่ระบุสถานที่',
      count: parseInt(item.count) || 0,
      success: parseInt(item.success) || parseInt(item.successfulAccess) || 0,
      denied: parseInt(item.denied) || parseInt(item.deniedAccess) || 0
    })) : [];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">การกระจายตามสถานที่</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-500">กำลังโหลดข้อมูลสถานที่...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">การกระจายตามสถานที่</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>ไม่มีข้อมูลสถานที่แสดง</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">การกระจายตามสถานที่</h3>
        <div className="text-sm text-gray-500">
          {chartData.length} สถานที่
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="locationShort" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip 
              formatter={(value, name) => [
                value.toLocaleString('th-TH'),
                name === 'count' ? 'จำนวนทั้งหมด' :
                name === 'success' ? 'เข้าถึงสำเร็จ' :
                name === 'denied' ? 'ถูกปฏิเสธ' : name
              ]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.location || label;
              }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '250px'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#3B82F6" 
              name="count"
              radius={[2, 2, 0, 0]}
            />
            {chartData.some(item => item.success > 0) && (
              <Bar 
                dataKey="success" 
                fill="#10B981" 
                name="success"
                radius={[2, 2, 0, 0]}
              />
            )}
            {chartData.some(item => item.denied > 0) && (
              <Bar 
                dataKey="denied" 
                fill="#EF4444" 
                name="denied"
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="text-gray-500">รวมทั้งหมด</p>
          <p className="font-semibold text-gray-900">
            {chartData.reduce((sum, item) => sum + item.count, 0).toLocaleString('th-TH')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">สำเร็จ</p>
          <p className="font-semibold text-green-600">
            {chartData.reduce((sum, item) => sum + item.success, 0).toLocaleString('th-TH')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">ปฏิเสธ</p>
          <p className="font-semibold text-red-600">
            {chartData.reduce((sum, item) => sum + item.denied, 0).toLocaleString('th-TH')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationDistributionChart;