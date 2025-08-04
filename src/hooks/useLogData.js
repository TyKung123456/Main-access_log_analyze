// src/hooks/useLogData.js
import { useState, useEffect, useCallback } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { processChartData, calculateStats } from '../utils/dataProcessing';
import apiService from '../services/apiService';

export const useLogData = () => {
  const [logData, setLogData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({ hourlyData: [], locationData: [], directionData: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 999999, total: 0, totalPages: 1 });

  const useRealData = import.meta.env.VITE_ENABLE_SAMPLE_DATA !== 'true';

  const transformApiData = useCallback((item) => ({
    id: item['Transaction ID'] || item.id,
    dateTime: new Date(item['Date Time']),
    location: item.Location,
    direction: item.Direction,
    allow: item.Allow,
    cardName: item['Card Name'],
    userType: item['User Type'],
  }), []);

  const fetchAPIData = useCallback(async (page = 1, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: pagination.limit, ...filters };

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
      
      // ✅ FIXED: Update both logData and filteredData states.
      setLogData(transformedLogs);
      setFilteredData(transformedLogs);
      
      setPagination(logsRes.pagination);

    } catch (err) {
      console.error('❌ Failed to fetch real data:', err);
      setError('ไม่สามารถดึงข้อมูลจากเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, transformApiData]);

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
      fetchAPIData(1, {});
    } else {
      fetchSampleData();
    }
  }, [useRealData, fetchAPIData, fetchSampleData]);

  const applyFilters = (filters) => {
    if (useRealData) {
      fetchAPIData(1, filters);
    }
  };
  
  return {
    // ✅ FIXED: Added 'logData' to the returned object.
    logData,
    filteredData,
    stats,
    chartData,
    loading,
    error,
    pagination,
    applyFilters,
    refreshData: fetchAPIData
  };
};