// src/components/Dashboard/DashboardPage.jsx - Safe Version
import React, { useState, useEffect } from 'react';
import { useLogData } from '../../hooks/useLogData';
import { useFilters } from '../../hooks/useFilters';
import StatsCards from './StatsCards';
import DataFilters from './DataFilters';
import RecentAccessTable from './RecentAccessTable';
import HourlyTrendChart from './Charts/HourlyTrendChart';
import LocationDistributionChart from './Charts/LocationDistributionChart';
import DirectionChart from './Charts/DirectionChart';

const DashboardPage = () => {
  const {
    logData,
    filteredData,
    stats,
    chartData,
    loading,
    error,
    refreshData,
    applyFilters,
    useRealData
  } = useLogData();

  const {
    filters,
    updateFilter,
    clearFilters,
    getFilterCount
  } = useFilters();

  const [refreshing, setRefreshing] = useState(false);

  // Auto refresh every 30 seconds for real data
  useEffect(() => {
    if (useRealData) {
      const interval = setInterval(() => {
        console.log('🔄 Auto refreshing Thai data...');
        refreshData(filters);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [useRealData, filters, refreshData]);

  // Apply filters when they change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      console.log('🔍 Applying filters:', filters);
      applyFilters(filters);
    }
  }, [filters, applyFilters]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData(filters);
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Safe chart data with fallbacks
  const safeChartData = {
    hourlyData: chartData?.hourlyData || [],
    locationData: chartData?.locationData || [],
    directionData: chartData?.directionData || []
  };

  // Safe stats with fallbacks
  const safeStats = {
    total_records: stats?.total_records || 0,
    success_count: stats?.success_count || 0,
    denied_count: stats?.denied_count || 0,
    success_rate: stats?.success_rate || 0,
    unique_locations: stats?.unique_locations || 0,
    unique_cards: stats?.unique_cards || 0,
    ...stats
  };

  if (error && !logData.length) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                เกิดข้อผิดพลาดในการโหลดข้อมูล
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  {refreshing ? 'กำลังโหลด...' : 'ลองใหม่'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📊 Dashboard - ภาพรวมการเข้าถึง
          </h1>
          <p className="text-gray-600 mt-1">
            {useRealData ? 'ข้อมูลจริงจากฐานข้อมูล' : 'ข้อมูลตัวอย่าง'} • 
            อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}
          </p>
        </div>
        
        <div className="flex gap-2">
          {getFilterCount() > 0 && (
            <button
              onClick={() => {
                clearFilters();
                refreshData();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ล้างตัวกรอง ({getFilterCount()})
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading || refreshing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {refreshing ? 'กำลังรีเฟรช...' : 'กำลังโหลด...'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                รีเฟรช
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !logData.length && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-600">กำลังโหลดข้อมูลไทย...</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards stats={safeStats} loading={loading} />

      {/* Filters */}
      <DataFilters 
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        loading={loading}
      />

      {/* Error Alert */}
      {error && logData.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>คำเตือน:</strong> บางข้อมูลอาจไม่อัปเดต - {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <HourlyTrendChart 
            data={safeChartData.hourlyData} 
            loading={chartData?.loading}
          />
        </div>
        
        <LocationDistributionChart 
          data={safeChartData.locationData}
          loading={chartData?.loading}
        />
        
        <DirectionChart 
          data={safeChartData.directionData}
          loading={chartData?.loading}
        />
      </div>

      {/* Recent Access Table */}
      <RecentAccessTable 
        data={filteredData.slice(0, 10)} 
        loading={loading}
        onRefresh={handleRefresh}
      />

      {/* Data Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">แสดงข้อมุล</p>
            <p className="text-lg font-semibold text-gray-900">
              {filteredData.length.toLocaleString('th-TH')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ทั้งหมด</p>
            <p className="text-lg font-semibold text-gray-900">
              {safeStats.total_records.toLocaleString('th-TH')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">อัตราสำเร็จ</p>
            <p className="text-lg font-semibold text-green-600">
              {safeStats.success_rate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">สถานที่</p>
            <p className="text-lg font-semibold text-blue-600">
              {safeStats.unique_locations}
            </p>
          </div>
        </div>
        
        {useRealData && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              🔄 ข้อมูลอัปเดตอัตโนมัติทุก 30 วินาที • 
              เชื่อมต่อกับฐานข้อมูล PostgreSQL • 
              รองรับข้อมูลภาษาไทย
            </p>
          </div>
        )}
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono">
          <details>
            <summary className="cursor-pointer mb-2">🔧 Debug Information</summary>
            <div className="space-y-1">
              <div>Data Source: {useRealData ? 'Real Database' : 'Sample Data'}</div>
              <div>Total Records: {logData.length}</div>
              <div>Filtered Records: {filteredData.length}</div>
              <div>Chart Data: {JSON.stringify({
                hourly: safeChartData.hourlyData.length,
                location: safeChartData.locationData.length,
                direction: safeChartData.directionData.length
              })}</div>
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Error: {error || 'None'}</div>
              <div>Filters: {JSON.stringify(filters)}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;