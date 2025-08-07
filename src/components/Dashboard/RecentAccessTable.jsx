// components/Dashboard/RecentAccessTable.jsx
import React from 'react';

const RecentAccessTable = ({ data, onRowClick }) => {
  // Filter out null/undefined items and limit to 10 items
  const filteredData = data.filter(item => item !== null && item !== undefined).slice(0, 10);

  return (
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
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  ไม่มีข้อมูลล่าสุดที่จะแสดง
                </td>
              </tr>
            )}
            {filteredData.map((item, index) => (
              <tr
                key={index}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => onRowClick && onRowClick(item)}
              >
                <td className="px-4 py-2 text-sm text-gray-900">
                  {item.dateTime ? new Date(item.dateTime).toLocaleString('th-TH') : <span className="italic text-gray-400">ไม่ระบุเวลา</span>}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  {item.cardName ?? <span className="italic text-gray-400">ไม่ระบุชื่อ</span>}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  {item.location ?? <span className="italic text-gray-400">ไม่ระบุสถานที่</span>}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.allow === true
                        ? 'bg-green-100 text-green-800'
                        : item.allow === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    {item.allow === true
                      ? 'สำเร็จ'
                      : item.allow === false
                        ? 'ถูกปฏิเสธ'
                        : 'ไม่ทราบผล'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentAccessTable;
