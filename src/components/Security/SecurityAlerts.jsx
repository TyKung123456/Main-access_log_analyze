import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Shield, MapPin, Activity, RefreshCw, CheckCircle2, Download, Search, Filter, TrendingUp, Eye, ChevronDown, ChevronUp, Bell, Users, Calendar, BarChart3, Target, Building2, X, Database, Wifi, AlertCircle } from 'lucide-react';

// Helper functions
const getSeverityDetails = (severity) => {
  const details = {
    high: { iconColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', pillClasses: 'bg-red-100 text-red-700', label: 'สูง' },
    medium: { iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', pillClasses: 'bg-amber-100 text-amber-700', label: 'ปานกลาง' },
    low: { iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', pillClasses: 'bg-blue-100 text-blue-700', label: 'ต่ำ' }
  };
  return details[severity] || { iconColor: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', pillClasses: 'bg-slate-100 text-slate-700', label: 'ทั่วไป' };
};

const getAlertDetails = (alertType) => {
  const types = {
    ACCESS_DENIED: { icon: Shield, name: 'การเข้าถึงถูกปฏิเสธ' },
    UNUSUAL_TIME: { icon: Clock, name: 'เข้าถึงนอกเวลา' },
    MULTIPLE_ATTEMPTS: { icon: RefreshCw, name: 'พยายามหลายครั้ง' },
    PERMISSION_MISMATCH: { icon: AlertTriangle, name: 'สิทธิ์ไม่ตรงกัน' },
    SUSPICIOUS_ACTIVITY: { icon: Eye, name: 'พฤติกรรมน่าสงสัย' }
  };
  return types[alertType] || { icon: Bell, name: 'การแจ้งเตือนทั่วไป' };
};

// Database API service
class DatabaseService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.isConnected = false;
    this.lastError = null;
  }

  async testConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try multiple health check endpoints
      const healthEndpoints = [
        `${this.baseUrl}/health`,
        `${this.baseUrl}/status`,
        `${this.baseUrl}/ping`,
        `${this.baseUrl}`,
        `${this.baseUrl}/api/health`, // Sometimes the base URL might not include /api
        `${this.baseUrl.replace('/api', '')}/health`, // Try without /api prefix
      ];

      console.log('🔍 Testing database connection...');
      console.log('🌐 Base URL:', this.baseUrl);

      for (const endpoint of healthEndpoints) {
        try {
          console.log(`⚡ Trying health check: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log(`📡 Health check response: ${response.status} ${response.statusText}`);

          if (response.ok) {
            this.isConnected = true;
            this.lastError = null;
            console.log('✅ Database connection successful!');
            return true;
          } else if (response.status === 404) {
            console.warn(`❌ 404 Not Found: ${endpoint}`);
            continue;
          } else {
            console.warn(`⚠️ ${response.status}: ${endpoint}`);
            continue;
          }
        } catch (endpointError) {
          if (endpointError.name === 'AbortError') {
            console.warn('⏰ Health check timeout');
            break;
          }
          console.warn(`⚠️ Health check failed for ${endpoint}:`, endpointError.message);
          continue;
        }
      }

      throw new Error('All health check endpoints failed - server may be down or API URL is incorrect');
    } catch (error) {
      this.isConnected = false;
      this.lastError = error.message;
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async fetchAccessLogs(filters = {}) {
    try {
      // Clean and validate filters
      const cleanFilters = {};
      if (filters.startDate && typeof filters.startDate === 'string') cleanFilters.startDate = filters.startDate;
      if (filters.endDate && typeof filters.endDate === 'string') cleanFilters.endDate = filters.endDate;
      if (filters.location && typeof filters.location === 'string') cleanFilters.location = filters.location;
      if (filters.cardName && typeof filters.cardName === 'string') cleanFilters.cardName = filters.cardName;
      if (filters.limit && typeof filters.limit === 'number') cleanFilters.limit = filters.limit;
      if (filters.offset && typeof filters.offset === 'number') cleanFilters.offset = filters.offset;

      const queryParams = new URLSearchParams();
      Object.entries(cleanFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      // Try multiple possible endpoints
      const endpoints = [
        `${this.baseUrl}/logs`, // Try this first since it's getting 500 instead of 404
        `${this.baseUrl}/access-logs`,
        `${this.baseUrl}/access`,
        `${this.baseUrl}/entries`,
        `${this.baseUrl}/door-logs`,
        `${this.baseUrl}/security-logs`
      ];

      let lastError;
      for (const baseEndpoint of endpoints) {
        try {
          const url = `${baseEndpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
          console.log(`🔍 Trying endpoint: ${url}`);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });

          console.log(`📡 Response from ${baseEndpoint}: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            this.isConnected = true;
            this.lastError = null;

            console.log('✅ Successfully fetched data from:', baseEndpoint);
            console.log('📊 Data structure:', Object.keys(data));

            return {
              success: true,
              data: data.logs || data.entries || data.data || data.records || (Array.isArray(data) ? data : []),
              total: data.total || data.count || data.totalRecords || (Array.isArray(data) ? data.length : 0),
              suspicious: data.suspicious || data.suspicious_count || data.suspiciousCount || 0
            };
          } else if (response.status === 404) {
            console.warn(`❌ 404 Not Found: ${baseEndpoint}`);
            continue; // Try next endpoint
          } else if (response.status === 500) {
            const errorText = await response.text();
            console.error(`💥 500 Server Error from ${baseEndpoint}:`, errorText);
            lastError = new Error(`Server Error (${response.status}): ${errorText.substring(0, 200)}`);
            continue; // Try next endpoint, maybe server has this endpoint but with bugs
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Failed to fetch from ${baseEndpoint}:`, error.message);
          continue;
        }
      }

      throw lastError || new Error('All access log endpoints failed - please check your API server configuration');
    } catch (error) {
      this.isConnected = false;
      this.lastError = error.message;
      console.error('❌ Failed to fetch access logs:', error);

      return {
        success: false,
        data: [],
        total: 0,
        suspicious: 0,
        error: error.message
      };
    }
  }

  async fetchSuspiciousActivities(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.severity) queryParams.append('severity', filters.severity);
      if (filters.alertType) queryParams.append('alertType', filters.alertType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.location) queryParams.append('location', filters.location);

      const endpoints = [
        `${this.baseUrl}/suspicious-activities`,
        `${this.baseUrl}/suspicious`,
        `${this.baseUrl}/alerts`,
        `${this.baseUrl}/incidents`
      ];

      let lastError;
      for (const baseEndpoint of endpoints) {
        try {
          const url = `${baseEndpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });

          if (response.ok) {
            const data = await response.json();

            return {
              success: true,
              data: data.activities || data.alerts || data.incidents || data.data || [],
              total: data.total || data.count || 0
            };
          } else if (response.status === 404) {
            continue;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`Failed to fetch from ${baseEndpoint}:`, error.message);
          continue;
        }
      }

      throw lastError || new Error('All suspicious activities endpoints failed');
    } catch (error) {
      console.error('Failed to fetch suspicious activities:', error);

      return {
        success: false,
        data: [],
        total: 0,
        error: error.message
      };
    }
  }

  async fetchDashboardStats() {
    try {
      const endpoints = [
        `${this.baseUrl}/dashboard/stats`,
        `${this.baseUrl}/stats`,
        `${this.baseUrl}/dashboard`,
        `${this.baseUrl}/summary`
      ];

      let lastError;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });

          if (response.ok) {
            const data = await response.json();

            return {
              success: true,
              data: data.stats || data
            };
          } else if (response.status === 404) {
            continue;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`Failed to fetch from ${endpoint}:`, error.message);
          continue;
        }
      }

      throw lastError || new Error('All dashboard stats endpoints failed');
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);

      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  // Mock data generator for fallback
  generateMockData() {
    const locations = ['ประตูหลัก', 'ห้องเซิร์ฟเวอร์', 'ห้องประชุม A', 'ห้องเก็บเอกสาร', 'โซนจอดรถ'];
    const users = ['นายสมชาย ใจดี', 'นางสาวมานี รักงาน', 'นายประเสริฐ ขยัน', 'นางวิไล สุภาพ', 'นายธนา เก่ง'];
    const reasons = ['บัตรหมดอายุ', 'บัตรไม่ถูกต้อง', 'ไม่มีสิทธิ์เข้าถึง', 'เข้าถึงนอกเวลาทำงาน'];

    const mockLogs = [];
    const mockAlerts = [];
    const now = new Date();

    // Generate 50 mock log entries
    for (let i = 0; i < 50; i++) {
      const isAllowed = Math.random() > 0.3;
      const randomHours = Math.floor(Math.random() * 24);
      const dateTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      dateTime.setHours(randomHours);

      const log = {
        id: i + 1,
        cardName: users[Math.floor(Math.random() * users.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        dateTime: dateTime.toISOString(),
        allow: isAllowed,
        reason: isAllowed ? '' : reasons[Math.floor(Math.random() * reasons.length)]
      };

      mockLogs.push(log);

      // Generate alerts for suspicious activities
      if (!isAllowed || randomHours < 6 || randomHours > 22) {
        mockAlerts.push({
          id: mockAlerts.length + 1,
          alertType: !isAllowed ? 'ACCESS_DENIED' : 'UNUSUAL_TIME',
          severity: randomHours < 2 || randomHours > 23 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
          cardName: log.cardName,
          location: log.location,
          accessTime: log.dateTime,
          reason: log.reason || `เข้าถึงนอกเวลา (${randomHours}:00)`,
          suspiciousScore: Math.floor(Math.random() * 100)
        });
      }
    }

    return {
      logs: mockLogs,
      alerts: mockAlerts,
      total: mockLogs.length,
      suspicious: mockAlerts.length,
      stats: {
        previousHighAlerts: 12,
        previousAccessDenied: 8,
        previousSuspicious: 25,
        previousCompliance: 94
      }
    };
  }
}

// KPI Card Component
const KPICard = ({ icon: Icon, title, value, previousValue, unit = '', colorClass, description, onClick, isSelected }) => {
  const change = previousValue ? ((value - previousValue) / previousValue * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:ring-1 hover:ring-blue-300'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass.bgColor}`}>
          <Icon className={`w-6 h-6 ${colorClass.iconColor}`} />
        </div>
        {previousValue && (
          <div className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${isPositive ? 'rotate-0' : 'rotate-180'}`} />
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
        <p className={`text-3xl font-bold ${colorClass.iconColor} mb-1`}>
          {value.toLocaleString()}{unit}
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
};

// Database Status Component
const DatabaseStatus = ({ isConnected, lastSync, totalRecords, error }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <Database className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">
            {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่สามารถเชื่อมต่อ'}
          </span>
        </div>
        {lastSync && (
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">
              อัปเดต: {lastSync}
            </span>
          </div>
        )}
        <div className="text-slate-600">
          รวม: {totalRecords.toLocaleString()} รายการ
        </div>
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Connection Error Component
const ConnectionError = ({ error, onRetry, onUseMockData }) => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 m-6">
      <div className="flex items-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
        <h3 className="text-lg font-bold text-red-800">ไม่สามารถเชื่อมต่อ API Server</h3>
      </div>
      <p className="text-red-700 mb-4">{error}</p>

      <div className="bg-red-100 p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-red-800 mb-2">🔍 ปัญหาที่พบ:</h4>
        <div className="space-y-2 text-sm text-red-700">
          {error.includes('404') && (
            <>
              <p>• <strong>404 Not Found:</strong> API endpoints ไม่มีอยู่จริง</p>
              <p>• Server อาจไม่มี endpoints เหล่านี้: <code>/api/logs</code>, <code>/api/access-logs</code></p>
            </>
          )}
          {error.includes('500') && (
            <>
              <p>• <strong>500 Internal Server Error:</strong> เซิร์ฟเวอร์มีข้อผิดพลาด</p>
              <p>• อาจมีปัญหาในการ parse URL parameters</p>
              <p>• ตรวจสอบ server logs สำหรับรายละเอียด</p>
            </>
          )}
          {error.includes('Failed to fetch') && (
            <>
              <p>• <strong>Network Error:</strong> ไม่สามารถเชื่อมต่อ server</p>
              <p>• Server อาจไม่ทำงานที่ <code>{apiUrl}</code></p>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-100 p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-blue-800 mb-2">🛠️ วิธีแก้ไข:</h4>
        <div className="space-y-2 text-sm text-blue-700">
          <p><strong>1. ตรวจสอบ Server:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>เปิด browser ไปที่ <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="underline">{apiUrl}</a></li>
            <li>ตรวจสอบว่า server ทำงานอยู่หรือไม่</li>
            <li>ดู server console logs หา errors</li>
          </ul>

          <p><strong>2. ตรวจสอบ API Endpoints:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>ลอง <code>GET {apiUrl}/health</code></li>
            <li>ลอง <code>GET {apiUrl}/logs</code></li>
            <li>ตรวจสอบว่า endpoints มีอยู่จริงใน server</li>
          </ul>

          <p><strong>3. ตรวจสอบ CORS:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>เพิ่ม CORS headers ใน server</li>
            <li>อนุญาต origin: <code>http://localhost:5173</code></li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={onRetry}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          ลองเชื่อมต่อใหม่
        </button>
        <button
          onClick={onUseMockData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          ใช้ข้อมูลจำลอง
        </button>
      </div>

      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-green-800">
          <strong>💡 เคล็ดลับ:</strong> ใช้ข้อมูลจำลองเพื่อดู Dashboard ทำงานขณะที่แก้ไขปัญหา server
        </p>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">
          🔧 Debug Information
        </summary>
        <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
          <p><strong>API URL:</strong> {apiUrl}</p>
          <p><strong>Error:</strong> {error}</p>
          <p><strong>Browser:</strong> {navigator.userAgent.substring(0, 50)}...</p>
          <p><strong>Time:</strong> {new Date().toISOString()}</p>
        </div>
      </details>
    </div>
  );
};

// Trend Analysis Component
const TrendAnalysis = ({ alerts, onHourClick }) => {
  const hourlyData = useMemo(() => {
    const data = Array(24).fill(0);
    alerts.forEach(alert => {
      const hour = new Date(alert.accessTime || alert.dateTime).getHours();
      data[hour]++;
    });
    return data.map((count, hour) => ({ hour, count }));
  }, [alerts]);

  const maxCount = Math.max(...hourlyData.map(d => d.count));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="text-lg font-bold text-slate-800 mb-4">แนวโน้มความน่าสงสัยตาม 24 ชั่วโมง</h3>
      <div className="flex items-end space-x-1 h-32">
        {hourlyData.map(({ hour, count }) => (
          <div key={hour} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-red-500 rounded-t-sm transition-all hover:bg-red-600 cursor-pointer"
              style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '2px' }}
              title={`${hour}:00 - ${count} เหตุการณ์น่าสงสัย`}
              onClick={() => onHourClick && onHourClick(hour)}
            ></div>
            {hour % 4 === 0 && (
              <div className="text-xs text-slate-500 mt-1">{hour}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert }) => {
  const severity = getSeverityDetails(alert.severity);
  const details = getAlertDetails(alert.alertType || alert.alert_type);
  const Icon = details.icon;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4"
      style={{ borderLeftColor: severity.iconColor.includes('red') ? '#ef4444' : severity.iconColor.includes('amber') ? '#f59e0b' : '#3b82f6' }}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${severity.bgColor}`}>
          <Icon className={`w-4 h-4 ${severity.iconColor}`} />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-800">{details.name}</span>
              <span className={`px-2 py-1 text-xs rounded ${severity.pillClasses}`}>{severity.label}</span>
            </div>
            <span className="text-xs text-slate-500">
              {new Date(alert.accessTime || alert.dateTime || alert.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2">"{alert.reason || alert.description}"</p>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 text-blue-500" />
              <span>{alert.cardName || alert.card_name || alert.user_name || 'ไม่ระบุ'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-green-500" />
              <span>{alert.location || alert.door || 'ไม่ระบุ'}</span>
            </div>
            {(alert.suspiciousScore || alert.suspicious_score || alert.risk_score) && (
              <div className="flex items-center space-x-1">
                <Eye className="w-3 h-3 text-orange-500" />
                <span>ความน่าสงสัย: {alert.suspiciousScore || alert.suspicious_score || alert.risk_score}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const SecurityDashboard = () => {
  const [logData, setLogData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedKPI, setSelectedKPI] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dbService] = useState(() => new DatabaseService());
  const [totalSuspiciousCount, setTotalSuspiciousCount] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({});
  const [connectionError, setConnectionError] = useState(null);

  // Load data from real database
  const loadDataFromDB = async (useMockData = false) => {
    setLoading(true);
    setConnectionError(null);

    try {
      if (useMockData) {
        // Use mock data for demonstration
        console.log('🔄 Using mock data for demonstration...');
        const mockData = dbService.generateMockData();

        setLogData(mockData.logs);
        setTotalSuspiciousCount(mockData.suspicious);
        setDashboardStats(mockData.stats);
        setUniqueLocations([...new Set(mockData.logs.map(log => log.location))]);
        setAlerts(mockData.alerts);
        setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
        setLoading(false);
        return;
      }

      // Test database connection first
      const isConnected = await dbService.testConnection();
      if (!isConnected) {
        throw new Error(dbService.lastError || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
      }

      // Prepare filters
      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (filterLocation !== 'all') filters.location = filterLocation;
      if (searchTerm) filters.cardName = searchTerm;

      // Fetch data concurrently with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );

      const [logsResult, suspiciousResult, statsResult] = await Promise.race([
        Promise.all([
          dbService.fetchAccessLogs(filters),
          dbService.fetchSuspiciousActivities(filters),
          dbService.fetchDashboardStats()
        ]),
        timeoutPromise
      ]);

      // Debug: Log the raw data structure
      console.log('🔍 Debug - Raw data received:');
      console.log('📊 Logs result:', logsResult);
      console.log('🚨 Suspicious result:', suspiciousResult);
      console.log('📈 Stats result:', statsResult);

      // Check for errors and provide fallbacks
      if (!logsResult.success) {
        console.warn('⚠️ Access logs failed, trying mock data fallback');
        if (logsResult.error?.includes('404') || logsResult.error?.includes('500')) {
          // Provide option to use mock data
          setConnectionError(`${logsResult.error} - คลิก "ใช้ข้อมูลจำลอง" เพื่อดูตัวอย่าง Dashboard`);
          setLoading(false);
          return;
        }
        throw new Error(logsResult.error || 'ไม่สามารถดึงข้อมูลล็อกได้');
      }

      // Process the logs data
      const processedLogs = logsResult.data || [];
      console.log('📋 Processed logs count:', processedLogs.length);
      console.log('📋 Sample log entry:', processedLogs[0]);

      // Handle partial failures gracefully
      let processedSuspiciousData = [];
      let suspiciousCount = 0;

      if (suspiciousResult.success) {
        processedSuspiciousData = suspiciousResult.data || [];
        suspiciousCount = suspiciousResult.total || processedSuspiciousData.length;
      } else {
        console.warn('⚠️ Suspicious activities API failed, generating from logs');
        // Generate suspicious activities from logs if API failed
        const generatedSuspicious = generateSuspiciousFromLogs(processedLogs);
        processedSuspiciousData = generatedSuspicious.alerts;
        suspiciousCount = generatedSuspicious.count;
      }

      const processedStatsData = statsResult.success ? statsResult.data : {};

      if (!suspiciousResult.success) {
        console.warn('⚠️ Suspicious activities API failed:', suspiciousResult.error);
      }

      if (!statsResult.success) {
        console.warn('⚠️ Dashboard stats API failed:', statsResult.error);
      }

      // Process data
      setLogData(processedLogs);
      setTotalSuspiciousCount(logsResult.suspicious || suspiciousCount || 0);
      setDashboardStats(processedStatsData || {});

      // Extract unique locations
      const locations = [...new Set(processedLogs.map(log =>
        log.location || log.door || log.gate || log.access_point || 'ไม่ระบุ'
      ).filter(Boolean))];
      setUniqueLocations(locations.sort());

      // Process suspicious activities into alerts
      const processedAlerts = processedSuspiciousData.map((activity, index) => ({
        id: activity.id || index + 1,
        alertType: activity.alert_type || activity.alertType || activity.type || 'SUSPICIOUS_ACTIVITY',
        severity: activity.severity || activity.level || activity.priority || 'medium',
        cardName: activity.card_name || activity.cardName || activity.user_name || activity.userName || activity.user || 'ไม่ระบุ',
        location: activity.location || activity.door || activity.gate || activity.access_point || 'ไม่ระบุ',
        accessTime: activity.created_at || activity.dateTime || activity.access_time || activity.timestamp || activity.time,
        reason: activity.description || activity.reason || activity.message || activity.details || 'ตรวจพบกิจกรรมน่าสงสัย',
        userType: activity.user_type || activity.userType || activity.type || 'ไม่ระบุ',
        suspiciousScore: activity.risk_score || activity.suspicious_score || activity.suspiciousScore || activity.score
      }));

      setAlerts(processedAlerts);
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));

      console.log('✅ Data processed successfully:');
      console.log('📊 Total logs:', processedLogs.length);
      console.log('🚨 Total suspicious:', suspiciousCount);
      console.log('⚠️ Total alerts:', processedAlerts.length);
      console.log('📍 Locations:', locations);

    } catch (error) {
      console.error('❌ Database error:', error);
      setConnectionError(error.message);
      setLogData([]);
      setAlerts([]);
      setTotalSuspiciousCount(0);
    }

    setLoading(false);
  };

  // Generate suspicious activities from logs if API doesn't provide them
  const generateSuspiciousFromLogs = (logs) => {
    const alerts = [];
    let suspiciousCount = 0;

    logs.forEach((log, index) => {
      let isSuspicious = false;
      let alertType = 'SUSPICIOUS_ACTIVITY';
      let severity = 'low';
      let reason = '';

      // Check for access denied
      if (log.allow === false || log.allow === 0 || log.status === 'denied' || log.access === false) {
        isSuspicious = true;
        alertType = 'ACCESS_DENIED';
        severity = 'high';
        reason = log.reason || 'การเข้าถึงถูกปฏิเสธ';
      }
      // Check for unusual time access
      else if (log.dateTime || log.timestamp || log.time) {
        const timeStr = log.dateTime || log.timestamp || log.time;
        const accessTime = new Date(timeStr);
        const hour = accessTime.getHours();

        if (hour < 6 || hour > 22) {
          isSuspicious = true;
          alertType = 'UNUSUAL_TIME';
          severity = hour < 4 || hour > 23 ? 'high' : 'medium';
          reason = `เข้าถึงนอกเวลาทำงาน (${hour.toString().padStart(2, '0')}:00)`;
        }
      }
      // Check for specific reason indicating problems
      else if (log.reason && (
        log.reason.includes('หมดอายุ') ||
        log.reason.includes('ไม่ถูกต้อง') ||
        log.reason.includes('ไม่มีสิทธิ์') ||
        log.reason.includes('invalid') ||
        log.reason.includes('expired')
      )) {
        isSuspicious = true;
        alertType = 'ACCESS_DENIED';
        severity = 'medium';
        reason = log.reason;
      }

      if (isSuspicious) {
        suspiciousCount++;
        alerts.push({
          id: alerts.length + 1,
          alertType: alertType,
          severity: severity,
          cardName: log.cardName || log.card_name || log.user_name || log.userName || log.user || 'ไม่ระบุ',
          location: log.location || log.door || log.gate || log.access_point || 'ไม่ระบุ',
          accessTime: log.dateTime || log.timestamp || log.time || new Date().toISOString(),
          reason: reason,
          userType: log.userType || log.user_type || 'ไม่ระบุ',
          suspiciousScore: Math.floor(Math.random() * 100)
        });
      }
    });

    console.log('🔍 Generated suspicious activities from logs:');
    console.log(`🚨 Found ${suspiciousCount} suspicious activities out of ${logs.length} logs`);
    console.log('⚠️ Sample suspicious activity:', alerts[0]);

    return { alerts, count: suspiciousCount };
  };

const handleUseMockData = () => {
  loadDataFromDB(true);
};

// Export functions
const generateCSVReport = (data, totalSuspicious) => {
  const now = new Date();
  let csvContent = `รายงานภาพรวมความปลอดภัย\n`;
  csvContent += `สร้างเมื่อ: ${now.toLocaleString('th-TH')}\n`;
  csvContent += `จำนวนความน่าสงสัยทั้งหมด: ${totalSuspicious} รายการ\n`;
  csvContent += `จำนวนรายการในรายงาน: ${data.length} รายการ\n\n`;

  csvContent += `สรุปผู้บริหาร\n`;
  csvContent += `การแจ้งเตือนระดับสูง: ${data.filter(a => a.severity === 'high').length}\n`;
  csvContent += `การแจ้งเตือนระดับกลาง: ${data.filter(a => a.severity === 'medium').length}\n`;
  csvContent += `การแจ้งเตือนระดับต่ำ: ${data.filter(a => a.severity === 'low').length}\n`;
  csvContent += `อัตราปฏิบัติตามนโยบาย: ${((logData.length - totalSuspicious) / logData.length * 100).toFixed(1)}%\n\n`;

  const locationStats = {};
  data.forEach(alert => {
    if (!locationStats[alert.location]) {
      locationStats[alert.location] = { high: 0, medium: 0, low: 0, total: 0 };
    }
    locationStats[alert.location][alert.severity]++;
    locationStats[alert.location].total++;
  });

  csvContent += `การวิเคราะห์ตามสถานที่\n`;
  csvContent += `สถานที่,รวม,สูง,กลาง,ต่ำ\n`;
  Object.entries(locationStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([location, stats]) => {
      csvContent += `${location},${stats.total},${stats.high},${stats.medium},${stats.low}\n`;
    });

  csvContent += `\nรายละเอียดความน่าสงสัย\n`;
  csvContent += `ลำดับ,วันที่,เวลา,ประเภท,ระดับ,ผู้ใช้,สถานที่,รายละเอียด,คะแนนความน่าสงสัย\n`;

  data.forEach((alert, index) => {
    const accessDate = new Date(alert.accessTime);
    const row = [
      index + 1,
      accessDate.toLocaleDateString('th-TH'),
      accessDate.toLocaleTimeString('th-TH'),
      getAlertDetails(alert.alertType).name,
      getSeverityDetails(alert.severity).label,
      alert.cardName,
      alert.location,
      `"${alert.reason}"`,
      alert.suspiciousScore || 'N/A'
    ].join(',');
    csvContent += row + '\n';
  });

  return csvContent;
};

const downloadCSV = (csvContent) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `รายงานความปลอดภัย_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Interactive handlers
const handleKPIClick = (type) => {
  if (selectedKPI === type) {
    setSelectedKPI('all');
    setFilterSeverity('all');
  } else {
    setSelectedKPI(type);
    if (type === 'high') {
      setFilterSeverity('high');
    } else if (type === 'access_denied') {
      setFilterSeverity('all');
    } else if (type === 'unusual_time') {
      setFilterSeverity('all');
    } else if (type === 'compliance') {
      setFilterSeverity('all');
    }
  }
};

const handleLocationClick = (location) => {
  setFilterLocation(location);
  setSearchTerm('');
  loadDataFromDB(); // Reload with new filter
};

const handleSeverityClick = (severity) => {
  setFilterSeverity(severity);
  setSelectedKPI('all');
};

const handleHourClick = (hour) => {
  setSearchTerm(`${hour.toString().padStart(2, '0')}:00`);
};

const clearFilters = () => {
  setSearchTerm('');
  setFilterSeverity('all');
  setFilterLocation('all');
  setSelectedKPI('all');
  setStartDate('');
  setEndDate('');
  loadDataFromDB();
};

const refreshData = () => {
  loadDataFromDB();
};

// Initial data load
useEffect(() => {
  loadDataFromDB();
}, []);

// Reload data when filters change
useEffect(() => {
  if (startDate || endDate) {
    const timeoutId = setTimeout(() => {
      loadDataFromDB();
    }, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }
}, [startDate, endDate]);

// Filter alerts (client-side filtering for better responsiveness)
const filteredAlerts = useMemo(() => {
  return alerts.filter(alert => {
    const matchesSearch = !searchTerm ||
      (alert.cardName && alert.cardName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.location && alert.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.reason && alert.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      new Date(alert.accessTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }).includes(searchTerm);

    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesLocation = filterLocation === 'all' || alert.location === filterLocation;

    let matchesKPI = true;
    if (selectedKPI === 'high') {
      matchesKPI = alert.severity === 'high';
    } else if (selectedKPI === 'access_denied') {
      matchesKPI = alert.alertType === 'ACCESS_DENIED';
    } else if (selectedKPI === 'unusual_time') {
      matchesKPI = alert.alertType === 'UNUSUAL_TIME';
    } else if (selectedKPI === 'compliance') {
      matchesKPI = alert.severity !== 'high';
    }

    return matchesSearch && matchesSeverity && matchesLocation && matchesKPI;
  });
}, [alerts, searchTerm, filterSeverity, filterLocation, selectedKPI]);

if (connectionError) {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <ConnectionError
          error={connectionError}
          onRetry={loadDataFromDB}
          onUseMockData={handleUseMockData}
        />
      </div>
    </div>
  );
}

if (loading) {
  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-20 bg-slate-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
          </div>
        </div>
        <div className="text-center mt-8">
          <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">กำลังโหลดข้อมูลจากฐานข้อมูล...</p>
        </div>
      </div>
    </div>
  );
}

const displayedAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 8);

return (
  <div className="bg-slate-50 min-h-screen">
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  Executive Security Dashboard
                </h1>
                <p className="text-slate-600 flex items-center mt-1">
                  <Building2 className="w-4 h-4 mr-2" />
                  ระบบภาพรวมความปลอดภัยระดับผู้บริหาร
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <RefreshCw className="w-5 h-5 mr-2" />รีเฟรช
              </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <DatabaseStatus
              isConnected={dbService.isConnected}
              lastSync={lastUpdated}
              totalRecords={logData.length}
              error={dbService.lastError}
            />
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard
          icon={AlertTriangle}
          title="เหตุการณ์วิกฤต"
          value={alerts.filter(a => a.severity === 'high').length}
          previousValue={dashboardStats.previousHighAlerts || 0}
          colorClass={getSeverityDetails('high')}
          description="ต้องการการตรวจสอบเร่งด่วน"
          onClick={() => handleKPIClick('high')}
          isSelected={selectedKPI === 'high'}
        />
        <KPICard
          icon={Shield}
          title="การละเมิดความปลอดภัย"
          value={alerts.filter(a => a.alertType === 'ACCESS_DENIED').length}
          previousValue={dashboardStats.previousAccessDenied || 0}
          colorClass={getSeverityDetails('medium')}
          description="การเข้าถึงที่ไม่ได้รับอนุญาต"
          onClick={() => handleKPIClick('access_denied')}
          isSelected={selectedKPI === 'access_denied'}
        />
        <KPICard
          icon={Eye}
          title="ความน่าสงสัยทั้งหมด"
          value={totalSuspiciousCount}
          previousValue={dashboardStats.previousSuspicious || 0}
          colorClass={getSeverityDetails('medium')}
          description="เหตุการณ์ที่ต้องติดตามและตรวจสอบ"
          onClick={() => handleKPIClick('suspicious')}
          isSelected={selectedKPI === 'suspicious'}
        />
        <KPICard
          icon={TrendingUp}
          title="อัตราปฏิบัติตามนโยบาย"
          value={logData.length > 0 ? Math.round((logData.length - totalSuspiciousCount) / logData.length * 100) : 100}
          previousValue={dashboardStats.previousCompliance || 94}
          unit="%"
          colorClass={getSeverityDetails('default')}
          description="เปอร์เซ็นต์การเข้าถึงที่ถูกต้อง"
          onClick={() => handleKPIClick('compliance')}
          isSelected={selectedKPI === 'compliance'}
        />
      </section>

      {/* Analytics Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendAnalysis alerts={filteredAlerts} onHourClick={handleHourClick} />
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold text-slate-800 mb-4">เมทริกซ์ความเสี่ยงตามสถานที่</h3>
          <div className="grid gap-2">
            <div className="grid grid-cols-4 gap-2 text-sm font-medium text-slate-600">
              <div>สถานที่</div>
              <div className="text-center cursor-pointer hover:text-red-600" onClick={() => handleSeverityClick('high')}>สูง</div>
              <div className="text-center cursor-pointer hover:text-amber-600" onClick={() => handleSeverityClick('medium')}>กลาง</div>
              <div className="text-center cursor-pointer hover:text-blue-600" onClick={() => handleSeverityClick('low')}>ต่ำ</div>
            </div>
            {uniqueLocations.slice(0, 5).map(location => {
              const locationAlerts = alerts.filter(a => a.location === location);
              const highCount = locationAlerts.filter(a => a.severity === 'high').length;
              const mediumCount = locationAlerts.filter(a => a.severity === 'medium').length;
              const lowCount = locationAlerts.filter(a => a.severity === 'low').length;

              return (
                <div key={location} className="grid grid-cols-4 gap-2 text-sm">
                  <div
                    className="truncate font-medium cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => handleLocationClick(location)}
                  >
                    {location}
                  </div>
                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${highCount > 0 ? 'bg-red-100 text-red-700 hover:opacity-80' : 'bg-slate-100 text-slate-400'
                        }`}
                      onClick={() => highCount > 0 && handleSeverityClick('high')}
                    >
                      {highCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${mediumCount > 0 ? 'bg-amber-100 text-amber-700 hover:opacity-80' : 'bg-slate-100 text-slate-400'
                        }`}
                      onClick={() => mediumCount > 0 && handleSeverityClick('medium')}
                    >
                      {mediumCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${lowCount > 0 ? 'bg-blue-100 text-blue-700 hover:opacity-80' : 'bg-slate-100 text-slate-400'
                        }`}
                      onClick={() => lowCount > 0 && handleSeverityClick('low')}
                    >
                      {lowCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Export Section */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">ส่งออกรายงาน</h3>
              <button
                onClick={() => {
                  const csvContent = generateCSVReport(alerts, totalSuspiciousCount);
                  downloadCSV(csvContent);
                }}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5 mr-2" />
                ส่งออก CSV
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium text-blue-800">รายงานทั้งหมด</p>
                <p className="text-blue-600">{alerts.length} รายการ</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="font-medium text-red-800">ระดับวิกฤต</p>
                <p className="text-red-600">{alerts.filter(a => a.severity === 'high').length} รายการ</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-green-800">ปฏิบัติตามนโยบาย</p>
                <p className="text-green-600">
                  {logData.length > 0 ? Math.round((logData.length - totalSuspiciousCount) / logData.length * 100) : 100}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">การแจ้งเตือนและรายงาน</h3>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                {totalSuspiciousCount} ความน่าสงสัยทั้งหมด
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {filteredAlerts.length} รายการแสดง
              </span>
              {filteredAlerts.length > 8 && (
                <button
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {showAllAlerts ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      ย่อ
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      ทั้งหมด
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้, สถานที่, รายละเอียด..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[280px]"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">ทุกระดับความรุนแรง</option>
              <option value="high">ระดับสูง</option>
              <option value="medium">ระดับปานกลาง</option>
              <option value="low">ระดับต่ำ</option>
            </select>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">ทุกสถานที่</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="วันที่เริ่มต้น"
              />
              <span className="text-slate-500 text-sm">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="วันที่สิ้นสุด"
              />
            </div>
            {(searchTerm || filterSeverity !== 'all' || filterLocation !== 'all' || selectedKPI !== 'all' || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            {totalSuspiciousCount === 0 ? 'ระบบปลอดภัย' : 'ไม่พบรายการตามเงื่อนไข'}
          </h2>
          <p className="text-slate-600 mb-6">
            {totalSuspiciousCount === 0 ? 'ไม่พบความน่าสงสัยในระบบในขณะนี้' : 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง'}
          </p>
          {totalSuspiciousCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      ) : (
        <main>
          {/* Alerts List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {displayedAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>

          {/* Critical Alert Banner */}
          {alerts.filter(a => a.severity === 'high').length > 5 && (
            <div className="mt-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <h4 className="font-bold text-red-800">การแจ้งเตือนสำคัญ</h4>
                  <p className="text-sm text-red-700 mt-1">
                    ตรวจพบเหตุการณ์ความปลอดภัยระดับสูงจำนวนมาก ({alerts.filter(a => a.severity === 'high').length} รายการ)
                    จากความน่าสงสัยทั้งหมด {totalSuspiciousCount} รายการ
                    แนะนำให้ทบทวนนโยบายความปลอดภัยและติดตามอย่างใกล้ชิด
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h4 className="font-bold text-blue-800">สรุปภาพรวมจากฐานข้อมูล</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalSuspiciousCount}</p>
                <p className="text-sm text-blue-700">ความน่าสงสัยทั้งหมด</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.severity === 'high').length}</p>
                <p className="text-sm text-red-700">ระดับวิกฤต</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{alerts.filter(a => a.severity === 'medium').length}</p>
                <p className="text-sm text-amber-700">ระดับปานกลาง</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {logData.length > 0 ? Math.round((logData.length - totalSuspiciousCount) / logData.length * 100) : 100}%
                </p>
                <p className="text-sm text-green-700">อัตราปฏิบัติตามนโยบาย</p>
              </div>
            </div>
            {dbService.isConnected && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm text-blue-600">
                  <span>ข้อมูลจากฐานข้อมูล: {logData.length.toLocaleString()} รายการ</span>
                  <span>อัปเดตล่าสุด: {lastUpdated}</span>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* API Configuration Help */}
      {!dbService.isConnected && alerts.length === 0 && (
        <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
            <h4 className="font-bold text-yellow-800">การตั้งค่า API สำหรับการใช้งานจริง</h4>
          </div>
          <div className="text-sm text-yellow-700 space-y-3">
            <div>
              <p><strong>🔧 API Endpoints ที่ต้องการ:</strong></p>
              <div className="bg-yellow-100 p-3 rounded mt-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><code>GET /api/health</code> หรือ <code>/api/status</code> - ตรวจสอบสถานะระบบ</li>
                  <li><code>GET /api/access-logs</code> หรือ <code>/api/logs</code> - ดึงข้อมูลล็อกการเข้าถึง</li>
                  <li><code>GET /api/suspicious-activities</code> หรือ <code>/api/alerts</code> - ดึงข้อมูลกิจกรรมน่าสงสัย</li>
                  <li><code>GET /api/dashboard/stats</code> หรือ <code>/api/stats</code> - ดึงสถิติสำหรับแดชบอร์ด</li>
                </ul>
              </div>
            </div>

            <div>
              <p><strong>⚙️ Environment Variables:</strong></p>
              <div className="bg-yellow-100 p-3 rounded mt-2">
                <code>REACT_APP_API_URL={process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}</code>
              </div>
            </div>

            <div>
              <p><strong>📝 ตัวอย่างโครงสร้างข้อมูลที่ API ควรส่งกลับ:</strong></p>
              <div className="bg-yellow-100 p-3 rounded mt-2 text-xs">
                <pre>{`// GET /api/access-logs
{
  "logs": [...],
  "total": 1000,
  "suspicious": 85
}

// GET /api/suspicious-activities
{
  "activities": [...],
  "total": 85
}

// GET /api/dashboard/stats
{
  "previousHighAlerts": 12,
  "previousAccessDenied": 8,
  "previousSuspicious": 25,
  "previousCompliance": 94
}`}</pre>
              </div>
            </div>

            <div>
              <p><strong>🚀 หากต้องการทดสอบ Dashboard:</strong></p>
              <button
                onClick={handleUseMockData}
                className="mt-2 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                ใช้ข้อมูลจำลองเพื่อทดสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      {alerts.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {dbService.isConnected ? '🟢 ข้อมูลจากฐานข้อมูลจริง' : '🔵 ข้อมูลจำลองสำหรับทดสอบ'}
              </span>
            </div>
            {!dbService.isConnected && (
              <button
                onClick={() => loadDataFromDB(false)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ลองเชื่อมต่อฐานข้อมูลอีกครั้ง
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>Executive Security Dashboard • เชื่อมต่อกับฐานข้อมูลจริง • ระบบแจ้งเตือนอัตโนมัติ</p>
      </footer>
    </div>
  </div>
);
};

export default SecurityDashboard;