import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Shield, Users, MapPin, Activity, RefreshCw, CheckCircle2, FileText, Bell, TrendingUp, Eye, Calendar, Download, Search, Filter, BarChart3, Target, Zap, ChevronDown, ChevronUp, Settings } from 'lucide-react';

// --- Helper: Get style details based on severity ---
const getSeverityDetails = (severity) => {
  switch (severity) {
    case 'high':
      return {
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        pillClasses: 'bg-red-100 text-red-700',
        label: 'สูง'
      };
    case 'medium':
      return {
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        pillClasses: 'bg-amber-100 text-amber-700',
        label: 'ปานกลาง'
      };
    case 'low':
      return {
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        pillClasses: 'bg-blue-100 text-blue-700',
        label: 'ต่ำ'
      };
    default:
      return {
        iconColor: 'text-slate-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        pillClasses: 'bg-slate-100 text-slate-700',
        label: 'ทั่วไป'
      };
  }
};

// --- Helper: Get details based on alert type ---
const getAlertDetails = (alertType) => {
  switch (alertType) {
    case 'ACCESS_DENIED':
      return { icon: Shield, name: 'การเข้าถึงถูกปฏิเสธ' };
    case 'UNUSUAL_TIME':
      return { icon: Clock, name: 'เข้าถึงนอกเวลา' };
    case 'MULTIPLE_ATTEMPTS':
      return { icon: RefreshCw, name: 'พยายามหลายครั้ง' };
    case 'PERMISSION_MISMATCH':
      return { icon: AlertTriangle, name: 'สิทธิ์ไม่ตรงกัน' };
    default:
      return { icon: Bell, name: 'การแจ้งเตือนทั่วไป' };
  }
};

// --- Statistic Card ---
const StatCard = ({ icon: Icon, title, value, colorClass, trend, description, onClick, isSelected }) => (
  <div
    className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 border cursor-pointer ${colorClass.borderColor} ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass.bgColor}`}>
        <Icon className={`w-6 h-6 ${colorClass.iconColor}`} />
      </div>
      {trend && (
        <div className={`flex items-center px-2 py-1 rounded-md ${trend > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <TrendingUp className={`w-3 h-3 mr-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`} />
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${colorClass.iconColor} mb-1`}>{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  </div>
);

// --- Risk Score Component ---
const RiskScore = ({ alerts }) => {
  const score = useMemo(() => {
    const weights = { high: 10, medium: 5, low: 2 };
    const totalScore = alerts.reduce((sum, alert) => sum + (weights[alert.severity] || 0), 0);
    const maxPossible = alerts.length * 10;
    return maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
  }, [alerts]);

  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'สูงมาก', color: 'text-red-600', bg: 'bg-red-100' };
    if (score >= 60) return { label: 'สูง', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (score >= 40) return { label: 'ปานกลาง', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 20) return { label: 'ต่ำ', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { label: 'ต่ำมาก', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const risk = getRiskLevel(score);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-800">คะแนนความเสี่ยง (Risk Score)</h4>
        <div className={`px-2 py-1 rounded-md text-xs font-medium ${risk.bg} ${risk.color}`}>
          {risk.label}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-yellow-500' : score >= 20 ? 'bg-blue-500' : 'bg-green-500'}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
        <span className="text-xl font-bold text-slate-800">{score}%</span>
      </div>
    </div>
  );
};

// --- Alert Heatmap Component ---
const AlertHeatmap = ({ alerts }) => {
  const heatmapData = useMemo(() => {
    const hourCounts = Array(24).fill(0);
    alerts.forEach(alert => {
      const hour = new Date(alert.accessTime).getHours();
      hourCounts[hour]++;
    });
    return hourCounts;
  }, [alerts]);

  const maxCount = Math.max(...heatmapData);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h4 className="font-semibold text-slate-800 mb-3">Alert Heatmap (24ชม.)</h4>
      <div className="grid grid-cols-12 gap-1">
        {heatmapData.map((count, hour) => {
          const intensity = maxCount > 0 ? count / maxCount : 0;
          return (
            <div
              key={hour}
              className="aspect-square rounded text-xs flex items-center justify-center text-white font-medium relative group"
              style={{
                backgroundColor: intensity > 0
                  ? `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`
                  : '#f3f4f6'
              }}
              title={`${hour.toString().padStart(2, '0')}:00 - ${count} alerts`}
            >
              {hour % 2 === 0 ? hour : ''}
              {count > 0 && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Top Offenders Component ---
const TopOffenders = ({ alerts }) => {
  const offenders = useMemo(() => {
    const counts = {};
    alerts.forEach(alert => {
      counts[alert.cardName] = (counts[alert.cardName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [alerts]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h4 className="font-semibold text-slate-800 mb-3">ผู้ใช้ที่เกิดการแจ้งเตือนสูงสุด</h4>
      <div className="space-y-2">
        {offenders.length > 0 ? offenders.map((offender, index) => (
          <div key={offender.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-slate-800">{offender.name}</span>
            </div>
            <span className="text-sm font-bold text-red-600">{offender.count} ครั้ง</span>
          </div>
        )) : <p className="text-sm text-slate-500 text-center py-4">ไม่มีข้อมูล</p>}
      </div>
    </div>
  );
};

// --- Location Risk Ranking Component ---
const LocationRiskRanking = ({ alerts }) => {
  const locationRisks = useMemo(() => {
    const risks = {};
    alerts.forEach(alert => {
      const location = alert.location;
      if (!risks[location]) {
        risks[location] = { high: 0, medium: 0, low: 0, total: 0 };
      }
      risks[location][alert.severity]++;
      risks[location].total++;
    });

    return Object.entries(risks)
      .map(([location, counts]) => ({
        location,
        ...counts,
        riskScore: (counts.high * 10 + counts.medium * 5 + counts.low * 2)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [alerts]);


  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h4 className="font-semibold text-slate-800 mb-3">สถานที่ความเสี่ยงสูงสุด</h4>
      <div className="space-y-2">
        {locationRisks.length > 0 ? locationRisks.map((location, index) => (
          <div key={location.location} className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-800">{location.location}</span>
              </div>
              <span className="text-sm font-bold text-red-600">Risk Score: {location.riskScore.toFixed(0)}</span>
            </div>
            <div className="flex space-x-1 w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-l-full" style={{ width: `${(location.high / location.total) * 100}%` }}></div>
              <div className="bg-amber-500 h-1.5" style={{ width: `${(location.medium / location.total) * 100}%` }}></div>
              <div className="bg-blue-500 h-1.5 rounded-r-full" style={{ width: `${(location.low / location.total) * 100}%` }}></div>
            </div>
          </div>
        )) : <p className="text-sm text-slate-500 text-center py-4">ไม่มีข้อมูล</p>}
      </div>
    </div>
  );
};

// --- View-Only Alert Item ---
const AlertItem = ({ alert }) => {
  const severity = getSeverityDetails(alert.severity);
  const details = getAlertDetails(alert.alertType);
  const Icon = details.icon;

  return (
    <div
      className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border-l-4"
      style={{
        borderLeftColor: severity.iconColor.includes('red') ? '#ef4444' :
          severity.iconColor.includes('amber') ? '#f59e0b' :
            severity.iconColor.includes('blue') ? '#3b82f6' : '#475569'
      }}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${severity.bgColor}`}>
        <Icon className={`w-5 h-5 ${severity.iconColor}`} />
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 truncate">{details.name}</span>
            <span className={`px-2 py-1 text-xs rounded-md font-medium ${severity.pillClasses}`}>
              {severity.label}
            </span>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
            {new Date(alert.accessTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-2 italic">"{alert.reason}"</p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="truncate font-medium">{alert.cardName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="truncate">{alert.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Time Range Picker Component ---
const TimeRangePicker = ({ startDate, endDate, onDateChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onDateChange('start', e.target.value)}
        className="px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      <span className="text-slate-500">ถึง</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onDateChange('end', e.target.value)}
        className="px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );
};

// --- Main Dashboard Component ---
const SecurityDashboard = ({ logData = [] }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dataPercentage, setDataPercentage] = useState(100);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedStatCard, setSelectedStatCard] = useState('all');

  const generateAlerts = () => {
    if (!logData || logData.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const dataCount = Math.ceil(logData.length * (dataPercentage / 100));
    const recentLogs = logData.slice(-dataCount);
    const locations = [...new Set(recentLogs.map(log => log.location || log.door || 'ไม่ระบุ').filter(Boolean))];
    setUniqueLocations(locations.sort());

    const recentAlerts = [];
    let alertId = 1;

    // Generation logic
    recentLogs.forEach(log => {
      if (log.allow === false || log.allow === 0 || log.reason) {
        recentAlerts.push({ id: alertId++, alertType: 'ACCESS_DENIED', severity: log.reason?.includes('INVALID') ? 'high' : 'medium', cardName: log.cardName || 'ไม่ระบุ', location: log.location || log.door || 'ไม่ระบุ', accessTime: log.dateTime, reason: log.reason || 'การเข้าถึงถูกปฏิเสธ', userType: log.userType || 'ไม่ระบุ' });
      }
    });
    recentLogs.forEach(log => {
      if (log.dateTime) {
        const hour = new Date(log.dateTime).getHours();
        if (hour < 6 || hour > 22) {
          recentAlerts.push({ id: alertId++, alertType: 'UNUSUAL_TIME', severity: hour < 4 || hour > 23 ? 'high' : 'medium', cardName: log.cardName || 'ไม่ระบุ', location: log.location || log.door || 'ไม่ระบุ', accessTime: log.dateTime, reason: `เข้าถึงนอกเวลา (${hour.toString().padStart(2, '0')}:00)`, userType: log.userType || 'ไม่ระบุ' });
        }
      }
    });
    const attemptGroups = {};
    recentLogs.forEach(log => {
      if (log.allow === false || log.allow === 0) {
        const key = `${log.cardName || log.cardNumber || 'Unknown'}_${log.location || log.door || 'Unknown'}`;
        if (!attemptGroups[key]) { attemptGroups[key] = []; }
        attemptGroups[key].push(log);
      }
    });
    Object.values(attemptGroups).forEach(attempts => {
      if (attempts.length >= 2) {
        const latest = attempts[attempts.length - 1];
        recentAlerts.push({ id: alertId++, alertType: 'MULTIPLE_ATTEMPTS', severity: attempts.length >= 3 ? 'high' : 'medium', cardName: latest.cardName || 'ไม่ระบุ', location: latest.location || latest.door || 'ไม่ระบุ', accessTime: latest.dateTime, reason: `พยายามเข้าถึงล้มเหลว ${attempts.length} ครั้ง`, userType: latest.userType || 'ไม่ระบุ' });
      }
    })

    recentAlerts.sort((a, b) => new Date(b.accessTime) - new Date(a.accessTime));
    setAlerts(recentAlerts);
    setLoading(false);
    setLastUpdatedTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      generateAlerts();
    }, 500);
    return () => clearTimeout(timer);
  }, [logData, dataPercentage]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.cardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesLocation = filterLocation === 'all' || alert.location === filterLocation;
      const matchesStatCard = selectedStatCard === 'all' || alert.severity === selectedStatCard;

      let matchesDateRange = true;
      if (alert.accessTime && customDateRange.start && customDateRange.end) {
        const alertDate = new Date(alert.accessTime);
        const startDate = new Date(customDateRange.start);
        const endDate = new Date(customDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = alertDate >= startDate && alertDate <= endDate;
      }
      return matchesSearch && matchesSeverity && matchesLocation && matchesStatCard && matchesDateRange;
    });
  }, [alerts, searchTerm, filterSeverity, filterLocation, selectedStatCard, customDateRange]);

  const generateReportCSV = (title, data) => {
    const now = new Date();
    let reportTitle = `รายงานความปลอดภัย_${title}_${now.toLocaleDateString('th-TH')}`;

    let csvContent = "รายงานภาพรวมความปลอดภัย\n";
    csvContent += `สร้างเมื่อ,${now.toLocaleString('th-TH')}\n`;
    csvContent += `ประเภทรายงาน,${title}\n\n`;

    csvContent += "สรุป\n";
    csvContent += `การแจ้งเตือนทั้งหมด,${data.length}\n`;
    csvContent += `ระดับสูง,${data.filter(a => a.severity === 'high').length}\n`;
    csvContent += `ระดับปานกลาง,${data.filter(a => a.severity === 'medium').length}\n`;
    csvContent += `ระดับต่ำ,${data.filter(a => a.severity === 'low').length}\n\n`;

    csvContent += "ลำดับ,ID,เวลา,วันที่,ประเภท,ระดับ,ผู้ใช้,สถานที่,รายละเอียด,ประเภทผู้ใช้\n";

    data.forEach((alert, index) => {
      const accessDate = new Date(alert.accessTime);
      const row = [
        index + 1,
        alert.id,
        accessDate.toLocaleTimeString('th-TH'),
        accessDate.toLocaleDateString('th-TH'),
        getAlertDetails(alert.alertType).name,
        getSeverityDetails(alert.severity).label,
        alert.cardName,
        alert.location,
        `"${alert.reason}"`,
        alert.userType
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = (range) => {
    let dataToExport;
    let reportName = "";
    const now = new Date();

    if (range === 'current') {
      dataToExport = filteredAlerts;
      reportName = 'ข้อมูลปัจจุบัน';
    } else {
      const endDate = new Date(now);
      let startDate = new Date(now);

      switch (range) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          reportName = 'รายวัน';
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          reportName = 'รายสัปดาห์';
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          reportName = 'รายเดือน';
          break;
        case 'quarterly':
          startDate.setMonth(now.getMonth() - 3);
          reportName = 'รายไตรมาส';
          break;
        default:
          dataToExport = [];
      }
      dataToExport = alerts.filter(alert => {
        const alertDate = new Date(alert.accessTime);
        return alertDate >= startDate && alertDate <= endDate;
      });
    }

    generateReportCSV(reportName, dataToExport);
    setIsExportModalOpen(false);
  };

  const handleDateRangeChange = (type, value) => {
    setCustomDateRange(prev => ({ ...prev, [type]: value }));
  };

  const reportOptions = [
    { key: 'daily', label: 'รายวัน', desc: 'ข้อมูลย้อนหลัง 24 ชั่วโมง', icon: Clock },
    { key: 'weekly', label: 'รายสัปดาห์', desc: 'ข้อมูลย้อนหลัง 7 วัน', icon: Calendar },
    { key: 'monthly', label: 'รายเดือน', desc: 'ข้อมูลย้อนหลัง 30 วัน', icon: TrendingUp },
    { key: 'quarterly', label: 'รายไตรมาส', desc: 'ข้อมูลย้อนหลัง 90 วัน', icon: Activity },
    { key: 'current', label: 'ข้อมูลปัจจุบัน', desc: `ตามการกรอง (${filteredAlerts.length} รายการ)`, icon: Filter }
  ];


  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6">
        <div className="max-w-7xl mx-auto"><div className="animate-pulse h-16 bg-slate-200 rounded-lg w-1/2 mb-6"></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><div className="h-32 bg-slate-200 rounded-lg"></div><div className="h-32 bg-slate-200 rounded-lg"></div><div className="h-32 bg-slate-200 rounded-lg"></div><div className="h-32 bg-slate-200 rounded-lg"></div></div></div>
      </div>
    );
  }

  const displayedAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 6);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center"><Shield className="w-6 h-6 text-white" /></div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                    แดชบอร์ดภาพรวมความปลอดภัย
                    {lastUpdatedTime && <span className="ml-3 text-sm font-normal text-slate-500">(ข้อมูล ณ {lastUpdatedTime} น.)</span>}
                  </h1>
                  <p className="text-slate-600 flex items-center mt-1"><Activity className="w-4 h-4 mr-2" />{alerts.length.toLocaleString()} การแจ้งเตือน จาก {Math.ceil(logData.length * (dataPercentage / 100)).toLocaleString()} รายการ ({dataPercentage}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAnalytics(!showAnalytics)} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"><BarChart3 className="w-4 h-4 mr-2" />{showAnalytics ? 'ซ่อน' : 'แสดง'} Analytics</button>
                <button onClick={() => setIsExportModalOpen(true)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"><Download className="w-4 h-4 mr-2" />ดาวน์โหลดรายงาน</button>
                <button onClick={generateAlerts} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"><RefreshCw className="w-4 h-4 mr-2" />รีเฟรช</button>
              </div>
            </div>
          </div>
        </header>

        {/* Analytics Section */}
        {showAnalytics && (
          <section className="mb-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <RiskScore alerts={filteredAlerts} />
              <AlertHeatmap alerts={filteredAlerts} />
              <TopOffenders alerts={filteredAlerts} />
            </div>
            <LocationRiskRanking alerts={filteredAlerts} />
          </section>
        )}

        {/* Data Controls */}
        <section className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">การตั้งค่าข้อมูลและช่วงเวลา</h3>
            <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">
              <div className="flex items-center space-x-2"><label className="text-sm font-medium text-slate-700 whitespace-nowrap">จำนวนข้อมูล:</label><select value={dataPercentage} onChange={(e) => setDataPercentage(Number(e.target.value))} className="px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[160px]"><option value={10}>10%</option><option value={25}>25%</option><option value={50}>50%</option><option value={75}>75%</option><option value={100}>100% - ทั้งหมด</option></select></div>
              <div className="flex items-center space-x-2"><label className="text-sm font-medium text-slate-700 whitespace-nowrap">ช่วงเวลา:</label><TimeRangePicker startDate={customDateRange.start} endDate={customDateRange.end} onDateChange={handleDateRangeChange} /></div>
            </div>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={AlertTriangle} title="แจ้งเตือนระดับสูง" value={alerts.filter(a => a.severity === 'high').length} colorClass={getSeverityDetails('high')} trend={-3} description="ต้องการการตรวจสอบเร่งด่วน" onClick={() => setSelectedStatCard(selectedStatCard === 'high' ? 'all' : 'high')} isSelected={selectedStatCard === 'high'} />
          <StatCard icon={Clock} title="แจ้งเตือนระดับกลาง" value={alerts.filter(a => a.severity === 'medium').length} colorClass={getSeverityDetails('medium')} trend={5} description="ควรติดตามและเฝ้าระวัง" onClick={() => setSelectedStatCard(selectedStatCard === 'medium' ? 'all' : 'medium')} isSelected={selectedStatCard === 'medium'} />
          <StatCard icon={Shield} title="แจ้งเตือนระดับต่ำ" value={alerts.filter(a => a.severity === 'low').length} colorClass={getSeverityDetails('low')} trend={15} description="สำหรับบันทึกและวิเคราะห์" onClick={() => setSelectedStatCard(selectedStatCard === 'low' ? 'all' : 'low')} isSelected={selectedStatCard === 'low'} />
          <StatCard icon={Activity} title="แจ้งเตือนทั้งหมด" value={alerts.length} colorClass={getSeverityDetails('default')} trend={8} description="ภาพรวมในระบบ" onClick={() => setSelectedStatCard('all')} isSelected={selectedStatCard === 'all'} />
        </section>

        {/* Export Modal */}
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">ดาวน์โหลดรายงาน</h3>
                <p className="text-slate-600">เลือกช่วงเวลาของข้อมูลที่ต้องการส่งออก</p>
              </div>
              <div className="space-y-3 mb-6">
                {reportOptions.map(({ key, label, desc, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleGenerateReport(key)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border"
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
              <div className="text-center">
                <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Main Content */}
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border"><div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-green-600" /></div><h2 className="text-xl font-bold text-slate-800 mb-2">{alerts.length === 0 ? 'ปลอดภัย' : 'ไม่พบรายการตามเงื่อนไข'}</h2><p className="text-slate-600">{alerts.length === 0 ? 'ไม่พบการแจ้งเตือนใดๆ ในขณะนี้' : 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง'}</p>{alerts.length > 0 && (<button onClick={() => { setSearchTerm(''); setFilterSeverity('all'); setFilterLocation('all'); setSelectedStatCard('all'); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">ล้างตัวกรองทั้งหมด</button>)}</div>
        ) : (
          <main>
            {/* Filter Section */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <h3 className="text-lg font-bold text-slate-800">การแจ้งเตือนล่าสุด</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{filteredAlerts.length}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="ค้นหาผู้ใช้, สถานที่..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px]" /></div>
                  <div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="pl-10 pr-8 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none min-w-[120px]"><option value="all">ทุกระดับ</option><option value="high">สูง</option><option value="medium">ปานกลาง</option><option value="low">ต่ำ</option></select></div>
                  <div className="relative"><MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" /><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="pl-10 pr-8 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none min-w-[150px]"><option value="all">ทุกสถานที่</option>{uniqueLocations.map(location => (<option key={location} value={location}>{location}</option>))}</select></div>
                  {filteredAlerts.length > 6 && (<button onClick={() => setShowAllAlerts(!showAllAlerts)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"><Eye className="w-4 h-4 mr-2" />{showAllAlerts ? <><ChevronUp className="w-4 h-4 mr-1" />ย่อ</> : <><ChevronDown className="w-4 h-4 mr-1" />ดูทั้งหมด ({filteredAlerts.length})</>}</button>)}
                </div>
                {(searchTerm || filterSeverity !== 'all' || filterLocation !== 'all' || selectedStatCard !== 'all') && (<div className="pt-3 border-t border-slate-200"><div className="flex flex-wrap gap-2 items-center"><span className="text-sm text-slate-600">ตัวกรอง:</span>{searchTerm && (<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">ค้นหา: "{searchTerm}"</span>)}{filterSeverity !== 'all' && (<span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs">ระดับ: {getSeverityDetails(filterSeverity).label}</span>)}{filterLocation !== 'all' && (<span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">สถานที่: {filterLocation}</span>)}{selectedStatCard !== 'all' && (<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">ประเภท: {getSeverityDetails(selectedStatCard).label}</span>)}<button onClick={() => { setSearchTerm(''); setFilterSeverity('all'); setFilterLocation('all'); setSelectedStatCard('all'); }} className="text-xs text-blue-600 hover:text-blue-800 underline">ล้างตัวกรอง</button></div></div>)}
              </div>
            </div>

            {/* Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayedAlerts.map((alert) => (<AlertItem key={alert.id} alert={alert} />))}
            </div>

            {/* Pattern Detection */}
            {filteredAlerts.length > 15 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"><div className="flex items-center"><Zap className="w-5 h-5 text-yellow-600 mr-2" /><h4 className="font-semibold text-yellow-800">Pattern Detection</h4></div><p className="text-sm text-yellow-700 mt-1">ตรวจพบการแจ้งเตือนจำนวนมากผิดปกติในช่วงเวลานี้</p></div>
            )}
          </main>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;