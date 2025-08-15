// components/Dashboard/RecentAccessTable.jsx
import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Filter, X } from 'lucide-react';

const RecentAccessTable = ({ data, onRowClick, onSortChange, currentSortColumn, currentSortOrder }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter data based on status
  const filteredData = useMemo(() => {
    let filtered = data.filter(item => item !== null && item !== undefined);

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (statusFilter === 'success') return item.allow === true;
        if (statusFilter === 'rejected') return item.allow === false;
        if (statusFilter === 'unknown') return item.allow !== true && item.allow !== false;
        return true;
      });
    }

    return filtered.slice(0, 10);
  }, [data, statusFilter]);

  const handleSortClick = (column) => {
    let newOrder = 'ASC';
    if (currentSortColumn === column) {
      newOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    }
    onSortChange(column, newOrder);
  };

  const renderSortIcon = (column) => {
    if (currentSortColumn === column) {
      return currentSortOrder === 'ASC' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
    }
    return null;
  };

  const getStatusCount = (status) => {
    const allData = data.filter(item => item !== null && item !== undefined);
    if (status === 'success') return allData.filter(item => item.allow === true).length;
    if (status === 'rejected') return allData.filter(item => item.allow === false).length;
    if (status === 'unknown') return allData.filter(item => item.allow !== true && item.allow !== false).length;
    return allData.length;
  };

  const clearFilter = () => {
    setStatusFilter('all');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">การเข้าถึงล่าสุด</h3>

        {/* Status Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">กรองตามสถานะ:</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
            >
              ทั้งหมด ({getStatusCount('all')})
            </button>

            <button
              onClick={() => setStatusFilter('success')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${statusFilter === 'success'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
            >
              สำเร็จ ({getStatusCount('success')})
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${statusFilter === 'rejected'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
            >
              ปฏิเสธ ({getStatusCount('rejected')})
            </button>

            <button
              onClick={() => setStatusFilter('unknown')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${statusFilter === 'unknown'
                  ? 'bg-gray-100 text-gray-800 border-gray-400'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
            >
              ไม่ทราบ ({getStatusCount('unknown')})
            </button>

            {statusFilter !== 'all' && (
              <button
                onClick={clearFilter}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                title="ล้างตัวกรอง"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Display */}
      {statusFilter !== 'all' && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              กำลังแสดง: <strong>
                {statusFilter === 'success' && 'การเข้าถึงที่สำเร็จ'}
                {statusFilter === 'rejected' && 'การเข้าถึงที่ถูกปฏิเสธ'}
                {statusFilter === 'unknown' && 'การเข้าถึงที่ไม่ทราบผล'}
              </strong> ({filteredData.length} รายการ)
            </span>
            <button
              onClick={clearFilter}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              แสดงทั้งหมด
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortClick('Date Time')}
              >
                <div className="flex items-center">
                  เวลา {renderSortIcon('Date Time')}
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ใช้</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานที่</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-500">
                  {statusFilter === 'all'
                    ? 'ไม่มีข้อมูลล่าสุดที่จะแสดง'
                    : `ไม่พบข้อมูลสำหรับสถานะ "${statusFilter === 'success' ? 'สำเร็จ' : statusFilter === 'rejected' ? 'ปฏิเสธ' : 'ไม่ทราบผล'}"`
                  }
                </td>
              </tr>
            )}
            {filteredData.map((item, index) => (
              <tr
                key={index}
                className="cursor-pointer hover:bg-gray-100 transition-colors"
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

      {/* Summary at bottom */}
      {filteredData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              แสดง {filteredData.length} จาก {data.filter(item => item !== null && item !== undefined).length} รายการ
            </span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                สำเร็จ: {getStatusCount('success')}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                ปฏิเสธ: {getStatusCount('rejected')}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                ไม่ทราบ: {getStatusCount('unknown')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentAccessTable;