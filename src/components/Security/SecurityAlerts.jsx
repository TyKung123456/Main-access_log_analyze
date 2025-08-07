import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Shield, MapPin, Activity, RefreshCw, CheckCircle2, Download, Search, Filter, TrendingUp, Eye, ChevronDown, ChevronUp, Bell, Users, Calendar, BarChart3, Target, Building2, X } from 'lucide-react';

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
    PERMISSION_MISMATCH: { icon: AlertTriangle, name: 'สิทธิ์ไม่ตรงกัน' }
  };
  return types[alertType] || { icon: Bell, name: 'การแจ้งเตือนทั่วไป' };
};

// KPI Card Component - Interactive
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

// Trend Analysis Component - Interactive
const TrendAnalysis = ({ alerts, onHourClick }) => {
  const hourlyData = useMemo(() => {
    const data = Array(24).fill(0);
    alerts.forEach(alert => {
      const hour = new Date(alert.accessTime).getHours();
      data[hour]++;
    });
    return data.map((count, hour) => ({ hour, count }));
  }, [alerts]);

  const maxCount = Math.max(...hourlyData.map(d => d.count));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="text-lg font-bold text-slate-800 mb-4">แนวโน้มการแจ้งเตือนตาม 24 ชั่วโมง</h3>
      <div className="flex items-end space-x-1 h-32">
        {hourlyData.map(({ hour, count }) => (
          <div key={hour} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600 cursor-pointer"
              style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '2px' }}
              title={`${hour}:00 - ${count} การแจ้งเตือน`}
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

// Risk Matrix Component - Interactive
const RiskMatrix = ({ alerts, onLocationClick, onSeverityClick }) => {
  const riskData = useMemo(() => {
    const matrix = {};
    alerts.forEach(alert => {
      const key = `${alert.location}-${alert.severity}`;
      if (!matrix[key]) {
        matrix[key] = { location: alert.location, severity: alert.severity, count: 0 };
      }
      matrix[key].count++;
    });
    return Object.values(matrix);
  }, [alerts]);

  const locations = [...new Set(riskData.map(d => d.location))].slice(0, 5);
  const severities = ['high', 'medium', 'low'];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="text-lg font-bold text-slate-800 mb-4">เมทริกซ์ความเสี่ยงตามสถานที่</h3>
      <div className="grid gap-2">
        <div className="grid grid-cols-4 gap-2 text-sm font-medium text-slate-600">
          <div>สถานที่</div>
          <div className="text-center cursor-pointer hover:text-red-600" onClick={() => onSeverityClick && onSeverityClick('high')}>สูง</div>
          <div className="text-center cursor-pointer hover:text-amber-600" onClick={() => onSeverityClick && onSeverityClick('medium')}>กลาง</div>
          <div className="text-center cursor-pointer hover:text-blue-600" onClick={() => onSeverityClick && onSeverityClick('low')}>ต่ำ</div>
        </div>
        {locations.map(location => (
          <div key={location} className="grid grid-cols-4 gap-2 text-sm">
            <div
              className="truncate font-medium cursor-pointer hover:text-blue-600 hover:underline"
              onClick={() => onLocationClick && onLocationClick(location)}
            >
              {location}
            </div>
            {severities.map(severity => {
              const item = riskData.find(d => d.location === location && d.severity === severity);
              const count = item ? item.count : 0;
              const colorClass = getSeverityDetails(severity);
              return (
                <div key={severity} className="text-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all ${count > 0 ? colorClass.pillClasses + ' hover:opacity-80' : 'bg-slate-100 text-slate-400'}`}
                    onClick={() => count > 0 && onSeverityClick && onSeverityClick(severity)}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Export Modal Component
const ExportModal = ({ isOpen, onClose, onExport, filteredCount }) => {
  if (!isOpen) return null;

  const exportOptions = [
    { key: 'daily', label: 'รายงานรายวัน', desc: 'ข้อมูล 24 ชั่วโมงล่าสุด', icon: Clock },
    { key: 'weekly', label: 'รายงานรายสัปดาห์', desc: 'ข้อมูล 7 วันล่าสุด', icon: Calendar },
    { key: 'monthly', label: 'รายงานรายเดือน', desc: 'ข้อมูล 30 วันล่าสุด', icon: BarChart3 },
    { key: 'quarterly', label: 'รายงานรายไตรมาส', desc: 'ข้อมูล 90 วันล่าสุด', icon: TrendingUp },
    { key: 'all', label: 'รายงานทั้งหมด', desc: 'ข้อมูลทั้งหมดในระบบ', icon: Target },
    { key: 'filtered', label: 'รายงานตามตัวกรอง', desc: `ข้อมูลที่แสดงอยู่ (${filteredCount} รายการ)`, icon: Filter }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold text-slate-800">ส่งออกรายงาน</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-600 mb-6">เลือกประเภทรายงานที่ต้องการส่งออก</p>
          <div className="space-y-3">
            {exportOptions.map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onExport(key)}
                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border hover:border-blue-300"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{label}</p>
                    <p className="text-sm text-slate-600">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert }) => {
  const severity = getSeverityDetails(alert.severity);
  const details = getAlertDetails(alert.alertType);
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
              {new Date(alert.accessTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2">"{alert.reason}"</p>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 text-blue-500" />
              <span>{alert.cardName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-green-500" />
              <span>{alert.location}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const SecurityDashboard = ({ logData = [] }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [selectedStatCard, setSelectedStatCard] = useState('all');
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedKPI, setSelectedKPI] = useState('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interactive handlers
  const handleKPIClick = (type) => {
    if (selectedKPI === type) {
      setSelectedKPI('all');
      setSelectedStatCard('all');
      setFilterSeverity('all');
    } else {
      setSelectedKPI(type);
      setSelectedStatCard('all');
      // Set filter based on KPI type
      if (type === 'high') {
        setFilterSeverity('high');
      } else if (type === 'access_denied') {
        setFilterSeverity('all');
        setSelectedStatCard('access_denied');
      } else if (type === 'unusual_time') {
        setFilterSeverity('all');
        setSelectedStatCard('unusual_time');
      } else if (type === 'compliance') {
        setFilterSeverity('all');
        setSelectedStatCard('compliance');
      }
    }
  };

  const handleLocationClick = (location) => {
    setFilterLocation(location);
    setSearchTerm('');
  };

  const handleSeverityClick = (severity) => {
    setFilterSeverity(severity);
    setSelectedStatCard('all');
    setSelectedKPI('all');
  };

  const handleHourClick = (hour) => {
    // Filter alerts by specific hour
    setSearchTerm(`${hour.toString().padStart(2, '0')}:00`);
  };

  // Generate alerts from log data
  const generateAlerts = () => {
    if (!logData || logData.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const locations = [...new Set(logData.map(log => log.location || log.door || 'ไม่ระบุ').filter(Boolean))];
    setUniqueLocations(locations.sort());

    const generatedAlerts = [];
    let alertId = 1;

    // Access denied alerts
    logData.forEach(log => {
      if (log.allow === false || log.allow === 0 || log.reason) {
        generatedAlerts.push({
          id: alertId++,
          alertType: 'ACCESS_DENIED',
          severity: log.reason?.includes('INVALID') ? 'high' : 'medium',
          cardName: log.cardName || 'ไม่ระบุ',
          location: log.location || log.door || 'ไม่ระบุ',
          accessTime: log.dateTime,
          reason: log.reason || 'การเข้าถึงถูกปฏิเสธ',
          userType: log.userType || 'ไม่ระบุ'
        });
      }
    });

    // Unusual time alerts
    logData.forEach(log => {
      if (log.dateTime) {
        const hour = new Date(log.dateTime).getHours();
        if (hour < 6 || hour > 22) {
          generatedAlerts.push({
            id: alertId++,
            alertType: 'UNUSUAL_TIME',
            severity: hour < 4 || hour > 23 ? 'high' : 'medium',
            cardName: log.cardName || 'ไม่ระบุ',
            location: log.location || log.door || 'ไม่ระบุ',
            accessTime: log.dateTime,
            reason: `เข้าถึงนอกเวลา (${hour.toString().padStart(2, '0')}:00)`,
            userType: log.userType || 'ไม่ระบุ'
          });
        }
      }
    });

    // Multiple attempts alerts
    const attemptGroups = {};
    logData.forEach(log => {
      if (log.allow === false || log.allow === 0) {
        const key = `${log.cardName || log.cardNumber || 'Unknown'}_${log.location || log.door || 'Unknown'}`;
        if (!attemptGroups[key]) attemptGroups[key] = [];
        attemptGroups[key].push(log);
      }
    });

    Object.values(attemptGroups).forEach(attempts => {
      if (attempts.length >= 2) {
        const latest = attempts[attempts.length - 1];
        generatedAlerts.push({
          id: alertId++,
          alertType: 'MULTIPLE_ATTEMPTS',
          severity: attempts.length >= 3 ? 'high' : 'medium',
          cardName: latest.cardName || 'ไม่ระบุ',
          location: latest.location || latest.door || 'ไม่ระบุ',
          accessTime: latest.dateTime,
          reason: `พยายามเข้าถึงล้มเหลว ${attempts.length} ครั้ง`,
          userType: latest.userType || 'ไม่ระบุ'
        });
      }
    });

    generatedAlerts.sort((a, b) => new Date(b.accessTime) - new Date(a.accessTime));
    setAlerts(generatedAlerts);
    setLoading(false);
    setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    setLoading(true);
    generateAlerts(); // Call immediately
  }, [logData]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = !searchTerm ||
        alert.cardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(alert.accessTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }).includes(searchTerm);

      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesLocation = filterLocation === 'all' || alert.location === filterLocation;

      // KPI filtering logic
      let matchesKPI = true;
      if (selectedKPI === 'high') {
        matchesKPI = alert.severity === 'high';
      } else if (selectedKPI === 'access_denied') {
        matchesKPI = alert.alertType === 'ACCESS_DENIED';
      } else if (selectedKPI === 'unusual_time') {
        matchesKPI = alert.alertType === 'UNUSUAL_TIME';
      } else if (selectedKPI === 'compliance') {
        matchesKPI = alert.severity !== 'high'; // Show non-critical alerts for compliance
      }

      // Date range filtering
      let matchesDateRange = true;
      if (startDate || endDate) {
        const alertDate = new Date(alert.accessTime);
        const alertDateString = alertDate.toISOString().split('T')[0];

        if (startDate && endDate) {
          matchesDateRange = alertDateString >= startDate && alertDateString <= endDate;
        } else if (startDate) {
          matchesDateRange = alertDateString >= startDate;
        } else if (endDate) {
          matchesDateRange = alertDateString <= endDate;
        }
      }

      return matchesSearch && matchesSeverity && matchesLocation && matchesKPI && matchesDateRange;
    });
  }, [alerts, searchTerm, filterSeverity, filterLocation, selectedKPI, startDate, endDate]);

  // Export to CSV function
  const generateCSVReport = (type, data, reportName) => {
    const now = new Date();

    // Header information
    let csvContent = `รายงานภาพรวมความปลอดภัย - ${reportName}\n`;
    csvContent += `สร้างเมื่อ: ${now.toLocaleString('th-TH')}\n`;
    csvContent += `จำนวนรายการ: ${data.length} รายการ\n\n`;

    // Executive Summary
    csvContent += `สรุปผู้บริหาร\n`;
    csvContent += `การแจ้งเตือนระดับสูง: ${data.filter(a => a.severity === 'high').length}\n`;
    csvContent += `การแจ้งเตือนระดับกลาง: ${data.filter(a => a.severity === 'medium').length}\n`;
    csvContent += `การแจ้งเตือนระดับต่ำ: ${data.filter(a => a.severity === 'low').length}\n`;
    csvContent += `อัตราปฏิบัติตามนโยบาย: ${((logData.length - data.length) / logData.length * 100).toFixed(1)}%\n\n`;

    // Location Analysis
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

    csvContent += `\nรายละเอียดการแจ้งเตือน\n`;
    csvContent += `ลำดับ,วันที่,เวลา,ประเภท,ระดับ,ผู้ใช้,สถานที่,รายละเอียด\n`;

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
        `"${alert.reason}"`
      ].join(',');
      csvContent += row + '\n';
    });

    // Download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานความปลอดภัย_${reportName}_${now.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (type) => {
    let dataToExport = [];
    let reportName = '';
    const now = new Date();

    switch (type) {
      case 'daily':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= yesterday);
        reportName = 'รายวัน';
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= weekAgo);
        reportName = 'รายสัปดาห์';
        break;
      case 'monthly':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= monthAgo);
        reportName = 'รายเดือน';
        break;
      case 'quarterly':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= quarterAgo);
        reportName = 'รายไตรมาส';
        break;
      case 'all':
        dataToExport = alerts;
        reportName = 'ทั้งหมด';
        break;
      case 'filtered':
        dataToExport = filteredAlerts;
        reportName = 'ตามตัวกรอง';
        break;
      default:
        dataToExport = filteredAlerts;
        reportName = 'ปัจจุบัน';
    }

    generateCSVReport(type, dataToExport, reportName);
    setIsExportModalOpen(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSeverity('all');
    setFilterLocation('all');
    setSelectedStatCard('all');
    setSelectedKPI('all');
    setStartDate('');
    setEndDate('');
  };

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
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5 mr-2" />ส่งออกรายงาน
                </button>
                <button
                  onClick={generateAlerts}
                  className="flex items-center px-6 py-3 bg-white border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />รีเฟรช
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KPICard
            icon={AlertTriangle}
            title="เหตุการณ์วิกฤต"
            value={alerts.filter(a => a.severity === 'high').length}
            previousValue={15}
            colorClass={getSeverityDetails('high')}
            description="ต้องการการตรวจสอบเร่งด่วน"
            onClick={() => handleKPIClick('high')}
            isSelected={selectedKPI === 'high'}
          />
          <KPICard
            icon={Shield}
            title="การละเมิดความปลอดภัย"
            value={alerts.filter(a => a.alertType === 'ACCESS_DENIED').length}
            previousValue={28}
            colorClass={getSeverityDetails('medium')}
            description="การเข้าถึงที่ไม่ได้รับอนุญาต"
            onClick={() => handleKPIClick('access_denied')}
            isSelected={selectedKPI === 'access_denied'}
          />
          <KPICard
            icon={Clock}
            title="เข้าถึงนอกเวลา"
            value={alerts.filter(a => a.alertType === 'UNUSUAL_TIME').length}
            previousValue={12}
            colorClass={getSeverityDetails('low')}
            description="การเข้าถึงนอกเวลาทำงาน"
            onClick={() => handleKPIClick('unusual_time')}
            isSelected={selectedKPI === 'unusual_time'}
          />
          <KPICard
            icon={TrendingUp}
            title="อัตราปฏิบัติตามนโยบาย"
            value={logData.length > 0 ? Math.round((logData.length - alerts.length) / logData.length * 100) : 100}
            previousValue={94}
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
          <RiskMatrix
            alerts={filteredAlerts}
            onLocationClick={handleLocationClick}
            onSeverityClick={handleSeverityClick}
          />
        </section>

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          filteredCount={filteredAlerts.length}
        />

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">การแจ้งเตือนและรายงาน</h3>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  {filteredAlerts.length} รายการ
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
              {alerts.length === 0 ? 'ระบบปลอดภัย' : 'ไม่พบรายการตามเงื่อนไข'}
            </h2>
            <p className="text-slate-600 mb-6">
              {alerts.length === 0 ? 'ไม่พบการแจ้งเตือนด้านความปลอดภัยในขณะนี้' : 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง'}
            </p>
            {alerts.length > 0 && (
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
                      แนะนำให้ทบทวนนโยบายความปลอดภัยและติดตามอย่างใกล้ชิด
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>Executive Security Dashboard • อัปเดตล่าสุด: {lastUpdated || 'ไม่ระบุ'} • รายงานสร้างโดยระบบอัตโนมัติ</p>
        </footer>
      </div>
    </div>
  );
};

export default SecurityDashboard;
