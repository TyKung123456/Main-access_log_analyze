import React, { useEffect, useRef, useState } from 'react';
import aiService from '../../services/aiService'; // Adjust path as needed

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

  // AI Analysis options - NEW!
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [aiStyle, setAiStyle] = useState('analytical'); // analytical, executive, technical, narrative
  const [aiLayout, setAiLayout] = useState('executive'); // executive, detailed, summary, custom
  const [aiLanguage, setAiLanguage] = useState('thai'); // thai, english, mixed
  const [aiTone, setAiTone] = useState('professional'); // professional, casual, formal, conversational
  const [aiDepth, setAiDepth] = useState('medium'); // shallow, medium, deep
  const [aiIncludeCharts, setAiIncludeCharts] = useState(true);
  const [aiIncludeRecommendations, setAiIncludeRecommendations] = useState(true);
  const [aiIncludeRiskAssessment, setAiIncludeRiskAssessment] = useState(true);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

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

  // NEW: Generate comprehensive data analysis with AI customization
  const generateDataAnalysis = (rows) => {
    let allowedCount = 0;
    let deniedCount = 0;
    const reasonCounts = {};
    const locationCounts = {};
    const deviceCounts = {};
    const userTypeCounts = {};
    const hourlyStats = Array(24).fill(0);
    const dailyStats = {};

    (rows || []).forEach(r => {
      const allowStatus = normalizeVal('Allow', r['Allow'] || r['allow']);
      if (allowStatus === 'สำเร็จ') {
        allowedCount++;
      } else if (allowStatus === 'ปฏิเสธ') {
        deniedCount++;
      }

      // Count reasons
      const reason = r['Reason'] || r['reason'];
      if (reason) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

      // Count locations
      const location = r['Location'] || r['location'];
      if (location) locationCounts[location] = (locationCounts[location] || 0) + 1;

      // Count devices
      const device = r['Device'] || r['device'];
      if (device) deviceCounts[device] = (deviceCounts[device] || 0) + 1;

      // Count user types
      const userType = r['User Type'] || r['userType'];
      if (userType) userTypeCounts[userType] = (userTypeCounts[userType] || 0) + 1;

      // Time analysis
      const dateTime = r['Date Time'] || r['dateTime'];
      if (dateTime) {
        const date = new Date(dateTime);
        if (!isNaN(date.getTime())) {
          const hour = date.getHours();
          hourlyStats[hour]++;
          const dayKey = date.toISOString().split('T')[0];
          dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;
        }
      }
    });

    const totalRecords = rows.length;
    const successRate = totalRecords > 0 ? ((allowedCount / totalRecords) * 100) : 0;
    const deniedRate = totalRecords > 0 ? ((deniedCount / totalRecords) * 100) : 0;

    // Find peak hours
    const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
    const peakCount = Math.max(...hourlyStats);

    // Find most active day
    const mostActiveDay = Object.entries(dailyStats).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);

    return {
      totalAccess: totalRecords,
      successfulAccess: allowedCount,
      deniedAccess: deniedCount,
      successRate: successRate.toFixed(2),
      deniedRate: deniedRate.toFixed(2),
      overview: { totalAccess: totalRecords, successfulAccess: allowedCount, deniedAccess: deniedCount, successRate, deniedRate },
      summary: {
        mostCommonReason: Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'ไม่ระบุ',
        mostCommonLocation: Object.entries(locationCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'ไม่ระบุ',
        mostActiveDevice: Object.entries(deviceCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'ไม่ระบุ',
        primaryUserType: Object.entries(userTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'ไม่ระบุ',
        peakHour: `${peakHour.toString().padStart(2, '0')}:00 (${peakCount} ครั้ง)`,
        mostActiveDay: mostActiveDay[0] ? `${new Date(mostActiveDay[0]).toLocaleDateString('th-TH')} (${mostActiveDay[1]} ครั้ง)` : 'ไม่ระบุ'
      },
      breakdowns: { reasons: reasonCounts, locations: locationCounts, devices: deviceCounts, userTypes: userTypeCounts, hourlyStats, dailyStats }
    };
  };

  // NEW: Generate AI analysis with custom options
  const generateAIAnalysis = async () => {
    if (!result.rows || result.rows.length === 0) return null;

    setAiGenerating(true);
    try {
      const analysis = generateDataAnalysis(result.rows);
      const caseTitle = caseList.find(c => c.id === result.id)?.title || 'รายงานเคสความปลอดภัย';

      // Build AI request based on user preferences
      const aiRequest = {
        stats: analysis,
        style: aiStyle,
        layout: aiLayout,
        options: {
          language: aiLanguage,
          tone: aiTone,
          depth: aiDepth,
          includeCharts: aiIncludeCharts,
          includeRecommendations: aiIncludeRecommendations,
          includeRiskAssessment: aiIncludeRiskAssessment,
          caseTitle: caseTitle,
          customPrompt: aiCustomPrompt.trim() || undefined
        }
      };

      const aiReport = await aiService.generateReport(aiRequest);
      return aiReport.markdown;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return `# ข้อผิดพลาดในการวิเคราะห์ AI\n\nไม่สามารถสร้างการวิเคราะห์ได้ในขณะนี้\n\nรายละเอียดข้อผิดพลาด: ${error.message}`;
    } finally {
      setAiGenerating(false);
    }
  };

  // Enhanced CSV export with AI analysis
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

    // Generate AI analysis with custom settings
    const aiReportMarkdown = await generateAIAnalysis();

    // Create CSV with AI analysis
    const reportContentForCSV = [
      ['--- รายงานการวิเคราะห์ความปลอดภัยโดย AI ---'],
      [aiReportMarkdown || 'ไม่สามารถสร้างการวิเคราะห์ AI ได้'],
      ['--- สิ้นสุดรายงาน AI ---'],
      [], // Blank line
    ].map(r => r.map(esc).join(',')).join('\r\n');

    const headerLine = selectedKeys.map(k => esc(displayName(k))).join(',');
    const body = (result.rows || []).map(r => selectedKeys.map(h => esc(normalizeVal(h, r[h]))).join(',')).join('\r\n');

    const csv = `\uFEFF${reportContentForCSV}\r\n${headerLine}\r\n${body}`;

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
          {/* NEW: AI Configuration Button */}
          <button
            disabled={!result.rows || result.rows.length === 0}
            onClick={() => setAiAnalysisOpen(true)}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
            title="ปรับแต่งการวิเคราะห์ AI"
          >
            🤖 ปรับแต่ง AI
          </button>
          <button
            disabled={!result.rows || result.rows.length === 0}
            onClick={() => setExportPickerOpen(true)}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
          >
            เลือกคอลัมน์
          </button>
          <button
            disabled={!result.rows || result.rows.length === 0 || aiGenerating}
            onClick={exportCaseCSV}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length && !aiGenerating ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
          >
            {aiGenerating ? '⏳ กำลังวิเคราะห์...' : 'ส่งออกรายงาน (CSV)'}
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

      {/* NEW: AI Analysis Configuration Modal */}
      {aiAnalysisOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAiAnalysisOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h3 className="text-lg font-semibold text-gray-900">ปรับแต่งการวิเคราะห์ AI</h3>
              </div>
              <button onClick={() => setAiAnalysisOpen(false)} className="text-xs px-3 py-1 rounded border bg-white hover:bg-gray-50">ปิด</button>
            </div>

            <div className="p-6 overflow-auto" style={{ maxHeight: '75vh' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Style & Format */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 border-b pb-2">รูปแบบรายงาน</h4>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">สไตล์การวิเคราะห์</label>
                    <select
                      value={aiStyle}
                      onChange={e => setAiStyle(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="analytical">วิเคราะห์เชิงลึก (Analytical)</option>
                      <option value="executive">สำหรับผู้บริหาร (Executive)</option>
                      <option value="technical">เทคนิค (Technical)</option>
                      <option value="narrative">เล่าเรื่อง (Narrative)</option>
                      <option value="summary">สรุปย่อ (Summary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">โครงสร้างรายงาน</label>
                    <select
                      value={aiLayout}
                      onChange={e => setAiLayout(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="executive">บทสรุปสำหรับผู้บริหาร</option>
                      <option value="detailed">รายละเอียดครบถ้วน</option>
                      <option value="summary">สรุปสั้น</option>
                      <option value="dashboard">แดชบอร์ด</option>
                      <option value="custom">กำหนดเอง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">ภาษา</label>
                    <select
                      value={aiLanguage}
                      onChange={e => setAiLanguage(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="thai">ไทย</option>
                      <option value="english">English</option>
                      <option value="mixed">ไทย-English (ผสม)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">โทนการเขียน</label>
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="professional">มืออาชีพ</option>
                      <option value="formal">เป็นทางการ</option>
                      <option value="casual">สบายๆ</option>
                      <option value="conversational">สนทนา</option>
                      <option value="urgent">เร่งด่วน</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">ความลึกของการวิเคราะห์</label>
                    <select
                      value={aiDepth}
                      onChange={e => setAiDepth(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="shallow">ภาพรวม (Shallow)</option>
                      <option value="medium">ปานกลาง (Medium)</option>
                      <option value="deep">เชิงลึก (Deep)</option>
                      <option value="comprehensive">ครอบคลุมทั้งหมด</option>
                    </select>
                  </div>
                </div>

                {/* Content Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 border-b pb-2">เนื้อหาที่ต้องการ</h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={aiIncludeCharts}
                        onChange={e => setAiIncludeCharts(e.target.checked)}
                      />
                      <span>รวมกราฟและแผนภูมิ</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={aiIncludeRecommendations}
                        onChange={e => setAiIncludeRecommendations(e.target.checked)}
                      />
                      <span>ข้อเสนอแนะและการปรับปรุง</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={aiIncludeRiskAssessment}
                        onChange={e => setAiIncludeRiskAssessment(e.target.checked)}
                      />
                      <span>การประเมินความเสี่ยง</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">คำสั่งพิเศษ (Custom Prompt)</label>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={e => setAiCustomPrompt(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm h-32 resize-none"
                      placeholder="ระบุคำสั่งพิเศษหรือข้อกำหนดเพิ่มเติมที่ต้องการให้ AI วิเคราะห์..."
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      ตัวอย่าง: "เปรียบเทียบกับเดือนที่แล้ว", "มุ่งเน้นการความปลอดภัย", "แสดงแนวโน้มรายชั่วโมง"
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">ตัวอย่างการตั้งค่า</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">สไตล์:</span>
                      <div className="text-gray-800 mt-1">{
                        {
                          analytical: 'วิเคราะห์เชิงลึก',
                          executive: 'สำหรับผู้บริหาร',
                          technical: 'เทคนิค',
                          narrative: 'เล่าเรื่อง',
                          summary: 'สรุปย่อ'
                        }[aiStyle]
                      }</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">โครงสร้าง:</span>
                      <div className="text-gray-800 mt-1">{
                        {
                          executive: 'บทสรุปผู้บริหาร',
                          detailed: 'รายละเอียดครบถ้วน',
                          summary: 'สรุปสั้น',
                          dashboard: 'แดชบอร์ด',
                          custom: 'กำหนดเอง'
                        }[aiLayout]
                      }</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">ภาษา:</span>
                      <div className="text-gray-800 mt-1">{
                        {
                          thai: 'ไทย',
                          english: 'English',
                          mixed: 'ไทย-English'
                        }[aiLanguage]
                      }</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">ความลึก:</span>
                      <div className="text-gray-800 mt-1">{
                        {
                          shallow: 'ภาพรวม',
                          medium: 'ปานกลาง',
                          deep: 'เชิงลึก',
                          comprehensive: 'ครอบคลุม'
                        }[aiDepth]
                      }</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {aiIncludeCharts && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">📊 กราฟแผนภูมิ</span>}
                      {aiIncludeRecommendations && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">💡 ข้อเสนอแนะ</span>}
                      {aiIncludeRiskAssessment && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">⚠️ ประเมินความเสี่ยง</span>}
                      {aiCustomPrompt && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">✨ คำสั่งพิเศษ</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAiStyle('analytical');
                      setAiLayout('executive');
                      setAiLanguage('thai');
                      setAiTone('professional');
                      setAiDepth('medium');
                      setAiIncludeCharts(true);
                      setAiIncludeRecommendations(true);
                      setAiIncludeRiskAssessment(true);
                      setAiCustomPrompt('');
                    }}
                    className="text-xs px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    รีเซ็ตเป็นค่าเริ่มต้น
                  </button>
                  <button
                    onClick={() => {
                      setAiStyle('executive');
                      setAiLayout('summary');
                      setAiTone('formal');
                      setAiDepth('shallow');
                      setAiIncludeCharts(false);
                      setAiIncludeRecommendations(true);
                      setAiIncludeRiskAssessment(true);
                    }}
                    className="text-xs px-3 py-1 rounded border bg-blue-100 hover:bg-blue-200 text-blue-700"
                  >
                    รายงานด่วน
                  </button>
                  <button
                    onClick={() => {
                      setAiStyle('analytical');
                      setAiLayout('detailed');
                      setAiTone('professional');
                      setAiDepth('deep');
                      setAiIncludeCharts(true);
                      setAiIncludeRecommendations(true);
                      setAiIncludeRiskAssessment(true);
                    }}
                    className="text-xs px-3 py-1 rounded border bg-green-100 hover:bg-green-200 text-green-700"
                  >
                    รายงานเต็มรูปแบบ
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAiAnalysisOpen(false)}
                    className="px-4 py-2 text-sm rounded border bg-white hover:bg-gray-50 text-gray-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => setAiAnalysisOpen(false)}
                    className="px-4 py-2 text-sm rounded border bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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