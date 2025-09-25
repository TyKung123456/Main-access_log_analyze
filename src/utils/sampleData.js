// utils/sampleData.js - Updated for Production Use

/**
 * Sample data generator for development, testing, and demo purposes
 * ใช้เมื่อ:
 * - Development mode (ยังไม่มี backend)
 * - Unit testing
 * - Demo/Preview
 * - Fallback เมื่อ API ล่ม
 */

export const generateSampleData = (count = 50) => {
  const locations = [
    'สำนักงานใหญ่ ชั้น 1',
    'สำนักงานใหญ่ ชั้น 3', 
    'สำนักงานใหญ่ ชั้น 5',
    'ห้องประชุม A',
    'ห้องประชุม B',
    'โรงจอดรถ',
    'ห้องเซิร์ฟเวอร์',
    'ห้องแล็บ',
    // Security Rooms (mock)
    'ห้องควบคุมความปลอดภัย A',
    'ห้องควบคุมความปลอดภัย B',
    'ห้องควบคุมความปลอดภัย C'
  ];

  const users = [
    'SKBI', 'JOHN', 'ALICE', 'BOB', 'CHARLIE', 
    'DIANA', 'EVE', 'FRANK', 'GRACE', 'HENRY'
  ];

  const userTypes = ['EMPLOYEE', 'AFFILIATE', 'VISITOR', 'CONTRACTOR', 'SECURITY'];
  const directions = ['IN', 'OUT'];
  const reasons = ['Verify Success', 'Access Denied', 'Card Expired', 'Invalid Card'];
  const doors = ['NNN0501', 'NNN0502', 'NNN0503', 'NNN0504', 'NNN0505'];

  const data = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // สร้างเวลาแบบสุ่มใน 7 วันที่ผ่านมา
    const randomHoursAgo = Math.floor(Math.random() * 168); // 7 days * 24 hours
    const dateTime = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000));
    
    // สร้างข้อมูลแบบสุ่มแต่เป็นไปได้จริง
    const isBusinessHour = dateTime.getHours() >= 8 && dateTime.getHours() <= 18;
    const allowRate = isBusinessHour ? 0.95 : 0.8; // ในเวลาทำงานมีโอกาสผ่านมากกว่า
    const allow = Math.random() < allowRate;
    
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    
    data.push({
      file: 1,
      dateTime: dateTime,
      day: dateTime.getDate(),
      month: dateTime.getMonth() + 1,
      year: dateTime.getFullYear(),
      yearMm: `${dateTime.getFullYear()}_${(dateTime.getMonth() + 1).toString().padStart(2, '0')}`,
      transactionId: generateTransactionId(),
      door: doors[Math.floor(Math.random() * doors.length)],
      device: `NFL${Math.floor(Math.random() * 900) + 100}${direction === 'IN' ? 'IN' : 'OUT'}`,
      location: location,
      direction: direction,
      allow: allow,
      reason: allow ? 'Verify Success' : reasons[Math.floor(Math.random() * (reasons.length - 1)) + 1],
      channel: 'CARD',
      cardName: allow ? user : (Math.random() < 0.3 ? 'UNKNOWN' : user),
      cardNumber: `0000${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      userType: userTypes[Math.floor(Math.random() * userTypes.length)],
      permission: allow ? 'General Permission Group' : 'Limited Access'
    });
  }
  // Ensure at least one off-hours non-security allowed IN event in a Security Room
  const isOffHours = (d) => {
    const h = d.getHours();
    const dow = d.getDay();
    return h >= 22 || h <= 6 || dow === 0 || dow === 6;
  };
  const isSecurityRoom = (loc) => {
    const s = String(loc || '').toLowerCase();
    return s.includes('security') || s.includes('ห้องควบคุมความปลอดภัย') || s.includes('ห้องความปลอดภัย') || s.includes('ศูนย์รักษาความปลอดภัย');
  };
  const hasTarget = data.some(x => isSecurityRoom(x.location) && x.direction === 'IN' && x.allow === true && (x.userType || '').toUpperCase() !== 'SECURITY' && isOffHours(new Date(x.dateTime)));
  if (!hasTarget) {
    const dt = new Date(now.getTime());
    dt.setHours(23, 20, 0, 0); // 23:20 today
    const fallback = {
      file: 1,
      dateTime: dt,
      day: dt.getDate(),
      month: dt.getMonth() + 1,
      year: dt.getFullYear(),
      yearMm: `${dt.getFullYear()}_${(dt.getMonth() + 1).toString().padStart(2, '0')}`,
      transactionId: generateTransactionId(),
      door: 'SEC-B-02',
      device: 'Reader-SecB-02',
      location: 'ห้องควบคุมความปลอดภัย B',
      direction: 'IN',
      allow: true,
      reason: 'Verify Success',
      channel: 'CARD',
      cardName: 'พนักงานเวรดึก',
      cardNumber: `0000${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      userType: 'EMPLOYEE',
      permission: 'EMP_SPECIAL'
    };
    data.push(fallback);
  }

  // เรียงตามเวลาจากใหม่ไปเก่า
  return data.sort((a, b) => b.dateTime - a.dateTime);
};

// สร้าง Transaction ID แบบสุ่ม
const generateTransactionId = () => {
  return Array.from({length: 24}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// สร้างข้อมูล sample สำหรับการทดสอบเฉพาะ
export const generateTestData = {
  // ข้อมูลที่มีการ access denied สูง
  highDeniedRate: () => {
    const data = generateSampleData(20);
    return data.map((item, index) => ({
      ...item,
      allow: index % 3 !== 0, // 33% denied rate
      reason: index % 3 === 0 ? 'Access Denied' : 'Verify Success'
    }));
  },

  // ข้อมูลในช่วงเวลาเฉพาะ
  timeRange: (startHour, endHour, count = 10) => {
    const data = generateSampleData(count);
    return data.map(item => {
      const newDateTime = new Date(item.dateTime);
      const randomHour = startHour + Math.floor(Math.random() * (endHour - startHour));
      newDateTime.setHours(randomHour);
      return {
        ...item,
        dateTime: newDateTime,
        day: newDateTime.getDate(),
        month: newDateTime.getMonth() + 1,
        year: newDateTime.getFullYear()
      };
    });
  },

  // ข้อมูลสำหรับ user เฉพาะ
  specificUser: (userName, count = 5) => {
    const data = generateSampleData(count);
    return data.map(item => ({
      ...item,
      cardName: userName,
      allow: true, // ให้ผ่านทั้งหมดสำหรับ user นี้
      reason: 'Verify Success'
    }));
  },

  // ข้อมูลว่างเปล่า
  empty: () => [],

  // ข้อมูลที่มี error
  withErrors: () => {
    const data = generateSampleData(10);
    return data.map((item, index) => {
      if (index % 5 === 0) {
        return {
          ...item,
          cardName: null, // Missing data
          location: '',
          reason: 'System Error'
        };
      }
      return item;
    });
  }
};

// ตรวจสอบว่าควรใช้ sample data หรือไม่
export const shouldUseSampleData = () => {
  // ใช้ในโหมด development และไม่มี API URL
  if (process.env.NODE_ENV === 'development' && !process.env.VITE_API_BASE_URL) {
    return true;
  }
  
  // ใช้เมื่อเปิด demo mode
  if (process.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  
  return false;
};

// ฟังก์ชันสำหรับ migrate sample data ไป PostgreSQL (development helper)
export const migrateSampleDataToAPI = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Migration only available in development mode');
    return;
  }

  try {
    const { apiService } = await import('../services/apiService');
    const sampleData = generateSampleData(100);
    
    console.log('Migrating sample data to API...');
    
    for (const item of sampleData) {
      await apiService.request('/api/logs', {
        method: 'POST',
        body: JSON.stringify(item)
      });
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
