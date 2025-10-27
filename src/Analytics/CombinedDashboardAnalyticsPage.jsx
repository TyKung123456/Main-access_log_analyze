import React, { useEffect, useMemo, useRef, useState } from 'react';
// import EnhancedStatsCards from '../components/Analytics/Cards/EnhancedStatsCards.jsx';
import EssentialStatsCards from '../components/Dashboard/EssentialStatsCards.jsx';
import StatsCards from '../components/Dashboard/StatsCards.jsx';
import TopEventsBarChart from '../components/Analytics/Charts/TopEventsBarChart.jsx';
import SuspiciousUsersCard from '../components/Analytics/Cards/SuspiciousUsersCard.jsx';
import TimelineDenied7d from '../components/Analytics/Charts/TimelineDenied7d.jsx';
import KPIStatusCard from '../components/Analytics/Cards/KPIStatusCard';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Clock,
  LayoutDashboard,
  LineChart,
  ChevronDown,
  Bell,
  MapPin,
  User as UserIcon,
} from 'lucide-react';
import DeniedReasonsChart from '../components/Analytics/Charts/DeniedReasonsChart.jsx';
import HourlyTrendChart from '../components/Dashboard/Charts/HourlyTrendChart.jsx';
import LocationDistributionChart from '../components/Dashboard/Charts/LocationDistributionChart.jsx';
import { computeSuspicionByUser, computeSuspicionAll } from '../utils/suspicionScore';
import apiService from '../services/apiService.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx';
import CollapsibleCard from '../components/Analytics/Common/CollapsibleCard.jsx';
import SimpleBarList from '../components/Analytics/Common/SimpleBarList.jsx';

// CollapsibleCard & SimpleBarList moved to components/Analytics/Common

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
  const norm = (v) => (typeof v === 'string' ? v.trim() : v);
  const isEmptyish = (v) => {
    const val = norm(v);
    if (val === undefined || val === null || val === '') return true;
    const lowered = String(val).toLowerCase();
    return [
      'ไม่ระบุ', 'ไม่ระบุเวลา', 'ไม่ระบุชื่อ', 'ไม่ระบุสถานที่',
      'n/a', 'na', '-', '—', 'unspecified', 'not specified'
    ].includes(lowered);
  };
  const clean = (v) => (isEmptyish(v) ? '' : v);
  const [activeView, setActiveView] = useState('overview');
  const [analyticsRange, setAnalyticsRange] = useState('7d'); // kept but graphs removed
  const [suspectDetail, setSuspectDetail] = useState(null);
  const [topListType, setTopListType] = useState('suspicious');
  const [topSuspicious, setTopSuspicious] = useState([]);
  const [showAllSuspects, setShowAllSuspects] = useState(false);
  const [loadingTopSuspicious, setLoadingTopSuspicious] = useState(false);
  const [locDetail, setLocDetail] = useState(null);
  const [showIncidentChart, setShowIncidentChart] = useState(true);
  const [logsFilter, setLogsFilter] = useState(null); // { type: 'location'|'reason', value: string }
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef(null);
  // Dashboard filter controls: year + locations
  const [dashYear, setDashYear] = useState('all');
  const [locOptions, setLocOptions] = useState([]);
  const [locQuery, setLocQuery] = useState('');
  const [locOpen, setLocOpen] = useState(false);

  useEffect(() => {
    const onClick = (e) => {
      if (!alertsRef.current) return;
      if (alertsOpen && !alertsRef.current.contains(e.target)) setAlertsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [alertsOpen]);

  // Fetch location options for dashboard filter (faceted by current filters except location)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = { ...(filters || {}) };
        const params = {}; // only use API-level filters via transform inside apiService endpoints
        // Use apiService facet endpoint; if it fails, fallback to unique from logData
        const res = await apiService.getLocations(params).catch(() => ({ locations: [] }));
        if (!mounted) return;
        const list = (res.locations || []).map(i => ({ value: i.value || i.label, label: i.label || i.value }));
        if (list.length > 0) setLocOptions(list);
        else {
          const uniq = Array.from(new Set((logData || []).map(l => (l.location || l.door)).filter(Boolean))).sort();
          setLocOptions(uniq.map(v => ({ value: v, label: v })));
        }
      } catch {
        const uniq = Array.from(new Set((logData || []).map(l => (l.location || l.door)).filter(Boolean))).sort();
        setLocOptions(uniq.map(v => ({ value: v, label: v })));
      }
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(filters), logData]);

  const headerComputed = useMemo(() => {
    let last = null; let total = 0; let denied = 0;
    const byUser = new Map();
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return;
      if (!last || dt > last) last = dt;
      total++;
      const isDenied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      if (isDenied) denied++;
      const user = l.cardName || l.cardNumber || 'Unknown';
      const loc = l.location || l.door || '';
      const reason = (l.reason || '').toString().toLowerCase();
      const arr = byUser.get(user) || [];
      arr.push({ time: dt, loc, denied: isDenied, reason });
      byUser.set(user, arr);
    });

    let alerts = 0; const list = [];
    for (const [user, arrRaw] of byUser.entries()) {
      const arr = arrRaw.slice().sort((a, b) => a.time - b.time);
      const den = arr.filter(a => a.denied).length;
      if (den >= 3) {
        alerts++;
        list.push({ type: 'MULTIPLE_DENIED', risk: 'high', description: `${user} ถูกปฏิเสธ ${den} ครั้ง`, who: user, location: arr[0].loc, time: arr[arr.length - 1].time });
      }
      for (let i = 1; i < arr.length; i++) {
        const diff = (arr[i].time - arr[i - 1].time) / (1000 * 60);
        if (diff <= 5 && arr[i].loc !== arr[i - 1].loc) {
          alerts++;
          const from = arr[i - 1].loc || '-';
          const to = arr[i].loc || '-';
          list.push({ type: 'RAPID_DIFF_LOC', risk: 'medium', description: `${user} เปลี่ยนจุดภายใน 5 นาที`, who: user, location: `${from} → ${to}` , time: arr[i].time });
          break;
        }
      }
      const off = arr.find(a => { const h = a.time.getHours(); return h >= 22 || h <= 6; });
      if (off) { alerts++; list.push({ type: 'OFF_HOURS', risk: 'medium', description: `${user} ใช้นอกเวลาทำการ`, who: user, location: off.loc, time: off.time }); }
      const lost = arr.find(a => a.reason.includes('lost') || a.reason.includes('stolen'));
      if (lost) { alerts++; list.push({ type: 'LOST_STOLEN', risk: 'high', description: `${user} เหตุผลเกี่ยวกับบัตรหาย/ถูกขโมย`, who: user, location: lost.loc, time: lost.time }); }
    }
    list.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));
    const denyRate = total > 0 ? (denied / total) * 100 : 0;
    const risk = denyRate > 10 ? { label: 'สูง', cls: 'bg-red-500' } : denyRate > 5 ? { label: 'กลาง', cls: 'bg-yellow-500' } : { label: 'ต่ำ', cls: 'bg-green-500' };
    return { last, alerts, risk, list };
  }, [logData]);

  const singleDayInfo = useMemo(() => {
    let minD = null, maxD = null;
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return;
      if (!minD || dt < minD) minD = dt;
      if (!maxD || dt > maxD) maxD = dt;
    });
    const sameDay = !!(minD && maxD && minD.toDateString() === maxD.toDateString());
    return { sameDay, day: sameDay && minD ? minD : null };
  }, [logData]);


  const scrollToSection = (id) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [isLoadingSecurityMetrics, setIsLoadingSecurityMetrics] = useState(true);
  const [selectedSecurityKPI, setSelectedSecurityKPI] = useState('all');
  const [alertDetail, setAlertDetail] = useState(null);

  // Support in-page jump and spotlight (e.g., 'dash-kpi')
  useEffect(() => {
    const onJump = (e) => {
      const id = e?.detail?.sectionId;
      if (!id || !String(id).startsWith('dash-')) return;
      try {
        // Specific KPI focus e.g. dash-kpi-total, dash-kpi-unique, ...
        if (id.startsWith('dash-kpi-')) {
          const key = id.replace('dash-kpi-', '');
          const card = document.getElementById(`kpi-${key}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // pop the card
            card.classList.remove('jump-pop');
            void card.offsetWidth;
            card.classList.add('jump-pop');
            // bounce the number
            const val = card.querySelector('.kpi-value');
            if (val) {
              val.classList.remove('kpi-bounce');
              void val.offsetWidth;
              val.classList.add('kpi-bounce');
              setTimeout(() => val.classList.remove('kpi-bounce'), 1000);
            }
            setTimeout(() => card.classList.remove('jump-pop'), 1200);
          }
          return;
        }

        // General KPI section spotlight
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('jump-pop');
        void el.offsetWidth; // force reflow to retrigger
        el.classList.add('jump-pop');
        // also bounce numbers inside
        el.querySelectorAll('.kpi-value').forEach((v) => {
          v.classList.remove('kpi-bounce');
          void v.offsetWidth;
          v.classList.add('kpi-bounce');
          setTimeout(() => v.classList.remove('kpi-bounce'), 1000);
        });
        setTimeout(() => el.classList.remove('jump-pop'), 1200);
      } catch {}
    };
    window.addEventListener('jumpTo', onJump);
    return () => window.removeEventListener('jumpTo', onJump);
  }, []);


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
        cardName: clean(log.cardName || log.cardNumber),
        location: clean(log.location || log.door),
        accessTime: log.dateTime,
        reason: log.reason || 'การเข้าถึงถูกปฏิเสธ',
        userType: clean(log.userType)
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
                cardName: clean(log.cardName || log.cardNumber),
                location: clean(log.location || log.door),
                accessTime: log.dateTime,
                reason: `เข้าถึงนอกเวลา (${hour.toString().padStart(2, '0')}:00) ${dayOfWeek === 0 ? '(วันอาทิตย์)' : dayOfWeek === 6 ? '(วันเสาร์)' : ''}`,
                userType: clean(log.userType)
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
          cardName: clean(latest.cardName || latest.cardNumber),
          location: clean(latest.location || latest.door),
          accessTime: latest.dateTime,
          reason: `พยายามเข้าถึงล้มเหลว ${attempts.length} ครั้ง`,
          userType: clean(latest.userType)
        });
      }
    });

    generatedAlerts.sort((a, b) => {
      const dateA = new Date(a.accessTime);
      const dateB = new Date(b.accessTime);
      return dateB - dateA;
    });

    const finalAlerts = generatedAlerts.filter(a => !isEmptyish(a.cardName) || !isEmptyish(a.location) || !isEmptyish(a.reason));
    switch (selectedSecurityKPI) {
      case 'high':
        return finalAlerts.filter(alert => alert.severity === 'high');
      case 'medium':
        return finalAlerts.filter(alert => alert.severity === 'medium');
      case 'low':
        return finalAlerts.filter(alert => alert.severity === 'low');
      case 'access_denied':
        return finalAlerts.filter(alert => alert.alertType === 'ACCESS_DENIED');
      case 'unusual_time':
        return finalAlerts.filter(alert => alert.alertType === 'UNUSUAL_TIME');
      case 'multiple_attempts':
        return finalAlerts.filter(alert => alert.alertType === 'MULTIPLE_ATTEMPTS');
      case 'risk_locations':
        return finalAlerts.filter(alert => !isEmptyish(alert.location));
      case 'suspicious_users':
        return finalAlerts.filter(alert => !isEmptyish(alert.cardName));
      case 'today_events':
        const today = new Date().toDateString();
        return finalAlerts.filter(alert => new Date(alert.accessTime).toDateString() === today);
      case 'compliance':
        return finalAlerts.filter(alert => alert.severity !== 'high');
      default:
        return finalAlerts;
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

  // Load all-time top suspicious users (simple: by denied%)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTopSuspicious(true);
        // ดึงจำนวนมากไว้ก่อน เพื่อรองรับการสลับ "แสดงทั้งหมด"
        const res = await apiService.getTopUsers({ limit: 200 });
        if (!mounted) return;
        const users = (res?.users || []).map(r => {
          const total = r.total || 0; const denied = r.denied || 0; const off = r.off_hours || 0; const multi = r.multi_events || 0;
          const deniedPct = total > 0 ? (denied/total)*100 : 0;
          const offPct = total > 0 ? (off/total)*100 : 0;
          const multiPct = total > 0 ? (multi/total)*100 : 0;
          const score = Math.round(deniedPct); // use denied% only
          return {
            user: (r.display_name || r.user || 'Unknown'),
            userKey: r.user || (r.display_name || 'Unknown'),
            score,
            counts: {
              total,
              denied,
              offHours: off,
              weekend: r.weekend || 0,
              uniqueLocations: r.unique_locations || 0,
            },
            lastTime: r.last_time || null,
            components: { deniedPct: Math.round(deniedPct), offPct: Math.round(offPct), multiPct: Math.round(multiPct) }
          };
        });
        setTopSuspicious(users);
      } catch (e) {
        setTopSuspicious([]);
      } finally {
        if (mounted) setLoadingTopSuspicious(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const safeChartData = {
    hourlyData: chartData?.hourlyData || [],
    locationData: chartData?.locationData || []
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

  // Export a concise snapshot report (Markdown)
  const exportDashboardSnapshot = () => {
    const now = new Date();
    // Derive freshness (last update)
    let last = null;
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null);
      if (!dt || isNaN(dt)) return; if (!last || dt > last) last = dt;
    });

    const total = safeStats.total_records || 0;
    const success = safeStats.success_count || 0;
    const denied = safeStats.denied_count || 0;
    const successRate = safeStats.success_rate || 0;

    // Today vs 7d
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start7d = new Date(startOfToday); start7d.setDate(startOfToday.getDate() - 7);
    let todayTotal=0, todayDenied=0, total7d=0, denied7d=0;
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : (l.accessTime ? new Date(l.accessTime) : null); if (!dt || isNaN(dt)) return;
      const isDenied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      if (dt >= startOfToday && dt <= now) { todayTotal++; if (isDenied) todayDenied++; }
      else if (dt >= start7d && dt < startOfToday) { total7d++; if (isDenied) denied7d++; }
    });
    const todayRate = todayTotal>0 ? Math.round((todayDenied/todayTotal)*100) : 0;
    const avgPerDay = Math.round(total7d/7);
    const avgRate = total7d>0 ? Math.round((denied7d/total7d)*100) : 0;

    // Direction ratio removed per request

    const topLoc = (chartData?.locationData || [])
      .map(i => ({ name: i.location || i.locationDisplay || '', count: parseInt(i.count)||0 }))
      .filter(i=>i.name)
      .sort((a,b)=>b.count-a.count)
      .slice(0,5);

    const reasonMap = new Map();
    (logData || []).forEach(l => { const d = l.allow===false || l.status==='denied' || l.accessResult==='DENIED'; if (!d) return; const r = (l.reason||'').toString().trim(); if (!r) return; reasonMap.set(r,(reasonMap.get(r)||0)+1); });
    const topReasons = Array.from(reasonMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const sus = computeSuspicionByUser(logData||[],5);

    const lines = [];
    lines.push(`# รายงานภาพรวมระบบ (Snapshot)`);
    lines.push(`ออกรายงาน: ${now.toLocaleString('th-TH')}`);
    lines.push(`อัปเดตล่าสุด: ${last ? last.toLocaleString('th-TH') : '-'}`);
    lines.push('');
    lines.push(`## KPI หลัก`);
    lines.push(`- รวมทั้งหมด: ${total.toLocaleString('th-TH')}`);
    lines.push(`- สำเร็จ: ${success.toLocaleString('th-TH')}`);
    lines.push(`- ปฏิเสธ: ${denied.toLocaleString('th-TH')}`);
    lines.push(`- อัตราสำเร็จ: ${successRate}%`);
    lines.push('');
    lines.push(`## วันนี้ vs เฉลี่ย 7 วัน`);
    lines.push(`- วันนี้: ${todayTotal.toLocaleString('th-TH')} (Deny ${todayRate}%)`);
    lines.push(`- เฉลี่ย/วัน (7 วัน): ${avgPerDay.toLocaleString('th-TH')} (Deny ${avgRate}%)`);
    lines.push('');
    // Removed direction section in snapshot
    lines.push(`## Top สถานที่`);
    topLoc.forEach((l,idx)=>lines.push(`${idx+1}. ${l.name} — ${l.count.toLocaleString('th-TH')}`));
    if (topLoc.length===0) lines.push('- ไม่มีข้อมูล');
    lines.push('');
    lines.push(`## เหตุผลปฏิเสธยอดฮิต`);
    topReasons.forEach(([r,c],idx)=>lines.push(`${idx+1}. ${r} — ${c.toLocaleString('th-TH')}`));
    if (topReasons.length===0) lines.push('- ไม่มีข้อมูล');
    lines.push('');
    lines.push(`## ผู้ใช้น่าสงสัย (Top 5)`);
    if (sus.length===0) lines.push('- ไม่มีข้อมูล');
    sus.forEach((u,idx)=> lines.push(`${idx+1}. ${u.user} — คะแนน ${u.score} (ปฏิเสธ ${u.counts?.denied||0}, นอกเวลา ${u.counts?.offHours||0})`));

    const md = lines.join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_report_${now.toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
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

  const renderOverview = () => {
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
            const u = clean(l.cardName || l.cardNumber); const loc = clean(l.location || l.door);
            if (isEmptyish(u) || isEmptyish(loc)) { /* skip */ } else {
              const key = `${u}|${loc}`;
              attemptsToday.set(key, (attemptsToday.get(key) || 0) + 1);
            }
          }
        } else if (dt >= startPrev && dt < startToday) {
          p_total++; if (denied) p_denied++; if (off) p_off++;
          if (denied) {
            const dk = `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`;
            const dayMap = attemptsPrevByDay.get(dk) || new Map();
            const u = clean(l.cardName || l.cardNumber); const loc = clean(l.location || l.door);
            if (!(isEmptyish(u) || isEmptyish(loc))) {
              const key = `${u}|${loc}`;
              dayMap.set(key, (dayMap.get(key) || 0) + 1);
            }
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
        user: clean(l.cardName || l.cardNumber),
        location: clean(l.location || l.door),
        reason: clean(l.reason) || 'ถูกปฏิเสธ'
      }));
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const h = dt.getHours(); const d = dt.getDay();
        if ((l.allow === true || l.allow === 1) && (h >= 22 || h <= 6) || (d===0 || d===6)) {
          items.push({ type: 'OFF_HOURS', when: l.dateTime, user: clean(l.cardName || l.cardNumber), location: clean(l.location || l.door), hour: h });
        }
      });
      // multiple attempts by user-location
      const attempts = new Map();
      deniedLogs.forEach(l => {
        const u = clean(l.cardName || l.cardNumber); const loc = clean(l.location || l.door);
        if (isEmptyish(u) || isEmptyish(loc)) return;
        const key = `${u}|${loc}`;
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

    // Risk bands (users)
  const bands = (() => {
      const all = (topSuspicious || []).map(u => ({ score: u.score }));
      let low=0, mid=0, high=0;
      all.forEach(u => {
        if (u.score >= 50) high++; else if (u.score >= 20) mid++; else low++;
      });
      return { low, mid, high, total: all.length };
  })();

  // Helper: explain a user's score in modal
  const explainUser = async (userName, lastTime = null) => {
    try {
      setSuspectDetail({ user: userName, loading: true });
      const summary = await apiService.getUserSummary({ user: userName });
      const total = summary.total || 0;
      const denied = summary.denied || 0;
      const offHours = summary.offHours || 0;
      const weekend = summary.weekend || 0;
      const uniqLoc = summary.uniqueLocations || 0;
      const multi = summary.multiEvents || 0;

      const deniedPct = total > 0 ? (denied/total)*100 : 0;
      const offPct = total > 0 ? (offHours/total)*100 : 0;
      const multiPct = total > 0 ? (multi/total)*100 : 0;
      const breakdown = [];
      breakdown.push({ label:'ปฏิเสธ', value: Math.round(deniedPct), detail:`เปอร์เซ็นต์การถูกปฏิเสธ (${denied}/${total})` , contrib: Math.round(deniedPct)});
      breakdown.push({ label:'นอกเวลา', value: Math.round(offPct), detail:`เปอร์เซ็นต์เข้าช่วง 22:00–06:00 (${offHours}/${total})` , contrib: Math.round(offPct)});
      breakdown.push({ label:'พยายามหลายครั้ง', value: Math.round(multiPct), detail:`เหตุการณ์ปฏิเสธซ้ำในสถานที่เดียวกัน (≥3) (${multi}/${total})` , contrib: Math.round(multiPct)});
      const score = Math.round(deniedPct);

      setSuspectDetail({
        user: userName,
        score,
        breakdown,
        counts: { total, denied, offHours, weekend, uniqueLocations: uniqLoc, multi },
        lastTime,
      });
    } catch (e) {
      setSuspectDetail({ user: userName, error: e?.message || 'โหลดรายละเอียดไม่สำเร็จ' });
    }
  };

    // Suspicious users with explainable score (Top 10) — all-time baseline
    // Ensure sorted by score desc (then by denied count desc if available)
    const suspiciousUsers = [...(topSuspicious || [])].sort((a, b) => {
      const sa = Number(a?.score || 0), sb = Number(b?.score || 0);
      if (sb !== sa) return sb - sa;
      const da = Number(a?.counts?.denied || 0), db = Number(b?.counts?.denied || 0);
      return db - da;
    });

    // Build Top-10 offenders per case for dropdown
    const topLists = (() => {
      const offenders = { ACCESS_DENIED: new Map(), UNUSUAL_TIME: new Map(), MULTIPLE_ATTEMPTS: new Map() };
      const byUserLocDenied = new Map();
      (logData || []).forEach(log => {
        const user = clean(log.cardName || log.cardNumber);
        const loc = clean(log.location || log.door);
        if (isEmptyish(user)) return;
        const allow = (log.allow === true || log.allow === 1);
        const dt = log.dateTime ? new Date(log.dateTime) : null;
        if (!allow) {
          offenders.ACCESS_DENIED.set(user, (offenders.ACCESS_DENIED.get(user) || 0) + 1);
          if (!isEmptyish(loc)) {
            const key = `${user}|${loc}`;
            byUserLocDenied.set(key, (byUserLocDenied.get(key) || 0) + 1);
          }
        } else if (dt && !isNaN(dt)) {
          const h = dt.getHours(); const d = dt.getDay();
          const off = (h >= 22 || h <= 6) || (d === 0 || d === 6);
          const isSecurity = (String(log.userType||'').toUpperCase() === 'SECURITY');
          if (off && !isSecurity) offenders.UNUSUAL_TIME.set(user, (offenders.UNUSUAL_TIME.get(user) || 0) + 1);
        }
      });
      for (const [key, c] of byUserLocDenied.entries()) {
        if (c >= 3) {
          const user = key.split('|')[0];
          offenders.MULTIPLE_ATTEMPTS.set(user, (offenders.MULTIPLE_ATTEMPTS.get(user) || 0) + 1);
        }
      }
      const toTop = (m) => Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
      return {
        suspicious: suspiciousUsers.map(u => [u.user, u.score]),
        denied: toTop(offenders.ACCESS_DENIED),
        off_hours: toTop(offenders.UNUSUAL_TIME),
        multiple_attempts: toTop(offenders.MULTIPLE_ATTEMPTS),
      };
    })();

    // topListType state is defined at component scope

    const exportDashboardReport = () => {
      const now = new Date();
      // KPIs
      const total = safeStats.total_records || 0;
      const success = safeStats.success_count || 0;
      const denied = safeStats.denied_count || 0;
      const successRate = safeStats.success_rate || 0;
      const lastUpdated = freshness.last ? new Date(freshness.last).toLocaleString('th-TH') : '-';

      // Today vs 7d (recompute quickly)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start7d = new Date(startOfToday); start7d.setDate(startOfToday.getDate() - 7);
      let todayTotal=0, todayDenied=0, total7d=0, denied7d=0;
      (logData || []).forEach(l => {
        const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
        const isDenied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        if (dt >= startOfToday && dt <= now) { todayTotal++; if (isDenied) todayDenied++; }
        else if (dt >= start7d && dt < startOfToday) { total7d++; if (isDenied) denied7d++; }
      });
      const todayRate = todayTotal>0 ? Math.round((todayDenied/todayTotal)*100) : 0;
      const avgPerDay = Math.round(total7d/7);
      const avgRate = total7d>0 ? Math.round((denied7d/total7d)*100) : 0;

      // Direction ratio removed

      // Top locations (reuse computed topLocations below)
      const topLoc = (chartData?.locationData || [])
        .map(i => ({ name: i.location || i.locationDisplay || '', count: parseInt(i.count)||0 }))
        .filter(i=>i.name)
        .sort((a,b)=>b.count-a.count)
        .slice(0,5);

      // Denied reasons (simple)
      const reasonMap = new Map();
      (logData || []).forEach(l => { const d = l.allow===false || l.status==='denied' || l.accessResult==='DENIED'; if (!d) return; const r = (l.reason||'').toString().trim(); if (!r) return; reasonMap.set(r,(reasonMap.get(r)||0)+1); });
      const topReasons = Array.from(reasonMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);

      // Suspicious users brief (top 5)
      const sus = computeSuspicionByUser(logData||[],5);

      const lines = [];
      lines.push(`# รายงานภาพรวมระบบ (Snapshot)`);
      lines.push(`ออกรายงาน: ${now.toLocaleString('th-TH')}`);
      lines.push(`อัปเดตล่าสุด: ${lastUpdated}`);
      lines.push('');
      lines.push(`## KPI หลัก`);
      lines.push(`- รวมทั้งหมด: ${total.toLocaleString('th-TH')}`);
      lines.push(`- สำเร็จ: ${success.toLocaleString('th-TH')}`);
      lines.push(`- ปฏิเสธ: ${denied.toLocaleString('th-TH')}`);
      lines.push(`- อัตราสำเร็จ: ${successRate}%`);
      lines.push('');
      lines.push(`## วันนี้ vs เฉลี่ย 7 วัน`);
      lines.push(`- วันนี้: ${todayTotal.toLocaleString('th-TH')} (Deny ${todayRate}%)`);
      lines.push(`- เฉลี่ย/วัน (7 วัน): ${avgPerDay.toLocaleString('th-TH')} (Deny ${avgRate}%)`);
      lines.push('');
      // Removed direction section
      lines.push(`## Top สถานที่`);
      topLoc.forEach((l,idx)=>lines.push(`${idx+1}. ${l.name} — ${l.count.toLocaleString('th-TH')}`));
      if (topLoc.length===0) lines.push('- ไม่มีข้อมูล');
      lines.push('');
      lines.push(`## เหตุผลปฏิเสธยอดฮิต`);
      topReasons.forEach(([r,c],idx)=>lines.push(`${idx+1}. ${r} — ${c.toLocaleString('th-TH')}`));
      if (topReasons.length===0) lines.push('- ไม่มีข้อมูล');
      lines.push('');
      lines.push(`## ผู้ใช้น่าสงสัย (Top 5)`);
      if (sus.length===0) lines.push('- ไม่มีข้อมูล');
      sus.forEach((u,idx)=> lines.push(`${idx+1}. ${u.user} — คะแนน ${u.score} (ปฏิเสธ ${u.counts?.denied||0}, นอกเวลา ${u.counts?.offHours||0})`));

      const md = lines.join('\n');
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_report_${now.toISOString().slice(0,10)}.md`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-4 max-w-7xl mx-auto w-full">
        {/* Dashboard Filters: Year + Location */}
        <div className="bg-white rounded-xl border shadow-sm p-3 flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">ปี</div>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={dashYear}
              onChange={(e) => {
                const v = e.target.value;
                setDashYear(v);
                if (v === 'all') {
                  updateFilter?.('dateRange', undefined);
                } else {
                  const y = parseInt(v, 10);
                  if (!isNaN(y)) {
                    const start = new Date(y, 0, 1).toISOString();
                    const end = new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
                    updateFilter?.('dateRange', { start, end });
                  }
                }
              }}
            >
              {(() => {
                const now = new Date().getFullYear();
                const items = [<option key="all" value="all">ทั้งหมด</option>];
                for (let y = now; y >= now - 6; y--) items.push(<option key={y} value={y}>{y}</option>);
                return items;
              })()}
            </select>
          </div>
          <div className="relative">
            <div className="text-xs text-gray-600 mb-1">สถานที่</div>
            <button
              className="border rounded-md px-2 py-1 text-sm bg-white hover:bg-gray-50 min-w-[12rem] flex items-center justify-between"
              onClick={() => setLocOpen(v => !v)}
            >
              <span className="truncate text-left">
                {Array.isArray(filters?.location) && filters.location.length > 0
                  ? `เลือกแล้ว ${filters.location.length} แห่ง`
                  : 'ทั้งหมด'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {locOpen && (
              <div className="absolute z-20 mt-1 w-72 bg-white border rounded-md shadow-lg p-2">
                <div className="relative mb-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="ค้นหา..."
                    value={locQuery}
                    onChange={(e)=>setLocQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-auto space-y-1">
                  {locOptions.filter(o => (o.label||'').toLowerCase().includes(locQuery.toLowerCase())).map(o => {
                    const checked = Array.isArray(filters?.location) ? filters.location.includes(o.value) : false;
                    return (
                      <label key={o.value} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={checked}
                          onChange={(e) => {
                            const cur = Array.isArray(filters?.location) ? [...filters.location] : [];
                            const next = e.target.checked ? [...new Set([...cur, o.value])] : cur.filter(v => v !== o.value);
                            updateFilter?.('location', next);
                          }}
                        />
                        <span className="text-sm text-gray-800 truncate" title={o.label}>{o.label}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>updateFilter?.('location', [])}>ล้าง</button>
                  <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>setLocOpen(false)}>ปิด</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Snapshot banner removed per request (duplicate section) */}

        {/* Essential KPIs only (not real-time heavy) */}
        <div id="dash-kpi" className="rounded-xl">
          <EssentialStatsCards stats={stats || {}} logData={logData} />
        </div>

        {/* รวมกราฟพื้นฐาน (ย้ายจากหน้า Log) */}
        <div id="dash-overview-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-xl">
          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">กราฟรวม</h3>
            </div>
            <div className="space-y-3">
              <HourlyTrendChart data={safeChartData.hourlyData} loading={loading} />
              <LocationDistributionChart data={safeChartData.locationData} loading={loading} />
            </div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Top สถานที่</h3>
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span>แสดง</span>
                <input id="top-loc-limit" type="number" min={1} max={50} defaultValue={10} className="w-14 px-1.5 py-1 border rounded" onChange={(e)=>{
                  const v = Math.max(1, Math.min(50, parseInt(e.target.value)||10));
                  const listEl = document.getElementById('top-loc-list'); if (!listEl) return;
                  Array.from(listEl.children).forEach((li, idx) => { li.style.display = idx < v ? '' : 'none'; });
                }} />
                <span>แห่ง</span>
              </div>
            </div>
            <ul id="top-loc-list" className="divide-y">
              {(() => {
                const items = (safeChartData.locationData || [])
                  .map(i => ({ name: i.location || i.locationDisplay || '', count: parseInt(i.count)||0, denied: parseInt(i.denied)||parseInt(i.deniedAccess)||0 }))
                  .filter(i=>i.name)
                  .sort((a,b)=>b.count-a.count)
                  .slice(0, 10);
                if (items.length === 0) return (<li className="py-3 text-sm text-gray-500">ไม่มีข้อมูล</li>);
                return items.map((l, idx) => (
                  <li key={idx} className="py-2 text-sm flex justify-between items-center">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{idx+1}. {l.name}</div>
                      <div className="text-xs text-gray-600 truncate">รวม {l.count.toLocaleString('th-TH')} ครั้ง • ปฏิเสธ {l.denied.toLocaleString('th-TH')}</div>
                    </div>
                  </li>
                ));
              })()}
            </ul>
          </div>
        </div>

        {/* เนื้อหาเชิงวิเคราะห์ถูกย้ายไปยังแท็บ "การวิเคราะห์" */}

        {suspectDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSuspectDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">สาเหตุคะแนนความสงสัย — {suspectDetail.user}</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-3">
                {suspectDetail.loading ? (
                  <div className="text-sm text-gray-600">กำลังโหลด...</div>
                ) : suspectDetail.error ? (
                  <div className="text-sm text-red-600">{suspectDetail.error}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">คะแนนรวม (ปฏิเสธ%)</div>
                      <div className="text-xl font-bold text-blue-600">{suspectDetail.score}%</div>
                    </div>
                    <div className="text-sm text-gray-700">รายละเอียดปัจจัย</div>
                    <ul className="divide-y rounded border">
                      {(suspectDetail.breakdown || []).map((b, i) => (
                        <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{b.label} × {b.value}%</div>
                            <div className="text-gray-500 text-xs">{b.detail}</div>
                          </div>
                          <div className="text-blue-600 font-semibold">{b.value}%</div>
                        </li>
                      ))}
                      {(!suspectDetail.breakdown || suspectDetail.breakdown.length === 0) && (
                        <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                      )}
                    </ul>
                    <div className="text-xs text-gray-600">
                      สรุป: รวม {suspectDetail.counts?.total || 0} ครั้ง • ปฏิเสธ {suspectDetail.counts?.denied || 0} • นอกเวลา {suspectDetail.counts?.offHours || 0} • วันหยุด {suspectDetail.counts?.weekend || 0} • สถานที่ {suspectDetail.counts?.uniqueLocations || 0}
                    </div>
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
                <button className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
        {alertDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAlertDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">รายละเอียดแจ้งเตือน</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setAlertDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{alertDetail.who || 'Unknown'}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${alertDetail.risk==='high'?'bg-red-100 text-red-700':alertDetail.risk==='medium'?'bg-yellow-100 text-yellow-700':'bg-emerald-100 text-emerald-700'}`}>{alertDetail.risk==='high'?'สูง':alertDetail.risk==='medium'?'ปานกลาง':'ต่ำ'}</span>
                </div>
                {alertDetail.description && (
                  <div className="text-gray-700">{alertDetail.description}</div>
                )}
                <div className="text-gray-600 space-y-1">
                  {alertDetail.location && (<div className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{alertDetail.location}</div>)}
                  {alertDetail.time && (<div className="flex items-center gap-2"><Clock className="w-4 h-4"/>{new Date(alertDetail.time).toLocaleString('th-TH')}</div>)}
                </div>
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-2">
                {alertDetail.who && (
                  <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>{ explainUser(alertDetail.who); setAlertDetail(null); }}>ดูผู้ใช้นี้</button>
                )}
                {alertDetail.location && (
                  <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>{ setLocDetail({ name: alertDetail.location }); setAlertDetail(null); }}>ดูสถานที่นี้</button>
                )}
                <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>setAlertDetail(null)}>ปิด</button>
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
                    const usr = clean(it.cardName || it.cardNumber);
                    if (!isEmptyish(usr)) users.add(usr);
                    const rs = (it.reason ?? '').toString().trim();
                    if (rs) reasons.set(rs, (reasons.get(rs) || 0) + 1);
                  }
                  const deniedRate = total > 0 ? Math.round((denied/total)*100) : 0;
                  // แปลงเป็นสัดส่วนของทั้งหมด (ร้อยละ) แล้วบวกกัน (แนวคิดเดียวกับ QuickInsights)
                  const breakdown = [];
                  const deniedPct = total>0 ? (denied/total)*100 : 0;
                  const offPct = total>0 ? (offHours/total)*100 : 0;
                  const weekendPct = total>0 ? (weekend/total)*100 : 0;
                  if (denied>0) breakdown.push({ label:'ปฏิเสธ', value: Math.round(deniedPct), detail:`ปฏิเสธ ${denied}/${total} (${deniedPct.toFixed(1)}%)`, contrib: Math.round(deniedPct) });
                  if (offHours>0) breakdown.push({ label:'นอกเวลา', value: Math.round(offPct), detail:`ช่วง 22:00–06:00 ${offHours}/${total} (${offPct.toFixed(1)}%)`, contrib: Math.round(offPct) });
                  if (weekend>0) breakdown.push({ label:'วันหยุด', value: Math.round(weekendPct), detail:`เสาร์/อาทิตย์ ${weekend}/${total} (${weekendPct.toFixed(1)}%)`, contrib: Math.round(weekendPct) });
                  const score = Math.min(100, Math.round(breakdown.reduce((s, b) => s + (b.contrib||0), 0)));
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

  // Analysis tab content: conditional/derived insights
  const renderAnalysis = () => {
    // Build local lists defensively to avoid TDZ/undefined refs
    const localSuspiciousUsers = (() => {
      try {
        const base = Array.isArray(topSuspicious) ? topSuspicious : [];
        return [...base].sort((a, b) => {
          const sa = Number(a?.score || 0), sb = Number(b?.score || 0);
          if (sb !== sa) return sb - sa;
          const da = Number(a?.counts?.denied || 0), db = Number(b?.counts?.denied || 0);
          return db - da;
        });
      } catch { return []; }
    })();

    const localTopLists = (() => {
      try {
        const offenders = { ACCESS_DENIED: new Map(), UNUSUAL_TIME: new Map(), MULTIPLE_ATTEMPTS: new Map() };
        const byUserLocDenied = new Map();
        (logData || []).forEach(log => {
          const user = clean(log.cardName || log.cardNumber);
          const loc = clean(log.location || log.door);
          if (isEmptyish(user)) return;
          const allow = (log.allow === true || log.allow === 1);
          const dt = log.dateTime ? new Date(log.dateTime) : null;
          if (!allow) {
            offenders.ACCESS_DENIED.set(user, (offenders.ACCESS_DENIED.get(user) || 0) + 1);
            if (!isEmptyish(loc)) {
              const key = `${user}|${loc}`;
              byUserLocDenied.set(key, (byUserLocDenied.get(key) || 0) + 1);
            }
          } else if (dt && !isNaN(dt)) {
            const h = dt.getHours(); const d = dt.getDay();
            const off = (h >= 22 || h <= 6) || (d === 0 || d === 6);
            const isSecurity = (String(log.userType||'').toUpperCase() === 'SECURITY');
            if (off && !isSecurity) offenders.UNUSUAL_TIME.set(user, (offenders.UNUSUAL_TIME.get(user) || 0) + 1);
          }
        });
        for (const [key, c] of byUserLocDenied.entries()) {
          if (c >= 3) {
            const user = key.split('|')[0];
            offenders.MULTIPLE_ATTEMPTS.set(user, (offenders.MULTIPLE_ATTEMPTS.get(user) || 0) + 1);
          }
        }
        const toTop = (m) => Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
        return {
          suspicious: localSuspiciousUsers.map(u => [u.user, u.score]),
          denied: toTop(offenders.ACCESS_DENIED),
          off_hours: toTop(offenders.UNUSUAL_TIME),
          multiple_attempts: toTop(offenders.MULTIPLE_ATTEMPTS),
        };
      } catch { return { suspicious: [], denied: [], off_hours: [], multiple_attempts: [] }; }
    })();

    return (
      <div className="space-y-4 max-w-7xl mx-auto w-full">
        {/* Top Events + Denied 7d Timeline */}
        <div id="dash-top" className="grid grid-cols-1 lg:grid-cols-2 gap-3 rounded-xl">
          <TopEventsBarChart
            logData={logData}
            onSelect={() => { try { const el=document.getElementById('logs-focus'); if (el) el.scrollIntoView({behavior:'smooth'}); } catch {} }}
          />
          <TimelineDenied7d
            logData={logData}
            onSelect={(dayLabel)=>{ try { const el=document.getElementById('logs-focus'); if (el) el.scrollIntoView({behavior:'smooth'}); } catch {} }}
          />
        </div>

        {/* Denied reasons + Suspicious users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <DeniedReasonsChart data={logData} loading={loading} />
          <div id="dash-suspicious" className="rounded-xl">
            <SuspiciousUsersCard
              topListType={topListType}
              setTopListType={setTopListType}
              showAllSuspects={showAllSuspects}
              setShowAllSuspects={setShowAllSuspects}
              suspiciousUsers={localSuspiciousUsers}
              topLists={localTopLists}
              onExplainUser={async (u) => { await explainUser(u.userKey || u.user, u.lastTime); }}
              loading={loadingTopSuspicious}
            />
          </div>
        </div>

        {/* (Optional) Logs filtered by selection */}
        {logsFilter && (
          <CollapsibleCard
            title={`ตาราง Log — ${logsFilter.type === 'location' ? 'สถานที่' : 'เหตุผล'}: ${logsFilter.value}`}
            actions={<button className="text-xs text-gray-600 hover:text-gray-900" onClick={()=>setLogsFilter(null)}>ล้างตัวกรอง</button>}
          >
            {(() => {
              const rows = (logData || []).filter(l => {
                if (logsFilter.type === 'location') {
                  const loc = clean(l.location || l.door);
                  return loc === logsFilter.value;
                } else if (logsFilter.type === 'reason') {
                  const rs = clean(l.reason);
                  return rs === logsFilter.value;
                }
                return false;
              });
              return (
                <div className="text-sm text-gray-600">ตาราง Log ถูกปิดใช้งานตามคำขอ</div>
              );
            })()}
          </CollapsibleCard>
        )}

        {/* Modals (duplicated here for analysis tab) */}
        {suspectDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSuspectDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">สาเหตุคะแนนความสงสัย — {suspectDetail.user}</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-3">
                {suspectDetail.loading ? (
                  <div className="text-sm text-gray-600">กำลังโหลด...</div>
                ) : suspectDetail.error ? (
                  <div className="text-sm text-red-600">{suspectDetail.error}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">คะแนนรวม (ปฏิเสธ%)</div>
                      <div className="text-xl font-bold text-blue-600">{suspectDetail.score}%</div>
                    </div>
                    <div className="text-sm text-gray-700">รายละเอียดปัจจัย</div>
                    <ul className="divide-y rounded border">
                      {(suspectDetail.breakdown || []).map((b, i) => (
                        <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{b.label} × {b.value}%</div>
                            <div className="text-gray-500 text-xs">{b.detail}</div>
                          </div>
                          <div className="text-blue-600 font-semibold">{b.value}%</div>
                        </li>
                      ))}
                      {(!suspectDetail.breakdown || suspectDetail.breakdown.length === 0) && (
                        <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                      )}
                    </ul>
                    <div className="text-xs text-gray-600">
                      สรุป: รวม {suspectDetail.counts?.total || 0} ครั้ง • ปฏิเสธ {suspectDetail.counts?.denied || 0} • นอกเวลา {suspectDetail.counts?.offHours || 0} • วันหยุด {suspectDetail.counts?.weekend || 0} • สถานที่ {suspectDetail.counts?.uniqueLocations || 0}
                    </div>
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
                <button className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100" onClick={()=>setSuspectDetail(null)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
        {alertDetail && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAlertDetail(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">รายละเอียดแจ้งเตือน</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setAlertDetail(null)}>ปิด</button>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{alertDetail.who || 'Unknown'}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${alertDetail.risk==='high'?'bg-red-100 text-red-700':alertDetail.risk==='medium'?'bg-yellow-100 text-yellow-700':'bg-emerald-100 text-emerald-700'}`}>{alertDetail.risk==='high'?'สูง':alertDetail.risk==='medium'?'ปานกลาง':'ต่ำ'}</span>
                </div>
                {alertDetail.description && (
                  <div className="text-gray-700">{alertDetail.description}</div>
                )}
                <div className="text-gray-600 space-y-1">
                  {alertDetail.location && (<div className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{alertDetail.location}</div>)}
                  {alertDetail.time && (<div className="flex items-center gap-2"><Clock className="w-4 h-4"/>{new Date(alertDetail.time).toLocaleString('th-TH')}</div>)}
                </div>
              </div>
              <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-2">
                {alertDetail.who && (
                  <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>{ explainUser(alertDetail.who); setAlertDetail(null); }}>ดูผู้ใช้นี้</button>
                )}
                {alertDetail.location && (
                  <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>{ setLocDetail({ name: alertDetail.location }); setAlertDetail(null); }}>ดูสถานที่นี้</button>
                )}
                <button className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-100 text-sm" onClick={()=>setAlertDetail(null)}>ปิด</button>
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
                    const usr = clean(it.cardName || it.cardNumber);
                    if (!isEmptyish(usr)) users.add(usr);
                    const rs = (it.reason ?? '').toString().trim();
                    if (rs) reasons.set(rs, (reasons.get(rs) || 0) + 1);
                  }
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{total.toLocaleString('th-TH')}</div>
                          <div className="text-xs text-gray-600">รวมทั้งหมด</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">{denied.toLocaleString('th-TH')}</div>
                          <div className="text-xs text-gray-600">ปฏิเสธ</div>
                        </div>
                      </div>
                      {reasons.size>0 && (
                        <div className="text-sm text-gray-700">
                          สาเหตุยอดฮิต:
                          <ul className="list-disc pl-5 mt-1 text-xs text-gray-600">
                            {Array.from(reasons.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([reason, cnt], idx) => (
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

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'analysis':
        return renderAnalysis();
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
    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 bg-gray-50">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
              <LayoutDashboard className="mr-3 h-6 w-6 text-blue-600" />
              ภาพรวมข้อมูล & วิเคราะห์
            </h1>
            <p className="text-gray-600 mt-1 text-sm">ภาพรวม, สถิติ และการวิเคราะห์เชิงลึกของข้อมูลการเข้าถึง</p>
          </div>
          {(() => (
            <div className="flex flex-wrap items-center gap-3 text-sm" ref={alertsRef}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/80 backdrop-blur-sm shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${headerComputed.risk.cls}`}></span>
                <span className="text-gray-800">ความเสี่ยง: {headerComputed.risk.label}</span>
              </span>

              <div className="relative">
                <button
                  onClick={() => setAlertsOpen(v => !v)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
                  aria-expanded={alertsOpen}
                >
                  <Bell className="h-4 w-4 text-gray-800" aria-hidden="true" />
                  <span className="sr-only">แจ้งเตือน</span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-red-600 text-white shadow-sm">{headerComputed.alerts}</span>
                </button>

                {alertsOpen && (
                  <div className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden z-40">
                    <div className="px-3 py-2 border-b bg-gray-50 text-gray-900 font-medium">รายการแจ้งเตือนล่าสุด</div>
                    <div className="max-h-96 overflow-y-auto divide-y">
                      {headerComputed.list.length === 0 && (
                        <div className="p-4 text-sm text-gray-600">ไม่มีแจ้งเตือน</div>
                      )}
                      {headerComputed.list.slice(0, 20).map((it, idx) => (
                        <div key={idx} className={`p-3 hover:bg-gray-50 border-l-4 cursor-pointer ${it.risk==='high' ? 'border-red-400 bg-red-50/30' : it.risk==='medium' ? 'border-yellow-400 bg-yellow-50/30' : 'border-emerald-400 bg-emerald-50/30'}`} onClick={()=>setAlertDetail(it)}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-gray-900 truncate">{it.who || 'Unknown'}</div>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${it.risk==='high' ? 'bg-red-100 text-red-700' : it.risk==='medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{it.risk==='high'?'สูง':it.risk==='medium'?'ปานกลาง':'ต่ำ'}</span>
                              </div>
                              {it.description && (
                                <div className="text-xs text-gray-700 mt-1 truncate">{it.description}</div>
                              )}
                              <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                                {it.who && <span className="inline-flex items-center gap-1"><UserIcon className="w-3.5 h-3.5"/>{it.who}</span>}
                                {it.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{it.location}</span>}
                                {it.time && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{new Date(it.time).toLocaleString('th-TH')}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {headerComputed.list.length > 20 && (
                      <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50 text-center">แสดง 20 รายการจากทั้งหมด {headerComputed.list.length.toLocaleString('th-TH')} รายการ</div>
                    )}
                  </div>
                )}
              </div>

              <span className="hidden sm:inline text-gray-700 px-3 py-1.5 rounded-full border bg-white/80 backdrop-blur-sm shadow-sm">
                {singleDayInfo.sameDay && singleDayInfo.day
                  ? `ข้อมูลเพียงวันที่: ${singleDayInfo.day.toLocaleDateString('th-TH')}`
                  : `อัปเดตล่าสุด: ${headerComputed.last ? headerComputed.last.toLocaleString('th-TH') : '-'}`}
              </span>
            </div>
          ))()}
        </div>
        {/* Snapshot banner removed per request */}
      </header>

      {/* Tabs: Overview vs Analysis */}
      <div className="max-w-7xl mx-auto w-full">
        <div role="tablist" aria-label="มุมมอง" className="inline-flex gap-2">
          <button
            id="tab-overview"
            role="tab"
            aria-selected={activeView==='overview'}
            className={`px-3 py-1.5 rounded-md text-sm border ${activeView==='overview' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            onClick={()=>setActiveView('overview')}
          >ภาพรวมข้อมูล</button>
          <button
            id="tab-analysis"
            role="tab"
            aria-selected={activeView==='analysis'}
            className={`px-3 py-1.5 rounded-md text-sm border ${activeView==='analysis' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            onClick={()=>setActiveView('analysis')}
          >การวิเคราะห์</button>
        </div>
      </div>

      {/* Main Content */}
      <main role="tabpanel" aria-labelledby={`tab-${activeView}`} className="max-w-7xl mx-auto w-full mt-3">
        {renderContent()}
      </main>

      {/* Footer Info */}
      <footer className="text-center text-xs text-gray-500 pt-4 max-w-7xl mx-auto w-full">
        <p className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>อัปเดตล่าสุดเมื่อ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
        </p>
      </footer>
    </div>
  );
};

export default CombinedDashboardAnalyticsPage;
