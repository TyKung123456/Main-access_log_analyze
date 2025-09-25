// components/Dashboard/StatsCards.jsx
import React from 'react';
import { DoorOpen, TrendingUp, AlertCircle, Users } from 'lucide-react';

const StatsCards = ({ stats }) => {
  const total = stats.totalAccess ?? stats.total_records ?? 0;
  const success = stats.successfulAccess ?? stats.success_count ?? 0;
  const denied = stats.deniedAccess ?? stats.denied_count ?? 0;
  const uniqueUsers = stats.uniqueUsers;
  const uniqueCards = stats.unique_cards;
  const uniqueLocations = stats.unique_locations;
  const uniqueTitle = uniqueUsers != null
    ? 'ผู้ใช้ที่ไม่ซ้ำ'
    : uniqueCards != null
      ? 'บัตรที่ไม่ซ้ำ'
      : uniqueLocations != null
        ? 'สถานที่ที่ไม่ซ้ำ'
        : 'รายการที่ไม่ซ้ำ';
  const uniqueValue = uniqueUsers ?? uniqueCards ?? uniqueLocations ?? 0;

  const cards = [
    { title: 'การเข้าถึงทั้งหมด', value: total, icon: DoorOpen, color: 'text-blue-600' },
    { title: 'การเข้าถึงสำเร็จ', value: success, icon: TrendingUp, color: 'text-green-600' },
    { title: 'การเข้าถึงถูกปฏิเสธ', value: denied, icon: AlertCircle, color: 'text-red-600' },
    { title: uniqueTitle, value: uniqueValue, icon: Users, color: 'text-purple-600' }
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
