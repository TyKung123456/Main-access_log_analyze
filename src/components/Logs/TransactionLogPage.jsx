import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, ChevronDown, ChevronUp, Calendar, Check, X, ArrowUp, ArrowDown, User, Globe, Upload } from 'lucide-react';
import QuickInsights from './QuickInsights.jsx';
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

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sort, setSort] = useState({ column: 'Date Time', order: 'DESC' });

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

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
    return base;
  }, [page, limit, sort, search, action, datePreset, customStart, customEnd]);

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
  }, [params.page, params.limit, params.sort, params.order, params.search, params.allow, params.startDate, params.endDate]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const doSearch = () => {
    setPage(1);
    fetchLogs();
  };

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

  const setSortColumn = (column) => {
    setSort((prev) => ({
      column,
      order: prev.column === column && prev.order === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const SortIcon = ({ column }) => (
    sort.column === column ? (sort.order === 'ASC' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUp className="w-3 h-3 opacity-0"/>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Transaction Log</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">ค้นหา</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full appearance-none pr-8 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full appearance-none pr-8 pl-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
              >
                {presets.map(o => (<option key={o.key} value={o.key}>{o.label}</option>))}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute right-7 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={doSearch} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black">
              <Search className="w-4 h-4"/> ค้นหา
            </button>
            <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50">
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
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">รายการ Log</h3>
          <button
            onClick={() => setLogsCollapsed(v => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            {logsCollapsed ? (<>
              <ChevronDown className="w-4 h-4" /> แสดงรายการ
            </>) : (<>
              <ChevronUp className="w-4 h-4" /> พับเก็บรายการ
            </>)}
          </button>
        </div>
        {!logsCollapsed && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-2 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={()=>setSortColumn('Date Time')}>
                  <div className="flex items-center gap-1">วันที่ / เวลา <SortIcon column="Date Time"/></div>
                </th>
                <th className="px-4 py-3 text-left">ผู้ใช้งาน (Card Name)</th>
                <th className="px-4 py-3 text-left">ประตู (Door)</th>
                <th className="px-4 py-3 text-left">เหตุผล/ความเคลื่อนไหว</th>
                <th className="px-4 py-3 text-left">ผลลัพธ์</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">กำลังโหลด...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
              ) : (
                rows.map((r, idx) => {
                  const key = rowKeyOf(r, idx);
                  const isOpen = expanded.has(key);
                  return (
                    <React.Fragment key={key}>
                      <tr className="border-t hover:bg-gray-50">
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
                              if (isNaN(date.getTime())) return dateTimeStr; // Fallback if invalid date
                              const hour = date.getHours();
                              const nextHour = (hour + 1) % 24;
                              const formattedHour = String(hour).padStart(2, '0');
                              const formattedNextHour = String(nextHour).padStart(2, '0');
                              return `${date.toLocaleDateString('th-TH')} ${formattedHour}:00 - ${formattedNextHour}:00`;
                            } catch (e) {
                              console.error("Error parsing date for time range:", e);
                              return dateTimeStr; // Fallback on error
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
                        <td className="px-4 py-3 cursor-pointer" onClick={()=>onRowClick?.(r)}>{clean(r['Reason'] || r.reason)}</td>
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
                        <tr className="bg-gray-50/70">
                          <td></td>
                          <td colSpan={5} className="px-4 py-3">
                            {(() => {
                              const details = [
                                { label: 'ชื่อบัตร', value: r['Card Name'] || r.cardName },
                                { label: 'ประเภทผู้ใช้', value: r['User Type'] || r.userType },
                                { label: 'สถานที่', value: r['Location'] || r.location },
                                { label: 'ประตู', value: r['Door'] || r.door },
                                { label: 'ทิศทาง', value: r['Direction'] || r.direction },
                                { label: 'เหตุผล', value: r['Reason'] || r.reason },
                                // Additional fields that may appear in data
                                { label: 'อุปกรณ์', value: r['Device'] || r.device },
                                { label: 'ช่องทาง', value: r['Channel'] || r.channel },
                                { label: 'สิทธิ์', value: r['Permission'] || r.permission },
                                { label: 'อุณหภูมิ', value: r['Temp.'] || r.temperature || r.temp },
                                { label: 'ผู้ใช้ (Hash)', value: r['User Hash'] || r.userHash },
                                { label: 'หมายเลขบัตร (Hash)', value: r['Card Number Hash'] || r.cardNumberHash },
                              ].filter(d => !isEmptyish(d.value));

                              return (
                                <>
                                  {details.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                                      {details.map((d, i) => (
                                        <div key={i}>
                                          <div className="text-gray-500">{d.label}</div>
                                          <div className="font-medium">{clean(d.value)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {!isEmptyish(r['Transaction ID'] || r.id) && (
                                    <div className="mt-2 text-[11px] text-gray-500">Transaction ID: {clean(r['Transaction ID'] || r.id)}</div>
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
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 border rounded disabled:opacity-40">ก่อนหน้า</button>
              <span>หน้า {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 border rounded disabled:opacity-40">ถัดไป</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Insights Charts */}
      <QuickInsights params={params} />

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
