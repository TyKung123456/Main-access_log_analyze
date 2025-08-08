// utils/filterUtils.js

export const applyFilters = (data, filters) => {
  let filtered = [...data];

  // กรองตามวันที่
  if (filters.date) {
    filtered = filtered.filter(item => 
      item.dateTime.toDateString() === new Date(filters.date).toDateString()
    );
  }

  // กรองตามสถานที่
  if (filters.location) {
    filtered = filtered.filter(item => 
      item.location.toLowerCase().includes(filters.location.toLowerCase())
    );
  }

  // กรองตามผู้ใช้
  if (filters.user) {
    filtered = filtered.filter(item => 
      item.cardName.toLowerCase().includes(filters.user.toLowerCase())
    );
  }

  // ค้นหาทั่วไป
  if (filters.search) {
    filtered = filtered.filter(item =>
      Object.values(item).some(value =>
        value && value.toString().toLowerCase().includes(filters.search.toLowerCase())
      )
    );
  }

  return filtered;
};

export const getFilterOptions = (data) => {
  return {
    locations: [...new Set(data.map(item => item.location))].sort(),
    users: [...new Set(data.map(item => item.cardName))].sort(),
    userTypes: [...new Set(data.map(item => item.userType))].sort(),
    doors: [...new Set(data.map(item => item.door))].sort()
  };
};

/**
 * Transforms the filters object from useFilters hook into a flat object suitable for API query parameters.
 * Handles nested objects like dateRange and array values.
 * @param {object} filters - The filters object from the useFilters hook.
 * @returns {object} A flat object with primitive values, ready for URLSearchParams.
 */
export const transformFiltersForApi = (filters) => {
  const apiFilters = {};

  if (filters.dateRange) {
    if (filters.dateRange.start) {
      apiFilters.startDate = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      apiFilters.endDate = filters.dateRange.end;
    }
  }

  if (filters.location && Array.isArray(filters.location) && filters.location.length > 0) {
    apiFilters.location = filters.location.join(','); // Join array for API
  }

  if (filters.direction && Array.isArray(filters.direction) && filters.direction.length > 0) {
    apiFilters.direction = filters.direction.join(','); // Join array for API
  }

  if (filters.userType && Array.isArray(filters.userType) && filters.userType.length > 0) {
    apiFilters.userType = filters.userType.join(','); // Join array for API
  }

  if (filters.allow !== undefined && filters.allow !== null) {
    apiFilters.allow = filters.allow.toString(); // Convert boolean to string
  }

  if (filters.search) {
    apiFilters.search = filters.search;
  }

  // Add sort parameters, mapping sortBy to 'sort' and sortOrder to 'order'
  if (filters.sortBy) {
    apiFilters.sort = filters.sortBy;
  }
  if (filters.sortOrder) {
    apiFilters.order = filters.sortOrder;
  }

  // Add any other simple filters directly
  for (const key in filters) {
    if (!['dateRange', 'location', 'direction', 'userType', 'allow', 'search', 'sortBy', 'sortOrder'].includes(key)) {
      if (filters[key] !== undefined && filters[key] !== null && !Array.isArray(filters[key]) && typeof filters[key] !== 'object') {
        apiFilters[key] = filters[key];
      }
    }
  }

  return apiFilters;
};
