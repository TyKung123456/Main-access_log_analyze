import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
];

// Helper functions - ต้องอยู่นอก component
const categorizeReason = (reason) => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('card') || reasonLower.includes('บัตร')) return 'บัตร/การ์ด';
  if (reasonLower.includes('time') || reasonLower.includes('เวลา')) return 'เวลา';
  if (reasonLower.includes('access') || reasonLower.includes('สิทธิ์')) return 'สิทธิ์การเข้าถึง';
  if (reasonLower.includes('door') || reasonLower.includes('ประตู')) return 'ประตู/อุปกรณ์';
  if (reasonLower.includes('user') || reasonLower.includes('ผู้ใช้')) return 'ผู้ใช้งาน';
  return 'อื่นๆ';
};

// Get severity level for color coding
const getSeverityLevel = (reason) => {
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('security') || reasonLower.includes('unauthorized')) return 'สูง';
  if (reasonLower.includes('expired') || reasonLower.includes('invalid')) return 'กลาง';
  return 'ต่ำ';
};

const DeniedReasonsChart = ({ data = [], loading = false, timeSeriesData = [] }) => {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'trends', 'details'
  const [selectedReason, setSelectedReason] = useState(null);

  // Enhanced data processing with better categorization
  const processedData = useMemo(() => {
    const reasonCounts = data.reduce((acc, item) => {
      if (item.status === 'denied' && item.reason && item.reason !== 'N/A') {
        acc[item.reason] = (acc[item.reason] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        name: reason,
        value: count,
        shortName: reason.length > 20 ? reason.substring(0, 20) + '...' : reason,
        category: categorizeReason(reason),
        severity: getSeverityLevel(reason)
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Group by category for analysis
  const categoryAnalysis = useMemo(() => {
    const categories = processedData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.value;
      return acc;
    }, {});

    return Object.entries(categories)
      .map(([category, count]) => ({ name: category, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [processedData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = processedData.reduce((sum, item) => sum + item.value, 0);
    const totalDenied = data.filter(item => item.status === 'denied').length;
    const mostCommon = processedData[0] || null;
    const categoriesCount = new Set(processedData.map(item => item.category)).size;

    return {
      total,
      totalDenied,
      mostCommon,
      categoriesCount,
      deniedRate: totalDenied > 0 ? ((total / totalDenied) * 100).toFixed(1) : 0
    };
  }, [processedData, data]);

  // Time-based trends (mock data if not provided)
  const trendData = useMemo(() => {
    if (timeSeriesData && timeSeriesData.length > 0) {
      return timeSeriesData;
    }

    // Generate mock hourly trend data
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      denied: Math.floor(Math.random() * 50) + 5,
      reasons: Math.floor(Math.random() * 3) + 1
    }));
  }, [timeSeriesData]);

  // Top 3 actionable insights
  const insights = useMemo(() => {
    const insights = [];

    if (stats.mostCommon) {
      insights.push({
        type: 'warning',
        title: 'สาเหตุหลักการปฏิเสธ',
        message: `${stats.mostCommon.name} คิดเป็น ${((stats.mostCommon.value / stats.total) * 100).toFixed(1)}% ของการปฏิเสธทั้งหมด`,
        action: 'ควรตรวจสอบและแก้ไขปัญหานี้เป็นอันดับแรก'
      });
    }

    if (categoryAnalysis.length > 0) {
      const topCategory = categoryAnalysis[0];
      insights.push({
        type: 'info',
        title: 'หมวดหมู่ปัญหาหลัก',
        message: `ปัญหาเกี่ยวกับ "${topCategory.name}" มีสัดส่วนสูงสุด`,
        action: 'ควรพิจารณาปรับปรุงระบบในหมวดหมู่นี้'
      });
    }

    if (stats.total > 100) {
      insights.push({
        type: 'danger',
        title: 'จำนวนการปฏิเสธสูง',
        message: `มีการปฏิเสธรวม ${stats.total.toLocaleString('th-TH')} ครั้ง`,
        action: 'ควรทบทวนนโยบายการเข้าถึงหรือปรับปรุงระบบ'
      });
    }

    return insights;
  }, [stats, categoryAnalysis]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">เหตุผลการเข้าถึงที่ถูกปฏิเสธ</h3>
      {processedData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>ไม่มีข้อมูลเหตุผลการปฏิเสธแสดง</p>
          </div>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value.toLocaleString('th-TH')} ครั้ง`, name]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle" 
                wrapperStyle={{ paddingLeft: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DeniedReasonsChart;
