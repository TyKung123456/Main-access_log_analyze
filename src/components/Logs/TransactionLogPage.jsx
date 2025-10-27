import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, ChevronDown, ChevronUp, Calendar, Check, X, ArrowUp, ArrowDown, User, Globe, Upload, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import apiService from '../../services/apiService';

const presets = [
  { key: 'all', label: 'แสดงทั้งหมด' },
  { key: 'today', label: 'วันนี้' },
  { key: '7d', label: '7 วันล่าสุด' },
  { key: '30d', label: '30 วันล่าสุด' },
  { key: 'custom', label: 'กำหนดเอง' },
];

const actionTypes = [
  { key: 'all', label: 'แสดงทั้งหมด' },
  { key: 'allow', label: 'อนุญาตเท่านั้น' },
  { key: 'deny', label: 'ปฏิเสธเท่านั้น' },
];

function toDateRange(preset) {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case '7d': {
      const end = now;
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case '30d': {
      const end = now;
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

const TransactionLogPage = ({ onRowClick, onOpenUpload }) => {
  const normalize = (v) => (typeof v === 'string' ? v.trim() : v);
  const isEmptyish = (v) => {
    const val = normalize(v);
    if (val === undefined || val === null) return true;
    if (val === '') return true;
    const lowered = String(val).toLowerCase();
    // Treat common placeholders as empty
    return [
      'ไม่ระบุ',
      'ไม่ระบุเวลา',
      'ไม่ระบุชื่อ',
      'ไม่ระบุสถานที่',
      'n/a',
      'na',
      'none',
      '-',
      '—',
      'unspecified',
      'not specified'
    ].includes(lowered);
  };
  const clean = (v) => (isEmptyish(v) ? '' : v);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  // Year filter
  const [year, setYear] = useState('all');

  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [sort, setSort] = useState({ column: 'Date Time', order: 'DESC' });

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locations, setLocations] = useState([]); // options
  const [directions, setDirections] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [doors, setDoors] = useState([]);

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDirections, setSelectedDirections] = useState([]);
  const [selectedUserTypes, setSelectedUserTypes] = useState([]);
  const [selectedDoors, setSelectedDoors] = useState([]);

  // Quick search for long lists
  const [locQuery, setLocQuery] = useState('');
  const [dirQuery, setDirQuery] = useState('');
  const [utQuery, setUtQuery] = useState('');
  const [doorQuery, setDoorQuery] = useState('');

  // Handle sidebar section jumps
  useEffect(() => {
    const onJump = (e) => {
      const id = e?.detail?.sectionId;
      if (!id || !String(id).startsWith('logs-')) return;
      try {
        const el = document.getElementById(id);
        if (el) {
          setLogsCollapsed(false);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // retrigger animation even if already present
          el.classList.remove('jump-flash');
          void el.offsetWidth; // force reflow
          el.classList.add('jump-flash');
          setTimeout(() => {
            el.classList.remove('jump-flash');
          }, 1800);
        }
      } catch {}
    };
    window.addEventListener('jumpTo', onJump);
    return () => window.removeEventListener('jumpTo', onJump);
  }, []);

  const params = useMemo(() => {
    const base = { page, limit, sort: sort.column, order: sort.order };
    if (search?.trim()) base.search = search.trim();
    if (action === 'allow') base.allow = true;
    if (action === 'deny') base.allow = false;

    if (datePreset === 'custom' && customStart && customEnd) {
      base.startDate = new Date(customStart).toISOString();
      base.endDate = new Date(new Date(customEnd).setHours(23, 59, 59, 999)).toISOString();
    } else if (datePreset !== 'all') {
      const r = toDateRange(datePreset);
      if (r.startDate) base.startDate = r.startDate;
      if (r.endDate) base.endDate = r.endDate;
    }
    // Year override (per-year filter)
    if (year !== 'all') {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const ys = new Date(y, 0, 1, 0, 0, 0, 0);
        const ye = new Date(y, 11, 31, 23, 59, 59, 999);
        base.startDate = ys.toISOString();
        base.endDate = ye.toISOString();
      }
    }
    if (selectedLocations.length > 0) base.location = selectedLocations;
    if (selectedDirections.length > 0) base.direction = selectedDirections;
    if (selectedUserTypes.length > 0) base.userType = selectedUserTypes;
    if (selectedDoors.length > 0) base.doors = selectedDoors;
    return base;
  }, [page, limit, sort, search, action, datePreset, customStart, customEnd, year, selectedLocations, selectedDirections, selectedUserTypes, selectedDoors]);

  // Logs follow selected date range (no realtime mode)

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getLogs(params);
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      setError(e.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);
  

  // Load/refresh filter option counts based on current filters (faceted)
  useEffect(() => {
    let mounted = true;
    const normalizeList = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (item == null) return null;
        if (typeof item === 'string') return { value: item, label: item, count: undefined };
        const value = item.value ?? item.key ?? item.id ?? item.name ?? item.label;
        const label = item.label ?? String(value ?? '');
        const count = item.count ?? item.total ?? item.qty ?? item.quantity ?? item.num ?? item.cnt;
        return { value, label, count };
      }).filter(Boolean);
    };
    (async () => {
      try {
        // Base facet params from current filters (exclude paging/sort)
        const base = { ...params };
        delete base.page; delete base.limit; delete base.sort; delete base.order;

        // For true faceting, exclude the facet itself from its own query
        const paramsForLocations = { ...base }; delete paramsForLocations.location;
        const paramsForDirections = { ...base }; delete paramsForDirections.direction;
        const paramsForUserTypes = { ...base }; delete paramsForUserTypes.userType;
        const paramsForDoors = { ...base }; delete paramsForDoors.doors;

        const [locRes, dirRes, utRes, doorRes] = await Promise.all([
          apiService.getLocations(paramsForLocations).catch(()=>({ locations: [] })),
          apiService.getDirections(paramsForDirections).catch(()=>({ directions: [] })),
          apiService.getUserTypes(paramsForUserTypes).catch(()=>({ userTypes: [] })),
          apiService.getDoors(paramsForDoors).catch(()=>({ doors: [] })),
        ]);
        if (!mounted) return;
        setLocations(normalizeList(locRes.locations || locRes.items || []));
        setDirections(normalizeList(dirRes.directions || dirRes.items || []));
        setUserTypes(normalizeList(utRes.userTypes || utRes.items || []));
        setDoors(normalizeList(doorRes.doors || doorRes.items || []));
      } catch {}
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(params)]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const doSearch = () => {
    setPage(1);
    fetchLogs();
  };

  // No auto-refresh: this page is not real-time by design

  const handleExport = async () => {
    try {
      const exportParams = { ...params };
      delete exportParams.page;
      delete exportParams.limit;
      const blob = await apiService.exportData('excel', exportParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `access_logs_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(`ส่งออกไม่สำเร็จ: ${e.message}`);
    }
  };

  const rowKeyOf = (r, idx) => r.id || r['Transaction ID'] || r['Id'] || `${r['Date Time'] || r.dateTime}-${idx}`;
  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // No grouping; render exact timestamp per row

  const setSortColumn = (column) => {
    setSort((prev) => ({
      column,
      order: prev.column === column && prev.order === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const SortIcon = ({ column }) => (
    sort.column === column ? (sort.order === 'ASC' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUp className="w-3 h-3 opacity-0"/>
  );

  const highlight = (text) => {
    const q = (search || '').trim();
    if (!q) return text || '-';
    try {
      const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const parts = String(text || '-').split(pattern);
      const matches = String(text || '-').match(pattern);
      if (!matches) return text || '-';
      const out = [];
      parts.forEach((p, i) => {
        out.push(p);
        if (i < parts.length - 1) out.push(<mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{matches[i]}</mark>);
      });
      return <span>{out}</span>;
    } catch { return text || '-'; }
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-2 py-3"><div className="h-4 w-5 bg-gray-200 rounded"/></td>
      <td className="px-4 py-3"><div className="h-4 w-36 bg-gray-200 rounded"/></td>
      <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-200 rounded"/></td>
      <td className="px-4 py-3"><div className="h-4 w-44 bg-gray-200 rounded"/></td>
      <td className="px-4 py-3"><div className="h-4 w-56 bg-gray-200 rounded"/></td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded"/></td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div id="quick-insights-anchor" />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Transaction Log</h1>
      </div>

      <div id="logs-filters" className="bg-white rounded-xl border shadow-sm p-4 ring-1 ring-black/5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-gray-700">ตัวกรอง</div>
          <div className="text-xs text-gray-600">ใช้งานอยู่ {
            [search?.trim()?1:0,
             action!=='all'?1:0,
             (year!=='all' || datePreset!=='all' || (datePreset==='custom' && customStart && customEnd))?1:0,
             selectedLocations.length>0?1:0,
             selectedDirections.length>0?1:0,
             selectedUserTypes.length>0?1:0,
             selectedDoors.length>0?1:0
            ].reduce((a,b)=>a+b,0)
          } รายการ</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">ค้นหา</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="ชื่อ, อีเมล, ไอพี, อื่นๆ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Action Type</label>
            <div className="relative">
              <select
                className="w-full appearance-none pr-8 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {actionTypes.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">ช่วงวันที่</label>
            <div className="relative">
              <select
                className="w-full appearance-none pr-8 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
              >
                {presets.map(o => (<option key={o.key} value={o.key}>{o.label}</option>))}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute right-7 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">ปี</label>
            <div className="relative">
              <select
                className="w-full appearance-none pr-8 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={year}
                onChange={(e) => {
                  const v = e.target.value;
                  setYear(v);
                  if (v !== 'all') {
                    const y = parseInt(v, 10);
                    if (!isNaN(y)) {
                      setDatePreset('custom');
                      setCustomStart(new Date(y, 0, 1).toISOString().slice(0,10));
                      setCustomEnd(new Date(y, 11, 31).toISOString().slice(0,10));
                    }
                  }
                }}
              >
                {(() => {
                  const out = [<option key="all" value="all">ทั้งหมด</option>];
                  const now = new Date().getFullYear();
                  for (let y = now; y >= now - 6; y--) out.push(<option key={y} value={y}>{y}</option>);
                  return out;
                })()}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={doSearch} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm">
              <Search className="w-4 h-4"/> ค้นหา
            </button>
            <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50 text-sm">
              <Download className="w-4 h-4"/> ส่งออกเป็น excel
            </button>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">วันที่เริ่ม</label>
              <input type="date" className="w-full border rounded-md px-3 py-2" value={customStart} onChange={(e)=>setCustomStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">วันที่สิ้นสุด</label>
              <input type="date" className="w-full border rounded-md px-3 py-2" value={customEnd} onChange={(e)=>setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {/* Advanced filters */}
        <div className="mt-3">
          <button
            onClick={() => setShowAdvanced(s => !s)}
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {showAdvanced ? <><ChevronUp className="w-4 h-4"/> ซ่อนตัวกรองเพิ่มเติม</> : <><ChevronDown className="w-4 h-4"/> ตัวกรองเพิ่มเติม</>}
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
              {/* Locations */}
              <div className="rounded-xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-800">สถานที่</label>
                  <div className="flex items-center gap-2">
                    {selectedLocations.length>0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{selectedLocations.length} เลือก</span>
                    )}
                    <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>setSelectedLocations([])}>ล้าง</button>
                  </div>
                </div>
                {/* chips */}
                <div className="min-h-[24px] mb-2">
                  {selectedLocations.length>0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedLocations.slice(0,4).map(v => (
                        <button key={v} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200 hover:bg-blue-100" onClick={()=>setSelectedLocations(selectedLocations.filter(x=>x!==v))} title="นำออก">
                          {v}
                        </button>
                      ))}
                      {selectedLocations.length>4 && (
                        <span className="text-xs text-gray-500">+{selectedLocations.length-4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input value={locQuery} onChange={(e)=>setLocQuery(e.target.value)} placeholder="ค้นหา..." className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {(locations||[]).filter(o => (o.label||o.value).toLowerCase().includes(locQuery.toLowerCase())).map(o => {
                    const checked = selectedLocations.includes(o.value);
                    return (
                      <label key={o.value} className="group flex items-center gap-2 py-1.5 px-2 rounded-md border hover:bg-gray-50 cursor-pointer">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <input type="checkbox" className="accent-blue-600" checked={checked} onChange={(e)=>{
                            setSelectedLocations(prev => e.target.checked ? [...new Set([...prev, o.value])] : prev.filter(v=>v!==o.value));
                          }} />
                          <span className="text-sm text-gray-800 truncate">{o.label || o.value}</span>
                        </span>
                        {o.count ? (<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.count.toLocaleString()}</span>) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Directions */}
              <div className="rounded-xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-800">ทิศทาง</label>
                  <div className="flex items-center gap-2">
                    {selectedDirections.length>0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{selectedDirections.length} เลือก</span>
                    )}
                    <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>setSelectedDirections([])}>ล้าง</button>
                  </div>
                </div>
                <div className="min-h-[24px] mb-2">
                  {selectedDirections.length>0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedDirections.map(v => (
                        <button key={v} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200 hover:bg-blue-100" onClick={()=>setSelectedDirections(selectedDirections.filter(x=>x!==v))}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input value={dirQuery} onChange={(e)=>setDirQuery(e.target.value)} placeholder="ค้นหา..." className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {(directions||[]).filter(o => (o.label||o.value).toLowerCase().includes(dirQuery.toLowerCase())).map(o => {
                    const checked = selectedDirections.includes(o.value);
                    return (
                      <label key={o.value} className="group flex items-center gap-2 py-1.5 px-2 rounded-md border hover:bg-gray-50 cursor-pointer">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <input type="checkbox" className="accent-blue-600" checked={checked} onChange={(e)=>{
                            setSelectedDirections(prev => e.target.checked ? [...new Set([...prev, o.value])] : prev.filter(v=>v!==o.value));
                          }} />
                          <span className="text-sm text-gray-800 truncate">{o.label || o.value}</span>
                        </span>
                        {o.count ? (<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.count.toLocaleString()}</span>) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* User Types */}
              <div className="rounded-xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-800">ประเภทผู้ใช้</label>
                  <div className="flex items-center gap-2">
                    {selectedUserTypes.length>0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{selectedUserTypes.length} เลือก</span>
                    )}
                    <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>setSelectedUserTypes([])}>ล้าง</button>
                  </div>
                </div>
                <div className="min-h-[24px] mb-2">
                  {selectedUserTypes.length>0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedUserTypes.map(v => (
                        <button key={v} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200 hover:bg-blue-100" onClick={()=>setSelectedUserTypes(selectedUserTypes.filter(x=>x!==v))}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input value={utQuery} onChange={(e)=>setUtQuery(e.target.value)} placeholder="ค้นหา..." className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {(userTypes||[]).filter(o => (o.label||o.value).toLowerCase().includes(utQuery.toLowerCase())).map(o => {
                    const checked = selectedUserTypes.includes(o.value);
                    return (
                      <label key={o.value} className="group flex items-center gap-2 py-1.5 px-2 rounded-md border hover:bg-gray-50 cursor-pointer">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <input type="checkbox" className="accent-blue-600" checked={checked} onChange={(e)=>{
                            setSelectedUserTypes(prev => e.target.checked ? [...new Set([...prev, o.value])] : prev.filter(v=>v!==o.value));
                          }} />
                          <span className="text-sm text-gray-800 truncate">{o.label || o.value}</span>
                        </span>
                        {o.count ? (<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.count.toLocaleString()}</span>) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Doors */}
              <div className="rounded-xl border bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-800">ประตู</label>
                  <div className="flex items-center gap-2">
                    {selectedDoors.length>0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{selectedDoors.length} เลือก</span>
                    )}
                    <button className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={()=>setSelectedDoors([])}>ล้าง</button>
                  </div>
                </div>
                <div className="min-h-[24px] mb-2">
                  {selectedDoors.length>0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedDoors.slice(0,4).map(v => (
                        <button key={v} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200 hover:bg-blue-100" onClick={()=>setSelectedDoors(selectedDoors.filter(x=>x!==v))}>
                          {v}
                        </button>
                      ))}
                      {selectedDoors.length>4 && (
                        <span className="text-xs text-gray-500">+{selectedDoors.length-4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input value={doorQuery} onChange={(e)=>setDoorQuery(e.target.value)} placeholder="ค้นหา..." className="w-full pl-7 pr-2 py-1.5 border rounded-md text-xs focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {(doors||[]).filter(o => (o.label||o.value).toLowerCase().includes(doorQuery.toLowerCase())).map(o => {
                    const checked = selectedDoors.includes(o.value);
                    return (
                      <label key={o.value} className="group flex items-center gap-2 py-1.5 px-2 rounded-md border hover:bg-gray-50 cursor-pointer">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <input type="checkbox" className="accent-blue-600" checked={checked} onChange={(e)=>{
                            setSelectedDoors(prev => e.target.checked ? [...new Set([...prev, o.value])] : prev.filter(v=>v!==o.value));
                          }} />
                          <span className="text-sm text-gray-800 truncate">{o.label || o.value}</span>
                        </span>
                        {o.count ? (<span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{o.count.toLocaleString()}</span>) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="xl:col-span-4 flex gap-2">
                <button onClick={()=>{ setSelectedLocations([]); setSelectedDirections([]); setSelectedUserTypes([]); setSelectedDoors([]); setPage(1); }}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50">
                  <X className="w-4 h-4"/> เคลียร์ตัวกรองเพิ่มเติม
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        {error && (
          <div className="mx-4 mt-4 mb-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={()=>setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">รายการ Log</h3>
          <button
            onClick={() => setLogsCollapsed(v => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md bg-white hover:bg-gray-50"
            title="พับ/แสดงรายการ"
          >
            {logsCollapsed ? (<>
              <ChevronDown className="w-4 h-4" /> แสดงรายการ
            </>) : (<>
              <ChevronUp className="w-4 h-4" /> พับเก็บรายการ
            </>)}
          </button>
        </div>
        {!logsCollapsed && (
        <div id="logs-table" className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-600">
              <tr className="bg-gray-50">
                <th className="px-2 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left cursor-pointer select-none sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80" onClick={()=>setSortColumn('Date Time')}>
                  <div className="flex items-center gap-1">วันที่ / เวลา <SortIcon column="Date Time"/></div>
                </th>
                <th className="px-4 py-3 text-left sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">ผู้ใช้งาน (Card Name)</th>
                <th className="px-4 py-3 text-left sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">ประตู (Door)</th>
                <th className="px-4 py-3 text-left sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">เหตุผล/ความเคลื่อนไหว</th>
                <th className="px-4 py-3 text-left sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">ผลลัพธ์</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-500">
                      <Search className="w-6 h-6" />
                      <div className="text-sm">ไม่พบข้อมูลที่ตรงกับตัวกรอง</div>
                      <div className="text-xs">ปรับตัวกรองหรือช่วงเวลา แล้วลองใหม่</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const key = rowKeyOf(r, idx);
                  const isOpen = expanded.has(key);
                  return (
                    <React.Fragment key={key}>
                      <tr className="odd:bg-white even:bg-gray-50 hover:bg-blue-50/40 transition-colors">
                        <td className="px-2 py-3 align-top">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}
                            className="p-1 rounded hover:bg-gray-100"
                            title={isOpen ? 'ย่อรายละเอียด' : 'ดูรายละเอียด'}
                          >
                            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600"/> : <ChevronDown className="w-4 h-4 text-gray-600"/>}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap cursor-pointer" onClick={()=>onRowClick?.(r)}>
                          {(() => {
                            const dateTimeStr = clean(r['Date Time'] || r.dateTime);
                            if (!dateTimeStr) return '-';
                            try {
                              const date = new Date(dateTimeStr);
                              if (isNaN(date.getTime())) return dateTimeStr;
                              const d = date.toLocaleDateString('th-TH');
                              const t = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
                              return `${d} ${t}`;
                            } catch {
                              return dateTimeStr;
                            }
                          })()}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={()=>onRowClick?.(r)}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400"/>
                            {clean(r['Card Name'] || r.cardName)}
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={()=>onRowClick?.(r)}>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400"/>
                            {clean(r['Door'] || r.door)}
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={()=>onRowClick?.(r)}>{highlight(clean(r['Reason'] || r.reason))}</td>
                        <td className="px-4 py-3 cursor-pointer" onClick={()=>onRowClick?.(r)}>
                          {(r.allow === true || r.Allow === true || r.Allow === 't') ? (
                            <span className="inline-flex items-center gap-1 text-green-600"><Check className="w-4 h-4"/> อนุญาต</span>
                          ) : (r.allow === false || r.Allow === false || r.Allow === 'f') ? (
                            <span className="inline-flex items-center gap-1 text-red-600"><X className="w-4 h-4"/> ปฏิเสธ</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-blue-50/40">
                          <td></td>
                          <td colSpan={5} className="px-4 py-3">
                            {(() => {
                              // Dynamic details: show all available columns for a complete review
                              const displayName = (key) => ({
                                'Date Time': 'วันที่เวลา', 'dateTime': 'วันที่เวลา',
                                'Card Name': 'ชื่อบัตร', 'cardName': 'ชื่อบัตร',
                                'Location': 'สถานที่', 'location': 'สถานที่',
                                'Reason': 'เหตุผล', 'reason': 'เหตุผล',
                                'Allow': 'ผลลัพธ์', 'allow': 'ผลลัพธ์',
                                'Direction': 'ทิศทาง', 'direction': 'ทิศทาง',
                                'Door': 'ประตู', 'door': 'ประตู',
                                'Device': 'อุปกรณ์', 'device': 'อุปกรณ์',
                                'User Type': 'ประเภทผู้ใช้', 'userType': 'ประเภทผู้ใช้',
                                'Permission': 'สิทธิ์', 'permission': 'สิทธิ์',
                                'Channel': 'ช่องทาง', 'channel': 'ช่องทาง',
                                'Temp.': 'อุณหภูมิ', 'temperature': 'อุณหภูมิ', 'temp': 'อุณหภูมิ',
                                'User Hash': 'ผู้ใช้ (Hash)', 'userHash': 'ผู้ใช้ (Hash)',
                                'Card Number Hash': 'หมายเลขบัตร (Hash)', 'cardNumberHash': 'หมายเลขบัตร (Hash)',
                                'Transaction ID': 'รหัสธุรกรรม', 'id': 'รหัสธุรกรรม'
                              })[key] || key;
                              const priority = ['Date Time','dateTime','Card Name','cardName','Location','location','Door','door','Direction','direction','Reason','reason','Allow','allow','User Type','userType','Permission','permission','Device','device','Channel','channel','Temp.','temperature','temp','User Hash','userHash','Card Number Hash','cardNumberHash','Transaction ID','id'];
                              const keys = Object.keys(r || {});
                              const ordered = [
                                ...priority.filter(k => keys.includes(k)),
                                ...keys.filter(k => !priority.includes(k)).sort((a,b)=>a.localeCompare(b))
                              ];
                              const rows = ordered.map(k => ({ key: k, label: displayName(k), value: r[k] })).filter(d => !isEmptyish(d.value));
                              return (
                                <>
                                  {rows.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                                      {rows.map((d, i) => (
                                        <div key={i}>
                                          <div className="text-gray-500">{d.label}</div>
                                          <div className="font-medium break-words">{clean(d.value)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {!isEmptyish(r['Transaction ID'] || r.id) && (
                                    <div className="mt-2 text-[11px] text-gray-500 inline-flex items-center gap-2">
                                      <span>Transaction ID: {clean(r['Transaction ID'] || r.id)}</span>
                                      <button
                                        onClick={() => { try { navigator.clipboard.writeText(String(clean(r['Transaction ID'] || r.id))); } catch {} }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 border rounded bg-white hover:bg-gray-50"
                                        title="คัดลอก"
                                      >
                                        <Copy className="w-3.5 h-3.5"/> คัดลอก
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-700">
          {(() => {
            const totalAllowed = rows.filter(r => (r.allow === true || r.Allow === true || r.Allow === 't')).length;
            const totalDenied = rows.filter(r => (r.allow === false || r.Allow === false || r.Allow === 'f')).length;
            const totalRecords = rows.length;
            const allowedRatio = totalRecords > 0 ? ((totalAllowed / totalRecords) * 100).toFixed(1) : 0;
            const deniedRatio = totalRecords > 0 ? ((totalDenied / totalRecords) * 100).toFixed(1) : 0;

            return (
              <div className="flex items-center gap-4">
                <span>รวม {total.toLocaleString()} รายการ</span>
                {totalRecords > 0 && (
                  <>
                    <span className="text-green-600">อนุญาต: {allowedRatio}%</span>
                    <span className="text-red-600">ปฏิเสธ: {deniedRatio}%</span>
                  </>
                )}
              </div>
            );
          })()}
          {!logsCollapsed && (
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-40 bg-white hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4"/> ก่อนหน้า
              </button>
              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">หน้า {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-40 bg-white hover:bg-gray-50">
                ถัดไป <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          )}
        </div>
      </div>

  {/* กราฟรวมถูกย้ายไปที่หน้า ภาพรวมข้อมูล & วิเคราะห์ */}

  

      {/* Floating upload button (bottom-right) */}
      {onOpenUpload && (
        <button
          onClick={onOpenUpload}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
          title="อัปโหลดไฟล์"
        >
          <Upload className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default TransactionLogPage;
