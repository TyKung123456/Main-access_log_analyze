// src/components/Analytics/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import SecurityDashboard from '../Security/SecurityDashboard';
import SecurityAlerts from '../Security/SecurityAlerts';
import {
  Shield,
  Activity,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  Construction,
  Clock
} from 'lucide-react';

const AnalyticsPage = ({ logData, stats }) => {
  const [activeView, setActiveView] = useState('overview');
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate security metrics from log data
  useEffect(() => {
    const calculateSecurityMetrics = () => {
      // Logic การคำนวณเหมือนเดิม ไม่มีการเปลี่ยนแปลง
      if (!logData || logData.length === 0) {
        setSecurityMetrics({
          totalEvents: 0,
          riskScore: 0,
          alertsToday: 0,
          securityTrend: 'stable'
        });
        setIsLoading(false);
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

      setIsLoading(false);
    };

    calculateSecurityMetrics();
  }, [logData]);

  const views = [
    { id: 'overview', label: 'ภาพรวม', icon: TrendingUp, description: 'สรุปสถานการณ์ความปลอดภัย' },
    { id: 'anomalies', label: 'ความผิดปกติ', icon: Shield, description: 'การวิเคราะห์ความผิดปกติเชิงลึก' },
    { id: 'alerts', label: 'การแจ้งเตือน', icon: AlertTriangle, description: 'การแจ้งเตือนแบบเรียลไทม์' },
    { id: 'monitoring', label: 'การติดตาม', icon: Activity, description: 'การติดตามแบบต่อเนื่อง' }
  ];

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

  const renderOverview = () => {
    const riskTheme = getRiskTheme(securityMetrics?.riskScore || 0);
    const trendUI = getTrendUI(securityMetrics?.securityTrend);

    return (
      <div className="space-y-8">
        {/* Security Metrics Overview - NEW CARD DESIGN */}
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
            <h3 className="text-lg font-semibold flex items-center gap-3">
              <span className="flex items-center justify-center h-10 w-10 bg-orange-100 text-orange-600 rounded-lg">
                🚨
              </span>
              การแจ้งเตือนล่าสุด
            </h3>
          </div>
          <div className="p-6">
            <SecurityAlerts />
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'anomalies':
        return <SecurityDashboard />;
      case 'alerts':
        return <SecurityAlerts />;
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
        return renderOverview();
    }
  };

  if (isLoading) {
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
            <Shield className="mr-3 h-8 w-8 text-blue-600" />
            แดชบอร์ดความปลอดภัย
          </h1>
          <p className="text-slate-500 mt-1">
            วิเคราะห์และติดตามข้อมูลความปลอดภัยของระบบ
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-full shadow-sm border border-slate-200">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
          <span>ข้อมูลเป็นปัจจุบัน</span>
        </div>
      </header>

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

export default AnalyticsPage;