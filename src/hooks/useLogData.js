// src/hooks/useLogData.js
import { useState, useEffect, useCallback } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { processChartData, calculateStats } from '../utils/dataProcessing';
import apiService from '../services/apiService';
import { transformFiltersForApi } from '../utils/filterUtils';

export const useLogData = () => {
  const [logData, setLogData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({ hourlyData: [], locationData: [], directionData: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 999999, total: 0, totalPages: 1 });
  const [sort, setSort] = useState({ column: 'Date Time', order: 'DESC' }); // New state for sorting

  const useRealData = import.meta.env.VITE_ENABLE_SAMPLE_DATA !== 'true';

  const transformApiData = useCallback((item) => ({
    id: item['Transaction ID'] || item.id,
    dateTime: new Date(item['Date Time']),
    location: item.Location,
    direction: item.Direction,
    allow: item.Allow, // Keep for backward compatibility if needed
    status: item.Allow ? 'allowed' : 'denied', // Add a status string
    reason: item.Reason || 'N/A', // Add reason for denied access
    cardName: item['Card Name'],
    userType: item['User Type'],
  }), []);

  const fetchAPIData = useCallback(async (page = 1, filters = {}, currentSort = sort) => {
    setLoading(true);
    setError(null);
    try {
      // Transform filters for API before sending
      const apiQueryParams = transformFiltersForApi(filters);
      const params = {
        page,
        limit: pagination.limit,
        sort: currentSort.column, // Add sort column
        order: currentSort.order, // Add sort order
        ...apiQueryParams
      };

      const [statsRes, chartsRes, logsRes] = await Promise.all([
        apiService.getStats(params),
        Promise.all([
          apiService.getChartData('hourly', params),
          apiService.getChartData('location', params),
          apiService.getChartData('direction', params)
        ]),
        apiService.getLogs(params)
      ]);

      setStats(statsRes);
      setChartData({
        hourlyData: chartsRes[0]?.data || [],
        locationData: chartsRes[1]?.data || [],
        directionData: chartsRes[2]?.data || []
      });
      
      const transformedLogs = logsRes.data.map(transformApiData);
      
      // Update both logData and filteredData states.
      setLogData(transformedLogs);
      setFilteredData(transformedLogs);
      
      setPagination(logsRes.pagination);

    } catch (err) {
      console.error('❌ Failed to fetch real data:', err);
      setError('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, transformApiData, sort]); // Add sort to dependencies

  const fetchSampleData = useCallback(() => {
    const sample = generateSampleData();
    const transformedSample = sample.map(transformApiData);
    setLogData(transformedSample);
    setFilteredData(transformedSample);
    setStats(calculateStats(sample));
    setChartData(processChartData(sample));
  }, [transformApiData]);
  
  useEffect(() => {
    if (useRealData) {
      fetchAPIData(1, {}, sort); // Pass initial sort state
    } else {
      fetchSampleData();
    }
  }, [useRealData, fetchAPIData, fetchSampleData, sort]); // Add sort to dependencies

  const applyFilters = (filters) => {
    if (useRealData) {
      fetchAPIData(1, filters, sort); // Pass current sort state
    }
  };

  const handleSortChange = useCallback((column, order) => {
    const newSort = { column, order };
    setSort(newSort);
    if (useRealData) {
      fetchAPIData(1, {}, newSort); // Fetch data with new sort, reset to page 1
    }
  }, [useRealData, fetchAPIData]);
  
  return {
    logData,
    filteredData,
    stats,
    chartData,
    loading,
    error,
    pagination,
    sort, // Expose sort state
    applyFilters,
    refreshData: fetchAPIData,
    onSortChange: handleSortChange // Expose sort handler
  };
};
