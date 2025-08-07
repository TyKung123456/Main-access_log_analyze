import React from 'react';

const LogDetailModal = ({ logEntry, onClose }) => {
  if (!logEntry) return null;

  const formatValue = (key, value) => {
    if (key === 'dateTime' && value) {
      return new Date(value).toLocaleString('th-TH');
    }
    if (key === 'allow') {
      return value === true ? 'สำเร็จ' : value === false ? 'ถูกปฏิเสธ' : 'ไม่ทราบผล';
    }
    if (typeof value === 'boolean') {
      return value ? 'ใช่' : 'ไม่ใช่';
    }
    if (value === null || value === undefined || value === '') {
      return <span className="italic text-gray-400">ไม่ระบุ</span>;
    }
    return value.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">รายละเอียดบันทึกการเข้าถึง</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="ปิด"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          {Object.entries(logEntry).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="font-medium text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="break-words">
                {formatValue(key, value)}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal;
