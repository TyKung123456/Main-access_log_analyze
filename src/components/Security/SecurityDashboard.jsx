import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Shield, MapPin, Activity, RefreshCw, Download, Search, Filter, TrendingUp, Eye, Building2, X, BarChart3, Users, Calendar } from 'lucide-react';

// Helper functions
const getSeverityDetails = (severity) => {
  const details = {
    high: { iconColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', pillClasses: 'bg-red-100 text-red-700', label: 'สูง' },
    medium: { iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', pillClasses: 'bg-amber-100 text-amber-700', label: 'ปานกลาง' },
    low: { iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', pillClasses: 'bg-blue-100 text-blue-700', label: 'ต่ำ' },
    default: { iconColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', pillClasses: 'bg-green-100 text-green-700', label: 'ปกติ' }
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
  return types[alertType] || { icon: AlertTriangle, name: 'การแจ้งเตือนทั่วไป' };
};

// KPI Card Component - Interactive
const KPICard = ({ icon: Icon, title, value, previousValue, unit = '', colorClass, description, onClick, isSelected }) => {
  const change = previousValue ? ((value - previousValue) / previousValue * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 ${isSelected ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white' : 'hover:ring-1 hover:ring-blue-300'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClass.bgColor} shadow-sm`}>
          <Icon className={`w-7 h-7 ${colorClass.iconColor}`} />
        </div>
        {previousValue && (
          <div className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${isPositive ? 'rotate-0' : 'rotate-180'}`} />
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-2">{title}</h3>
        <p className={`text-3xl font-bold ${colorClass.iconColor} mb-2`}>
          {value.toLocaleString()}{unit}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
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
  const peakHour = hourlyData.find(d => d.count === maxCount);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800">แนวโน้มการแจ้งเตือนตาม 24 ชั่วโมง</h3>
        {peakHour && (
          <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            ช่วงเวลาที่พบมากที่สุด: {peakHour.hour.toString().padStart(2, '0')}:00
          </div>
        )}
      </div>
      <div className="flex items-end space-x-1 h-40 mb-4">
        {hourlyData.map(({ hour, count }) => (
          <div key={hour} className="flex-1 flex flex-col items-center group">
            <div
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer shadow-sm"
              style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '3px' }}
              title={`${hour.toString().padStart(2, '0')}:00 - ${count} การแจ้งเตือน`}
              onClick={() => onHourClick && onHourClick(hour)}
            ></div>
            {hour % 6 === 0 && (
              <div className="text-xs text-slate-500 mt-2 group-hover:text-slate-700 transition-colors">
                {hour.toString().padStart(2, '0')}:00
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-xs text-slate-500">รวมทั้งหมด</p>
          <p className="font-bold text-slate-800">{alerts.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">เฉลี่ยต่อชั่วโมง</p>
          <p className="font-bold text-slate-800">{(alerts.length / 24).toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">ช่วงเวลาเสี่ยง</p>
          <p className="font-bold text-amber-600">{hourlyData.filter(d => d.count > 0 && (d.hour < 6 || d.hour > 22)).length}</p>
        </div>
      </div>
    </div>
  );
};

// Risk Matrix Component - Interactive
const RiskMatrix = ({ alerts, onLocationClick, onSeverityClick, selectedSeverity }) => {
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

  const locations = [...new Set(riskData.map(d => d.location))].slice(0, 8);
  const severities = ['high', 'medium', 'low'];

  const totalByLocation = locations.map(location => ({
    location,
    total: riskData.filter(d => d.location === location).reduce((sum, d) => sum + d.count, 0)
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border">
      <h3 className="text-lg font-bold text-slate-800 mb-6">เมทริกซ์ความเสี่ยงตามสถานที่</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-3 text-sm font-semibold text-slate-600 pb-2 border-b">
          <div>สถานที่</div>
          <div className="text-center">รวม</div>
          <div className="text-center cursor-pointer hover:text-red-600 transition-colors" onClick={() => onSeverityClick && onSeverityClick('high')}>สูง</div>
          <div className="text-center cursor-pointer hover:text-amber-600 transition-colors" onClick={() => onSeverityClick && onSeverityClick('medium')}>กลาง</div>
          <div className="text-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onSeverityClick && onSeverityClick('low')}>ต่ำ</div>
        </div>
        {totalByLocation.map(({ location, total }) => (
          <div key={location} className="grid grid-cols-5 gap-3 text-sm hover:bg-slate-50 p-2 rounded-lg transition-colors">
            <div
              className="truncate font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors"
              onClick={() => onLocationClick && onLocationClick(location)}
              title={location}
            >
              {location}
            </div>
            <div className="text-center font-bold text-slate-800">{total}</div>
            {severities.map(severity => {
              const item = riskData.find(d => d.location === location && d.severity === severity);
              const count = item ? item.count : 0;
              const colorClass = getSeverityDetails(severity);
              return (
                <div key={severity} className="text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all min-w-[40px]
                    ${count > 0 ? colorClass.pillClasses + ' hover:opacity-80 shadow-sm' : 'bg-slate-100 text-slate-400'}
                    ${selectedSeverity === severity ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
                    `}
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

// Suspicious Activity Summary Component - Interactive
const SuspiciousActivitySummary = ({ alerts, logData, onKPIClick, selectedKPI }) => {
  const suspiciousMetrics = useMemo(() => {
    // คำนวณจากข้อมูลจริงที่ส่งมา
    const accessDenied = alerts.filter(alert => alert.alertType === 'ACCESS_DENIED').length;
    const unusualTime = alerts.filter(alert => alert.alertType === 'UNUSUAL_TIME').length;
    const multipleAttempts = alerts.filter(alert => alert.alertType === 'MULTIPLE_ATTEMPTS').length;
    const highRiskEvents = alerts.filter(alert => alert.severity === 'high').length;

    // คำนวณสถานที่เสี่ยง
    const riskLocations = [...new Set(alerts.map(alert => alert.location))].length;

    // คำนวณผู้ใช้ต้องสงสัย
    const suspiciousUsers = [...new Set(alerts.map(alert => alert.cardName))].length;

    // เหตุการณ์วันนี้
    const today = new Date().toDateString();
    const todayEvents = alerts.filter(alert => {
      return new Date(alert.accessTime).toDateString() === today;
    }).length;

    return {
      totalSuspicious: alerts.length,
      accessDenied,
      unusualTime,
      multipleAttempts,
      highRiskEvents,
      riskLocations,
      suspiciousUsers,
      todayEvents
    };
  }, [alerts, logData]);

  const suspiciousCards = [
    {
      title: 'รวมเหตุการณ์ต้องสงสัย',
      value: suspiciousMetrics.totalSuspicious,
      icon: Eye,
      color: 'purple',
      description: 'เหตุการณ์ที่ต้องตรวจสอบทั้งหมด',
      kpiType: 'all'
    },
    {
      title: 'การเข้าถึงถูกปฏิเสธ',
      value: suspiciousMetrics.accessDenied,
      icon: Shield,
      color: 'red',
      description: 'ครั้งที่พยายามเข้าถึงแต่ถูกปฏิเสธ',
      kpiType: 'access_denied'
    },
    {
      title: 'เข้าถึงนอกเวลา',
      value: suspiciousMetrics.unusualTime,
      icon: Clock,
      color: 'amber',
      description: 'การเข้าถึงนอกเวลาทำงานปกติ',
      kpiType: 'unusual_time'
    },
    {
      title: 'พยายามหลายครั้ง',
      value: suspiciousMetrics.multipleAttempts,
      icon: RefreshCw,
      color: 'orange',
      description: 'ผู้ใช้ที่พยายามเข้าถึงหลายครั้ง',
      kpiType: 'multiple_attempts'
    },
    {
      title: 'เหตุการณ์ระดับสูง',
      value: suspiciousMetrics.highRiskEvents,
      icon: AlertTriangle,
      color: 'red',
      description: 'เหตุการณ์ที่ต้องการความสนใจเร่งด่วน',
      kpiType: 'high'
    },
    {
      title: 'สถานที่เสี่ยง',
      value: suspiciousMetrics.riskLocations,
      icon: MapPin,
      color: 'blue',
      description: 'จำนวนสถานที่ที่มีเหตุการณ์ต้องสงสัย',
      kpiType: 'risk_locations'
    },
    {
      title: 'ผู้ใช้ต้องสงสัย',
      value: suspiciousMetrics.suspiciousUsers,
      icon: Users,
      color: 'indigo',
      description: 'จำนวนผู้ใช้ที่มีพฤติกรรมต้องสงสัย',
      kpiType: 'suspicious_users'
    },
    {
      title: 'เหตุการณ์วันนี้',
      value: suspiciousMetrics.todayEvents,
      icon: Calendar,
      color: 'green',
      description: 'เหตุการณ์ต้องสงสัยที่เกิดขึ้นวันนี้',
      kpiType: 'today_events'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
      red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
      orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
      blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
      indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
      green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Eye className="w-6 h-6 mr-3 text-purple-600" />
          สรุปข้อมูลกิจกรรมต้องสงสัย
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {suspiciousCards.map((card, index) => {
            const colors = getColorClasses(card.color);
            const Icon = card.icon;
            const isCardSelected = selectedKPI === card.kpiType;

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5
                  ${isCardSelected ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white' : `${colors.border} ${colors.bg} hover:ring-1 hover:ring-blue-300`}`}
                onClick={() => onKPIClick && onKPIClick(card.kpiType)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                </div>
                <h4 className="font-semibold text-slate-800 mb-1 text-sm">{card.title}</h4>
                <p className={`text-2xl font-bold ${colors.icon} mb-1`}>
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">{card.description}</p>
              </div>
            );
          })}
        </div>
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
    { key: 'quarterly', label: 'รายงานรายไตรมาส', desc: 'ข้อมุล 90 วันล่าสุด', icon: TrendingUp },
    { key: 'all', label: 'รายงานทั้งหมด', desc: 'ข้อมูลทั้งหมดในระบบ', icon: Eye },
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

// Main Dashboard Component
const SecurityDashboard = ({ logData = [] }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // Interactive handlers
  const handleKPIClick = (type) => {
    setSelectedKPI(selectedKPI === type ? 'all' : type);
  };

  const handleLocationClick = (location) => {
    console.log('Location clicked:', location);
  };

  const handleSeverityClick = (severity) => {
    setSelectedKPI(severity);
  };

  const handleHourClick = (hour) => {
    console.log('Hour clicked:', hour);
  };

  // แก้ไขการสร้าง alerts ให้ถูกต้องและมีประสิทธิภาพมากขึ้น
  const generateAlerts = () => {
    if (!logData || logData.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const generatedAlerts = [];
    let alertId = 1;

    // 1. Access denied alerts - เฉพาะที่ allow = false หรือ 0
    const deniedLogs = logData.filter(log => log.allow === false || log.allow === 0);
    deniedLogs.forEach(log => {
      generatedAlerts.push({
        id: alertId++,
        alertType: 'ACCESS_DENIED',
        severity: log.reason && log.reason.includes('INVALID') ? 'high' : 'medium',
        cardName: log.cardName || log.cardNumber || 'ไม่ระบุ',
        location: log.location || log.door || 'ไม่ระบุ',
        accessTime: log.dateTime,
        reason: log.reason || 'การเข้าถึงถูกปฏิเสธ',
        userType: log.userType || 'ไม่ระบุ'
      });
    });

    // 2. Unusual time alerts - เฉพาะที่มี dateTime และ allow = true
    const allowedLogs = logData.filter(log => (log.allow === true || log.allow === 1) && log.dateTime);
    allowedLogs.forEach(log => {
      try {
        const accessDate = new Date(log.dateTime);
        if (accessDate && !isNaN(accessDate.getTime())) {
          const hour = accessDate.getHours();
          const dayOfWeek = accessDate.getDay();

          // นอกเวลาทำการ (22:00-06:00) หรือวันหยุดสุดสัปดาห์
          if ((hour >= 22 || hour <= 6) || (dayOfWeek === 0 || dayOfWeek === 6)) {
            // ข้ามเจ้าหน้าที่รักษาความปลอดภัย
            if (log.userType !== 'SECURITY' && log.userType !== 'security') {
              generatedAlerts.push({
                id: alertId++,
                alertType: 'UNUSUAL_TIME',
                severity: (hour >= 23 || hour <= 5) ? 'high' : 'medium',
                cardName: log.cardName || log.cardNumber || 'ไม่ระบุ',
                location: log.location || log.door || 'ไม่ระบุ',
                accessTime: log.dateTime,
                reason: `เข้าถึงนอกเวลา (${hour.toString().padStart(2, '0')}:00) ${dayOfWeek === 0 ? '(วันอาทิตย์)' : dayOfWeek === 6 ? '(วันเสาร์)' : ''}`,
                userType: log.userType || 'ไม่ระบุ'
              });
            }
          }
        }
      } catch (error) {
        console.warn('Invalid date format:', log.dateTime);
      }
    });

    // 3. Multiple attempts - จัดกลุ่มตามบัตรและสถานที่
    const failedAttempts = {};
    deniedLogs.forEach(log => {
      const key = `${log.cardName || log.cardNumber || 'Unknown'}_${log.location || log.door || 'Unknown'}`;
      if (!failedAttempts[key]) {
        failedAttempts[key] = [];
      }
      failedAttempts[key].push(log);
    });

    Object.entries(failedAttempts).forEach(([key, attempts]) => {
      if (attempts.length >= 2) {
        const latest = attempts[attempts.length - 1];
        generatedAlerts.push({
          id: alertId++,
          alertType: 'MULTIPLE_ATTEMPTS',
          severity: attempts.length >= 3 ? 'high' : 'medium',
          cardName: latest.cardName || latest.cardNumber || 'ไม่ระบุ',
          location: latest.location || latest.door || 'ไม่ระบุ',
          accessTime: latest.dateTime,
          reason: `พยายามเข้าถึงล้มเหลว ${attempts.length} ครั้ง`,
          userType: latest.userType || 'ไม่ระบุ'
        });
      }
    });

    // เรียงตามเวลาล่าสุด
    generatedAlerts.sort((a, b) => {
      const dateA = new Date(a.accessTime);
      const dateB = new Date(b.accessTime);
      return dateB - dateA;
    });

    console.log(`🔍 สร้าง ${generatedAlerts.length} การแจ้งเตือน จากข้อมูล ${logData.length} รายการ`);
    setAlerts(generatedAlerts);
    setLoading(false);
    setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(generateAlerts, 500);
    return () => clearTimeout(timer);
  }, [logData]);

  // Filter alerts based on selected KPI
  const filteredAlerts = useMemo(() => {
    if (selectedKPI === 'all') return alerts;

    switch (selectedKPI) {
      case 'high':
        return alerts.filter(alert => alert.severity === 'high');
      case 'medium':
        return alerts.filter(alert => alert.severity === 'medium');
      case 'low':
        return alerts.filter(alert => alert.severity === 'low');
      case 'access_denied':
        return alerts.filter(alert => alert.alertType === 'ACCESS_DENIED');
      case 'unusual_time':
        return alerts.filter(alert => alert.alertType === 'UNUSUAL_TIME');
      case 'multiple_attempts':
        return alerts.filter(alert => alert.alertType === 'MULTIPLE_ATTEMPTS');
      case 'risk_locations':
        // This KPI represents the count of unique locations with suspicious events.
        // When selected, we should show all alerts that have a location.
        return alerts.filter(alert => alert.location && alert.location !== 'ไม่ระบุ');
      case 'suspicious_users':
        // This KPI represents the count of unique users with suspicious behavior.
        // When selected, we should show all alerts that have a cardName.
        return alerts.filter(alert => alert.cardName && alert.cardName !== 'ไม่ระบุ');
      case 'today_events':
        const today = new Date().toDateString();
        return alerts.filter(alert => new Date(alert.accessTime).toDateString() === today);
      case 'compliance':
        return alerts.filter(alert => alert.severity !== 'high');
      default:
        return alerts;
    }
  }, [alerts, selectedKPI]);

  // Export to CSV function
  const generateCSVReport = (type, data, reportName) => {
    const now = new Date();
    let csvContent = `รายงานภาพรวมความปลอดภัย - ${reportName}\n`;
    csvContent += `สร้างเมื่อ: ${now.toLocaleString('th-TH')}\n`;
    csvContent += `จำนวนรายการ: ${data.length} รายการ\n\n`;

    csvContent += `สรุปผู้บริหาร\n`;
    csvContent += `การแจ้งเตือนระดับสูง: ${data.filter(a => a.severity === 'high').length}\n`;
    csvContent += `การแจ้งเตือนระดับกลาง: ${data.filter(a => a.severity === 'medium').length}\n`;
    csvContent += `การแจ้งเตือนระดับต่ำ: ${data.filter(a => a.severity === 'low').length}\n\n`;

    csvContent += `รายละเอียดการแจ้งเตือน\n`;
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-24 bg-white rounded-xl mb-8 shadow-sm"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-white rounded-xl shadow-sm"></div>)}
            </div>
            <div className="h-80 bg-white rounded-xl shadow-sm mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-white rounded-xl shadow-sm"></div>
              <div className="h-64 bg-white rounded-xl shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border-0 bg-gradient-to-r from-white to-blue-50">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-800 mb-2">
                    Executive Security Dashboard
                  </h1>
                  <p className="text-slate-600 flex items-center text-lg">
                    <Building2 className="w-5 h-5 mr-3" />
                    ระบบภาพรวมความปลอดภัยระดับผู้บริหาร
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Download className="w-5 h-5 mr-3" />ส่งออกรายงาน
                </button>
                <button
                  onClick={generateAlerts}
                  className="flex items-center px-8 py-4 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <RefreshCw className="w-5 h-5 mr-3" />รีเฟรช
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Suspicious Activity Summary */}
        <SuspiciousActivitySummary
          alerts={alerts}
          logData={logData}
          onKPIClick={handleKPIClick}
          selectedKPI={selectedKPI}
        />

        {/* Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <TrendAnalysis alerts={filteredAlerts} onHourClick={handleHourClick} />
          <RiskMatrix
            alerts={filteredAlerts}
            onLocationClick={handleLocationClick}
            onSeverityClick={handleSeverityClick}
            selectedSeverity={selectedKPI}
          />
        </section>

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          filteredCount={filteredAlerts.length}
        />

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="bg-white p-6 rounded-xl shadow-lg border">
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>ระบบออนไลน์</span>
              </div>
              <div className="text-slate-400">•</div>
              <span>อัปเดตล่าสุด: {lastUpdated || 'ไม่ระบุ'}</span>
              <div className="text-slate-400">•</div>
              <span>รายงานสร้างโดยระบบอัตโนมัติ</span>
              <div className="text-slate-400">•</div>
              <span>Executive Security Dashboard v2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SecurityDashboard;
