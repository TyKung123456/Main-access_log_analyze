// src/components/Dashboard/DataFilters.jsx - ปรับปรุงแก้ไขปัญหา
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';

const DataFilters = ({ filters, onFilterChange, onClearFilters, loading = false }) => {
  const [locations, setLocations] = useState([]);
  const [directions, setDirections] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Load filter options from API
  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoadingOptions(true);
      try {
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

  // Synchronize internal searchTerm with external filters.search
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onFilterChange('search', searchTerm || null);
      }
    }, 300); // ลดเวลา debounce จาก 500 เป็น 300ms

    return () => clearTimeout(timer);
  }, [searchTerm, onFilterChange, filters.search]);

  // Handle date range change with validation
  const handleDateRangeChange = (type, value) => {
    const currentRange = filters.dateRange || {};
    const newRange = { ...currentRange, [type]: value };

    // Validate date range
    if (type === 'start' && newRange.end && value > newRange.end) {
      alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
      return;
    }
    if (type === 'end' && newRange.start && value < newRange.start) {
      alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }

    onFilterChange('dateRange', newRange);
  };

  // Handle multi-select change
  const handleMultiSelectChange = (filterKey, option, checked) => {
    const currentValues = filters[filterKey] || [];
    const newValues = checked
      ? [...currentValues, option.value]
      : currentValues.filter(val => val !== option.value);

    onFilterChange(filterKey, newValues.length > 0 ? newValues : null);
  };

  // Handle sort change
  const handleSortChange = (field, newSortBy, newSortOrder) => {
    onFilterChange('sortBy', newSortBy);
    onFilterChange('sortOrder', newSortOrder);
  };

  // Apply all filters - แก้ไขฟังก์ชันนี้
  const handleApplyFilters = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('🔍 Applying filters button clicked');
    console.log('Current searchTerm:', searchTerm);
    console.log('Current filters:', filters);

    // อัพเดต search term ก่อน
    if (searchTerm !== (filters.search || '')) {
      onFilterChange('search', searchTerm || null);
    }

    // บังคับให้ refresh ข้อมูล
    setTimeout(() => {
      if (typeof onFilterChange === 'function') {
        onFilterChange('_forceRefresh', Date.now());
      }
    }, 100);

    return false;
  }, [filters, searchTerm, onFilterChange]);

  // Get active filter count (exclude internal fields)
  const activeFilterCount = useMemo(() => {
    const count = Object.keys(filters).filter(key =>
      !key.startsWith('_') &&
      filters[key] !== null &&
      filters[key] !== undefined &&
      filters[key] !== '' &&
      !(Array.isArray(filters[key]) && filters[key].length === 0)
    ).length;
    console.log('📊 Active filter count:', count, filters);
    return count;
  }, [filters]);

  // Quick filter presets - เพิ่มฟีเจอร์ใหม่
  const quickFilters = [
    {
      label: 'วันนี้',
      action: () => {
        const today = new Date().toISOString().split('T')[0];
        onFilterChange('dateRange', { start: today, end: today });
      }
    },
    {
      label: '7 วันที่แล้ว',
      action: () => {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        onFilterChange('dateRange', {
          start: weekAgo.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        });
      }
    },
    {
      label: 'เดือนนี้',
      action: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        onFilterChange('dateRange', {
          start: firstDay.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        });
      }
    },
    {
      label: 'การเข้าถึงที่ถูกปฏิเสธ',
      action: () => {
        onFilterChange('allow', false);
      }
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🔍 ตัวกรองข้อมูล</h3>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {activeFilterCount} ตัวกรอง
            </span>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showAdvanced ? 'ซ่อนตัวกรองขั้นสูง' : 'แสดงตัวกรองขั้นสูง'}
          </button>
        </div>
      </div>

      {/* Quick Filters - เพิ่มฟีเจอร์ใหม่ */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">ตัวกรองด่วน:</span>
        {quickFilters.map((filter, index) => (
          <button
            key={index}
            onClick={filter.action}
            disabled={loading}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ค้นหา
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                console.log('🔤 Search input changed:', e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                console.log('⌨️ Key pressed:', e.key);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyFilters(e);
                }
              }}
              onFocus={() => console.log('🎯 Search input focused')}
              onBlur={() => console.log('😴 Search input blurred')}
              placeholder="ชื่อ, หมายเลขบัตร, สถานที่..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              disabled={loading}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
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
            max={filters.dateRange?.end || new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
            min={filters.dateRange?.start || ''}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            disabled={loading}
          >
            <option value="">ทั้งหมด</option>
            <option value="true">✅ อนุญาต</option>
            <option value="false">❌ ปฏิเสธ</option>
          </select>
        </div>
      </div>

      {/* Sort Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เรียงตาม
          </label>
          <select
            value={filters.sortBy || 'timestamp'}
            onChange={(e) => handleSortChange('sortBy', e.target.value, filters.sortOrder || 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            disabled={loading}
          >
            <option value="timestamp">⏰ เวลาเข้าถึง</option>
            <option value="name">👤 ชื่อผู้ใช้</option>
            <option value="location">📍 สถานที่</option>
            <option value="cardNumber">🔢 หมายเลขบัตร</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ลำดับการเรียง
          </label>
          <select
            value={filters.sortOrder || 'desc'}
            onChange={(e) => handleSortChange('sortOrder', filters.sortBy || 'timestamp', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            disabled={loading}
          >
            <option value="desc">⬇️ ล่าสุด - เก่าสุด</option>
            <option value="asc">⬆️ เก่าสุด - ล่าสุด</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-gray-900">ตัวกรองขั้นสูง</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📍 สถานที่ ({locations.length})
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1 bg-gray-50">
                {loadingOptions ? (
                  <div className="text-center py-4 text-gray-500">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    กำลังโหลด...
                  </div>
                ) : locations.length > 0 ? (
                  locations.map((location) => (
                    <label key={location.value} className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
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
                      {location.count !== undefined && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                          {location.count.toLocaleString('th-TH')}
                        </span>
                      )}
                    </label>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">ไม่มีข้อมูลสถานที่</div>
                )}
              </div>
            </div>

            {/* Directions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔄 ทิศทาง
              </label>
              <div className="space-y-2">
                {directions.map((direction) => (
                  <label key={direction.value} className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded border border-gray-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={(filters.direction || []).includes(direction.value)}
                      onChange={(e) => handleMultiSelectChange('direction', direction, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm flex-1 font-medium">
                      {direction.label}
                    </span>
                    {direction.count !== undefined && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {direction.count.toLocaleString('th-TH')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* User Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 ประเภทผู้ใช้
              </label>
              <div className="space-y-2">
                {loadingOptions ? (
                  <div className="text-center py-4 text-gray-500">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    กำลังโหลด...
                  </div>
                ) : userTypes.length > 0 ? (
                  userTypes.map((userType) => (
                    <label key={userType.value} className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded border border-gray-200 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={(filters.userType || []).includes(userType.value)}
                        onChange={(e) => handleMultiSelectChange('userType', userType, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm flex-1 font-medium">
                        {userType.label}
                      </span>
                      {userType.count !== undefined && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {userType.count.toLocaleString('th-TH')}
                        </span>
                      )}
                    </label>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">ไม่มีข้อมูลประเภทผู้ใช้</div>
                )}
              </div>
            </div>
          </div>

          {/* Time Range Filters - เพิ่มฟีเจอร์ใหม่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เวลาเริ่มต้น
              </label>
              <input
                type="time"
                value={filters.timeRange?.start || ''}
                onChange={(e) => {
                  const currentRange = filters.timeRange || {};
                  onFilterChange('timeRange', { ...currentRange, start: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เวลาสิ้นสุด
              </label>
              <input
                type="time"
                value={filters.timeRange?.end || ''}
                onChange={(e) => {
                  const currentRange = filters.timeRange || {};
                  onFilterChange('timeRange', { ...currentRange, end: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel - ลบออกเมื่อใช้งานจริง */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-xs">
          <details>
            <summary className="cursor-pointer font-medium text-yellow-800">🐛 Debug Info (คลิกเพื่อดู)</summary>
            <div className="mt-2 space-y-1 text-yellow-700">
              <div><strong>Search Term:</strong> "{searchTerm}"</div>
              <div><strong>Filters Search:</strong> "{filters.search || 'null'}"</div>
              <div><strong>Active Filters:</strong> {activeFilterCount}</div>
              <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
              <div><strong>All Filters:</strong> {JSON.stringify(filters, null, 2)}</div>
              <button
                onClick={() => {
                  console.log('🧪 Manual test button clicked');
                  handleApplyFilters();
                }}
                className="mt-2 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-yellow-800"
              >
                Test Apply Filters
              </button>
            </div>
          </details>
        </div>
      )}

      {/* Filter Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          {activeFilterCount > 0 ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              ใช้ตัวกรอง {activeFilterCount} รายการ
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              ไม่มีตัวกรองที่ใช้งาน
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              ล้างตัวกรอง
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={loading}
            style={{
              pointerEvents: loading ? 'none' : 'auto',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            onMouseDown={(e) => {
              console.log('🖱️ Search button mouse down');
              e.preventDefault();
            }}
            onMouseUp={(e) => {
              console.log('🖱️ Search button mouse up');
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              console.log('📱 Search button touch start');
            }}
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-900">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <strong>ตัวกรองที่ใช้งาน:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters)
                .filter(([key, value]) => key !== '_refresh' && value !== null && value !== undefined && value !== '')
                .map(([key, value]) => {
                  let displayText = '';
                  let bgColor = 'bg-blue-100 text-blue-800';

                  if (key === 'search' && value) {
                    displayText = `ค้นหา: "${value}"`;
                    bgColor = 'bg-green-100 text-green-800';
                  } else if (key === 'dateRange' && value) {
                    displayText = `📅 ${value.start || ''} ${value.end ? `- ${value.end}` : ''}`;
                    bgColor = 'bg-purple-100 text-purple-800';
                  } else if (key === 'timeRange' && value) {
                    displayText = `🕒 ${value.start || ''} ${value.end ? `- ${value.end}` : ''}`;
                    bgColor = 'bg-orange-100 text-orange-800';
                  } else if (key === 'allow' && value !== undefined) {
                    displayText = `${value ? '✅' : '❌'} ${value ? 'อนุญาত' : 'ปฏิเสธ'}`;
                    bgColor = value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                  } else if (key === 'sortBy' && value) {
                    const sortLabels = {
                      timestamp: '⏰ เวลาเข้าถึง',
                      name: '👤 ชื่อ',
                      location: '📍 สถานที่',
                      cardNumber: '🔢 หมายเลขบัตร'
                    };
                    displayText = `เรียง: ${sortLabels[value] || value}`;
                  } else if (key === 'sortOrder' && value) {
                    displayText = `${value === 'desc' ? '⬇️' : '⬆️'} ${value === 'desc' ? 'ใหม่-เก่า' : 'เก่า-ใหม่'}`;
                  } else if (Array.isArray(value) && value.length > 0) {
                    const keyMap = {
                      location: { label: '📍 สถานที่', color: 'bg-yellow-100 text-yellow-800' },
                      direction: { label: '🔄 ทิศทาง', color: 'bg-indigo-100 text-indigo-800' },
                      userType: { label: '👥 ประเภท', color: 'bg-pink-100 text-pink-800' }
                    };
                    const config = keyMap[key] || { label: key, color: bgColor };
                    displayText = `${config.label}: ${value.join(', ')}`;
                    bgColor = config.color;
                  }

                  return displayText ? (
                    <span key={key} className={`inline-flex items-center px-3 py-1 ${bgColor} rounded-full text-xs font-medium`}>
                      {displayText}
                      <button
                        onClick={() => onFilterChange(key, null)}
                        className="ml-2 hover:text-current opacity-70 hover:opacity-100 transition-opacity"
                        title={`ลบตัวกรอง ${displayText}`}
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

      {/* Export Options - เพิ่มฟีเจอร์ใหม่ */}
      {activeFilterCount > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">ส่งออกข้อมูล:</span>
            <button
              onClick={() => {
                // สร้าง CSV export logic
                console.log('Exporting to CSV with filters:', filters);
                // เรียก API หรือฟังก์ชัน export ที่เหมาะสม
              }}
              disabled={loading}
              className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              📊 CSV
            </button>
            <button
              onClick={() => {
                // สร้าง Excel export logic
                console.log('Exporting to Excel with filters:', filters);
              }}
              disabled={loading}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              📈 Excel
            </button>
            <button
              onClick={() => {
                // สร้าง PDF report logic
                console.log('Generating PDF report with filters:', filters);
              }}
              disabled={loading}
              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              📄 PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFilters;