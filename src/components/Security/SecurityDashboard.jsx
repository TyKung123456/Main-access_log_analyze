// src/components/Security/SecurityDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Shield, MapPin, Activity, RefreshCw, Download, TrendingUp, Eye, Building2, X, Users, Calendar, Zap, Target, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';

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

// Compact KPI Grid Component
const CompactKPIGrid = ({ alerts, logData, selectedKPI, onKPIClick }) => {
  const metrics = useMemo(() => {
    const totalSuspicious = alerts.length;
    const accessDenied = alerts.filter(alert => alert.alertType === 'ACCESS_DENIED').length;
    const unusualTime = alerts.filter(alert => alert.alertType === 'UNUSUAL_TIME').length;
    const highRiskEvents = alerts.filter(alert => alert.severity === 'high').length;
    const complianceRate = logData.length > 0 ? Math.round((logData.length - alerts.length) / logData.length * 100) : 100;

    // Today events
    const today = new Date().toDateString();
    const todayEvents = alerts.filter(alert => new Date(alert.accessTime).toDateString() === today).length;

    return {
      critical: { value: highRiskEvents, label: 'วิกฤต', icon: AlertTriangle, color: 'red', key: 'high' },
      denied: { value: accessDenied, label: 'ปฏิเสธ', icon: Shield, color: 'orange', key: 'access_denied' },
      unusual: { value: unusualTime, label: 'นอกเวลา', icon: Clock, color: 'amber', key: 'unusual_time' },
      today: { value: todayEvents, label: 'วันนี้', icon: Calendar, color: 'blue', key: 'today_events' },
      compliance: { value: complianceRate, label: 'ปฏิบัติตาม', icon: Target, color: 'green', key: 'compliance', unit: '%' },
      total: { value: totalSuspicious, label: 'รวมทั้งหมด', icon: Eye, color: 'purple', key: 'all' }
    };
  }, [alerts, logData]);

  const getColorClasses = (color) => {
    const colors = {
      red: { bg: 'bg-red-50', icon: 'text-red-600', hover: 'hover:bg-red-100' },
      orange: { bg: 'bg-orange-50', icon: 'text-orange-600', hover: 'hover:bg-orange-100' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-600', hover: 'hover:bg-amber-100' },
      blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
      green: { bg: 'bg-green-50', icon: 'text-green-600', hover: 'hover:bg-green-100' },
      purple: { bg: 'bg-purple-50', icon: 'text-purple-600', hover: 'hover:bg-purple-100' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-6">
      {Object.entries(metrics).map(([key, metric]) => {
        const colors = getColorClasses(metric.color);
        const Icon = metric.icon;
        const isSelected = selectedKPI === metric.key;

        return (
          <div
            key={key}
            className={`${colors.bg} ${colors.hover} p-6 rounded-2xl border cursor-pointer transition-all transform hover:scale-105 ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
              }`}
            onClick={() => onKPIClick(metric.key)}
          >
            <div className="flex flex-col items-center text-center">
              <Icon className={`w-8 h-8 ${colors.icon} mb-3`} />
              <div className={`text-3xl font-bold ${colors.icon} mb-2`}>
                {metric.value.toLocaleString()}{metric.unit || ''}
              </div>
              <div className="text-sm text-gray-600 font-medium">{metric.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Compact Analytics Panel
const CompactAnalytics = ({ alerts, onLocationClick }) => {
  const [activeTab, setActiveTab] = useState('trends');

  // Hourly trends - ใช้เฉพาะข้อมูลจริง
  const hourlyData = useMemo(() => {
    const data = Array(24).fill(0);
    alerts.forEach(alert => {
      const hour = new Date(alert.accessTime).getHours();
      data[hour]++;
    });
    return data.map((count, hour) => ({ hour, count }));
  }, [alerts]);

  // Location risk analysis
  const locationData = useMemo(() => {
    const locations = {};
    alerts.forEach(alert => {
      if (!locations[alert.location]) {
        locations[alert.location] = { high: 0, medium: 0, low: 0, total: 0 };
      }
      locations[alert.location][alert.severity]++;
      locations[alert.location].total++;
    });

    return Object.entries(locations)
      .map(([location, counts]) => ({ location, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [alerts]);

  const maxHourlyCount = Math.max(...hourlyData.map(d => d.count));
  const peakHour = hourlyData.find(d => d.count === maxHourlyCount);

  const tabs = [
    { id: 'trends', label: '📈 แนวโน้ม', desc: 'รูปแบบ 24 ชั่วโมง' },
    { id: 'locations', label: '📍 สถานที่', desc: 'วิเคราะห์ความเสี่ยง' },
    { id: 'insights', label: '💡 สรุป', desc: 'ข้อเสนะแนะ' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border min-h-[450px]">
      {/* Tab Header */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
          >
            <div className="mb-1">{tab.label}</div>
            <div className="text-xs opacity-75">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab Content - ขนาดพอดี */}
      <div className="p-5" style={{ minHeight: '350px' }}>
        {activeTab === 'trends' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800">แนวโน้มรายชั่วโมง</h4>
              {peakHour && peakHour.count > 0 && (
                <div className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">
                  ช่วงเวลาเสี่ยง: {peakHour.hour.toString().padStart(2, '0')}:00 ({peakHour.count} ครั้ง)
                </div>
              )}
            </div>

            {/* Chart Area */}
            {alerts.length > 0 ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-end justify-center space-x-1 h-32">
                    {hourlyData.map(({ hour, count }) => {
                      const height = maxHourlyCount > 0 ? Math.max((count / maxHourlyCount) * 100, count > 0 ? 5 : 2) : 2;
                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center group">
                          <div className="relative">
                            <div
                              className={`w-full rounded-t-md transition-all duration-300 cursor-pointer ${count > 0
                                  ? 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 shadow-sm'
                                  : 'bg-gray-300'
                                }`}
                              style={{ height: `${height}%`, minHeight: '8px' }}
                              title={`${hour.toString().padStart(2, '0')}:00 - ${count} การแจ้งเตือน`}
                            ></div>
                            {count > 0 && (
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {count} ครั้ง
                              </div>
                            )}
                          </div>
                          {(hour % 6 === 0 || hour === 0) && (
                            <div className="text-xs text-gray-600 mt-2 font-medium">
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
                    <div className="text-xl font-bold text-blue-600 mb-1">{alerts.length}</div>
                    <div className="text-xs text-gray-500">รวมทั้งหมด</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-amber-100 shadow-sm">
                    <div className="text-xl font-bold text-amber-600 mb-1">{(alerts.length / 24).toFixed(1)}</div>
                    <div className="text-xs text-gray-500">เฉลี่ย/ชั่วโมง</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-red-100 shadow-sm">
                    <div className="text-xl font-bold text-red-600 mb-1">
                      {hourlyData.filter(d => d.count > 0 && (d.hour < 6 || d.hour > 22)).length}
                    </div>
                    <div className="text-xs text-gray-500">ช่วงเวลาเสี่ยง</div>
                  </div>
                </div>
              </>
            ) : (
              // No data state
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <div className="text-2xl text-gray-400">📊</div>
                </div>
                <h5 className="text-base font-medium text-gray-600 mb-2">ไม่มีข้อมูลแนวโน้ม</h5>
                <p className="text-sm text-gray-500">
                  เมื่อมีการแจ้งเตือนจะแสดงแนวโน้มการเกิดเหตุการณ์ตลอด 24 ชั่วโมง
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'locations' && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">สถานที่เสี่ยงสูง</h4>
            {locationData.length > 0 ? (
              <div className="space-y-3">
                {locationData.map((location, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all border hover:border-blue-200"
                    onClick={() => onLocationClick && onLocationClick(location.location)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 mb-1" title={location.location}>
                        📍 {location.location}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        รวม {location.total} เหตุการณ์
                      </div>
                      <div className="flex space-x-2">
                        {location.high > 0 && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-medium">
                            สูง: {location.high}
                          </span>
                        )}
                        {location.medium > 0 && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-xs font-medium">
                            กลาง: {location.medium}
                          </span>
                        )}
                        {location.low > 0 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                            ต่ำ: {location.low}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-center">
                      <div className="text-2xl font-bold text-gray-800">{location.total}</div>
                      <div className="text-xs text-gray-500">ครั้ง</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <div className="text-2xl text-gray-400">📍</div>
                </div>
                <h5 className="text-base font-medium text-gray-600 mb-2">ไม่มีข้อมูลสถานที่</h5>
                <p className="text-sm text-gray-500">
                  เมื่อมีการแจ้งเตือนจะแสดงสถานที่ที่มีความเสี่ยงสูง
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">ข้อเสนอแนะเร่งด่วน</h4>
            {(alerts.filter(a => a.severity === 'high').length > 0 ||
              locationData[0]?.total > 5 ||
              peakHour?.count > 10) ? (
              <div className="space-y-4">
                {alerts.filter(a => a.severity === 'high').length > 0 && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="font-medium text-red-800">⚠️ เหตุการณ์วิกฤต</span>
                    </div>
                    <p className="text-red-700 mb-2 text-sm">
                      พบ {alerts.filter(a => a.severity === 'high').length} เหตุการณ์ที่ต้องการความสนใจเร่งด่วน
                    </p>
                    <div className="text-xs text-red-600 bg-red-100 p-3 rounded-lg">
                      💡 <strong>คำแนะนำ:</strong> ตรวจสอบและดำเนินการแก้ไขทันที เพื่อป้องกันปัญหาที่ร้ายแรงขึ้น
                    </div>
                  </div>
                )}

                {locationData[0]?.total > 5 && (
                  <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-xl">
                    <div className="flex items-center mb-2">
                      <MapPin className="w-5 h-5 text-amber-600 mr-2" />
                      <span className="font-medium text-amber-800">📍 สถานที่เสี่ยง</span>
                    </div>
                    <p className="text-amber-700 mb-2 text-sm">
                      {locationData[0]?.location} มีเหตุการณ์สูงผิดปกติ ({locationData[0]?.total} ครั้ง)
                    </p>
                    <div className="text-xs text-amber-600 bg-amber-100 p-3 rounded-lg">
                      💡 <strong>คำแนะนำ:</strong> ทบทวนระบบรักษาความปลอดภัยในพื้นที่นี้ และพิจารณาเพิ่มมาตรการเฝ้าระวัง
                    </div>
                  </div>
                )}

                {peakHour?.count > 10 && (
                  <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-xl">
                    <div className="flex items-center mb-2">
                      <Clock className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">🕒 ช่วงเวลาเสี่ยง</span>
                    </div>
                    <p className="text-blue-700 mb-2 text-sm">
                      เวลา {peakHour.hour.toString().padStart(2, '0')}:00 มีการแจ้งเตือนสูงสุด ({peakHour.count} ครั้ง)
                    </p>
                    <div className="text-xs text-blue-600 bg-blue-100 p-3 rounded-lg">
                      💡 <strong>คำแนะนำ:</strong> เพิ่มการตรวจสอบในช่วงเวลานี้ และพิจารณาปรับปรุงกระบวนการอนุญาต
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <div className="text-2xl text-green-600">✅</div>
                </div>
                <h5 className="text-base font-medium text-green-700 mb-2">สถานะปกติดี</h5>
                <p className="text-sm text-green-600 mb-3">
                  ระบบรักษาความปลอดภัยทำงานได้ดี ไม่พบเหตุการณ์ที่ต้องกังวล
                </p>
                <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                  <p className="text-xs text-green-700">
                    💡 <strong>เก็บระดับนี้ไว้:</strong> ดำเนินการตรวจสอบประจำและรักษามาตรฐานความปลอดภัยไว้
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Recent Alerts Sidebar
const RecentAlertsSidebar = ({ alerts, selectedKPI }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredAlerts = useMemo(() => {
    if (selectedKPI === 'all') return alerts.slice(0, 8);

    let filtered = alerts;
    switch (selectedKPI) {
      case 'high':
        filtered = alerts.filter(alert => alert.severity === 'high');
        break;
      case 'access_denied':
        filtered = alerts.filter(alert => alert.alertType === 'ACCESS_DENIED');
        break;
      case 'unusual_time':
        filtered = alerts.filter(alert => alert.alertType === 'UNUSUAL_TIME');
        break;
      case 'today_events':
        const today = new Date().toDateString();
        filtered = alerts.filter(alert => new Date(alert.accessTime).toDateString() === today);
        break;
      default:
        filtered = alerts;
    }
    return filtered.slice(0, 8);
  }, [alerts, selectedKPI]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white rounded-xl shadow-lg border flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="mt-4 writing-mode-vertical text-xs text-gray-600 font-medium">
          การแจ้งเตือน
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">การแจ้งเตือนล่าสุด</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-gray-600 rotate-90" />
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm text-gray-400 mt-1">ระบบทำงานปกติ</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAlerts.map((alert, index) => {
              const alertDetails = getAlertDetails(alert.alertType);
              const severityDetails = getSeverityDetails(alert.severity);
              const Icon = alertDetails.icon;
              const timeAgo = new Date(alert.accessTime).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${severityDetails.bgColor}`}>
                      <Icon className={`w-5 h-5 ${severityDetails.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-medium text-gray-800 truncate">
                          {alert.cardName}
                        </h4>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${severityDetails.pillClasses}`}>
                          {severityDetails.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        📍 {alert.location}
                      </p>
                      <p className="text-sm text-gray-500">
                        🕒 {timeAgo} • {alertDetails.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Export Modal Component
const ExportModal = ({ isOpen, onClose, onExport, filteredCount }) => {
  if (!isOpen) return null;

  const exportOptions = [
    { key: 'filtered', label: 'รายงานปัจจุบัน', desc: `${filteredCount} รายการ`, icon: BarChart3 },
    { key: 'daily', label: 'รายงานรายวัน', desc: '24 ชั่วโมงล่าสุด', icon: Clock },
    { key: 'weekly', label: 'รายงานรายสัปดาห์', desc: '7 วันล่าสุด', icon: Calendar },
    { key: 'all', label: 'รายงานทั้งหมด', desc: 'ข้อมูลทั้งหมด', icon: Eye }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">ส่งออกรายงาน</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {exportOptions.map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onExport(key)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border hover:border-blue-300"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">{label}</p>
                    <p className="text-sm text-gray-600">{desc}</p>
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

  const handleKPIClick = (type) => {
    setSelectedKPI(selectedKPI === type ? 'all' : type);
  };

  const handleLocationClick = (location) => {
    console.log('Location clicked:', location);
  };

  // Generate alerts function
  const generateAlerts = () => {
    if (!logData || logData.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const generatedAlerts = [];
    let alertId = 1;

    // Access denied alerts
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

    // Unusual time alerts
    const allowedLogs = logData.filter(log => (log.allow === true || log.allow === 1) && log.dateTime);
    allowedLogs.forEach(log => {
      try {
        const accessDate = new Date(log.dateTime);
        if (accessDate && !isNaN(accessDate.getTime())) {
          const hour = accessDate.getHours();
          const dayOfWeek = accessDate.getDay();

          if ((hour >= 22 || hour <= 6) || (dayOfWeek === 0 || dayOfWeek === 6)) {
            if (log.userType !== 'SECURITY' && log.userType !== 'security') {
              generatedAlerts.push({
                id: alertId++,
                alertType: 'UNUSUAL_TIME',
                severity: (hour >= 23 || hour <= 5) ? 'high' : 'medium',
                cardName: log.cardName || log.cardNumber || 'ไม่ระบุ',
                location: log.location || log.door || 'ไม่ระบุ',
                accessTime: log.dateTime,
                reason: `เข้าถึงนอกเวลา (${hour.toString().padStart(2, '0')}:00)`,
                userType: log.userType || 'ไม่ระบุ'
              });
            }
          }
        }
      } catch (error) {
        console.warn('Invalid date format:', log.dateTime);
      }
    });

    generatedAlerts.sort((a, b) => new Date(b.accessTime) - new Date(a.accessTime));
    setAlerts(generatedAlerts);
    setLoading(false);
    setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(generateAlerts, 500);
    return () => clearTimeout(timer);
  }, [logData]);

  // Enhanced export function - สร้างรายงานที่พร้อมส่ง
  const handleExport = (type) => {
    let dataToExport = [];
    let reportName = '';
    let dateRange = '';
    const now = new Date();

    switch (type) {
      case 'filtered':
        dataToExport = alerts;
        reportName = 'รายงานสถานะปัจจุบัน';
        dateRange = `ณ วันที่ ${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH')}`;
        break;
      case 'daily':
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= yesterday);
        reportName = 'รายงานรายวัน';
        dateRange = `ระหว่างวันที่ ${yesterday.toLocaleDateString('th-TH')} - ${now.toLocaleDateString('th-TH')}`;
        break;
      case 'weekly':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dataToExport = alerts.filter(alert => new Date(alert.accessTime) >= weekAgo);
        reportName = 'รายงานรายสัปดาห์';
        dateRange = `ระหว่างวันที่ ${weekAgo.toLocaleDateString('th-TH')} - ${now.toLocaleDateString('th-TH')}`;
        break;
      default:
        dataToExport = alerts;
        reportName = 'รายงานทั้งหมด';
        dateRange = `ข้อมูลทั้งหมดในระบบ ณ วันที่ ${now.toLocaleDateString('th-TH')}`;
    }

    // สร้างรายงานแบบมืออาชีพ
    const totalRecords = dataToExport.length;
    const criticalAlerts = dataToExport.filter(a => a.severity === 'high').length;
    const mediumAlerts = dataToExport.filter(a => a.severity === 'medium').length;
    const lowAlerts = dataToExport.filter(a => a.severity === 'low').length;
    const complianceRate = logData.length > 0 ? (((logData.length - alerts.length) / logData.length) * 100).toFixed(1) : '100.0';

    // สร้างเนื้อหารายงาน
    let csvContent = '';

    // Header ของรายงาน
    csvContent += `"รายงานความปลอดภัยระบบเข้าถึง"\n`;
    csvContent += `"${reportName}"\n`;
    csvContent += `"${dateRange}"\n`;
    csvContent += `"สร้างโดย: Executive Security Dashboard v2.0"\n`;
    csvContent += `\n`;

    // สรุปผู้บริหาร
    csvContent += `"สรุปสำหรับผู้บริหาร"\n`;
    csvContent += `"=============================="\n`;
    csvContent += `"จำนวนการแจ้งเตือนทั้งหมด:","${totalRecords} รายการ"\n`;
    csvContent += `"การแจ้งเตือนระดับวิกฤต:","${criticalAlerts} รายการ (${totalRecords > 0 ? ((criticalAlerts / totalRecords) * 100).toFixed(1) : 0}%)"\n`;
    csvContent += `"การแจ้งเตือนระดับกลาง:","${mediumAlerts} รายการ (${totalRecords > 0 ? ((mediumAlerts / totalRecords) * 100).toFixed(1) : 0}%)"\n`;
    csvContent += `"การแจ้งเตือนระดับต่ำ:","${lowAlerts} รายการ (${totalRecords > 0 ? ((lowAlerts / totalRecords) * 100).toFixed(1) : 0}%)"\n`;
    csvContent += `"อัตราการปฏิบัติตามนโยบาย:","${complianceRate}%"\n`;
    csvContent += `\n`;

    // คำแนะนำเชิงปฏิบัติ
    csvContent += `"คำแนะนำเชิงปฏิบัติ"\n`;
    csvContent += `"=================="\n`;
    if (criticalAlerts > 0) {
      csvContent += `"🔴 เร่งด่วน: พบเหตุการณ์วิกฤต ${criticalAlerts} รายการ ต้องการการดำเนินการทันที"\n`;
    }
    if (totalRecords > 50) {
      csvContent += `"🟡 แนะนำ: จำนวนการแจ้งเตือนสูง ควรทบทวนนโยบายการเข้าถึง"\n`;
    }
    if (parseFloat(complianceRate) < 95) {
      csvContent += `"🟠 ปรับปรุง: อัตราการปฏิบัติตามนโยบายต่ำกว่าเกณฑ์ (เป้าหมาย 95%)"\n`;
    }
    if (totalRecords === 0) {
      csvContent += `"🟢 ดีเยี่ยม: ไม่พบเหตุการณ์ที่ต้องกังวล ระบบทำงานได้ดี"\n`;
    }
    csvContent += `\n`;

    // สถิติเชิงลึก
    if (dataToExport.length > 0) {
      const locationStats = {};
      const timeStats = {};

      dataToExport.forEach(alert => {
        // นับตามสถานที่
        locationStats[alert.location] = (locationStats[alert.location] || 0) + 1;

        // นับตามชั่วโมง
        const hour = new Date(alert.accessTime).getHours();
        timeStats[hour] = (timeStats[hour] || 0) + 1;
      });

      const topLocation = Object.entries(locationStats).sort((a, b) => b[1] - a[1])[0];
      const peakHour = Object.entries(timeStats).sort((a, b) => b[1] - a[1])[0];

      csvContent += `"การวิเคราะห์เชิงลึก"\n`;
      csvContent += `"================="\n`;
      csvContent += `"สถานที่เสี่ยงสูงสุด:","${topLocation ? `${topLocation[0]} (${topLocation[1]} ครั้ง)` : 'ไม่มีข้อมูล'}"\n`;
      csvContent += `"ช่วงเวลาเสี่ยงสูงสุด:","${peakHour ? `${peakHour[0].padStart(2, '0')}:00 น. (${peakHour[1]} ครั้ง)` : 'ไม่มีข้อมูล'}"\n`;
      csvContent += `\n`;
    }

    // รายละเอียดข้อมูล
    csvContent += `"รายละเอียดการแจ้งเตือน"\n`;
    csvContent += `"======================="\n`;
    csvContent += `"ลำดับ","วันที่","เวลา","ประเภทการแจ้งเตือน","ระดับความร้ายแรง","ผู้ใช้/บัตร","สถานที่","รายละเอียด","สถานะ","หมายเหตุ"\n`;

    if (dataToExport.length === 0) {
      csvContent += `"ไม่มีข้อมูลการแจ้งเตือน","","","","","","","สถานะระบบปกติ","","ระบบรักษาความปลอดภัยทำงานได้ดี"\n`;
    } else {
      dataToExport.forEach((alert, index) => {
        const date = new Date(alert.accessTime);
        const alertType = getAlertDetails(alert.alertType).name;
        const severity = getSeverityDetails(alert.severity).label;
        const status = alert.severity === 'high' ? 'ต้องดำเนินการ' :
          alert.severity === 'medium' ? 'ติดตาม' : 'ทราบ';
        const note = alert.severity === 'high' ? 'เร่งด่วน' :
          alert.alertType === 'UNUSUAL_TIME' ? 'ตรวจสอบสิทธิ์' : 'ปกติ';

        const row = [
          index + 1,
          date.toLocaleDateString('th-TH'),
          date.toLocaleTimeString('th-TH'),
          alertType,
          severity,
          alert.cardName,
          alert.location,
          `"${alert.reason}"`,
          status,
          note
        ].join(',');
        csvContent += row + '\n';
      });
    }

    // Footer ของรายงาน
    csvContent += `\n`;
    csvContent += `"หมายเหตุ"\n`;
    csvContent += `"========"\n`;
    csvContent += `"1. รายงานนี้สร้างขึ้นโดยระบบอัตโนมัติ"\n`;
    csvContent += `"2. ข้อมูลได้รับการตรวจสอบความถูกต้องแล้ว"\n`;
    csvContent += `"3. หากพบเหตุการณ์ระดับวิกฤต ควรดำเนินการทันที"\n`;
    csvContent += `"4. ติดต่อทีมรักษาความปลอดภัย: ext. 1234"\n`;
    csvContent += `\n`;
    csvContent += `"ลายมือชื่อผู้อนุมัติ: _______________________"\n`;
    csvContent += `"วันที่อนุมัติ: _______________________"\n`;

    // สร้างไฟล์และดาวน์โหลด
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `รายงานความปลอดภัย_${reportName.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-20 bg-white rounded-xl mb-6 shadow-sm"></div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl shadow-sm"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 h-80 bg-white rounded-xl shadow-sm"></div>
              <div className="h-80 bg-white rounded-xl shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto p-8">
        {/* Spacious Header */}
        <header className="mb-10">
          <div className="bg-white rounded-3xl p-8 shadow-lg border-0 bg-gradient-to-r from-white to-blue-50">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 mb-2">
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
                  className="flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Download className="w-5 h-5 mr-3" />ส่งออกรายงาน
                </button>
                <button
                  onClick={generateAlerts}
                  className="flex items-center px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <RefreshCw className="w-5 h-5 mr-3" />รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Spacious KPI Grid */}
        <section className="mb-10">
          <CompactKPIGrid
            alerts={alerts}
            logData={logData}
            selectedKPI={selectedKPI}
            onKPIClick={handleKPIClick}
          />
        </section>

        {/* Main Content Grid with more space */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Analytics Panel - Takes 3 columns */}
          <div className="lg:col-span-3">
            <CompactAnalytics
              alerts={alerts}
              onLocationClick={handleLocationClick}
            />
          </div>

          {/* Recent Alerts Sidebar - Takes 2 columns for more space */}
          <div className="lg:col-span-2">
            <RecentAlertsSidebar
              alerts={alerts}
              selectedKPI={selectedKPI}
            />
          </div>
        </section>

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          filteredCount={alerts.length}
        />

        {/* Spacious Footer */}
        <footer className="mt-12 text-center">
          <div className="bg-white p-6 rounded-2xl shadow-lg border">
            <div className="flex items-center justify-center space-x-6 text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-base font-medium">ระบบออนไลน์</span>
              </div>
              <div className="text-slate-400">•</div>
              <span className="text-base">อัปเดตล่าสุด: {lastUpdated || 'ไม่ระบุ'}</span>
              <div className="text-slate-400">•</div>
              <span className="text-base">Security Dashboard v2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SecurityDashboard;
