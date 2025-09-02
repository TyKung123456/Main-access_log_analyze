import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Filter, X, Clock, User, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const RecentAccessTable = ({ data = [], onRowClick, onSortChange, currentSortColumn, currentSortOrder }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter and process data
  const filteredData = useMemo(() => {
    const validData = data.filter(item => item !== null && item !== undefined);

    let filtered = validData;
    if (statusFilter !== 'all') {
      filtered = validData.filter(item => {
        if (statusFilter === 'success') return item.allow === true;
        if (statusFilter === 'rejected') return item.allow === false;
        if (statusFilter === 'unknown') return item.allow !== true && item.allow !== false;
        return true;
      });
    }

    return filtered.slice(0, 10);
  }, [data, statusFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const validData = data.filter(item => item !== null && item !== undefined);
    return {
      all: validData.length,
      success: validData.filter(item => item.allow === true).length,
      rejected: validData.filter(item => item.allow === false).length,
      unknown: validData.filter(item => item.allow !== true && item.allow !== false).length
    };
  }, [data]);

  const handleSortClick = (column) => {
    const newOrder = currentSortColumn === column && currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    onSortChange?.(column, newOrder);
  };

  const renderSortIcon = (column) => {
    if (currentSortColumn === column) {
      return currentSortOrder === 'ASC'
        ? <ArrowUp className="h-3 w-3" />
        : <ArrowDown className="h-3 w-3" />;
    }
    return <ArrowUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />;
  };

  const getStatusBadge = (allow) => {
    if (allow === true) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'อนุญาต',
        className: 'bg-green-50 text-green-700 border-green-200'
      };
    }
    if (allow === false) {
      return {
        icon: <XCircle className="h-3 w-3" />,
        text: 'ปฏิเสธ',
        className: 'bg-red-50 text-red-700 border-red-200'
      };
    }
    return {
      icon: <AlertCircle className="h-3 w-3" />,
      text: 'ไม่ทราบ',
      className: 'bg-gray-50 text-gray-600 border-gray-200'
    };
  };

  const filterButtons = [
    { key: 'all', label: 'ทั้งหมด', count: statusCounts.all, color: 'blue' },
    { key: 'success', label: 'อนุญาต', count: statusCounts.success, color: 'green' },
    { key: 'rejected', label: 'ปฏิเสธ', count: statusCounts.rejected, color: 'red' },
    { key: 'unknown', label: 'ไม่ทราบ', count: statusCounts.unknown, color: 'gray' }
  ];

  const getFilterButtonClass = (filterKey, color) => {
    const isActive = statusFilter === filterKey;
    const baseClass = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200';

    if (isActive) {
      const colorMap = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
        green: 'bg-green-50 text-green-700 border-green-200 shadow-sm',
        red: 'bg-red-50 text-red-700 border-red-200 shadow-sm',
        gray: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm'
      };
      return `${baseClass} ${colorMap[color]}`;
    }

    return `${baseClass} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">การเข้าถึงล่าสุด</h3>
            <span className="text-sm text-gray-500">({statusCounts.all} รายการ)</span>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>กรอง:</span>
            </div>

            <div className="flex gap-1">
              {filterButtons.map(({ key, label, count, color }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={getFilterButtonClass(key, color)}
                >
                  {label} <span className="font-semibold">({count})</span>
                </button>
              ))}

              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="ล้างตัวกรอง"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSortClick('Date Time')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  เวลา
                  {renderSortIcon('Date Time')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  ผู้ใช้
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  สถานที่
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 text-gray-300">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {statusFilter === 'all'
                        ? 'ไม่มีข้อมูลการเข้าถึง'
                        : `ไม่พบข้อมูลสำหรับ "${filterButtons.find(f => f.key === statusFilter)?.label}"`
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => {
                const statusBadge = getStatusBadge(item.allow);
                return (
                  <tr
                    key={`${item.dateTime}-${index}`}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.dateTime ? (
                        <div className="flex flex-col">
                          <span>{new Date(item.dateTime).toLocaleDateString('th-TH')}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.dateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">ไม่ระบุเวลา</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.cardName || <span className="text-gray-400 italic">ไม่ระบุชื่อ</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.location || <span className="text-gray-400 italic">ไม่ระบุสถานที่</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${statusBadge.className}`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      {filteredData.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              แสดง <span className="font-semibold">{filteredData.length}</span> จาก{' '}
              <span className="font-semibold">{statusCounts.all}</span> รายการ
            </span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">อนุญาต: {statusCounts.success}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">ปฏิเสธ: {statusCounts.rejected}</span>
              </div>
              {statusCounts.unknown > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">ไม่ทราบ: {statusCounts.unknown}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentAccessTable;