import React, { useState, useEffect } from 'react';
import DeniedReasonsChart from '../components/Analytics/Charts/DeniedReasonsChart';
import StatsCards from '../components/Dashboard/StatsCards';
import DataFilters from '../components/Dashboard/DataFilters';
import RecentAccessTable from '../components/Dashboard/RecentAccessTable';
import HourlyTrendChart from '../components/Dashboard/Charts/HourlyTrendChart';
import LocationDistributionChart from '../components/Dashboard/Charts/LocationDistributionChart';
import DirectionChart from '../components/Dashboard/Charts/DirectionChart';
import SecurityDashboard from '../components/Security/SecurityDashboard';
import {
  Shield, // Re-add Shield icon
  Activity,
  AlertTriangle, // Re-add AlertTriangle icon
  TrendingUp, // Re-add TrendingUp icon
  BarChart3, // Re-add BarChart3 icon
  ShieldAlert, // Re-add ShieldAlert icon
  Construction,
  Clock,
  LayoutDashboard, // New icon for combined dashboard
  LineChart, // New icon for charts
  List, // New icon for recent access
} from 'lucide-react';

const CombinedDashboardAnalyticsPage = ({
  logData,
  filteredData,
  stats,
  chartData,
  filters,
  updateFilter,
  clearFilters,
  getFilterCount,
  loading,
  error,
  refreshData,
  useRealData,
  uploadStats,
  systemStatus,
  onRowClick, // Receive onRowClick prop
  sort, // Receive sort state from useLogData
  onSortChange // Receive onSortChange handler from useLogData
}) => {
  const [activeView, setActiveView] = useState('dashboard-overview'); // Default to dashboard overview
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [isLoadingSecurityMetrics, setIsLoadingSecurityMetrics] = useState(true);
  const [selectedSecurityKPI, setSelectedSecurityKPI] = useState('all'); // State for security dashboard KPI filtering

  // Filtered data for RecentAccessTable based on selectedSecurityKPI
  const filteredSecurityAlerts = React.useMemo(() => {
    // This logic should ideally mirror the filtering in SecurityDashboard
    // to ensure consistency when a KPI card is clicked.
    // For now, we'll pass the full logData and let SecurityDashboard handle its internal filtering.
    // However, if the user clicks a KPI card, we need to apply that filter here for the table.
    if (selectedSecurityKPI === 'all') {
      return logData; // Or a subset like deniedLogData if that's the default for the table
    }

    // Replicate the filtering logic from SecurityDashboard.jsx
    const generatedAlerts = [];
    let alertId = 1;

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
          userType: latest.userType || 'ไม่ระระบุ'
        });
      }
    });

    generatedAlerts.sort((a, b) => {
      const dateA = new Date(a.accessTime);
      const dateB = new Date(b.accessTime);
      return dateB - dateA;
    });

    switch (selectedSecurityKPI) {
      case 'high':
        return generatedAlerts.filter(alert => alert.severity === 'high');
      case 'medium':
        return generatedAlerts.filter(alert => alert.severity === 'medium');
      case 'low':
        return generatedAlerts.filter(alert => alert.severity === 'low');
      case 'access_denied':
        return generatedAlerts.filter(alert => alert.alertType === 'ACCESS_DENIED');
      case 'unusual_time':
        return generatedAlerts.filter(alert => alert.alertType === 'UNUSUAL_TIME');
      case 'multiple_attempts':
        return generatedAlerts.filter(alert => alert.alertType === 'MULTIPLE_ATTEMPTS');
      case 'risk_locations':
        return generatedAlerts.filter(alert => alert.location && alert.location !== 'ไม่ระบุ');
      case 'suspicious_users':
        return generatedAlerts.filter(alert => alert.cardName && alert.cardName !== 'ไม่ระบุ');
      case 'today_events':
        const today = new Date().toDateString();
        return generatedAlerts.filter(alert => new Date(alert.accessTime).toDateString() === today);
      case 'compliance':
        return generatedAlerts.filter(alert => alert.severity !== 'high');
      default:
        return generatedAlerts;
    }
  }, [logData, selectedSecurityKPI]);

  const handleSecurityKPIClick = (type) => {
    setSelectedSecurityKPI(type);
    setActiveView('recent-access'); // Switch to recent access table when a KPI is clicked
  };

  // Apply filters when they change (from DashboardPage)
  useEffect(() => {
    // This useEffect should trigger data refresh when filters change, not update filters themselves.
    // The `filters` prop is already the latest state from `useFilters` in App.jsx.
    // `refreshData` (which is `fetchAPIData` from `useLogData`) should be called here.
    // Pass page as 1 when filters change, and then the filters object
    refreshData(1, filters);
  }, [filters, refreshData]);

  // Manual refresh handler (from DashboardPage)
  const handleRefresh = async () => {
    setIsLoadingSecurityMetrics(true); // Also set loading for security metrics
    try {
      await refreshData(filters);
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setIsLoadingSecurityMetrics(false);
    }
  };

  // Calculate security metrics from log data (from AnalyticsPage)
  useEffect(() => {
    const calculateSecurityMetrics = () => {
      if (!logData || logData.length === 0) {
        setSecurityMetrics({
          totalEvents: 0,
          riskScore: 0,
          alertsToday: 0,
          securityTrend: 'stable',
          deniedRate: 0
        });
        setIsLoadingSecurityMetrics(false);
        return;
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const todayEvents = logData.filter(log =>
        log.accessTime && log.accessTime.startsWith(todayStr)
      );

      const deniedEvents = logData.filter(log =>
        log.status === 'denied' || log.accessResult === 'DENIED'
      );

      const alertsToday = todayEvents.filter(log =>
        log.status === 'denied' || log.accessResult === 'DENIED'
      ).length;

      const deniedRate = logData.length > 0 ? (deniedEvents.length / logData.length) * 100 : 0;
      const riskScore = Math.min(100, Math.max(0, deniedRate * 2));

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayAlerts = logData.filter(log =>
        log.accessTime && log.accessTime.startsWith(yesterdayStr) &&
        (log.status === 'denied' || log.accessResult === 'DENIED')
      ).length;

      let securityTrend = 'stable';
      if (alertsToday > yesterdayAlerts * 1.2) {
        securityTrend = 'increasing';
      } else if (alertsToday < yesterdayAlerts * 0.8) {
        securityTrend = 'decreasing';
      }

      setSecurityMetrics({
        totalEvents: logData.length,
        riskScore: Math.round(riskScore),
        alertsToday,
        securityTrend,
        deniedRate: Math.round(deniedRate * 10) / 10
      });

      setIsLoadingSecurityMetrics(false);
    };

    calculateSecurityMetrics();
  }, [logData]);

  // Safe chart data with fallbacks (from DashboardPage)
  const safeChartData = {
    hourlyData: chartData?.hourlyData || [],
    locationData: chartData?.locationData || [],
    directionData: chartData?.directionData || []
  };

  // Safe stats with fallbacks (from DashboardPage)
  const safeStats = {
    total_records: stats?.total_records || 0,
    success_count: stats?.success_count || 0,
    denied_count: stats?.denied_count || 0,
    success_rate: stats?.success_rate || 0,
    unique_locations: stats?.unique_locations || 0,
    unique_cards: stats?.unique_cards || 0,
    ...stats
  };

  const getTrendUI = (trend) => {
    switch (trend) {
      case 'increasing':
        return { text: 'เพิ่มขึ้น', icon: '📈', color: 'text-red-600' };
      case 'decreasing':
        return { text: 'ลดลง', icon: '📉', color: 'text-green-600' };
      default:
        return { text: 'คงที่', icon: '➡️', color: 'text-gray-600' };
    }
  };

  const getRiskTheme = (score) => {
    if (score >= 70) {
      return {
        iconColor: 'text-red-600',
        iconBg: 'bg-red-100',
        gradientFrom: 'from-red-50',
      };
    }
    if (score >= 40) {
      return {
        iconColor: 'text-yellow-600',
        iconBg: 'bg-yellow-100',
        gradientFrom: 'from-yellow-50',
      };
    }
    return {
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      gradientFrom: 'from-green-50',
    };
  };

  const views = [
    { id: 'dashboard-overview', label: 'ภาพรวมแดชบอร์ด', icon: LayoutDashboard, description: 'ภาพรวมสถิติการเข้าถึง' },
    { id: 'charts', label: 'กราฟวิเคราะห์', icon: LineChart, description: 'กราฟแสดงแนวโน้มและข้อมูลเชิงลึก' },
    { id: 'security-analysis', label: 'วิเคราะห์ความปลอดภัย', icon: Shield, description: 'สรุปและแจ้งเตือนความปลอดภัย' },
    { id: 'recent-access', label: 'รายการเข้าถึงล่าสุด', icon: List, description: 'ดูรายการเข้าถึง 10 รายการล่าสุด' },
    { id: 'monitoring', label: 'การติดตาม (เร็วๆ นี้)', icon: Activity, description: 'การติดตามแบบต่อเนื่อง' }
  ];

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={safeStats} loading={loading} />

      {/* Filters */}
      <DataFilters
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        loading={loading}
      />

      {/* Data Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">แสดงข้อมุล</p>
            <p className="text-lg font-semibold text-gray-900">
              {filteredData.length.toLocaleString('th-TH')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ทั้งหมด</p>
            <p className="text-lg font-semibold text-gray-900">
              {safeStats.total_records.toLocaleString('th-TH')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">อัตราสำเร็จ</p>
            <p className="text-lg font-semibold text-green-600">
              {safeStats.success_rate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">สถานที่</p>
            <p className="text-lg font-semibold text-blue-600">
              {safeStats.unique_locations}
            </p>
          </div>
        </div>

        {useRealData && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              🔄 ข้อมูลอัปเดตอัตโนมัติทุก 30 วินาที •
              เชื่อมต่อกับฐานข้อมูล PostgreSQL •
              รองรับข้อมูลภาษาไทย
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2">
        <HourlyTrendChart
          data={safeChartData.hourlyData}
          loading={chartData?.loading}
        />
      </div>

      <LocationDistributionChart
        data={safeChartData.locationData}
        loading={chartData?.loading}
      />

      <DirectionChart
        data={safeChartData.directionData}
        loading={chartData?.loading}
      />
      <DeniedReasonsChart data={logData} loading={loading} />
    </div>
  );

  const renderSecurityAnalysis = () => {
    const riskTheme = getRiskTheme(securityMetrics?.riskScore || 0);
    const trendUI = getTrendUI(securityMetrics?.securityTrend);

    return (
      <div className="space-y-8">
        {/* Security Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Events Card */}
          <div className="p-5 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-white border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">เหตุการณ์ทั้งหมด</p>
                <p className="text-3xl font-bold text-slate-800">{securityMetrics?.totalEvents?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Risk Score Card */}
          <div className={`p-5 rounded-2xl shadow-sm bg-gradient-to-br ${riskTheme.gradientFrom} to-white border border-slate-100`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">คะแนนความเสี่ยง</p>
                <p className={`text-3xl font-bold ${riskTheme.iconColor}`}>{securityMetrics?.riskScore || 0}%</p>
              </div>
              <div className={`p-3 ${riskTheme.iconBg} rounded-full`}>
                <ShieldAlert className={`h-7 w-7 ${riskTheme.iconColor}`} />
              </div>
            </div>
          </div>

          {/* Alerts Today Card */}
          <div className="p-5 rounded-2xl shadow-sm bg-gradient-to-br from-orange-50 to-white border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">การแจ้งเตือนวันนี้</p>
                <p className="text-3xl font-bold text-slate-800">{securityMetrics?.alertsToday || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Security Trend Card */}
          <div className="p-5 rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-white border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">แนวโน้มความปลอดภัย</p>
                <p className={`text-xl font-bold flex items-center gap-2 ${trendUI.color}`}>
                  <span>{trendUI.icon}</span>
                  {trendUI.text}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts Preview */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-2xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-200">
          </div>
          <div className="p-6">
          </div>
        </div>
        <SecurityDashboard
          logData={logData}
          onKPIClick={handleSecurityKPIClick}
          selectedKPI={selectedSecurityKPI}
        />
      </div>
    );
  };

  const renderRecentAccess = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">จำนวนรายการที่แสดง</p>
        <p className="text-lg font-semibold text-blue-600">
          {filteredSecurityAlerts.length.toLocaleString('th-TH')}
        </p>
      </div>
      <RecentAccessTable
        data={filteredSecurityAlerts}
        loading={loading}
        onRowClick={onRowClick} // Pass the onRowClick prop down
        onSortChange={onSortChange} // Pass the sort handler
        currentSortColumn={sort.column} // Pass current sort column
        currentSortOrder={sort.order} // Pass current sort order
      />
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard-overview':
        return renderDashboardOverview();
      case 'charts':
        return renderCharts();
      case 'security-analysis':
        return renderSecurityAnalysis();
      case 'recent-access':
        return renderRecentAccess();
      case 'monitoring':
        return (
          <div className="text-center p-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-yellow-100 rounded-full mb-4">
              <Construction className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Coming Soon!
            </h3>
            <p className="text-slate-600 max-w-md mx-auto">
              ฟีเจอร์การติดตามสถานะแบบละเอียดกำลังอยู่ในขั้นตอนการพัฒนา
              แล้วพบกันเร็วๆ นี้ค่ะ
            </p>
          </div>
        );
      default:
        return renderDashboardOverview();
    }
  };

  if (loading && !logData.length) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-14 bg-slate-200 rounded-xl w-full"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>)}
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <LayoutDashboard className="mr-3 h-8 w-8 text-blue-600" />
            แดชบอร์ด & การวิเคราะห์
          </h1>
          <p className="text-slate-500 mt-1">
            ภาพรวม, สถิติ และการวิเคราะห์เชิงลึกของข้อมูลการเข้าถึง
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-full shadow-sm border border-slate-200">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
          <span>ข้อมูลเป็นปัจจุบัน</span>
        </div>
      </header>

      {/* Error Alert (from DashboardPage) */}
      {error && logData.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>คำเตือน:</strong> บางข้อมูลอาจไม่อัปเดต - {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Navigation */}
      <div className="bg-slate-100 rounded-xl p-1.5">
        <nav className="flex space-x-1" role="tablist">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;

            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 ease-in-out flex-1
                  ${isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-blue-600'
                  }
                `}
                role="tab"
                aria-selected={isActive}
                title={view.description}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main role="tabpanel" aria-labelledby={`tab-${activeView}`}>
        {renderContent()}
      </main>

      {/* Footer Info */}
      <footer className="text-center text-sm text-slate-400 pt-4">
        <p className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>อัปเดตล่าสุดเมื่อ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
        </p>
      </footer>
    </div>
  );
};

export default CombinedDashboardAnalyticsPage;
