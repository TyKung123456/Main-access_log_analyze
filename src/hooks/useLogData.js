// src/hooks/useLogData.js
import { useState, useEffect, useCallback } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { processChartData, calculateStats } from '../utils/dataProcessing';
import apiService from '../services/apiService';
import { transformFiltersForApi } from '../utils/filterUtils';

// Helper to normalize direction variants to IN / OUT
const normalizeDirection = (v) => {
  const s = (v ?? '').toString().trim().toUpperCase();
  if (!s) return '';
  if (['IN', 'INBOUND', 'เข้า'].includes(s)) return 'IN';
  if (['OUT', 'OUTBOUND', 'ออก'].includes(s)) return 'OUT';
  return s; // keep as-is for other possible values
};

export const useLogData = () => {
  const [logData, setLogData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({ hourlyData: [], locationData: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 999999, total: 0, totalPages: 1 });
  const [sort, setSort] = useState({ column: 'Date Time', order: 'DESC' }); // New state for sorting

  const useRealData = import.meta.env.VITE_ENABLE_SAMPLE_DATA !== 'true';

  const transformApiData = useCallback((item) => {
    // Normalize Allow to boolean
    const rawAllow = item.Allow;
    let allowBool;
    if (typeof rawAllow === 'boolean') allowBool = rawAllow;
    else if (typeof rawAllow === 'number') allowBool = rawAllow !== 0;
    else if (typeof rawAllow === 'string') {
      const s = rawAllow.trim().toLowerCase();
      allowBool = ['true','t','1','yes','y'].includes(s) ? true : ['false','f','0','no','n'].includes(s) ? false : Boolean(rawAllow);
    } else {
      allowBool = Boolean(rawAllow);
    }

    // Robust date parsing (handle 'YYYY-MM-DD HH:mm:ss')
    const dtRaw = item['Date Time'];
    let dt;
    if (dtRaw instanceof Date) dt = dtRaw;
    else if (typeof dtRaw === 'string') {
      const hasT = dtRaw.includes('T');
      dt = new Date(hasT ? dtRaw : dtRaw.replace(' ', 'T'));
      if (isNaN(dt)) {
        // Fallback: try Date.parse directly
        const ts = Date.parse(dtRaw);
        dt = isNaN(ts) ? null : new Date(ts);
      }
    } else dt = null;

    return {
      id: item['Transaction ID'] || item.id,
      dateTime: dt,
      location: item.Location,
      direction: normalizeDirection(item.Direction || item.direction),
      allow: allowBool,
      status: allowBool ? 'allowed' : 'denied',
      reason: item.Reason || '',
      cardName: item['Card Name'],
      userType: item['User Type'],
    };
  }, []);

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
          apiService.getChartData('location', params)
        ]),
        apiService.getLogs(params)
      ]);

      setStats(statsRes);

      // Ensure logsRes.data is an array before mapping
      const transformedLogs = (logsRes.data || []).map(transformApiData);

      setChartData({
        hourlyData: chartsRes[0]?.data || [],
        locationData: chartsRes[1]?.data || []
      });
      
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
