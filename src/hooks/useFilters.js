// src/hooks/useFilters.js - Complete Implementation
import { useState, useMemo } from 'react';
import { transformFiltersForApi } from '../utils/filterUtils';

export const useFilters = () => {
  const [filters, setFilters] = useState({
    sortBy: 'timestamp', // Default sort by timestamp
    sortOrder: 'desc'    // Default sort order descending
  });

  // Update a specific filter
  const updateFilter = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        // Remove filter if value is empty
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      
      return newFilters;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
  };

  // Clear specific filter
  const clearFilter = (key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  // Get filter count (active filters)
  const getFilterCount = () => {
    return Object.keys(filters).length;
  };

  // Check if a specific filter is active
  const hasFilter = (key) => {
    return key in filters && filters[key] !== null && filters[key] !== undefined;
  };

  // Get filter value
  const getFilter = (key) => {
    return filters[key];
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  // Get filter summary for display
  const getFilterSummary = () => {
    const summary = [];
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      summary.push(`วันที่: ${start} - ${end}`);
    }
    
    if (filters.location && filters.location.length > 0) {
      const locations = Array.isArray(filters.location) ? filters.location : [filters.location];
      if (locations.length === 1) {
        summary.push(`สถานที่: ${locations[0]}`);
      } else {
        summary.push(`สถานที่: ${locations.length} แห่ง`);
      }
    }
    
    if (filters.direction && filters.direction.length > 0) {
      const directions = Array.isArray(filters.direction) ? filters.direction : [filters.direction];
      summary.push(`ทิศทาง: ${directions.join(', ')}`);
    }
    
    if (filters.userType && filters.userType.length > 0) {
      const userTypes = Array.isArray(filters.userType) ? filters.userType : [filters.userType];
      if (userTypes.length === 1) {
        summary.push(`ประเภทผู้ใช้: ${userTypes[0]}`);
      } else {
        summary.push(`ประเภทผู้ใช้: ${userTypes.length} ประเภท`);
      }
    }
    
    if (filters.allow !== undefined) {
      summary.push(`สถานะ: ${filters.allow === true ? 'อนุญาต' : 'ปฏิเสธ'}`);
    }
    
    if (filters.search) {
      summary.push(`ค้นหา: "${filters.search}"`);
    }

    if (filters.sortBy) {
      const sortByText = filters.sortBy === 'timestamp' ? 'เวลาเข้าถึง' : filters.sortBy;
      const sortOrderText = filters.sortOrder === 'desc' ? 'ล่าสุด - เก่าสุด' : 'เก่าสุด - ล่าสุด';
      summary.push(`เรียงตาม: ${sortByText} (${sortOrderText})`);
    }
    
    return summary;
  };

  // Set multiple filters at once
  const setMultipleFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Reset filters to initial state
  const resetFilters = () => {
    setFilters({});
  };

  // Toggle filter value (for boolean filters)
  const toggleFilter = (key) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Date range helper functions
  const setDateRange = (start, end) => {
    updateFilter('dateRange', { start, end });
  };

  const clearDateRange = () => {
    clearFilter('dateRange');
  };

  // Location filter helpers
  const addLocation = (location) => {
    const currentLocations = filters.location || [];
    const newLocations = Array.isArray(currentLocations) 
      ? [...currentLocations, location]
      : [currentLocations, location];
    
    updateFilter('location', [...new Set(newLocations)]); // Remove duplicates
  };

  const removeLocation = (location) => {
    const currentLocations = filters.location || [];
    const newLocations = Array.isArray(currentLocations)
      ? currentLocations.filter(loc => loc !== location)
      : [];
    
    updateFilter('location', newLocations);
  };

  // Direction filter helpers
  const addDirection = (direction) => {
    const currentDirections = filters.direction || [];
    const newDirections = Array.isArray(currentDirections)
      ? [...currentDirections, direction]
      : [currentDirections, direction];
    
    updateFilter('direction', [...new Set(newDirections)]);
  };

  const removeDirection = (direction) => {
    const currentDirections = filters.direction || [];
    const newDirections = Array.isArray(currentDirections)
      ? currentDirections.filter(dir => dir !== direction)
      : [];
    
    updateFilter('direction', newDirections);
  };

  // User type filter helpers
  const addUserType = (userType) => {
    const currentUserTypes = filters.userType || [];
    const newUserTypes = Array.isArray(currentUserTypes)
      ? [...currentUserTypes, userType]
      : [currentUserTypes, userType];
    
    updateFilter('userType', [...new Set(newUserTypes)]);
  };

  const removeUserType = (userType) => {
    const currentUserTypes = filters.userType || [];
    const newUserTypes = Array.isArray(currentUserTypes)
      ? currentUserTypes.filter(type => type !== userType)
      : [];
    
    updateFilter('userType', newUserTypes);
  };

  // Search filter helpers
  const setSearch = (searchTerm) => {
    updateFilter('search', searchTerm);
  };

  const clearSearch = () => {
    clearFilter('search');
  };

  // Export current filters for API calls
  const getApiFilters = () => {
    return transformFiltersForApi(filters);
  };

  return {
    // State
    filters,
    hasActiveFilters,
    
    // Basic operations
    updateFilter,
    clearFilters,
    clearFilter,
    resetFilters,
    setMultipleFilters,
    toggleFilter,
    
    // Query functions
    getFilterCount,
    hasFilter,
    getFilter,
    getFilterSummary,
    getApiFilters,
    
    // Date range helpers
    setDateRange,
    clearDateRange,
    
    // Location helpers
    addLocation,
    removeLocation,
    
    // Direction helpers
    addDirection,
    removeDirection,
    
    // User type helpers
    addUserType,
    removeUserType,
    
    // Search helpers
    setSearch,
    clearSearch
  };
};
