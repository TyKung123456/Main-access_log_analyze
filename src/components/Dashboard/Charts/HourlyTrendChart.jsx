// src/components/Dashboard/Charts/HourlyTrendChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const HourlyTrendChart = ({ data = [], loading = false }) => {
  // Safe data handling
  const chartData = Array.isArray(data) && data.length > 0 ? data : 
    Array.from({length: 24}, (_, hour) => ({
      hour: `${hour}:00`,
      hourThai: `${hour.toString().padStart(2, '0')}:00 น.`,
      count: 0,
      success: 0,
      denied: 0
    }));

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">การเข้าถึงตามช่วงเวลา (24 ชั่วโมง)</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-500">กำลังโหลดข้อมูลกราฟ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">การเข้าถึงตามช่วงเวลา (24 ชั่วโมง)</h3>
        <div className="text-sm text-gray-500">
          รวม: {chartData.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString('th-TH')} ครั้ง
        </div>
      </div>
      
      {chartData.every(item => item.count === 0) ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>ไม่มีข้อมูลการเข้าถึงแสดง</p>
          </div>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  value.toLocaleString('th-TH'),
                  name === 'count' ? 'ทั้งหมด' :
                  name === 'success' ? 'เข้าถึงสำเร็จ' :
                  name === 'denied' ? 'ถูกปฏิเสธ' : name
                ]}
                labelFormatter={(label) => `เวลา ${label} น.`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                name="count"
              />
              <Line 
                type="monotone" 
                dataKey="success" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2 }}
                name="success"
              />
              <Line 
                type="monotone" 
                dataKey="denied" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#EF4444', strokeWidth: 2 }}
                name="denied"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">ทั้งหมด</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">สำเร็จ</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">ปฏิเสธ</span>
        </div>
      </div>
    </div>
  );
};

export default HourlyTrendChart;