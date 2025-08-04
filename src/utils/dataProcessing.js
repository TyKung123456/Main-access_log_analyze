// utils/dataProcessing.js

export const calculateStats = (data) => {
  return {
    totalAccess: data.length,
    successfulAccess: data.filter(item => item.allow).length,
    deniedAccess: data.filter(item => !item.allow).length,
    uniqueUsers: new Set(data.map(item => item.cardName)).size,
  };
};

export const processChartData = (data) => {
  // ข้อมูลสำหรับกราฟแนวโน้มรายชั่วโมง
  const hourlyData = Array.from({length: 24}, (_, hour) => {
    const hourData = data.filter(item => item.dateTime.getHours() === hour);
    return {
      hour: `${hour}:00`,
      count: hourData.length,
      success: hourData.filter(item => item.allow).length,
      denied: hourData.filter(item => !item.allow).length
    };
  });

  // ข้อมูลสำหรับกราห Pie Chart - การเข้าออกตามสถานที่
  const locationData = Object.entries(
    data.reduce((acc, item) => {
      acc[item.location] = (acc[item.location] || 0) + 1;
      return acc;
    }, {})
  ).map(([location, count]) => ({ name: location, value: count }));

  // ข้อมูลสำหรับกราฟ Direction
  const directionData = Object.entries(
    data.reduce((acc, item) => {
      acc[item.direction] = (acc[item.direction] || 0) + 1;
      return acc;
    }, {})
  ).map(([direction, count]) => ({ name: direction, value: count }));

  return {
    hourlyData,
    locationData,
    directionData
  };
};

export const parseLogFile = (content) => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const columns = line.split('\t');
      
      // ตรวจสอบว่ามีข้อมูลครบถ้วน
      if (columns.length < 15) {
        throw new Error(`Invalid data format at line ${index + 1}`);
      }

      return {
        file: parseInt(columns[0]) || 0,
        dateTime: new Date(columns[1]),
        day: parseInt(columns[2]) || 0,
        month: parseInt(columns[3]) || 0,
        year: parseInt(columns[4]) || 0,
        yearMm: columns[5] || '',
        transactionId: columns[7] || '',
        door: columns[8] || '',
        device: columns[9] || '',
        location: columns[10] || '',
        direction: columns[11] || '',
        allow: columns[12] === 't' || columns[12] === 'true',
        reason: columns[13] || '',
        channel: columns[14] || '',
        cardName: columns[15] || '',
        cardNumber: columns[16] || '',
        userType: columns[19] || '',
        permission: columns[20] || ''
      };
    });
  } catch (error) {
    console.error('Error parsing log file:', error);
    throw new Error('Invalid file format. Please check your log file.');
  }
};