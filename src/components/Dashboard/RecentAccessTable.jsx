// components/Dashboard/RecentAccessTable.jsx
import React from 'react';

const RecentAccessTable = ({ data }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h3 className="text-lg font-semibold mb-4">การเข้าถึงล่าสุด</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">เวลา</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ใช้</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานที่</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice(0, 5).map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-2 text-sm text-gray-900">
                {item.dateTime.toLocaleString('th-TH')}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">{item.cardName}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{item.location}</td>
              <td className="px-4 py-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.allow 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.allow ? 'สำเร็จ' : 'ถูกปฏิเสธ'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default RecentAccessTable;