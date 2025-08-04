// frontend/services/apiService.js - Improved with Timeouts and Better Error Handling

class ApiService {
  constructor() {
    // กำหนด BASE_URL จากตัวแปรสภาพแวดล้อม หรือใช้ localhost:3001 เป็นค่าเริ่มต้น
    this.BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    this.DEFAULT_TIMEOUT = 30000; // 30 วินาทีสำหรับ timeout เริ่มต้น
  }

  /**
   * ส่งคำขอ HTTP ไปยัง API พร้อมการจัดการ Timeout
   * @param {string} endpoint - เส้นทาง API (เช่น '/api/logs')
   * @param {string} method - เมธอด HTTP (GET, POST, PUT, DELETE)
   * @param {object} [data=null] - ข้อมูลที่จะส่งไปกับคำขอ (สำหรับ POST, PUT)
   * @param {object} [params=null] - พารามิเตอร์ Query (สำหรับ GET)
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - ระยะเวลา timeout (มิลลิวินาที)
   * @returns {Promise<object>} - ผลลัพธ์จาก API
   */
  async request(endpoint, method = 'GET', data = null, params = null, timeout = this.DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    let url = `${this.BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal, // เพิ่ม AbortSignal สำหรับยกเลิกคำขอ
    };

    if (params) {
      const query = new URLSearchParams(params).toString();
      url = `${url}?${query}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`[API] ${method}: ${url}`); // แก้ไข Log ให้แสดง method ที่ถูกต้อง

      const response = await fetch(url, options);
      clearTimeout(id); // ยกเลิก timeout เมื่อได้รับการตอบกลับ

      if (!response.ok) {
        // ✅ FIX: อ่าน body เป็น text เพียงครั้งเดียวเพื่อป้องกัน "body stream already read"
        const errorText = await response.text();
        let errorJson;
        try {
          // พยายาม parse text เป็น JSON
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // ถ้า parse ไม่สำเร็จ ให้ใช้ text ที่ได้มาเป็นข้อความ error แทน
          errorJson = { error: errorText || response.statusText };
        }
        throw new Error(`HTTP ${response.status}: ${errorJson.error || 'Unknown server error'}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text(); // คืนค่าเป็น text ถ้าไม่ใช่ JSON

    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        console.error(`API Request timed out: ${method} ${endpoint}`);
        throw new Error('การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว (Timeout)');
      }
      console.error(`API Request failed: ${method} ${endpoint}`, error);
      throw error; // ส่งต่อ error ที่ได้รับ
    }
  }

  // ============== API Endpoints ==============

  // Health Check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Logs
  async getLogs(params) {
    return this.request('/api/logs', 'GET', null, params);
  }

  // ... (ส่วนของ endpoints อื่นๆ เหมือนเดิม)
  async getLogById(id) {
    return this.request(`/api/logs/${id}`);
  }

  async updateLog(id, data) {
    return this.request(`/api/logs/${id}`, 'PUT', data);
  }

  async deleteLogs(ids) {
    return this.request('/api/logs', 'DELETE', { ids });
  }

  // Filter Options
  async getLocations() {
    return this.request('/api/logs/locations');
  }

  async getDirections() {
    return this.request('/api/logs/directions');
  }

  async getUserTypes() {
    return this.request('/api/logs/user-types');
  }

  async getDevices() {
    return this.request('/api/logs/devices');
  }

  // Stats
  async getStats(params) {
    return this.request('/api/stats', 'GET', null, params);
  }
  
  // ... (endpoints อื่นๆ ของ stats)
  async getDailyStats(params) {
    return this.request('/api/stats/daily', 'GET', null, params);
  }

  async getHourlyStats(params) {
    return this.request('/api/stats/hourly', 'GET', null, params);
  }

  async getLocationStats(params) {
    return this.request('/api/stats/locations', 'GET', null, params);
  }

  async getUserActivityStats(params) {
    return this.request('/api/stats/user-activity', 'GET', null, params);
  }

  async getDeviceStats(params) {
    return this.request('/api/stats/devices', 'GET', null, params);
  }

  async getMonthlyStats(params) {
    return this.request('/api/stats/monthly', 'GET', null, params);
  }

  async getSecurityAlerts(params) {
    return this.request('/api/stats/security-alerts', 'GET', null, params);
  }

  // Charts
  async getChartData(type, params) {
    return this.request(`/api/charts/${type}`, 'GET', null, params);
  }

  /**
   * ใช้สำหรับส่งข้อมูลที่ผ่านการตรวจสอบแล้วจาก Client (JSON)
   * ซึ่งเป็นเมธอดหลักที่ uploadService ใช้
   * เพิ่ม timeout ให้ยาวขึ้นสำหรับข้อมูลขนาดใหญ่
   */
  async appendLogData(data) {
    const BATCH_INSERT_TIMEOUT = 120000; // 2 นาที
    return this.request('/api/logs/batch-append', 'POST', { logs: data }, null, BATCH_INSERT_TIMEOUT);
  }
  
  /**
   * ใช้สำหรับอัปโหลดไฟล์โดยตรง (FormData)
   * เมธอดนี้ไม่ได้ถูกใช้โดย uploadService.js ตัวปัจจุบัน แต่เก็บไว้เผื่อใช้งาน
   */
  async uploadLogFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // การใช้ fetch โดยตรงสำหรับ FormData
    try {
      const response = await fetch(`${this.BASE_URL}/api/upload-log`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          errorJson = { error: errorText || response.statusText };
        }
        throw new Error(`HTTP ${response.status}: ${errorJson.error || 'Unknown server error'}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Upload API Request failed:', error);
      throw error;
    }
  }

  async getUploadStats() {
    return this.request('/api/upload-log/stats');
  }

  async getUploadHistory(params) {
    return this.request('/api/upload-log/history', 'GET', null, params);
  }

  // Export
  async exportData(format, params) {
    // การ export อาจใช้เวลานาน, ตั้ง timeout ให้นานขึ้น
    const EXPORT_TIMEOUT = 180000; // 3 นาที
    const response = await this.request(`/api/export/${format}`, 'GET', null, params, EXPORT_TIMEOUT);
    return new Blob([response]); // แปลง response ที่เป็น text/blob กลับเป็น Blob
  }
}

const apiService = new ApiService();
export default apiService;
