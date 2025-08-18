import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

const usePivotTableData = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async (currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      // Request a very large limit to get all records for the pivot table
      const result = await apiService.getLogs({ ...currentFilters, limit: 999999 });
      setData(result.data || []);
    } catch (err) {
      console.error("Failed to fetch pivot table data:", err);
      setError(err.message || "Failed to fetch data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [filters, fetchData]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return { data, loading, error, filters, updateFilters, clearFilters, fetchData };
};

export default usePivotTableData;
