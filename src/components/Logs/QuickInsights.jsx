import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';
import HourlyTrendChart from '../Dashboard/Charts/HourlyTrendChart.jsx';
import LocationDistributionChart from '../Dashboard/Charts/LocationDistributionChart.jsx';
import DirectionChart from '../Dashboard/Charts/DirectionChart.jsx';

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [h, l, d] = await Promise.all([
          apiService.getChartData('hourly', params),
          apiService.getChartData('location', params),
          apiService.getChartData('direction', params),
        ]);
        if (!mounted) return;
        const dirData = Array.isArray(d?.data) ? d.data : [];
        let finalDir = dirData;
        if (dirData.length === 0) {
          try {
            // Fallback: compute from logs when chart API returns empty
            const logRes = await apiService.getLogs({ ...(params||{}), page: 1, limit: 1000 });
            const rows = Array.isArray(logRes?.data) ? logRes.data : [];
            const counts = rows.reduce((acc, r) => {
              const raw = (r.Direction || r.direction || '').toString().trim().toUpperCase();
              const val = raw === 'INBOUND' || raw === 'เข้า' ? 'IN' : raw === 'OUTBOUND' || raw === 'ออก' ? 'OUT' : raw;
              if (val === 'IN' || val === 'OUT') acc[val] = (acc[val] || 0) + 1;
              return acc;
            }, {});
            finalDir = ['IN','OUT'].filter(k => counts[k] > 0).map(k => ({ direction: k, count: counts[k] }));
          } catch(e) {
            finalDir = [];
          }
        }
        setHourly({ data: h?.data || [], loading: false });
        setLocation({ data: l?.data || [], loading: false });
        setDirection({ data: finalDir, loading: false });
      } catch (e) {
        if (!mounted) return;
        setHourly({ data: [], loading: false });
        setLocation({ data: [], loading: false });
        setDirection({ data: [], loading: false });
      }
    };
    setHourly(s => ({ ...s, loading: true }));
    setLocation(s => ({ ...s, loading: true }));
    setDirection(s => ({ ...s, loading: true }));
    load();
    return () => { mounted = false; };
  }, [JSON.stringify(params)]);

  const top5Locations = useMemo(() => {
    return (location.data || [])
      .map(i => ({
        name: clean(i.location || i.locationDisplay),
        count: parseInt(i.count) || 0,
        success: parseInt(i.success) || parseInt(i.successfulAccess) || 0,
        denied: parseInt(i.denied) || parseInt(i.deniedAccess) || 0,
      }))
      .filter(i => !isEmptyish(i.name))
      .sort((a,b) => b.count - a.count)
      .slice(0,5);
  }, [location.data]);

  const openLocationDetail = async (name) => {
    try {
      setActiveTab('location');
      setLocationFocus(name);
      setLoadingDetail(true);
      const query = { ...(params || {}), page: 1, limit: 500, location: [name] };
      const res = await apiService.getLogs(query);
      const rows = res?.data || [];
      const normalize = (r) => ({
        dt: new Date(r['Date Time'] || r.dateTime),
        allow: (r.Allow === true || r.Allow === 't' || r.allow === true),
        location: clean(r.Location || r.location),
        cardName: clean(r['Card Name'] || r.cardName || r['Card Number'] || r.cardNumber),
        reason: clean(r.Reason || r.reason)
      });
      const items = rows.map(normalize).filter(x => x.dt && !isNaN(x.dt));
      const total = items.length;
      let denied = 0, offHours = 0, weekend = 0;
      const users = new Set();
      const reasons = new Map();
      let lastTime = null;
      for (const it of items) {
        if (!it.allow) denied++;
        const h = it.dt.getHours();
        const d = it.dt.getDay();
        if (h >= 22 || h <= 6) offHours++;
        if (d === 0 || d === 6) weekend++;
        if (!isEmptyish(it.cardName)) users.add(it.cardName);
        if (!isEmptyish(it.reason)) reasons.set(it.reason, (reasons.get(it.reason) || 0) + 1);
        if (!lastTime || it.dt > lastTime) lastTime = it.dt;
      }
      const deniedRate = total > 0 ? Math.round((denied/total)*100) : 0;
      const breakdown = [];
      if (denied>0) breakdown.push({ label:'ปฏิเสธ', value: denied, detail:'จำนวนครั้งที่ถูกปฏิเสธ', contrib: denied*2, weight:2 });
      if (offHours>0) breakdown.push({ label:'นอกเวลา', value: offHours, detail:'ช่วง 22:00–06:00', contrib: offHours, weight:1 });
      if (weekend>0) breakdown.push({ label:'วันหยุด', value: weekend, detail:'เสาร์/อาทิตย์', contrib: weekend, weight:1 });
      if (users.size>10) breakdown.push({ label:'ผู้ใช้หลากหลาย', value: users.size, detail:'ผู้ใช้ไม่ซ้ำ > 10', contrib: Math.round((users.size-10)*0.5*10)/10, weight:0.5 });
      if (deniedRate>0) breakdown.push({ label:'อัตราถูกปฏิเสธ', value: deniedRate, detail:'เปอร์เซ็นต์เหตุการณ์', contrib: Math.min(10, Math.round((denied/Math.max(1,total))*20)), weight:'~' });
      const score = Math.min(100, Math.round(breakdown.reduce((s, b) => s + b.contrib, 0)));
      // top reasons
      const topReasons = Array.from(reasons.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
      setLocDetail({
        name,
        score,
        breakdown,
        counts: { total, denied, offHours, weekend, uniqueUsers: users.size },
        topReasons,
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
              { key: 'hourly', label: 'รายชั่วโมง' },
              { key: 'location', label: 'ตามสถานที่' },
              { key: 'direction', label: 'ทิศทาง' },
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
            {activeTab === 'direction' && (
              <DirectionChart data={direction.data} loading={direction.loading} />
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
                      รวม {l.count.toLocaleString('th-TH')} • ปฏิเสธ {l.denied.toLocaleString('th-TH')}
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
                          <div className="font-medium text-gray-900">{b.label} × {b.value}</div>
                          <div className="text-gray-500 text-xs">{b.detail} • น้ำหนัก {b.weight}</div>
                        </div>
                        <div className="text-blue-600 font-semibold">+{b.contrib}</div>
                      </li>
                    ))}
                    {(!locDetail.breakdown || locDetail.breakdown.length === 0) && (
                      <li className="px-3 py-2 text-sm text-gray-500">ไม่มีปัจจัยที่เพิ่มคะแนน</li>
                    )}
                  </ul>
                  <div className="text-xs text-gray-600">
                    สรุป: รวม {locDetail.counts?.total || 0} ครั้ง • ปฏิเสธ {locDetail.counts?.denied || 0} • นอกเวลา {locDetail.counts?.offHours || 0} • วันหยุด {locDetail.counts?.weekend || 0} • ผู้ใช้ {locDetail.counts?.uniqueUsers || 0}
                  </div>
                  {locDetail.topReasons && locDetail.topReasons.length > 0 && (
                    <div className="text-sm text-gray-700">
                      สาเหตุยอดฮิต:
                      <ul className="list-disc pl-5 mt-1 text-xs text-gray-600">
                        {locDetail.topReasons.map(([reason, cnt], idx) => (
                          <li key={idx}>{reason} — {cnt.toLocaleString('th-TH')} ครั้ง</li>
                        ))}
                      </ul>
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
