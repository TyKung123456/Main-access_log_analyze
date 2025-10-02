import React, { useEffect, useRef, useState } from 'react';
import aiService from '../../services/aiService';
// AI customization removed by request

const CasesPage = () => {
  const [caseList, setCaseList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const loadingStartRef = useRef(null);
  const [result, setResult] = useState({ id: null, rows: [], count: 0 });
  const [queryMeta, setQueryMeta] = useState({ status: 'idle', startedAt: null, finishedAt: null, durationMs: 0 });
  const [error, setError] = useState(null);
  const [displayMode, setDisplayMode] = useState('modal'); // 'modal' | 'inline'
  const [search, setSearch] = useState('');
  const resultsRef = useRef(null);

  // Export options
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const [exportSearch, setExportSearch] = useState('');
  const [exportSelectedKeys, setExportSelectedKeys] = useState([]); // empty = all
  const [exportCompress, setExportCompress] = useState(false); // gzip if supported

  // Removed AI customization states

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/security/cases/list');
        const data = await res.json();
        setCaseList(data.cases || []);
      } catch (e) {
        setError('โหลดรายการเคสไม่สำเร็จ');
      }
    })();
  }, []);

  const runCase = async (id) => {
    setSelectedId(id);
    setLoading(true);
    loadingStartRef.current = Date.now();
    setLoadingSeconds(0);
    setError(null);
    setQueryMeta({ status: 'running', startedAt: new Date(), finishedAt: null, durationMs: 0 });
    try {
      const res = await fetch(`/api/security/cases?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setResult({ id, rows: data.rows || [], count: data.count || 0 });
      const finishedAt = new Date();
      setQueryMeta(prev => ({
        status: 'success',
        startedAt: prev.startedAt,
        finishedAt,
        durationMs: prev.startedAt ? (finishedAt - prev.startedAt) : 0
      }));
    } catch (e) {
      setError('ดึงข้อมูลไม่สำเร็จ');
      setResult({ id, rows: [], count: 0 });
      const finishedAt = new Date();
      setQueryMeta(prev => ({
        status: 'error',
        startedAt: prev.startedAt,
        finishedAt,
        durationMs: prev.startedAt ? (finishedAt - prev.startedAt) : 0
      }));
    } finally {
      setLoading(false);
      if (resultsRef.current && displayMode === 'inline') {
        try { resultsRef.current.scrollTop = 0; } catch { }
      }
    }
  };

  // Tick loading seconds while loading
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      const start = loadingStartRef.current;
      if (start) {
        setLoadingSeconds(Math.floor((Date.now() - start) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  const fmtSec = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Helper function to normalize values for display
  const normalizeVal = (key, val) => {
    if (val == null) return '';
    const s = String(val);

    // Handle specific field normalizations
    if (key.toLowerCase().includes('allow')) {
      const lower = s.toLowerCase();
      if (lower.includes('true') || lower.includes('success') || lower.includes('allow') || lower === '1') return 'สำเร็จ';
      if (lower.includes('false') || lower.includes('deny') || lower.includes('fail') || lower === '0') return 'ปฏิเสธ';
    }

    // Handle date/time fields
    const d = new Date(s);
    if (!isNaN(d.getTime()) && (/\d{4}-\d{2}-\d{2}|T|Z|\d{1,2}[:\/.]\d{1,2}/.test(s))) {
      try { return d.toLocaleString('th-TH'); } catch { return s; }
    }

    return s;
  };

  // Analyze rows to produce a non-AI summary and recommendations
  const analyzeRows = (rows) => {
    const summary = {
      total: 0,
      allowed: 0,
      denied: 0,
      deniedRate: 0,
      reasons: {},
      locations: {},
      doors: {},
      users: {},
      hourly: Array(24).fill(0),
      daily: {},
    };

    const emptyish = (v) => {
      if (v === null || v === undefined) return true;
      const s = String(v).trim().toLowerCase();
      return s === '' || s === '-' || s === '—' || s === 'n/a' || s === 'na' || s === 'none' || s === 'ไม่ระบุ' || s === 'unspecified' || s === 'not specified';
    };

    const isAllowish = (v) => {
      if (typeof v === 'boolean') return v === true;
      if (typeof v === 'number') return v === 1;
      const s = String(v || '').trim().toLowerCase();
      return ['true','t','1','yes','y','success','allow','allowed','pass','granted','อนุญาต'].includes(s);
    };
    const isDeniedish = (v) => {
      if (typeof v === 'boolean') return v === false;
      if (typeof v === 'number') return v === 0;
      const s = String(v || '').trim().toLowerCase();
      return ['false','f','0','no','n','deny','denied','fail','failed','blocked','ปฏิเสธ'].includes(s);
    };
    const getAllowFromRow = (r) => {
      const candidates = ['Allow','allow','Allow Status','allowStatus','Access Result','accessResult','Result','result','Status','status'];
      for (const k of candidates) {
        if (k in (r || {})) {
          const v = r[k];
          if (isAllowish(v)) return 1;
          if (isDeniedish(v)) return -1;
        }
      }
      return 0;
    };
    const extractHour = (s) => {
      if (!s) return null;
      const str = String(s);
      const m = str.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
      if (m) {
        const h = parseInt(m[1], 10);
        if (!isNaN(h) && h >= 0 && h <= 23) return h;
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.getHours();
      return null;
    };
    const extractDayKey = (s) => {
      if (!s) return null;
      const str = String(s);
      const iso = str.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (iso) return iso[1];
      const part = str.split(/\s+/)[0];
      return part || null;
    };

    (rows || []).forEach(r => {
      summary.total += 1;
      const allowFlag = getAllowFromRow(r);
      if (allowFlag === 1) summary.allowed += 1;
      else if (allowFlag === -1) summary.denied += 1;

      const inc = (obj, key) => { if (emptyish(key)) return; obj[key] = (obj[key] || 0) + 1; };
      inc(summary.reasons, r['Reason'] || r['reason']);
      inc(summary.locations, r['Location'] || r['location']);
      inc(summary.doors, r['Door'] || r['door']);
      inc(summary.users, r['Card Name'] || r['cardName']);

      const dt = r['Date Time'] || r['dateTime'];
      const hour = extractHour(dt);
      if (hour != null) summary.hourly[hour] += 1;
      const dayKey = extractDayKey(dt);
      if (dayKey) summary.daily[dayKey] = (summary.daily[dayKey] || 0) + 1;
    });

    summary.deniedRate = summary.total > 0 ? (summary.denied / summary.total) * 100 : 0;

    const topOf = (obj, n = 3) => Object.entries(obj)
      .filter(([k]) => !!k)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);

    const maxCount = Math.max(...summary.hourly);
    const peakHour = summary.hourly.indexOf(maxCount);
    const peakHourRange = maxCount > 0 && peakHour >= 0
      ? `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 1) % 24).padStart(2, '0')}:00`
      : '-';
    const mostActiveDay = Object.entries(summary.daily).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);

    return {
      ...summary,
      topReasons: topOf(summary.reasons),
      topLocations: topOf(summary.locations),
      topDoors: topOf(summary.doors),
      frequentUsers: topOf(summary.users),
      peakHourRange,
      mostActiveDay,
    };
  };

  // Produce rule-based recommendations from summary
  const buildRecommendations = (s) => {
    const recs = [];
    const round1 = (x) => Math.round(x * 10) / 10;

    if (s.deniedRate >= 20) {
      recs.push(`อัตราปฏิเสธสูง (${round1(s.deniedRate)}%) — ตรวจสอบสิทธิ์เข้า–ออกและนโยบายการเข้าถึงของผู้ใช้กลุ่มเสี่ยง`);
    } else if (s.deniedRate >= 10) {
      recs.push(`อัตราปฏิเสธปานกลาง (${round1(s.deniedRate)}%) — ทบทวนกฎการเข้าถึงที่ใช้บ่อยและอัปเดตสิทธิ์ของผู้ใช้`);
    }

    if (s.topReasons[0]) {
      const [reason, cnt] = s.topReasons[0];
      recs.push(`เหตุผลที่พบมาก: “${reason}” (${cnt} ครั้ง) — วิเคราะห์ที่ต้นทาง (อุปกรณ์/ระบบ) เพื่อปรับลดความผิดพลาด`);
    }

    if (s.topLocations[0]) {
      const [loc] = s.topLocations[0];
      recs.push(`จุดที่ใช้งานมาก: ${loc} — เพิ่มการเฝ้าระวังและจัดสรรทรัพยากรช่วงพีก`);
    }

    // Business hours heuristic 08:00–18:00 (only if we have a real peak hour)
    if (s.peakHourRange && s.peakHourRange !== '-') {
      const peakHour = parseInt(s.peakHourRange.slice(0, 2) || '0', 10);
      if (!isNaN(peakHour) && (peakHour < 8 || peakHour >= 18)) {
        recs.push(`ปริมาณการใช้งานสูงนอกเวลาทำการ (${s.peakHourRange}) — ตรวจสอบตารางกะ/สิทธิ์พิเศษ และเพิ่มการแจ้งเตือน`);
      }
    }

    if (s.frequentUsers[0] && s.frequentUsers[0][1] >= Math.max(5, Math.ceil(s.total * 0.05))) {
      recs.push(`มีผู้ใช้บางรายมีการใช้งานสูงผิดปกติ — ตรวจสอบความถูกต้องของการใช้งานและให้คำแนะนำเพิ่มเติม`);
    }

    if (recs.length === 0) recs.push('พฤติกรรมรวมอยู่ในเกณฑ์ปกติ — เฝ้าระวังต่อเนื่องและทบทวนสิทธิ์เป็นระยะ');
    return recs;
  };

  // CSV export with report-like summary (no AI)
  const exportCaseCSV = async () => {
    if (!result.rows || result.rows.length === 0) return;

    const metaTitle = caseList.find(c => c.id === result.id)?.title || 'รายงานเคส';
    const priority = ['Date Time', 'dateTime', 'Card Name', 'cardName', 'Location', 'location', 'Reason', 'reason', 'Allow', 'allow', 'Direction', 'direction', 'Door', 'door', 'Device', 'device', 'User Type', 'userType', 'Transaction ID', 'id'];
    const keys = new Set();
    (result.rows || []).forEach(r => Object.keys(r || {}).forEach(k => keys.add(k)));
    const all = Array.from(keys);
    const headerKeys = [
      ...priority.filter(k => all.includes(k)),
      ...all.filter(k => !priority.includes(k)).sort((a, b) => a.localeCompare(b))
    ];
    const selectedKeys = (exportSelectedKeys && exportSelectedKeys.length > 0)
      ? exportSelectedKeys.filter(k => headerKeys.includes(k))
      : headerKeys;

    const toLocalIfDate = (v) => {
      if (v == null) return '';
      const s = String(v);
      const d = new Date(s);
      if (!isNaN(d.getTime()) && (/\d{4}-\d{2}-\d{2}|T|Z|\d{1,2}[:\/.]\d{1,2}/.test(s))) {
        try { return d.toLocaleString('th-TH'); } catch { return s; }
      }
      return s;
    };
    const esc = (val) => {
      const s = toLocalIfDate(val).replace(/\"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };

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
      'Transaction ID': 'รหัสธุรกรรม', 'id': 'รหัสธุรกรรม'
    })[key] || key;

    // Build report-like preface (AI-first with fallback)
    const summary = analyzeRows(result.rows || []);
    const recs = buildRecommendations(summary);
    const fmtTop = (arr) => (arr && arr.length > 0)
      ? arr.map(([k, c]) => `- ${k}: ${c} ครั้ง`)
      : ['- ไม่มีข้อมูล'];

    const wantAISummary = (import.meta.env.VITE_ENABLE_AI_EXPORT_SUMMARY || 'true') !== 'false';

    const buildFallbackLines = () => [
      `รายงานสรุปเคส: ${metaTitle}`,
      `วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}`,
      '',
      'สรุปภาพรวม:',
      `- รายการทั้งหมด: ${summary.total.toLocaleString('th-TH')} ครั้ง`,
      `- อนุญาต: ${summary.allowed.toLocaleString('th-TH')} ครั้ง`,
      `- ปฏิเสธ: ${summary.denied.toLocaleString('th-TH')} ครั้ง (${(Math.round(summary.deniedRate*10)/10)}%)`,
      `- ชั่วโมงพีก: ${summary.peakHourRange}`,
      summary.mostActiveDay[0] ? `- วันที่ใช้งานมากสุด: ${new Date(summary.mostActiveDay[0]).toLocaleDateString('th-TH')} (${summary.mostActiveDay[1]} ครั้ง)` : undefined,
      '',
      'เหตุผลที่พบบ่อย:',
      ...fmtTop(summary.topReasons),
      '',
      'สถานที่ที่พบบ่อย:',
      ...fmtTop(summary.topLocations),
      '',
      'ข้อเสนอแนะถัดไป:',
      ...recs.map(r => `- ${r}`),
      '',
    ].filter(Boolean);

    let reportLines = buildFallbackLines();

    if (wantAISummary) {
      try {
        // Build a concise Thai prompt for AI to produce the 4 sections in bullet format
        const aiList = (arr) => (arr || []).map(([k, c]) => `${k} (${c} ครั้ง)`).join(', ');
        const userMessage = [
          'โปรดสรุปข้อมูล access log ต่อไปนี้แบบกระชับ เป็นภาษาไทย และจัดหัวข้อดังนี้:',
          'สรุปภาพรวม:, เหตุผลที่พบบ่อย:, สถานที่ที่พบบ่อย:, ข้อเสนอแนะถัดไป:.',
          `ข้อมูล: รวม ${summary.total} ครั้ง, อนุญาต ${summary.allowed}, ปฏิเสธ ${summary.denied} (${Math.round(summary.deniedRate*10)/10}%), ชั่วโมงพีก: ${summary.peakHourRange}${summary.mostActiveDay[0] ? `, วันใช้งานมากสุด: ${summary.mostActiveDay[0]} (${summary.mostActiveDay[1]} ครั้ง)` : ''}.`,
          `เหตุผล Top: ${aiList(summary.topReasons) || 'ไม่มีข้อมูล'}.`,
          `สถานที่ Top: ${aiList(summary.topLocations) || 'ไม่มีข้อมูล'}.`,
          'ระบุข้อเสนอแนะให้ actionable และเหมาะกับบริบทความปลอดภัย. หลีกเลี่ยงคำทักทายและปิดท้าย, ตอบเป็น bullet สั้นๆ.'
        ].join(' ');

        const aiText = await aiService.generateResponse(userMessage, { stats: { totalAccess: summary.total, successfulAccess: summary.allowed, deniedAccess: summary.denied } });

        // Normalize AI text into lines. If the AI text doesn’t include headings, prepend them.
        const lines = String(aiText || '').split(/\r?\n/).map(s => s.trim());
        const hasHeading = (h) => lines.some(l => l.replace(/^[-•]\s*/, '') === h || l.startsWith(h));
        const ensureHeadingBlock = (h) => (hasHeading(h) ? [] : [h]);

        const aiLines = [
          `รายงานสรุปเคส: ${metaTitle}`,
          `วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}`,
          '',
          ...ensureHeadingBlock('สรุปภาพรวม:'),
          ...lines,
        ];

        // Use AI output if it has some substance; else fallback
        if (aiLines.filter(l => l && !/^รายงานสรุปเคส:|^วันที่ออกรายงาน:/.test(l)).length > 0) {
          reportLines = aiLines;
        }
      } catch (e) {
        // AI unavailable or failed → keep fallback
        console.warn('AI summary generation failed, using fallback:', e?.message);
      }
    }

    const headerLine = selectedKeys.map(k => esc(displayName(k))).join(',');
    const body = (result.rows || []).map(r => selectedKeys.map(h => esc(normalizeVal(h, r[h]))).join(',')).join('\r\n');

    const reportBlock = reportLines.map(esc).join('\r\n');
    const csv = `\uFEFF${reportBlock}\r\n${headerLine}\r\n${body}`;

    const download = async () => {
      const base = metaTitle.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      if (exportCompress && 'CompressionStream' in window) {
        try {
          const cs = new CompressionStream('gzip');
          const stream = new Blob([csv]).stream().pipeThrough(cs);
          const gzBlob = await new Response(stream).blob();
          const url = URL.createObjectURL(gzBlob);
          const a = document.createElement('a'); a.href = url; a.download = `${base || 'case'}_${stamp}.csv.gz`;
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          return;
        } catch (e) { console.warn('GZIP compress failed, fallback to CSV', e); }
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${base || 'case'}_${stamp}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
    download();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">รายงานตามเคส</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
            <span className="mr-1">โหมดแสดงผล:</span>
            <button
              onClick={() => setDisplayMode(m => m === 'modal' ? 'inline' : 'modal')}
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
              title="สลับการแสดงผลผลลัพธ์"
            >
              {displayMode === 'modal' ? 'Modal' : 'Inline'}
            </button>
          </div>
          {/* AI customization removed */}
          <button
            disabled={!result.rows || result.rows.length === 0}
            onClick={() => setExportPickerOpen(true)}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
          >
            เลือกคอลัมน์
          </button>
          <button
            disabled={!result.rows || result.rows.length === 0}
            onClick={exportCaseCSV}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
          >
            ส่งออกรายงาน (CSV)
          </button>
        </div>
      </div>

      {/* SQL/Query Status */}
      {queryMeta.status !== 'idle' && (
        <div className={`mb-3 text-sm rounded-md border px-3 py-2 flex items-center gap-2 ${queryMeta.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : queryMeta.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span className="text-lg leading-none">{queryMeta.status === 'success' ? '✅' : queryMeta.status === 'error' ? '⛔' : '⏳'}</span>
          <span>
            {queryMeta.status === 'running' && 'กำลังตรวจสอบและประมวลผลคำสั่ง SQL...'}
            {queryMeta.status === 'success' && `คำสั่งสำเร็จใน ${(queryMeta.durationMs / 1000).toFixed(2)} วินาที`}
            {queryMeta.status === 'error' && `คำสั่งล้มเหลวใน ${(queryMeta.durationMs / 1000).toFixed(2)} วินาที`}
          </span>
          {queryMeta.startedAt && (
            <span className="ml-auto text-xs opacity-70">
              เริ่ม {new Date(queryMeta.startedAt).toLocaleTimeString('th-TH')} • {queryMeta.finishedAt ? `เสร็จ ${new Date(queryMeta.finishedAt).toLocaleTimeString('th-TH')}` : 'กำลังทำงาน'}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left sticky list with search */}
        <div className="space-y-2 md:sticky md:top-4 md:max-h-[calc(100vh-8rem)] md:overflow-auto pr-1">
          <div className="relative mb-1">
            <input
              className="w-full border rounded px-3 py-2 text-sm pr-8"
              placeholder="ค้นหาเคส..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>
          </div>
          {caseList.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีรายการเคส</div>
          ) : caseList
            .filter(c => !search || [c.title, c.category, c.id].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())))
            .map(c => (
              <button
                key={c.id}
                onClick={() => runCase(c.id)}
                className={`w-full text-left px-3 py-2 rounded border text-sm ${selectedId === c.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="text-sm font-medium text-gray-800">{c.title}</div>
                <div className="text-xs text-gray-500">{c.category}</div>
              </button>
            ))}
        </div>

        {/* Results area */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-base font-semibold text-gray-800">กำลังดึงข้อมูลเคส...</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {caseList.find(c => c.id === selectedId)?.title || 'โปรดรอสักครู่'}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-0.5 border border-indigo-200">
                    <span role="img" aria-label="timer">⏱️</span>
                    <span>เวลาที่ผ่านไป: {fmtSec(loadingSeconds)}</span>
                  </div>
                </div>
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full bg-blue-200 animate-ping" />
                  <div className="relative w-10 h-10 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center shadow-sm">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4">
                <span className="text-xs text-gray-600 mr-1">กำลังประมวลผล</span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="h-8 bg-gray-50 border-b" />
                <ul className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="p-3 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : result.id ? (
            displayMode === 'inline' ? (
              <div ref={resultsRef} className="overflow-auto border rounded max-h-[calc(100vh-10rem)]">
                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-3 py-2 border-b flex items-center justify-between">
                  <div className="text-sm text-gray-700">ผลลัพธ์: {result.count.toLocaleString('th-TH')} แถว</div>
                  <button
                    onClick={() => resultsRef.current && (resultsRef.current.scrollTop = 0)}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/70 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 hover:ring-blue-300 shadow-sm transition-colors"
                    aria-label="ไปบนสุด"
                    title="ไปบนสุด"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 15l7-7 7 7" /></svg>
                  </button>
                </div>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.rows[0] && Object.keys(result.rows[0]).map((k) => (
                        <th key={k} className="px-2 py-1 text-left text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.rows || []).slice(0, 500).map((r, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.keys(r).map(k => (
                          <td key={k} className="px-2 py-1 whitespace-nowrap text-gray-800">{String(r[k] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                    {(!result.rows || result.rows.length === 0) && (
                      <tr><td className="px-2 py-4 text-gray-500">ไม่มีข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setResult(r => ({ ...r }))}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                    <div className="text-sm text-gray-700">ผลลัพธ์: {result.count.toLocaleString('th-TH')} แถว</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDisplayMode('inline')} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">แสดงแบบ Inline</button>
                      <button onClick={() => setResult({ id: null, rows: [], count: 0 })} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">ปิด</button>
                    </div>
                  </div>
                  <div className="overflow-auto" style={{ maxHeight: '75vh' }}>
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {result.rows[0] && Object.keys(result.rows[0]).map((k) => (
                            <th key={k} className="px-2 py-1 text-left text-gray-600 whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(result.rows || []).slice(0, 500).map((r, idx) => (
                          <tr key={idx} className="border-t">
                            {Object.keys(r).map(k => (
                              <td key={k} className="px-2 py-1 whitespace-nowrap text-gray-800">{String(r[k] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                        {(!result.rows || result.rows.length === 0) && (
                          <tr><td className="px-2 py-4 text-gray-500">ไม่มีข้อมูล</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-gray-500">เลือกเคสจากด้านซ้ายเพื่อดูผลลัพธ์</div>
          )}
        </div>
      </div>

      {/* AI customization removed by request */}

      {/* Export Column Picker */}
      {exportPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setExportPickerOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="text-sm font-semibold text-gray-900">เลือกคอลัมน์ที่ต้องการส่งออก</div>
              <button onClick={() => setExportPickerOpen(false)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">ปิด</button>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: '65vh' }}>
              {(() => {
                const keysSet = new Set();
                (result.rows || []).forEach(r => Object.keys(r || {}).forEach(k => keysSet.add(k)));
                const allKeys = Array.from(keysSet);
                const priority = ['Date Time', 'dateTime', 'Card Name', 'cardName', 'Location', 'location', 'Reason', 'reason', 'Allow', 'allow', 'Direction', 'direction', 'Door', 'door', 'Device', 'device', 'User Type', 'userType', 'Transaction ID', 'id'];
                const headerKeys = [
                  ...priority.filter(k => allKeys.includes(k)),
                  ...allKeys.filter(k => !priority.includes(k)).sort((a, b) => a.localeCompare(b))
                ];
                const filtered = headerKeys.filter(k => !exportSearch || k.toLowerCase().includes(exportSearch.toLowerCase()));
                const toggle = (k) => setExportSelectedKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
                const selectAll = () => setExportSelectedKeys(filtered);
                const clearAll = () => setExportSelectedKeys([]);
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <input value={exportSearch} onChange={e => setExportSearch(e.target.value)} placeholder="ค้นหาคอลัมน์..." className="flex-1 border rounded px-3 py-2 text-sm" />
                      <button onClick={selectAll} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">เลือกทั้งหมด</button>
                      <button onClick={clearAll} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">ล้าง</button>
                    </div>
                    <ul className="divide-y border rounded">
                      {filtered.map(k => (
                        <li key={k} className="px-3 py-2 flex items-center justify-between text-sm">
                          <span className="text-gray-800">{k}</span>
                          <input type="checkbox" className="w-4 h-4" checked={exportSelectedKeys.length === 0 || exportSelectedKeys.includes(k)} onChange={() => toggle(k)} />
                        </li>
                      ))}
                      {filtered.length === 0 && (
                        <li className="px-3 py-6 text-center text-sm text-gray-500">ไม่พบคอลัมน์</li>
                      )}
                    </ul>
                    <div className="mt-3 flex items-center justify-between">
                      <label className="text-xs text-gray-700 inline-flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" checked={exportCompress} onChange={e => setExportCompress(e.target.checked)} />
                        บีบอัดเป็น GZIP (.csv.gz)
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setExportPickerOpen(false)} className="text-xs px-3 py-1 rounded border bg-white hover:bg-gray-50">ยกเลิก</button>
                        <button onClick={() => { setExportPickerOpen(false); exportCaseCSV(); }} className="text-xs px-3 py-1 rounded border bg-blue-600 text-white border-blue-600">ส่งออก</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesPage;
