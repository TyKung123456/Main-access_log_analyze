import React, { useState, useEffect } from 'react';
import StatsCards from '../components/Dashboard/StatsCards';
import RecentAccessTable from '../components/Dashboard/RecentAccessTable';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Clock,
  LayoutDashboard,
  LineChart,
} from 'lucide-react';
import { computeSuspicionByUser, computeSuspicionAll } from '../utils/suspicionScore';

// Simple collapsible wrapper for overview blocks
const CollapsibleCard = ({ title, children, actions = null, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-blue-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-blue-50/50">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 bg-blue-300 rounded-full" />
          <h3 className="font-semibold text-blue-900 text-base">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => setOpen(o => !o)}
            className="text-blue-700 hover:text-blue-900 text-xs"
            title={open ? 'พับเก็บ' : 'แสดง'}
          >
            {open ? 'ย่อ' : 'แสดง'}
          </button>
        </div>
      </div>
      {open && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Simple horizontal bar list (no external lib)
const SimpleBarList = ({ data = [], maxValue, valueKey = 'value', labelKey = 'label', colorKey = 'color', rightText }) => {
  const max = Math.max(1, maxValue ?? Math.max(0, ...data.map(d => d[valueKey] || 0)));
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const v = d[valueKey] || 0;
        const pct = Math.round((v / max) * 100);
        const color = d[colorKey] || '#3b82f6';
        return (
          <li key={i} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="truncate mr-2">{d[labelKey]}</div>
              <div className="text-gray-700 whitespace-nowrap">{rightText ? rightText(d) : v.toLocaleString('th-TH')}</div>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
              <div className="h-2" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        );
      })}
      {data.length === 0 && (
        <li className="text-sm text-gray-500">ไม่มีข้อมูล</li>
      )}
    </ul>
  );
};

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
  onRowClick,
  sort = { column: null, order: null },
  onSortChange
}) => {
  const [activeView, setActiveView] = useState('overview');
  const [analyticsRange, setAnalyticsRange] = useState('7d'); // kept but graphs removed
  const [suspectDetail, setSuspectDetail] = useState(null);
  const [locDetail, setLocDetail] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshIntervalSec] = useState(60);
  const [showIncidentChart, setShowIncidentChart] = useState(true);

  const scrollToSection = (id) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [isLoadingSecurityMetrics, setIsLoadingSecurityMetrics] = useState(true);
  const [selectedSecurityKPI, setSelectedSecurityKPI] = useState('all');

  // Optional auto refresh for near real-time mini charts and stats
  useEffect(() => {
    if (!autoRefresh || !refreshData) return;
    const id = setInterval(() => {
      try { refreshData(1, filters, sort); } catch (e) { /* noop */ }
    }, refreshIntervalSec * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshIntervalSec, refreshData, filters, sort]);

  // Filtered data for RecentAccessTable based on selectedSecurityKPI
  const filteredSecurityAlerts = React.useMemo(() => {
    if (selectedSecurityKPI === 'all') {
      return logData;
    }

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
    setActiveView('security');
  };

  useEffect(() => {
    refreshData(1, filters);
  }, [filters, refreshData]);

  const handleRefresh = async () => {
    setIsLoadingSecurityMetrics(true);
    try {
      await refreshData(filters);
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setIsLoadingSecurityMetrics(false);
    }
  };

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

  const safeChartData = {
    hourlyData: chartData?.hourlyData || [],
    locationData: chartData?.locationData || [],
    directionData: chartData?.directionData || []
  };

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
    { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard, description: 'สรุปสำคัญและแนวโน้ม' }
  ];

  // Lightweight mini sparkline component (no external chart lib)
  const MiniSparkline = ({ points = [], width = 140, height = 40, stroke = '#2563eb' }) => {
    if (!points || points.length === 0) {
      return <div className="h-10 flex items-center text-xs text-gray-400">ไม่มีข้อมูล</div>;
    }
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = Math.max(1, max - min);
    const stepX = points.length > 1 ? (width - 4) / (points.length - 1) : width - 4;
    const path = points
      .map((v, i) => {
        const x = 2 + i * stepX;
        const y = 2 + (height - 4) - ((v - min) / span) * (height - 4);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline fill="none" stroke="#bfdbfe" strokeWidth="2" points={points.map((v,i)=>{
          const x = 2 + i * stepX; const y = 2 + (height - 4) - ((v - min) / span) * (height - 4); return `${x},${y}`;
        }).join(' ')} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  const renderOverview = () => {
    // เตรียม Top 5 สถานที่จากข้อมูลกราฟ location
    const topLocations = (safeChartData.locationData || [])
      .map(i => ({ name: i.location || i.locationDisplay || 'ไม่ระบุ', count: parseInt(i.count) || 0 }))
      .sort((a,b) => b.count - a.count)
      .slice(0,5);

    // Today vs 7-day average (แทน sparkline 24 ชม.)
    const todayVs7d = (() => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start7d = new Date(startOfToday); start7d.setDate(startOfToday.getDate() - 7);
      let todayTotal = 0, todayDenied = 0;
      let total7d = 0, denied7d = 0;
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        if (dt >= startOfToday && dt <= now) { todayTotal++; if (denied) todayDenied++; }
        else if (dt >= start7d && dt < startOfToday) { total7d++; if (denied) denied7d++; }
      });
      const avgPerDay = Math.round(total7d / 7);
      const avgRate = total7d > 0 ? Math.round((denied7d / total7d) * 100) : 0;
      const todayRate = todayTotal > 0 ? Math.round((todayDenied / todayTotal) * 100) : 0;
      const max = Math.max(1, todayTotal, avgPerDay);
      return { todayTotal, todayRate, avgPerDay, avgRate, todayPct: Math.round((todayTotal/max)*100), avgPct: Math.round((avgPerDay/max)*100) };
    })();

    // อัตราส่วน IN/OUT แบบสรุป
    const dirStats = (safeChartData.directionData || []).reduce((acc, i) => {
      const key = (i.direction || i.name || '').toUpperCase();
      const v = parseInt(i.count || i.value || 0) || 0;
      if (key === 'IN') acc.IN += v; else if (key === 'OUT') acc.OUT += v;
      acc.total += v; return acc;
    }, { IN:0, OUT:0, total:0 });

    // Data freshness (last updated) and last 24h count
    const freshness = (() => {
      let last = null, last24h = 0;
      const now = new Date();
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null;
        if (!dt || isNaN(dt)) return;
        if (!last || dt > last) last = dt;
        const diffH = (now - dt) / (1000*60*60);
        if (diffH >= 0 && diffH <= 24) last24h += 1;
      });
      return { last, last24h };
    })();

    // KPI delta: denied rate compared with previous 7 days
    const kpiDelta = (() => {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 7);
      const prevStart = new Date(now); prevStart.setDate(now.getDate() - 14);
      const prevEnd = new Date(now); prevEnd.setDate(now.getDate() - 7);

      let curT=0, curD=0, prevT=0, prevD=0;
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        if (dt >= start && dt <= now) { curT++; if (denied) curD++; }
        else if (dt >= prevStart && dt < prevEnd) { prevT++; if (denied) prevD++; }
      });
      const curRate = curT>0 ? (curD/curT)*100 : 0;
      const prevRate = prevT>0 ? (prevD/prevT)*100 : 0;
      const delta = Math.round((curRate - prevRate) * 10)/10;
      return { curRate: Math.round(curRate*10)/10, prevRate: Math.round(prevRate*10)/10, delta };
    })();

    // Compare Today vs 7-day average for key metrics
    const compareTodayVs7d = (() => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startPrev = new Date(startToday.getTime() - 7*24*60*60*1000);

      let t_total=0, t_denied=0, t_off=0;
      let p_total=0, p_denied=0, p_off=0;

      const offCheck = (dt) => {
        const h = dt.getHours(); const d = dt.getDay();
        return (h >= 22 || h <= 6) || (d === 0 || d === 6);
      };

      const attemptsToday = new Map(); // key user|loc
      const attemptsPrevByDay = new Map(); // dayKey -> Map

      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        const off = offCheck(dt) && (l.allow === true || l.allow === 1);
        if (dt >= startToday) {
          t_total++; if (denied) t_denied++; if (off) t_off++;
          if (denied) {
            const key = `${l.cardName || l.cardNumber || '-'}|${l.location || l.door || '-'}`;
            attemptsToday.set(key, (attemptsToday.get(key) || 0) + 1);
          }
        } else if (dt >= startPrev && dt < startToday) {
          p_total++; if (denied) p_denied++; if (off) p_off++;
          if (denied) {
            const dk = `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`;
            const dayMap = attemptsPrevByDay.get(dk) || new Map();
            const key = `${l.cardName || l.cardNumber || '-'}|${l.location || l.door || '-'}`;
            dayMap.set(key, (dayMap.get(key) || 0) + 1);
            attemptsPrevByDay.set(dk, dayMap);
          }
        }
      });

      const t_multi = Array.from(attemptsToday.values()).filter(c => c>=3).length;
      // average multi attempts per day across 7 days
      let prevMultiSum = 0; attemptsPrevByDay.forEach(map => {
        prevMultiSum += Array.from(map.values()).filter(c => c>=3).length;
      });
      const p_multi_avg = Math.round(prevMultiSum / 7);

      const p_total_avg = Math.round(p_total / 7);
      const p_denied_avg = Math.round(p_denied / 7);
      const p_off_avg = Math.round(p_off / 7);

      return [
        { label: 'จำนวนเหตุการณ์', today: t_total, avg: p_total_avg, colorA: '#2563eb', colorB: '#93c5fd' },
        { label: 'ถูกปฏิเสธ', today: t_denied, avg: p_denied_avg, colorA: '#ef4444', colorB: '#fecaca' },
        { label: 'นอกเวลา (อนุญาต)', today: t_off, avg: p_off_avg, colorA: '#f59e0b', colorB: '#fde68a' },
        { label: 'พยายามซ้ำ (คู่เหตุการณ์)', today: t_multi, avg: p_multi_avg, colorA: '#8b5cf6', colorB: '#ddd6fe' },
      ];
    })();

    // Incident feed (latest 5)
    const incidentFeed = (() => {
      const items = [];
      const deniedLogs = (logData || []).filter(l => l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED');
      deniedLogs.forEach(l => items.push({
        type: 'DENIED',
        when: l.dateTime,
        user: l.cardName || l.cardNumber || 'ไม่ระบุ',
        location: l.location || l.door || 'ไม่ระบุ',
        reason: l.reason || 'ถูกปฏิเสธ'
      }));
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const h = dt.getHours(); const d = dt.getDay();
        if ((l.allow === true || l.allow === 1) && (h >= 22 || h <= 6 || d===0 || d===6)) {
          items.push({ type: 'OFF_HOURS', when: l.dateTime, user: l.cardName || l.cardNumber || 'ไม่ระบุ', location: l.location || l.door || 'ไม่ระบุ', hour: h });
        }
      });
      // multiple attempts by user-location
      const attempts = new Map();
      deniedLogs.forEach(l => {
        const key = `${l.cardName || l.cardNumber || '-'}|${l.location || l.door || '-'}`;
        attempts.set(key, (attempts.get(key) || 0) + 1);
      });
      attempts.forEach((cnt, key) => {
        if (cnt >= 3) {
          const [user, location] = key.split('|');
          items.push({ type: 'MULTI_DENY', when: null, user, location, count: cnt });
        }
      });
      // sort newest first
      const sorted = items.sort((a,b) => new Date(b.when || 0) - new Date(a.when || 0));
      // collapse near-duplicate entries (same type+user+location within 5 minutes)
      const deduped = [];
      const lastSeen = new Map();
      sorted.forEach(it => {
        const key = `${it.type}|${it.user}|${it.location}`;
        const t = it.when ? new Date(it.when).getTime() : null;
        const prev = lastSeen.get(key);
        if (prev && t && Math.abs(prev - t) <= 5*60*1000) {
          // skip near-duplicate
          return;
        }
        if (t) lastSeen.set(key, t);
        deduped.push(it);
      });
      return deduped.slice(0,5);
    })();

    // Risky hours (7 วัน): คะแนน = denied*2 + off-hours allowed*1
    const riskyHoursTop = (() => {
      const now = new Date();
      const start7 = new Date(now.getTime() - 7*24*60*60*1000);
      const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, score: 0, count: 0 }));
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt) || dt < start7 || dt > now) return;
        const h = dt.getHours(); const d = dt.getDay();
        const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        const off = (h >= 22 || h <= 6) || (d === 0 || d === 6);
        const b = buckets[h];
        b.count += 1;
        if (denied) b.score += 2;
        if (!denied && off) b.score += 1; // allowed off-hours still adds risk
      });
      return buckets
        .filter(b => b.count > 0 || b.score > 0)
        .sort((a,b) => (b.score - a.score) || (b.count - a.count))
        .slice(0, 6)
        .map(b => ({ label: `${String(b.hour).padStart(2,'0')}:00`, value: b.score, count: b.count, color: '#9333ea' }));
    })();

    // Risk bands (users)
    const bands = (() => {
      const all = computeSuspicionAll(logData || []);
      let low=0, mid=0, high=0;
      all.forEach(u => {
        if (u.score >= 50) high++; else if (u.score >= 20) mid++; else low++;
      });
      return { low, mid, high, total: all.length };
    })();

    // Suspicious users with explainable score
    const suspiciousUsers = computeSuspicionByUser(logData || [], 5);

    return (
      <div className="space-y-6">
        {/* 1) KPIs */}
        <StatsCards stats={safeStats} loading={loading} />

        {/* 2) กราฟย่อ (ไม่หนักเครื่อง) - รวมเป็นบล็อกเดียวและพับเก็บได้ */}
        <CollapsibleCard title="กราฟย่อ">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">วันนี้ เทียบค่าเฉลี่ย 7 วัน</div>
              <div className="text-xs text-gray-600">จำนวนเหตุการณ์</div>
              <div className="mt-1 h-2 bg-gray-100 rounded overflow-hidden flex">
                <div className="bg-blue-600" style={{ width: `${todayVs7d.todayPct}%` }} title={`วันนี้ ${todayVs7d.todayTotal.toLocaleString('th-TH')}`} />
                <div className="bg-gray-200" style={{ width: `${100 - todayVs7d.todayPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-gray-600">วันนี้ {todayVs7d.todayTotal.toLocaleString('th-TH')} รายการ</div>
              <div className="mt-3 text-xs text-gray-600">เฉลี่ย 7 วัน</div>
              <div className="mt-1 h-2 bg-gray-100 rounded overflow-hidden flex">
                <div className="bg-indigo-400" style={{ width: `${todayVs7d.avgPct}%` }} title={`เฉลี่ย/วัน ${todayVs7d.avgPerDay.toLocaleString('th-TH')}`} />
                <div className="bg-gray-200" style={{ width: `${100 - todayVs7d.avgPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-gray-600">เฉลี่ย/วัน {todayVs7d.avgPerDay.toLocaleString('th-TH')}</div>
              <div className="mt-2 text-[11px] text-gray-600">อัตราถูกปฏิเสธ: วันนี้ {todayVs7d.todayRate}% • 7 วัน {todayVs7d.avgRate}%</div>
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900 mb-2">สัดส่วนทิศทาง</div>
              {(() => {
                const total = Math.max(1, dirStats.total);
                const inPct = Math.round((dirStats.IN/total)*100);
                const outPct = 100 - inPct;
                return (
                  <div>
                    <div className="flex h-3 w-full rounded bg-gray-100 overflow-hidden border">
                      <div className="bg-emerald-500" style={{ width: `${inPct}%` }} />
                      <div className="bg-red-500" style={{ width: `${outPct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">IN {inPct}% • OUT {outPct}%</div>
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900 mb-2">Top 5 สถานที่</div>
              <ul className="space-y-1">
                {topLocations.map((l, i) => {
                  const max = topLocations[0]?.count || 1;
                  const pct = Math.round((l.count / Math.max(1,max)) * 100);
                  return (
                    <li key={i} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="truncate mr-2">{i+1}. {l.name}</span>
                        <span className="text-gray-600">{l.count.toLocaleString('th-TH')}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                        <div className="h-2 bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
                {topLocations.length === 0 && (
                  <li className="text-gray-400">ไม่มีข้อมูล</li>
                )}
              </ul>
            </div>
          </div>
        </CollapsibleCard>

        {/* 3) KPI Delta / Freshness / Risk bands */}
        <CollapsibleCard title="KPI & สถานะข้อมูล">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">อัปเดตล่าสุด</div>
              <div className="text-sm text-gray-800">{freshness.last ? new Date(freshness.last).toLocaleString('th-TH') : '-'}</div>
              <div className="text-xs text-gray-600 mt-1">24 ชม.ล่าสุด: {freshness.last24h.toLocaleString('th-TH')} รายการ</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">อัตราถูกปฏิเสธ (7 วัน)</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-900">{kpiDelta.curRate}%</div>
                <div className={`text-sm ${kpiDelta.delta>0 ? 'text-red-600' : kpiDelta.delta<0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                  {kpiDelta.delta>0 ? '▲' : kpiDelta.delta<0 ? '▼' : '•'} {Math.abs(kpiDelta.delta)}% เทียบช่วงก่อน
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">ระดับความเสี่ยงผู้ใช้</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-700">ต่ำ {bands.low}</span>
                <span className="text-yellow-700">กลาง {bands.mid}</span>
                <span className="text-red-700">สูง {bands.high}</span>
                <span className="text-gray-400 ml-auto">รวม {bands.total}</span>
              </div>
            </div>
          </div>
        </CollapsibleCard>
        
        <CollapsibleCard title="เปรียบเทียบ วันนี้ vs เฉลี่ย 7 วัน">
          {(() => {
            const max = Math.max(1, ...compareTodayVs7d.flatMap(x => [x.today, x.avg]));
            return (
              <ul className="space-y-3">
                {compareTodayVs7d.map((it, i) => (
                  <li key={i} className="text-sm">
                    <div className="mb-1 font-medium text-gray-900">{it.label}</div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>วันนี้</span>
                      <span>{it.today.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded overflow-hidden mb-2">
                      <div className="h-2" style={{ width: `${Math.round((it.today/max)*100)}%`, background: it.colorA }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>เฉลี่ย 7 วัน</span>
                      <span>{it.avg.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                      <div className="h-2" style={{ width: `${Math.round((it.avg/max)*100)}%`, background: it.colorB }} />
                    </div>
                  </li>
                ))}
              </ul>
            );
          })()}
        </CollapsibleCard>

        {/* 4) สรุปย่อ: ผู้ใช้น่าสงสัย + เหตุผลที่ถูกปฏิเสธบ่อย */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollapsibleCard title="Top 10 ผู้ใช้น่าสงสัย">
            <ul className="divide-y">
              {suspiciousUsers.length === 0 ? (
                <li className="py-3 text-sm text-gray-500">ไม่มีข้อมูล</li>
              ) : suspiciousUsers.map((u, idx) => (
                <li key={idx} className="py-2 text-sm flex justify-between items-center">
                  <button
                    className="min-w-0 text-left"
                    onClick={() => setSuspectDetail(u)}
                    title="อธิบายคะแนน"
                  >
                    <div className="font-medium text-gray-900 truncate">{idx+1}. {u.user}</div>
                    <div className="text-xs text-gray-600 truncate">ปฏิเสธ {u.counts?.denied || 0} • นอกเวลา {u.counts?.offHours || 0} • ล่าสุด {u.lastTime ? new Date(u.lastTime).toLocaleString('th-TH',{hour:'2-digit',minute:'2-digit'}) : '-'}</div>
                  </button>
                  <div className="text-blue-600 font-semibold" title="คะแนนความสงสัย">{u.score}</div>
                </li>
              ))}
            </ul>
          </CollapsibleCard>
          <CollapsibleCard title="เหตุผลที่ถูกปฏิเสธบ่อย">
            {(() => {
              const counts = new Map();
              (logData || []).forEach(l => {
                const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
                if (!denied) return;
                const reason = l.reason || '-';
                counts.set(reason, (counts.get(reason) || 0) + 1);
              });
              const totalDenied = Array.from(counts.values()).reduce((a,b)=>a+b,0) || 1;
              const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
              if (top.length === 0) return (<div className="text-sm text-gray-500">ไม่มีข้อมูล</div>);
              return (
                <ul className="divide-y">
                  {top.map(([reason, cnt], i) => (
                    <li key={i} className="py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="truncate mr-2">{i+1}. {reason}</div>
                        <div className="text-gray-700 whitespace-nowrap">{cnt.toLocaleString('th-TH')}</div>
                      </div>
                      {(() => { const pct = Math.round((cnt/totalDenied)*100); return (
                        <div className="mt-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                          <div className="h-1.5 bg-red-500" style={{ width: `${pct}%` }} />
                        </div>
                      ); })()}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </CollapsibleCard>
        </div>

        {/* 5) Incident Feed + Top Doors by Fail-Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleCard
            title="เหตุการณ์ล่าสุด"
            actions={
              <button onClick={() => setShowIncidentChart(s => !s)} className="text-xs text-blue-600 hover:underline">
                {showIncidentChart ? 'ดูรายการ' : 'ดูกราฟ'}
              </button>
            }
          >
            {showIncidentChart ? (
              (() => {
                const now = new Date();
                const start24 = new Date(now.getTime() - 24*60*60*1000);
                let denied=0, off=0, multi=0;
                const deniedLogs = (logData || []).filter(l => l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED');
                const attempts = new Map();
                deniedLogs.forEach(l => {
                  const dt = l.dateTime ? new Date(l.dateTime) : null; if (dt && dt >= start24) denied++;
                  const key = `${l.cardName || l.cardNumber || '-'}|${l.location || l.door || '-'}`;
                  attempts.set(key, (attempts.get(key) || 0) + 1);
                });
                (logData || []).forEach(l => {
                  const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || dt < start24) return;
                  const h = dt.getHours(); const d = dt.getDay();
                  if ((l.allow === true || l.allow === 1) && (h >= 22 || h <= 6 || d===0 || d===6)) off++;
                });
                attempts.forEach(c => { if (c>=3) multi++; });
                const data = [
                  { label: 'ถูกปฏิเสธ', value: denied, color: '#ef4444' },
                  { label: 'นอกเวลา', value: off, color: '#f59e0b' },
                  { label: 'พยายามซ้ำ', value: multi, color: '#8b5cf6' },
                ];
                return <SimpleBarList data={data} />;
              })()
            ) : (
              <ul className="divide-y">
                {incidentFeed.length === 0 ? (
                  <li className="py-3 text-sm text-gray-500">ไม่มีรายการ</li>
                ) : incidentFeed.map((it, idx) => (
                  <li key={idx} className="py-2 text-sm">
                    <div className="font-medium text-gray-900 truncate">{it.user} @ {it.location}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {it.type === 'DENIED' && (
                        <>
                          ถูกปฏิเสธ{it.reason && it.reason !== 'ถูกปฏิเสธ' ? ` — ${it.reason}` : ''} • {it.when ? new Date(it.when).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </>
                      )}
                      {it.type === 'OFF_HOURS' && (
                        <>นอกเวลา ({String(it.hour).padStart(2,'0')}:00) • {it.when ? new Date(it.when).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}</>
                      )}
                      {it.type === 'MULTI_DENY' && (
                        <>พยายามซ้ำ • ล้มเหลว {it.count} ครั้ง</>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>
          <CollapsibleCard title="ช่วงเวลาที่เสี่ยง (7 วัน)">
            <SimpleBarList
              data={riskyHoursTop}
              rightText={(d) => `${d.value} คะแนน • ${d.count.toLocaleString('th-TH')} ครั้ง`}
            />
          </CollapsibleCard>
        </div>

        {/* Analytics graphs removed per request; keep concise overview only */}
        {suspectDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSuspectDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">สาเหตุคะแนนความสงสัย — {suspectDetail.user}</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">คะแนนรวม</div>
                  <div className="text-xl font-bold text-blue-600">{suspectDetail.score}</div>
                </div>
                <div className="text-sm text-gray-700">รายละเอียดปัจจัย</div>
                <ul className="divide-y rounded border">
                  {(suspectDetail.breakdown || []).map((b, i) => (
                    <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{b.label} × {b.value}</div>
                        <div className="text-gray-500 text-xs">{b.detail} • น้ำหนัก {b.weight}</div>
                      </div>
                      <div className="text-blue-600 font-semibold">+{b.contrib}</div>
                    </li>
                  ))}
                  {(!suspectDetail.breakdown || suspectDetail.breakdown.length === 0) && (
                    <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                  )}
                </ul>
                <div className="text-xs text-gray-600">
                  สรุป: รวม {suspectDetail.counts?.total || 0} ครั้ง • ปฏิเสธ {suspectDetail.counts?.denied || 0} • นอกเวลา {suspectDetail.counts?.offHours || 0} • วันหยุด {suspectDetail.counts?.weekend || 0} • สถานที่ {suspectDetail.counts?.uniqueLocations || 0}
                </div>
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
                <button className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
        {locDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setLocDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">รายละเอียดสถานที่ — {locDetail.name}</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setLocDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const items = (logData || []).filter(x => (x.location || x.door) === locDetail.name);
                  const total = items.length;
                  let denied = 0, offHours = 0, weekend = 0; const users = new Set(); const reasons = new Map(); let lastTime = null;
                  for (const it of items) {
                    if (it.allow === false || it.status === 'denied') denied++;
                    const dt = it.dateTime ? new Date(it.dateTime) : null; if (dt && !isNaN(dt)) {
                      const h = dt.getHours(); const d = dt.getDay(); if (h >= 22 || h <= 6) offHours++; if (d===0||d===6) weekend++; if (!lastTime || dt>lastTime) lastTime = dt;
                    }
                    users.add(it.cardName || it.cardNumber || '-');
                    const rs = it.reason || '-'; reasons.set(rs, (reasons.get(rs) || 0) + 1);
                  }
                  const deniedRate = total > 0 ? Math.round((denied/total)*100) : 0;
                  const breakdown = [];
                  if (denied>0) breakdown.push({ label:'ปฏิเสธ', value: denied, detail:'จำนวนครั้งที่ถูกปฏิเสธ', contrib: denied*2, weight:2 });
                  if (offHours>0) breakdown.push({ label:'นอกเวลา', value: offHours, detail:'ช่วง 22:00–06:00', contrib: offHours, weight:1 });
                  if (weekend>0) breakdown.push({ label:'วันหยุด', value: weekend, detail:'เสาร์/อาทิตย์', contrib: weekend, weight:1 });
                  if (users.size>10) breakdown.push({ label:'ผู้ใช้หลากหลาย', value: users.size, detail:'ผู้ใช้ไม่ซ้ำ > 10', contrib: Math.round((users.size-10)*0.5*10)/10, weight:0.5 });
                  if (deniedRate>0) breakdown.push({ label:'อัตราถูกปฏิเสธ', value: deniedRate, detail:'เปอร์เซ็นต์เหตุการณ์', contrib: Math.min(10, Math.round((denied/Math.max(1,total))*20)), weight:'~' });
                  const score = Math.min(100, Math.round(breakdown.reduce((s, b) => s + b.contrib, 0)));
                  const topReasons = Array.from(reasons.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">คะแนนรวม</div>
                        <div className="text-xl font-bold text-blue-600">{score}</div>
                      </div>
                      <div className="text-sm text-gray-700">รายละเอียดปัจจัย</div>
                      <ul className="divide-y rounded border">
                        {breakdown.map((b, i) => (
                          <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{b.label} × {b.value}</div>
                              <div className="text-gray-500 text-xs">{b.detail} • น้ำหนัก {b.weight}</div>
                            </div>
                            <div className="text-blue-600 font-semibold">+{b.contrib}</div>
                          </li>
                        ))}
                        {breakdown.length === 0 && (
                          <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                        )}
                      </ul>
                      <div className="text-xs text-gray-600">
                        สรุป: รวม {total} ครั้ง • ปฏิเสธ {denied} • นอกเวลา {offHours} • วันหยุด {weekend} • ผู้ใช้ {users.size}
                      </div>
                      {topReasons.length > 0 && (
                        <div className="text-sm text-gray-700">
                          สาเหตุยอดฮิต:
                          <ul className="list-disc pl-5 mt-1 text-xs text-gray-600">
                            {topReasons.map(([reason, cnt], idx) => (
                              <li key={idx}>{reason} — {cnt.toLocaleString('th-TH')} ครั้ง</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
                <button className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100" onClick={()=>setLocDetail(null)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // analytics view merged into overview

  const renderSecurity = () => null;

  // Removed separate Recent/Pivot views to simplify

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      default:
        return renderOverview();
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
    <div className="p-4 sm:p-6 md:p-8 space-y-4 bg-gray-50 min-h-screen"> {/* เปลี่ยนจาก space-y-8 เป็น space-y-4 */}
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <LayoutDashboard className="mr-3 h-6 w-6 text-blue-600" />
            แดชบอร์ด & การวิเคราะห์
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            ภาพรวม, สถิติ และการวิเคราะห์เชิงลึกของข้อมูลการเข้าถึง
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center space-x-2 text-gray-600 bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
            <span>ข้อมูลเป็นปัจจุบัน</span>
          </div>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-3 py-2 rounded-full border shadow-sm ${autoRefresh ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
            title={`Auto refresh ${autoRefresh ? 'ON' : 'OFF'} (${refreshIntervalSec}s)`}
          >
            Auto refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      {/* View Navigation */}
      <div className="bg-gray-100 rounded-lg p-1">
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
                  ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-blue-700'}
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
      <footer className="text-center text-xs text-gray-500 pt-4">
        <p className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>อัปเดตล่าสุดเมื่อ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
        </p>
      </footer>
    </div>
  );
};

export default CombinedDashboardAnalyticsPage;
