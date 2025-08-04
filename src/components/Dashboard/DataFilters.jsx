// src/components/Dashboard/DataFilters.jsx - Complete Component
import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';

const DataFilters = ({ filters, onFilterChange, onClearFilters, loading = false }) => {
  const [locations, setLocations] = useState([]);
  const [directions, setDirections] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load filter options from API
  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoadingOptions(true);
      try {
        // แก้ไข: เรียกใช้เมธอดที่ถูกต้องจาก apiService
        const [locationsRes, directionsRes, userTypesRes] = await Promise.all([
          apiService.getLocations().catch(() => ({ locations: [] })),
          apiService.getDirections().catch(() => ({ directions: [] })),
          apiService.getUserTypes().catch(() => ({ userTypes: [] }))
        ]);

        setLocations(locationsRes.locations || []);
        setDirections(directionsRes.directions || []);
        setUserTypes(userTypesRes.userTypes || []);
      } catch (error) {
        console.warn('Failed to load filter options:', error);
        // Set default options
        setDirections([
          { value: 'IN', label: 'เข้า (IN)', count: 0 },
          { value: 'OUT', label: 'ออก (OUT)', count: 0 }
        ]);
        setUserTypes([
          { value: 'EMPLOYEE', label: 'พนักงาน', count: 0 },
          { value: 'VISITOR', label: 'ผู้มาเยือน', count: 0 },
          { value: 'AFFILIATE', label: 'บุคคลที่เกี่ยวข้อง', count: 0 }
        ]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadFilterOptions();
  }, []);

  // Handle date range change
  const handleDateRangeChange = (type, value) => {
    const currentRange = filters.dateRange || {};
    const newRange = {
      ...currentRange,
      [type]: value
    };

    // Only update if both start and end are set
    if (newRange.start && newRange.end) {
      onFilterChange('dateRange', newRange);
    }
  };

  // Handle multi-select change
  const handleMultiSelectChange = (filterKey, option, checked) => {
    const currentValues = filters[filterKey] || [];
    const newValues = checked
      ? [...currentValues, option.value]
      : currentValues.filter(val => val !== option.value);

    onFilterChange(filterKey, newValues.length > 0 ? newValues : null);
  };

  // Handle search change with debounce
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange('search', searchTerm || null);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, onFilterChange]);

  // Get active filter count
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🔍 ตัวกรองข้อมูล</h3>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
              {activeFilterCount} ตัวกรอง
            </span>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {showAdvanced ? 'แสดงน้อยลง' : 'ตัวกรองขั้นสูง'}
          </button>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหา
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ชื่อ, หมายเลขบัตร, สถานที่..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Date Range Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มต้น
          </label>
          <input
            type="date"
            value={filters.dateRange?.start || ''}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่สิ้นสุด
          </label>
          <input
            type="date"
            value={filters.dateRange?.end || ''}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* Access Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            สถานะการเข้าถึง
          </label>
          <select
            value={filters.allow === undefined ? '' : filters.allow.toString()}
            onChange={(e) => {
              const value = e.target.value;
              onFilterChange('allow', value === '' ? null : value === 'true');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="">ทั้งหมด</option>
            <option value="true">อนุญาต</option>
            <option value="false">ปฏิเสธ</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานที่ ({locations.length})
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                {loadingOptions ? (
                  <div className="text-center py-2 text-gray-500">กำลังโหลด...</div>
                ) : locations.length > 0 ? (
                  locations.map((location) => (
                    <label key={location.value} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={(filters.location || []).includes(location.value)}
                        onChange={(e) => handleMultiSelectChange('location', location, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm flex-1 truncate" title={location.label}>
                        {location.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({location.count?.toLocaleString('th-TH')})
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500">ไม่มีข้อมูล</div>
                )}
              </div>
            </div>

            {/* Directions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ทิศทาง
              </label>
              <div className="space-y-2">
                {directions.map((direction) => (
                  <label key={direction.value} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={(filters.direction || []).includes(direction.value)}
                      onChange={(e) => handleMultiSelectChange('direction', direction, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm flex-1">
                      {direction.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({direction.count?.toLocaleString('th-TH')})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* User Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทผู้ใช้
              </label>
              <div className="space-y-2">
                {loadingOptions ? (
                  <div className="text-center py-2 text-gray-500">กำลังโหลด...</div>
                ) : userTypes.length > 0 ? (
                  userTypes.map((userType) => (
                    <label key={userType.value} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={(filters.userType || []).includes(userType.value)}
                        onChange={(e) => handleMultiSelectChange('userType', userType, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm flex-1">
                        {userType.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({userType.count?.toLocaleString('th-TH')})
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500">ไม่มีข้อมูล</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          {activeFilterCount > 0 ? (
            <span>ใช้ตัวกรอง {activeFilterCount} รายการ</span>
          ) : (
            <span>ไม่มีตัวกรองที่ใช้งาน</span>
          )}
        </div>

        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}

          <button
            onClick={() => {
              // Apply current filters (this will trigger the parent component to fetch data)
              console.log('Applying filters:', filters);
            }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังค้นหา...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                ค้นหา
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="text-sm text-blue-800">
            <strong>ตัวกรองที่ใช้:</strong>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(filters).map(([key, value]) => {
                let displayText = '';

                if (key === 'search' && value) {
                  displayText = `ค้นหา: "${value}"`;
                } else if (key === 'dateRange' && value) {
                  displayText = `วันที่: ${value.start} - ${value.end}`;
                } else if (key === 'allow' && value !== undefined) {
                  displayText = `สถานะ: ${value ? 'อนุญาต' : 'ปฏิเสธ'}`;
                } else if (Array.isArray(value) && value.length > 0) {
                  const keyMap = {
                    location: 'สถานที่',
                    direction: 'ทิศทาง',
                    userType: 'ประเภทผู้ใช้'
                  };
                  displayText = `${keyMap[key] || key}: ${value.length} รายการ`;
                }

                return displayText ? (
                  <span key={key} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {displayText}
                    <button
                      onClick={() => onFilterChange(key, null)}
                      className="ml-1 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFilters;
