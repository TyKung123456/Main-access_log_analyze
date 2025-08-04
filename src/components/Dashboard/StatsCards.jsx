// components/Dashboard/StatsCards.jsx
import React from 'react';
import { DoorOpen, TrendingUp, AlertCircle, Users } from 'lucide-react';

const StatsCards = ({ stats }) => {
  const cards = [
    {
      title: 'การเข้าถึงทั้งหมด',
      value: stats.totalAccess,
      icon: DoorOpen,
      color: 'text-blue-600'
    },
    {
      title: 'การเข้าถึงสำเร็จ',
      value: stats.successfulAccess,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'การเข้าถึงถูกปฏิเสธ',
      value: stats.deniedAccess,
      icon: AlertCircle,
      color: 'text-red-600'
    },
    {
      title: 'ผู้ใช้ที่ไม่ซ้ำ',
      value: stats.uniqueUsers,
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
            <card.icon className={`w-8 h-8 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;