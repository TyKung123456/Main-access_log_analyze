// src/components/Dashboard/Charts/DirectionChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const DirectionChart = ({ data = [], loading = false }) => {
  // Safe data handling with Thai translation
  const chartData = Array.isArray(data) && data.length > 0 ? 
    data.map(item => ({
      ...item,
      name: item.direction === 'IN' ? 'เข้า (IN)' :
            item.direction === 'OUT' ? 'ออก (OUT)' :
            item.directionThai || item.direction || 'ไม่ระบุ',
      value: parseInt(item.count) || parseInt(item.value) || 0,
      originalDirection: item.direction
    })).filter(item => item.value > 0) : [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">ทิศทางการเข้าถึง</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-500">กำลังโหลดข้อมูลทิศทาง...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">ทิศทางการเข้าถึง</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <p>ไม่มีข้อมูลทิศทางแสดง</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total for percentage
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">ทิศทางการเข้าถึง</h3>
        <div className="text-sm text-gray-500">
          รวม: {total.toLocaleString('th-TH')} ครั้ง
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, value }) => 
                `${name}\n${value.toLocaleString('th-TH')} (${(percent * 100).toFixed(1)}%)`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => [
                value.toLocaleString('th-TH') + ' ครั้ง',
                name
              ]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend with detailed info */}
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-2">
          {chartData.map((entry, index) => {
            const percentage = ((entry.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm font-medium">{entry.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {entry.value.toLocaleString('th-TH')} ครั้ง
                  </div>
                  <div className="text-xs text-gray-500">
                    {percentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">ประเภททิศทาง</p>
            <p className="text-lg font-semibold text-blue-600">
              {chartData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">เฉลี่ยต่อประเภท</p>
            <p className="text-lg font-semibold text-gray-900">
              {Math.round(total / chartData.length).toLocaleString('th-TH')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectionChart;  