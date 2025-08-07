// frontend/services/apiService.js - Fixed version to prevent object parameter issues

class ApiService {
  constructor() {
    // กำหนด BASE_URL จากตัวแปรสภาพแวดล้อม หรือใช้ localhost:3001 เป็นค่าเริ่มต้น
    this.BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    this.DEFAULT_TIMEOUT = 30000; // 30 วินาทีสำหรับ timeout เริ่มต้น
  }

  /**
   * ทำความสะอาดและตรวจสอบ parameters เพื่อป้องกัน [object Object] ใน URL
   */
  cleanParams(params) {
    if (!params || typeof params !== 'object') {
      return {};
    }

    const cleanedParams = {};

    Object.entries(params).forEach(([key, value]) => {
      // ข้าม null, undefined, หรือ object/array
      if (value === null || value === undefined) {
        return;
      }

      // ตรวจสอบว่าเป็น object หรือ array
      if (typeof value === 'object') {
        console.warn(`⚠️ Parameter '${key}' is an object, skipping:`, value);
        console.warn('📍 This usually happens when state objects are passed as parameters');
        return;
      }

      // แปลงเป็น string และตัดช่องว่าง
      const stringValue = String(value).trim();

      // ข้าม string ที่ว่างเปล่าหรือค่าที่ไม่ถูกต้อง
      if (stringValue === '' || stringValue === 'undefined' || stringValue === 'null') {
        return;
      }

      cleanedParams[key] = stringValue;
    });

    console.log('🧹 Cleaned parameters:', cleanedParams);
    return cleanedParams;
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
        'Accept': 'application/json',
      },
      signal: controller.signal, // เพิ่ม AbortSignal สำหรับยกเลิกคำขอ
    };

    // 🔧 แก้ไข: ทำความสะอาด parameters ก่อนสร้าง query string
    if (params) {
      const cleanedParams = this.cleanParams(params);

      if (Object.keys(cleanedParams).length > 0) {
        const query = new URLSearchParams(cleanedParams).toString();
        url = `${url}?${query}`;
      }
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`📡 [API] ${method}: ${url}`);

      const response = await fetch(url, options);
      clearTimeout(id); // ยกเลิก timeout เมื่อได้รับการตอบกลับ

      console.log(`📨 [API] Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // ✅ อ่าน body เป็น text เพียงครั้งเดียวเพื่อป้องกัน "body stream already read"
        const errorText = await response.text();
        let errorJson;
        try {
          // พยายาม parse text เป็น JSON
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // ถ้า parse ไม่สำเร็จ ให้ใช้ text ที่ได้มาเป็นข้อความ error แทน
          errorJson = { error: errorText || response.statusText };
        }

        const errorMessage = `HTTP ${response.status}: ${errorJson.error || errorJson.message || 'Unknown server error'}`;
        console.error('❌ API Error:', errorMessage);

        // 🔧 แก้ไข: เพิ่มข้อมูล debug สำหรับ 500 errors
        if (response.status === 500) {
          console.error('💥 Server Error Details:', {
            url,
            method,
            params: params ? this.cleanParams(params) : null,
            responseText: errorText.substring(0, 500) // แสดงเฉพาะ 500 ตัวอักษรแรก
          });
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log('✅ API Success:', {
          endpoint,
          method,
          dataKeys: Object.keys(result),
          responseSize: JSON.stringify(result).length
        });
        return result;
      }
      return await response.text(); // คืนค่าเป็น text ถ้าไม่ใช่ JSON

    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        console.error(`⏰ API Request timed out: ${method} ${endpoint}`);
        throw new Error('การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว (Timeout)');
      }
      console.error(`❌ API Request failed: ${method} ${endpoint}`, error);
      throw error; // ส่งต่อ error ที่ได้รับ
    }
  }

  // ============== API Endpoints ==============

  // Health Check
  async healthCheck() {
    try {
      return await this.request('/api/health');
    } catch (error) {
      console.warn('Health check failed, trying alternative endpoints...');

      // ลองเส้นทางอื่น
      const alternatives = ['/api/status', '/api/ping', '/health', '/status'];

      for (const alt of alternatives) {
        try {
          console.log(`🔄 Trying alternative health check: ${alt}`);
          return await this.request(alt);
        } catch (altError) {
          console.warn(`Alternative ${alt} failed:`, altError.message);
          continue;
        }
      }

      throw error; // ถ้าทุกทางไม่สำเร็จ
    }
  }

  // 🔧 แก้ไข: Logs - เพิ่มการตรวจสอบและทำความสะอาด parameters
  async getLogs(params) {
    try {
      // ตรวจสอบและทำความสะอาด parameters
      console.log('📥 getLogs called with params:', params);

      // 🚨 แก้ไขปัญหาหลัก: ตรวจสอบว่า params ไม่มี object
      if (params && typeof params === 'object') {
        const problematicKeys = Object.entries(params).filter(([key, value]) =>
          typeof value === 'object' && value !== null
        );

        if (problematicKeys.length > 0) {
          console.error('🚨 Found object parameters that will cause [object Object] error:', problematicKeys);

          // ลบ object parameters ออก
          const cleanedParams = { ...params };
          problematicKeys.forEach(([key]) => {
            delete cleanedParams[key];
          });

          console.log('🧹 Cleaned params (removed objects):', cleanedParams);
          params = cleanedParams;
        }
      }

      // ลองหลาย endpoints
      const endpoints = ['/api/logs', '/api/access-logs', '/api/entries'];
      let lastError;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const result = await this.request(endpoint, 'GET', null, params);

          console.log(`✅ Success with endpoint: ${endpoint}`);
          return result;
        } catch (error) {
          console.warn(`❌ Endpoint ${endpoint} failed:`, error.message);
          lastError = error;

          // ถ้าเป็น 404 ให้ลองต่อ, ถ้าเป็น 500 ให้หยุด
          if (error.message.includes('500')) {
            console.error('💥 Server error detected, stopping endpoint attempts');
            break;
          }

          continue;
        }
      }

      throw lastError || new Error('All log endpoints failed');
    } catch (error) {
      console.error('❌ getLogs failed:', error);
      throw error;
    }
  }

  // เพิ่มเมธอดใหม่สำหรับ Security Dashboard
  async getSuspiciousActivities(params) {
    try {
      console.log('🚨 getSuspiciousActivities called with params:', params);

      const endpoints = ['/api/suspicious-activities', '/api/suspicious', '/api/alerts', '/api/incidents'];
      let lastError;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying suspicious endpoint: ${endpoint}`);
          const result = await this.request(endpoint, 'GET', null, params);

          console.log(`✅ Success with suspicious endpoint: ${endpoint}`);
          return result;
        } catch (error) {
          console.warn(`❌ Suspicious endpoint ${endpoint} failed:`, error.message);
          lastError = error;

          if (error.message.includes('404')) {
            continue;
          } else {
            break;
          }
        }
      }

      throw lastError || new Error('All suspicious activities endpoints failed');
    } catch (error) {
      console.error('❌ getSuspiciousActivities failed:', error);
      throw error;
    }
  }

  async getDashboardStats(params) {
    try {
      console.log('📊 getDashboardStats called with params:', params);

      const endpoints = ['/api/dashboard/stats', '/api/stats', '/api/dashboard', '/api/summary'];
      let lastError;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying stats endpoint: ${endpoint}`);
          const result = await this.request(endpoint, 'GET', null, params);

          console.log(`✅ Success with stats endpoint: ${endpoint}`);
          return result;
        } catch (error) {
          console.warn(`❌ Stats endpoint ${endpoint} failed:`, error.message);
          lastError = error;

          if (error.message.includes('404')) {
            continue;
          } else {
            break;
          }
        }
      }

      throw lastError || new Error('All dashboard stats endpoints failed');
    } catch (error) {
      console.error('❌ getDashboardStats failed:', error);
      throw error;
    }
  }

  // ... (เก็บ methods เดิมไว้)
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