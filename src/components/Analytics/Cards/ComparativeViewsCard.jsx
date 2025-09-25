import React, { useMemo, useState } from 'react';

const ComparativeViewsCard = ({ logData = [], onPickFilter, onRowClick }) => {
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

  const [compareMode, setCompareMode] = useState('ww'); // 'ww' | 'bo' | 'dp' | 'ev'
  const [cvDetail, setCvDetail] = useState(null); // { mode, label, stats }

  const buildSegmentStats = (predicate) => {
    const rows = (logData || []).filter(l => {
      try { return predicate(l); } catch { return false; }
    });
    const total = rows.length;
    let denied = 0;
    const locMap = new Map();
    const reasonMap = new Map();
    rows.forEach(l => {
      const isDenied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      if (isDenied) denied++;
      const loc = clean(l.location || l.door);
      if (!isEmptyish(loc)) {
        const cur = locMap.get(loc) || { total: 0, denied: 0 };
        cur.total += 1; if (isDenied) cur.denied += 1;
        locMap.set(loc, cur);
      }
      const rs = clean(l.reason);
      if (isDenied && !isEmptyish(rs)) {
        reasonMap.set(rs, (reasonMap.get(rs) || 0) + 1);
      }
    });
    const allow = total - denied;
    const denyRate = total > 0 ? Math.round((denied / total) * 100) : 0;
    const topLocations = Array.from(locMap.entries())
      .sort((a,b)=> b[1].total - a[1].total)
      .slice(0,3)
      .map(([name, v]) => ({ name, total: v.total, denied: v.denied, rate: v.total>0 ? Math.round((v.denied/v.total)*100) : 0 }));
    const topReasons = Array.from(reasonMap.entries())
      .sort((a,b)=> b[1] - a[1])
      .slice(0,3)
      .map(([name, count]) => ({ name, count }));
    return { total, allow, denied, denyRate, topLocations, topReasons };
  };

  // Pre-calc helpers
  const totals = useMemo(() => {
    // Weekday/Weekend
    let wd=0, we=0, wdDenied=0, weDenied=0;
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
      const d = dt.getDay();
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      if (d===0 || d===6) { we++; if (denied) weDenied++; } else { wd++; if (denied) wdDenied++; }
    });
    const ww = { wd, we, wdDenied, weDenied };

    // Business vs Off-hours
    let bo=0, off=0, boDenied=0, offDenied=0;
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : null; if(!dt||isNaN(dt)) return;
      const h = dt.getHours(); const d = dt.getDay();
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      const isBusiness = (d>=1 && d<=5) && (h>=8 && h<18);
      if (isBusiness) { bo++; if (denied) boDenied++; } else { off++; if (denied) offDenied++; }
    });
    const boh = { bo, off, boDenied, offDenied };

    // Dayparts
    const parts = [
      { key: '00-06', h: [0,6], color:'#6366f1' },
      { key: '06-12', h: [6,12], color:'#22c55e' },
      { key: '12-18', h: [12,18], color:'#f59e0b' },
      { key: '18-24', h: [18,24], color:'#ef4444' },
    ].map(p => ({...p, count:0, denied:0}));
    (logData || []).forEach(l => {
      const dt = l.dateTime ? new Date(l.dateTime) : null; if (!dt || isNaN(dt)) return;
      const h = dt.getHours();
      const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
      const part = parts.find(p => h>=p.h[0] && h<p.h[1]);
      if (part) { part.count += 1; if (denied) part.denied += 1; }
    });
    const dp = parts;

    // Events
    const evCounts = new Map();
    const evDenied = new Map();
    (logData || []).forEach(l => {
      const ev = clean(l.campaign || l.event || l.campaignName || l.eventName);
      if (!isEmptyish(ev)) {
        evCounts.set(ev, (evCounts.get(ev)||0)+1);
        const denied = l.allow === false || l.status === 'denied' || l.accessResult === 'DENIED';
        if (denied) evDenied.set(ev, (evDenied.get(ev)||0)+1);
      }
    });
    const ev = { evCounts, evDenied, topEv: Array.from(evCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3) };

    return { ww, boh, dp, ev };
  }, [logData]);

  const totalAll = (logData || []).length || 1;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900">Comparative Views</div>
        <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
          {[
            {k:'ww',label:'Weekday/Weekend'},
            {k:'bo',label:'Business/Off-hours'},
            {k:'dp',label:'Dayparts'},
            {k:'ev',label:'Events'},
          ].map(o=> (
            <button key={o.k}
              onClick={()=>setCompareMode(o.k)}
              className={`px-2.5 py-1 rounded-md ${compareMode===o.k? 'bg-white shadow-sm text-gray-900':'text-gray-600 hover:text-gray-900'}`}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {/* WW / BO */}
      {(compareMode==='ww' || compareMode==='bo') && (
        <div className="grid grid-cols-2 gap-3">
          {compareMode==='ww' ? (
            <>
              {(() => {
                const { wd, wdDenied } = totals.ww; const rate = wd>0? Math.round((wdDenied/wd)*100):0;
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Weekday</span>
                      <span className="font-medium text-gray-900">{wd.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded overflow-hidden border cursor-pointer"
                      title="แตะเพื่อดูรายละเอียด"
                      onClick={()=>setCvDetail({ mode:'weekday', label:'Weekday', stats: buildSegmentStats(l=>{ const dt=l.dateTime?new Date(l.dateTime):null; if(!dt||isNaN(dt)) return false; const d=dt.getDay(); return !(d===0||d===6); }) })}
                    >
                      <div className="h-3 bg-emerald-500 inline-block" style={{ width: `${wd>0? Math.round(((wd-wdDenied)/wd)*100):0}%` }} />
                      <div className="h-3 bg-red-500 inline-block" style={{ width: `${wd>0? Math.round((wdDenied/wd)*100):0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Deny {rate}%</div>
                  </div>
                );
              })()}
              {(() => {
                const { we, weDenied } = totals.ww; const rate = we>0? Math.round((weDenied/we)*100):0;
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Weekend</span>
                      <span className="font-medium text-gray-900">{we.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded overflow-hidden border cursor-pointer"
                      title="แตะเพื่อดูรายละเอียด"
                      onClick={()=>setCvDetail({ mode:'weekend', label:'Weekend', stats: buildSegmentStats(l=>{ const dt=l.dateTime?new Date(l.dateTime):null; if(!dt||isNaN(dt)) return false; const d=dt.getDay(); return (d===0||d===6); }) })}
                    >
                      <div className="h-3 bg-emerald-500 inline-block" style={{ width: `${we>0? Math.round(((we-weDenied)/we)*100):0}%` }} />
                      <div className="h-3 bg-red-500 inline-block" style={{ width: `${we>0? Math.round((weDenied/we)*100):0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Deny {rate}%</div>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              {(() => {
                const { bo, boDenied } = totals.boh; const rate = bo>0? Math.round((boDenied/bo)*100):0;
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Business</span>
                      <span className="font-medium text-gray-900">{bo.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded overflow-hidden border cursor-pointer"
                      title="แตะเพื่อดูรายละเอียด"
                      onClick={()=>setCvDetail({ mode:'business', label:'Business Hours', stats: buildSegmentStats(l=>{ const dt=l.dateTime?new Date(l.dateTime):null; if(!dt||isNaN(dt)) return false; const h=dt.getHours(); const d=dt.getDay(); return (d>=1&&d<=5)&&(h>=8&&h<18); }) })}
                    >
                      <div className="h-3 bg-emerald-500 inline-block" style={{ width: `${bo>0? Math.round(((bo-boDenied)/bo)*100):0}%` }} />
                      <div className="h-3 bg-red-500 inline-block" style={{ width: `${bo>0? Math.round((boDenied/bo)*100):0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Deny {rate}%</div>
                  </div>
                );
              })()}
              {(() => {
                const { off, offDenied } = totals.boh; const rate = off>0? Math.round((offDenied/off)*100):0;
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Off-hours</span>
                      <span className="font-medium text-gray-900">{off.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded overflow-hidden border cursor-pointer"
                      title="แตะเพื่อดูรายละเอียด"
                      onClick={()=>setCvDetail({ mode:'offhours', label:'Off-hours', stats: buildSegmentStats(l=>{ const dt=l.dateTime?new Date(l.dateTime):null; if(!dt||isNaN(dt)) return false; const h=dt.getHours(); const d=dt.getDay(); return !((d>=1&&d<=5)&&(h>=8&&h<18)); }) })}
                    >
                      <div className="h-3 bg-emerald-500 inline-block" style={{ width: `${off>0? Math.round(((off-offDenied)/off)*100):0}%` }} />
                      <div className="h-3 bg-red-500 inline-block" style={{ width: `${off>0? Math.round((offDenied/off)*100):0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">Deny {rate}%</div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Dayparts */}
      {compareMode==='dp' && (
        <div>
          <div className="text-xs text-gray-600 mb-1">ช่วงเวลาในวัน</div>
          <ul className="space-y-1">
            {totals.dp.map((p,i)=>{
              const share = Math.round((p.count/totalAll)*100);
              const denyRate = p.count>0 ? Math.round((p.denied/p.count)*100) : 0;
              return (
                <li key={i} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{p.key}</span>
                    <span className="text-gray-700">{p.count.toLocaleString('th-TH')} <span className="text-gray-400">({share}%)</span></span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded overflow-hidden border cursor-pointer"
                    onClick={()=>setCvDetail({ mode:'daypart', label:`ช่วง ${p.key}`, stats: buildSegmentStats(l => { const dt=l.dateTime?new Date(l.dateTime):null; if(!dt||isNaN(dt)) return false; const h=dt.getHours(); return h>=p.h[0] && h<p.h[1]; }) })}
                    title="แตะเพื่อดูรายละเอียด"
                  >
                    <div className="h-3 inline-block bg-emerald-500" style={{ width: `${p.count>0? Math.round(((p.count-p.denied)/p.count)*100):0}%` }} />
                    <div className="h-3 inline-block bg-red-500" style={{ width: `${p.count>0? Math.round((p.denied/p.count)*100):0}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-600">Deny {denyRate}%</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Events */}
      {compareMode==='ev' && (
        <div>
          <div className="text-xs text-gray-600 mb-1">แคมเปญ/เหตุการณ์</div>
          {totals.ev.topEv.length === 0 ? (
            <div className="text-xs text-gray-400">ไม่มีข้อมูล</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {totals.ev.topEv.map(([name, c], i) => {
                const d = totals.ev.evDenied.get(name) || 0;
                const rate = c>0 ? Math.round((d/c)*100) : 0;
                return (
                  <li key={i} className="flex items-center justify-between cursor-pointer"
                    onClick={()=>setCvDetail({ mode:'event', label:name, stats: buildSegmentStats(l=>{ const ev=clean(l.campaign||l.event||l.campaignName||l.eventName); return !isEmptyish(ev) && ev===name; }) })}
                    title="แตะเพื่อดูรายละเอียด"
                  >
                    <span className="truncate mr-2">{i+1}. {name}</span>
                    <span className="text-gray-700">{c.toLocaleString('th-TH')} <span className="text-gray-400">(Deny {rate}%)</span></span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {cvDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={()=>setCvDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">รายละเอียด — {cvDetail.label}</div>
              <button className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100 text-gray-700" onClick={()=>setCvDetail(null)}>ปิด</button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(() => {
                const s = cvDetail.stats || {};
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-sm leading-relaxed">
                    <div className="bg-gray-50 rounded-md p-5 border lg:col-span-3">
                      <div className="text-gray-600 mb-3">สรุป</div>
                      <div className="space-y-2">
                        <div>รวม: <span className="font-semibold text-gray-900">{(s.total||0).toLocaleString('th-TH')}</span></div>
                        <div>อนุญาต: <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{(s.allow||0).toLocaleString('th-TH')}</span></div>
                        <div>ปฏิเสธ: <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">{(s.denied||0).toLocaleString('th-TH')}</span></div>
                        <div>Deny Rate: <span className={`font-semibold ${s.denyRate>15?'text-red-600':s.denyRate>5?'text-amber-600':'text-emerald-600'}`}>{s.denyRate || 0}%</span></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-5 border lg:col-span-6">
                      <div className="text-gray-600 mb-3">Top สถานที่</div>
                      {(s.topLocations||[]).length===0 ? (
                        <div className="text-gray-400">ไม่มีข้อมูล</div>
                      ) : (
                        <ul className="space-y-3">
                          {(s.topLocations||[]).map((i,idx)=>{
                            const allowPct = i.total>0? Math.round(((i.total-i.denied)/i.total)*100):0;
                            const denyPct = i.rate;
                            return (
                              <li key={idx} className="cursor-pointer" onClick={()=>{ onPickFilter?.({ type:'location', value: i.name }); setCvDetail(null); }} title="คลิกเพื่อกรองตาราง Log">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 text-gray-900 whitespace-normal break-words">{idx+1}. {i.name}</div>
                                  <span className="flex-none text-gray-700 flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[12px]">{i.total.toLocaleString('th-TH')}</span>
                                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[12px]">Deny {denyPct}%</span>
                                  </span>
                                </div>
                                <div className="mt-2 h-3 bg-gray-100 rounded overflow-hidden">
                                  <div className="h-3 inline-block bg-emerald-500" style={{ width: `${allowPct}%` }} />
                                  <div className="h-3 inline-block bg-red-500" style={{ width: `${denyPct}%` }} />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="bg-white rounded-md p-5 border lg:col-span-3">
                      <div className="text-gray-600 mb-3">เหตุผลปฏิเสธ</div>
                      {(s.topReasons||[]).length===0 ? (
                        <div className="text-gray-400">ไม่มีข้อมูล</div>
                      ) : (
                        <ul className="space-y-3">
                          {(s.topReasons||[]).map((i,idx)=> (
                            <li key={idx} className="flex items-start justify-between gap-4 cursor-pointer" onClick={()=>{ onPickFilter?.({ type:'reason', value: i.name }); setCvDetail(null); }} title="คลิกเพื่อกรองตาราง Log">
                              <div className="flex-1 text-gray-900 whitespace-normal break-words">{idx+1}. {i.name}</div>
                              <span className="flex-none px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[12px]">{i.count.toLocaleString('th-TH')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparativeViewsCard;

