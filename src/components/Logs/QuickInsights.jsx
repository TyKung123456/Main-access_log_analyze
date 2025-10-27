import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';
import HourlyTrendChart from '../Dashboard/Charts/HourlyTrendChart.jsx';
import LocationDistributionChart from '../Dashboard/Charts/LocationDistributionChart.jsx';
// import DirectionChart from '../Dashboard/Charts/DirectionChart.jsx';

const QuickInsights = ({ params }) => {
  const isEmptyish = (v) => {
    if (v === undefined || v === null) return true;
    const s = String(v).trim().toLowerCase();
    return s === '' || ['ไม่ระบุ', 'ไม่ระบุสถานที่', 'ไม่ระบุชื่อ', 'n/a', 'na', '-', '—', 'unspecified', 'not specified'].includes(s);
  };
  const clean = (v) => (isEmptyish(v) ? '' : (typeof v === 'string' ? v.trim() : v));
  const [hourly, setHourly] = useState({ data: [], loading: true });
  const [location, setLocation] = useState({ data: [], loading: true });
  const [direction, setDirection] = useState({ data: [], loading: true });
  const [activeTab, setActiveTab] = useState('hourly');
  const [locationFocus, setLocationFocus] = useState('all');
  const [locDetail, setLocDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [directionTS, setDirectionTS] = useState([]);
  const [showAllReasons, setShowAllReasons] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [h, l] = await Promise.all([
          apiService.getChartData('hourly', params),
          apiService.getChartData('location', params),
        ]);
        if (!mounted) return;
        setHourly({ data: h?.data || [], loading: false });
        setLocation({ data: l?.data || [], loading: false });
        // Direction view removed

        // Build time series (hourly IN/OUT, today vs average) from logs
        try {
          const logRes = await apiService.getLogs({ ...(params||{}), page: 1, limit: 5000, sort: 'Date Time', order: 'ASC' });
          const rows = Array.isArray(logRes?.data) ? logRes.data : [];
          const normalize = (r) => {
            const dtRaw = r['Date Time'] || r.dateTime;
            let dt = null; try { dt = new Date(dtRaw); if (isNaN(dt)) dt = null; } catch {}
            const dirRaw = (r.Direction || r.direction || '').toString().trim().toUpperCase();
            const dir = dirRaw === 'INBOUND' || dirRaw === 'เข้า' ? 'IN' : dirRaw === 'OUTBOUND' || dirRaw === 'ออก' ? 'OUT' : dirRaw;
            return { dt, dir };
          };
          const items = rows.map(normalize).filter(x => x.dt);
          const hours = Array.from({ length: 24 }, (_, h) => ({
            hour: `${String(h).padStart(2,'0')}:00`,
            hourRange: `${String(h).padStart(2,'0')}:00 - ${String(h).padStart(2,'0')}:59`,
            IN: 0, OUT: 0, todayTotal: 0, total: 0
          }));
          const daySet = new Set();
          const byDayHour = new Map(); // key dayKey -> array[24] totals
          const todayKey = new Date().toISOString().slice(0,10);
          for (const it of items) {
            const h = it.dt.getHours();
            const dk = it.dt.toISOString().slice(0,10);
            daySet.add(dk);
            if (it.dir === 'IN') hours[h].IN++;
            else if (it.dir === 'OUT') hours[h].OUT++;
            hours[h].total++;
            if (dk === todayKey) hours[h].todayTotal++;
            const arr = byDayHour.get(dk) || Array(24).fill(0);
            arr[h]++;
            byDayHour.set(dk, arr);
          }
          // Average per hour across days
          const dayCount = Array.from(daySet).length || 1;
          const ts = hours.map((o, h) => {
            let sum = 0; byDayHour.forEach(arr => { sum += arr[h] || 0; });
            const avg = sum / dayCount;
            return { ...o, avgTotal: Math.round(avg) };
          });
          setDirectionTS(ts);
        } catch {
          setDirectionTS([]);
        }
      } catch (e) {
        if (!mounted) return;
        setHourly({ data: [], loading: false });
        setLocation({ data: [], loading: false });
        setDirection({ data: [], loading: false });
        setDirectionTS([]);
      }
    };
    setHourly(s => ({ ...s, loading: true }));
    setLocation(s => ({ ...s, loading: true }));
    setDirection(s => ({ ...s, loading: true }));
    load();
    return () => { mounted = false; };
  }, [JSON.stringify(params)]);

  const top5Locations = useMemo(() => {
    const items = (location.data || [])
      .map(i => ({
        name: clean(i.location || i.locationDisplay),
        count: parseInt(i.count) || 0,
        success: parseInt(i.success) || parseInt(i.successfulAccess) || 0,
        denied: parseInt(i.denied) || parseInt(i.deniedAccess) || 0,
      }))
      .filter(i => !isEmptyish(i.name));
    const total = items.reduce((s, it) => s + (it.count || 0), 0) || 1;
    return items
      .sort((a,b) => b.count - a.count)
      .slice(0,5)
      .map(it => ({ ...it, pct: Math.round((it.count / total) * 1000) / 10 })); // one decimal place
  }, [location.data]);

  const openLocationDetail = async (name) => {
    try {
      setActiveTab('location');
      setLocationFocus(name);
      setShowAllReasons(false);
      setLoadingDetail(true);
      // ใช้ limit สูงเพื่อให้สรุปใกล้เคียงทั้งชุดข้อมูล และอ่านค่า total จาก pagination
      const query = { ...(params || {}), page: 1, limit: 50000, location: [name] };
      const res = await apiService.getLogs(query);
      const rows = res?.data || [];
      const isAllowish = (v) => {
        if (v === true || v === 1) return true;
        const s = String(v ?? '').trim().toLowerCase();
        return ['true','t','1','yes','y','success','allow','allowed','pass','granted','verify success'].includes(s) || s.includes('success');
      };
      const firstTruthy = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '');
      const normalize = (r) => ({
        dt: new Date(r['Date Time'] || r.dateTime),
        allow: isAllowish(firstTruthy(r.Allow, r.allow, r['Allow Status'], r.allowStatus, r['Access Result'], r.accessResult, r.Result, r.result, r.Status, r.status, r['Reason'], r.reason)),
        location: clean(r.Location || r.location),
        cardName: clean(r['Card Name'] || r.cardName || r['Card Number'] || r.cardNumber),
        reason: clean(r.Reason || r.reason)
      });
      const items = rows.map(normalize).filter(x => x.dt && !isNaN(x.dt));
      const total = (res?.pagination?.total != null) ? parseInt(res.pagination.total, 10) : items.length;
      let denied = 0, offHours = 0, weekend = 0;
      const users = new Set();
      const reasons = new Map();
      let lastTime = null;
      const isSuccessReason = (txt) => {
        if (isEmptyish(txt)) return false;
        const s = String(txt).trim().toLowerCase();
        return s === 'verify success' || s === 'success' || s.includes('success') || s === 'allow' || s === 'allowed' || s.includes('granted') || s === 'pass' || s === 'passed';
      };

      for (const it of items) {
        if (!it.allow) denied++;
        const h = it.dt.getHours();
        const d = it.dt.getDay();
        if (h >= 22 || h <= 6) offHours++;
        if (d === 0 || d === 6) weekend++;
        if (!isEmptyish(it.cardName)) users.add(it.cardName);
        // เก็บเฉพาะเหตุผลที่เป็นความผิดปกติ/ปฏิเสธ ไม่ใช่ข้อความสำเร็จ
        if (!isEmptyish(it.reason) && (!it.allow) && !isSuccessReason(it.reason)) {
          reasons.set(it.reason, (reasons.get(it.reason) || 0) + 1);
        }
        if (!lastTime || it.dt > lastTime) lastTime = it.dt;
      }
      const deniedPct = total > 0 ? (denied/total)*100 : 0;
      const offPct = total > 0 ? (offHours/total)*100 : 0;
      const weekendPct = total > 0 ? (weekend/total)*100 : 0;
      const breakdown = [];
      // คิดเป็นสัดส่วนของทั้งหมด (ร้อยละ) แล้วนำมาบวกกันโดยตรง
      if (total > 0 && denied > 0) breakdown.push({ label:'ปฏิเสธ', value: Math.round(deniedPct), detail:`ปฏิเสธ ${denied}/${total} (${deniedPct.toFixed(1)}%)`, contrib: Math.round(deniedPct), unit:'%' });
      if (total > 0 && offHours > 0) breakdown.push({ label:'นอกเวลา', value: Math.round(offPct), detail:`ช่วง 22:00–06:00 ${offHours}/${total} (${offPct.toFixed(1)}%)`, contrib: Math.round(offPct), unit:'%' });
      if (total > 0 && weekend > 0) breakdown.push({ label:'วันหยุด', value: Math.round(weekendPct), detail:`เสาร์/อาทิตย์ ${weekend}/${total} (${weekendPct.toFixed(1)}%)`, contrib: Math.round(weekendPct), unit:'%' });
      const score = Math.min(100, Math.round(breakdown.reduce((s, b) => s + (b.contrib || 0), 0)));
      // reasons list (sorted desc)
      const reasonsSorted = Array.from(reasons.entries()).sort((a,b)=>b[1]-a[1]);
      setLocDetail({
        name,
        score,
        breakdown,
        counts: { total, denied, offHours, weekend, uniqueUsers: users.size },
        reasonsSorted,
        lastTime,
      });
    } catch (e) {
      setLocDetail({ name, error: e.message || 'โหลดรายละเอียดไม่สำเร็จ' });
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-900">กราฟรวม</h2>
          <div className="flex items-center gap-2">
            {[
              { key: 'location', label: 'ตามสถานที่' },
              { key: 'hourly', label: 'รายชั่วโมง' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${activeTab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 p-4">
            {activeTab === 'hourly' && (
              <HourlyTrendChart data={hourly.data} loading={hourly.loading} />
            )}
            {activeTab === 'location' && (
              <LocationDistributionChart data={location.data} loading={location.loading} initialLocation={locationFocus} />
            )}
          </div>
          <div className="border-l p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">Top 5 สถานที่</h3>
            </div>
            <ul className="divide-y">
              {top5Locations.length === 0 ? (
                <li className="py-3 text-sm text-gray-500">ไม่มีข้อมูล</li>
              ) : top5Locations.map((l, idx) => (
                <li key={idx} className="py-2 text-sm flex justify-between items-center">
                  <button
                    className="min-w-0 text-left"
                    onClick={() => openLocationDetail(l.name)}
                    title="ดูรายละเอียดสถานที่"
                  >
                    <div className="font-medium text-gray-900 truncate">{idx+1}. {l.name}</div>
                    <div className="text-xs text-gray-600 truncate">
                      รวม {l.count.toLocaleString('th-TH')} ครั้ง ({(l.pct ?? 0).toFixed(1)}%) • ปฏิเสธ {l.denied.toLocaleString('th-TH')}
                      {l.count > 0 && (
                        <span className="ml-1">({((l.denied / l.count) * 100).toFixed(1)}%)</span>
                      )}
                    </div>
                  </button>
                  <button onClick={() => openLocationDetail(l.name)} className="text-blue-600 text-xs hover:underline">รายละเอียด</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {locDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setLocDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">รายละเอียดสถานที่ — {locDetail.name}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={()=>setLocDetail(null)}>ปิด</button>
            </div>
            <div className="p-4 space-y-3">
              {loadingDetail ? (
                <div className="text-sm text-gray-600">กำลังโหลด...</div>
              ) : locDetail.error ? (
                <div className="text-sm text-red-600">{locDetail.error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">คะแนนรวม</div>
                    <div className="text-xl font-bold text-blue-600">{locDetail.score}</div>
                  </div>
                  <div className="text-sm text-gray-700">รายละเอียดปัจจัย</div>
                  <ul className="divide-y rounded border">
                    {(locDetail.breakdown || []).map((b, i) => (
                      <li key={i} className="px-3 py-2 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{b.label} • {b.value}%</div>
                          <div className="text-gray-500 text-xs">{b.detail}</div>
                        </div>
                        <div className="text-blue-600 font-semibold">+{b.contrib}%</div>
                      </li>
                    ))}
                    {(!locDetail.breakdown || locDetail.breakdown.length === 0) && (
                      <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                    )}
                  </ul>
                  <div className="text-xs text-gray-600">
                    สรุป: รวม {(locDetail.counts?.total||0).toLocaleString('th-TH')} ครั้ง • ปฏิเสธ {(locDetail.counts?.denied||0).toLocaleString('th-TH')} • นอกเวลา {(locDetail.counts?.offHours||0).toLocaleString('th-TH')} • วันหยุด {(locDetail.counts?.weekend||0).toLocaleString('th-TH')} • ผู้ใช้ {(locDetail.counts?.uniqueUsers||0).toLocaleString('th-TH')}
                  </div>
                  {Array.isArray(locDetail.reasonsSorted) && locDetail.reasonsSorted.length > 0 && (
                    <div className="text-sm text-gray-700">
                      เหตุผลการปฏิเสธ{showAllReasons ? 'ทั้งหมด' : 'ที่พบบ่อย'} ({locDetail.reasonsSorted.length.toLocaleString('th-TH')} รายการ):
                      <ul className="list-disc pl-5 mt-1 text-xs text-gray-600 max-h-52 overflow-auto">
                        {(showAllReasons ? locDetail.reasonsSorted : locDetail.reasonsSorted.slice(0,10)).map(([reason, cnt], idx) => (
                          <li key={idx}>{reason || '(ไม่ระบุ)'} — {cnt.toLocaleString('th-TH')} ครั้ง</li>
                        ))}
                      </ul>
                      {locDetail.reasonsSorted.length > 10 && (
                        <button onClick={()=>setShowAllReasons(s=>!s)} className="mt-2 text-xs text-blue-600 hover:underline">
                          {showAllReasons ? 'แสดงเฉพาะ Top 10' : 'แสดงทั้งหมด'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
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

export default QuickInsights;
