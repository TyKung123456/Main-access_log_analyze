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