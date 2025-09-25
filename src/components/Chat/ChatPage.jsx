import React, { useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  FileDown,
  Download,
  FileText,
  Info,
  Eye,
  Settings,
  ChevronLeft,
  Plus,
  BarChart3,
  Zap,
  PieChart as PieChartIcon,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const stylePresets = [
  { value: 'business_concise', label: 'ธุรกิจ', icon: '💼' },
  { value: 'formal', label: 'ทางการ', icon: '📋' },
  { value: 'analytical', label: 'วิเคราะห์', icon: '📊' }
];

const layoutPresets = [
  { value: 'standard', label: 'มาตรฐาน', icon: '📄' },
  { value: 'summary', label: 'แบบย่อ', icon: '📝' },
  { value: 'executive', label: 'ผู้บริหาร', icon: '👔' }
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const convertMarkdownToHtml = (markdown, includeCharts = false, chartData = null) => {
  if (!markdown) return '<div class="text-slate-400 text-center py-8">ยังไม่มีเนื้อหา</div>';

  const lines = markdown.split('\n');
  const html = [];
  let inList = false;
  let inTable = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html.push('</tbody></table></div>');
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    if (!line.trim()) {
      closeList();
      closeTable();
      return;
    }

    // Chart placeholder
    if (line.includes('[CHART:') && includeCharts && chartData) {
      const chartType = line.match(/\[CHART:(\w+)\]/)?.[1];
      if (chartType === 'ACCESS_BY_LOCATION') {
        html.push('<div class="chart-container my-6" style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">');
        html.push('<h4 style="margin-bottom: 16px; font-weight: 600;">การเข้าใช้งานตามสถานที่</h4>');
        html.push('<div style="font-size: 14px; color: #64748b;">กราฟแท่งแสดงการกระจายการเข้าใช้งาน</div>');
        html.push('</div>');
      } else if (chartType === 'SUCCESS_RATE') {
        html.push('<div class="chart-container my-6" style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">');
        html.push('<h4 style="margin-bottom: 16px; font-weight: 600;">อัตราความสำเร็จ</h4>');
        html.push('<div style="font-size: 14px; color: #64748b;">กราฟวงกลมแสดงสัดส่วนการอนุมัติ/ปฏิเสธ</div>');
        html.push('</div>');
      }
      return;
    }

    if (line.startsWith('### ')) {
      closeList();
      closeTable();
      html.push(`<h3 class="text-lg font-semibold text-slate-800 mb-3 mt-4">${line.substring(4)}</h3>`);
      return;
    }

    if (line.startsWith('## ')) {
      closeList();
      closeTable();
      html.push(`<h2 class="text-xl font-semibold text-slate-800 mt-6 mb-4 pb-2 border-b border-slate-200">${line.substring(3)}</h2>`);
      return;
    }

    if (line.startsWith('# ')) {
      closeList();
      closeTable();
      html.push(`<h1 class="text-2xl font-bold text-slate-900 mb-6">${line.substring(2)}</h1>`);
      return;
    }

    if (line.startsWith('- ')) {
      closeTable();
      if (!inList) {
        inList = true;
        html.push('<ul class="list-disc pl-5 space-y-2 mb-4">');
      }
      html.push(`<li class="text-slate-700">${line.substring(2)}</li>`);
      return;
    }

    // Table handling
    if (line.includes('|')) {
      closeList();
      if (line.includes('---')) {
        if (!inTable) {
          inTable = true;
          html.push('<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-slate-300"><thead class="bg-slate-50">');
        }
        return;
      } else {
        if (!inTable) {
          inTable = true;
          html.push('<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-slate-300"><thead class="bg-slate-50">');
        }
        const cells = line.split('|').filter(cell => cell.trim());
        const isHeader = html[html.length - 1].includes('<thead');
        const cellTag = isHeader ? 'th' : 'td';
        const cellClass = isHeader ? 'border border-slate-300 px-4 py-2 text-left font-semibold' : 'border border-slate-300 px-4 py-2 text-sm';
        const row = cells.map(cell => `<${cellTag} class="${cellClass}">${cell.trim()}</${cellTag}>`).join('');

        if (isHeader) {
          html.push(`<tr>${row}</tr>`);
          html.push('</thead><tbody>');
        } else {
          html.push(`<tr>${row}</tr>`);
        }
        return;
      }
    }

    closeList();
    closeTable();

    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    html.push(`<p class="mb-3 text-slate-700">${formatted}</p>`);
  });

  closeList();
  closeTable();

  return html.join('\n');
};

const ChartComponent = ({ type, data, title }) => {
  if (type === 'bar' && data) {
    return (
      <div className="bg-white p-4 rounded-lg border mb-4">
        <h4 className="font-semibold mb-3">{title}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'pie' && data) {
    return (
      <div className="bg-white p-4 rounded-lg border mb-4">
        <h4 className="font-semibold mb-3">{title}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

const ReportAssistant = ({ stats = {}, uploadStats = {}, chartData = {} }) => {
  const [selectedStyle, setSelectedStyle] = useState('business_concise');
  const [selectedLayout, setSelectedLayout] = useState('standard');
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('md');
  const [viewMode, setViewMode] = useState('split');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  const editorRef = useRef(null);
  const previewHtml = useMemo(() => convertMarkdownToHtml(reportContent, showCharts, chartData), [reportContent, showCharts, chartData]);

  // Normalize real data for charts
  const locationChartData = useMemo(() => {
    const arr = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    return arr.map((d) => ({ name: d.name || d.location || '-', count: d.count ?? d.value ?? 0 }));
  }, [chartData]);

  const successPieData = useMemo(() => {
    const total = Number(stats?.totalAccess ?? 0);
    const success = Number(stats?.successfulAccess ?? 0);
    const denied = Number(stats?.deniedAccess ?? 0);
    if (!total && !success && !denied) {
      const arr = Array.isArray(chartData?.successRateData) ? chartData.successRateData : [];
      return arr.map((d) => ({ name: d.name || d.label || '-', value: d.value ?? d.count ?? 0 }));
    }
    return [
      { name: 'อนุมัติ', value: success },
      { name: 'ปฏิเสธ', value: denied },
    ];
  }, [stats, chartData]);

  const wordCount = useMemo(() => {
    const text = reportContent.trim();
    return text ? text.split(/\s+/).length : 0;
  }, [reportContent]);

  const format = (n) => Number(n ?? 0).toLocaleString('th-TH');

  const buildReportByStyleLayout = () => {
    const total = Number(stats?.totalAccess ?? 0);
    const success = Number(stats?.successfulAccess ?? 0);
    const denied = Number(stats?.deniedAccess ?? 0);
    const unique = Number(stats?.uniqueUsers ?? 0);
    const sr = total ? ((success/total)*100).toFixed(1) : '-';
    const dr = total ? ((denied/total)*100).toFixed(1) : '-';
    const loc = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    const locRows = [...loc]
      .map(i => ({ name: i.name || i.location || '-', count: i.count || i.value || 0 }))
      .sort((a,b)=>b.count-a.count)
      .map(r => `| ${r.name} | ${format(r.count)} |`).join('\n');

    const styleText = {
      business_concise: {
        title: 'สรุป (เชิงธุรกิจ กระชับ)',
        intro: `สรุปภาพรวมเพื่อการตัดสินใจอย่างรวดเร็ว`,
        rec: `ข้อเสนอแนะเบื้องต้น: ทบทวนสิทธิ์ผู้ใช้งาน ตรวจพื้นที่ที่มีการปฏิเสธซ้ำ และติดตามช่วงเวลาหนาแน่น`
      },
      formal: {
        title: 'บทสรุป (ทางการ)',
        intro: `รายงานฉบับนี้จัดทำเพื่อสรุปสถานะการเข้าใช้งานและสถิติสำคัญในช่วงเวลาที่ประเมิน`,
        rec: `ข้อเสนอแนะ: จัดให้มีการทบทวนสิทธิ์ประจำรอบ ตรวจสอบรายการปฏิเสธ และวางมาตรการรองรับภาระงานช่วงพีค`
      },
      analytical: {
        title: 'บทสรุป (เชิงวิเคราะห์)',
        intro: `ชี้ให้เห็นแนวโน้ม ตัวเลขหลัก และประเด็นที่ควรเจาะลึกต่อไป`,
        rec: `ประเด็นติดตาม: การเปลี่ยนแปลงอัตราปฏิเสธตามพื้นที่/ช่วงเวลา และผลลัพธ์หลังปรับสิทธิ์`
      }
    }[selectedStyle] || styleText?.business_concise;

    const summary = `## ${styleText.title}\n${styleText.intro}\n\n- การเข้าใช้ทั้งหมด: **${format(total)}** ครั้ง\n- ผู้ใช้ไม่ซ้ำ: **${format(unique)}** คน\n- อัตราสำเร็จ: **${sr}%** • ปฏิเสธ: **${dr}%**\n\n${styleText.rec}\n`;

    const kpi = `## KPI\n\n| ตัวชี้วัด | จำนวน | สัดส่วน |\n|---|---:|---:|\n| การเข้าใช้ทั้งหมด | ${format(total)} | 100% |\n| อนุมัติ | ${format(success)} | ${sr}% |\n| ปฏิเสธ | ${format(denied)} | ${dr}% |\n`;

    const byLocation = `## การเข้าใช้งานตามสถานที่\n\n| สถานที่ | จำนวน |\n|---|---:|\n${locRows || '| - | - |'}\n\n[CHART:ACCESS_BY_LOCATION]\n`;

    const successRate = `## อัตราความสำเร็จ\n\n| สถานะ | จำนวน | สัดส่วน |\n|---|---:|---:|\n| อนุมัติ | ${format(success)} | ${sr}% |\n| ปฏิเสธ | ${format(denied)} | ${dr}% |\n| รวม | ${format(total)} | 100% |\n\n[CHART:SUCCESS_RATE]\n`;

    const sectionsByLayout = {
      standard: [summary, kpi, byLocation, successRate],
      summary: [summary, successRate],
      executive: [summary, kpi]
    }[selectedLayout] || [summary, kpi, byLocation, successRate];

    return ['# รายงานการใช้งาน Access Log', '', ...sectionsByLayout].join('\n');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      setReportContent(buildReportByStyleLayout());
    } catch (err) {
      setError('ไม่สามารถสร้างรายงานได้');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('คัดลอกไม่สำเร็จ');
    }
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = convertMarkdownToHtml(reportContent, true, chartData);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>รายงาน Access Log</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Sarabun', Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #334155; margin-top: 30px; }
            h3 { color: #475569; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; }
            ul { padding-left: 25px; }
            li { margin-bottom: 8px; }
            .chart-container { page-break-inside: avoid; }
            strong { font-weight: 600; }
            @media print {
              body { margin: 20px; }
              .chart-container { border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="border: none; color: #1e293b;">รายงานการวิเคราะห์การเข้าใช้งาน</h1>
            <p style="color: #64748b;">สร้างเมื่อ ${new Date().toLocaleDateString('th-TH')}</p>
          </div>
          ${htmlContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPDF();
      return;
    }

    const filename = `report-${Date.now()}.${exportFormat}`;
    let content = reportContent;
    let mimeType = 'text/plain';

    if (exportFormat === 'html') {
      const hasLoc = reportContent.includes('[CHART:ACCESS_BY_LOCATION]');
      const hasPie = reportContent.includes('[CHART:SUCCESS_RATE]');
      const htmlBody = convertMarkdownToHtml(reportContent, false, null);
      const locLabels = (locationChartData || []).map(d=>d.name.replace(/"/g,'\\"'));
      const locCounts = (locationChartData || []).map(d=>d.count);
      const pieLabels = (successPieData || []).map(d=>d.name.replace(/"/g,'\\"'));
      const pieValues = (successPieData || []).map(d=>d.value);
      content = `<!DOCTYPE html>
<html>
<head>
  <title>รายงาน Access Log</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1, h2, h3 { color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
    th { background-color: #f1f5f9; }
    .chart-wrap { margin: 16px auto; max-width: 560px; }
    .chart-wrap h3 { margin: 0 0 8px 0; font-size: 16px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  ${htmlBody}
  ${hasLoc ? '<div class="chart-wrap"><h3>การเข้าใช้งานตามสถานที่</h3><canvas id="locChart" height="200"></canvas></div>' : ''}
  ${hasPie ? '<div class="chart-wrap"><h3>อัตราความสำเร็จ</h3><canvas id="pieChart" height="200"></canvas></div>' : ''}
  <script>
    (function(){
      try {
        ${hasLoc ? `
        const locCtx = document.getElementById('locChart')?.getContext('2d');
        if (locCtx) {
          new Chart(locCtx, {
            type: 'bar',
            data: { labels: ${JSON.stringify(locLabels)}, datasets: [{ label: 'จำนวน', data: ${JSON.stringify(locCounts)}, backgroundColor: '#3B82F6' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
          });
        }
        ` : ''}
        ${hasPie ? `
        const pieCtx = document.getElementById('pieChart')?.getContext('2d');
        if (pieCtx) {
          new Chart(pieCtx, {
            type: 'pie',
            data: { labels: ${JSON.stringify(pieLabels)}, datasets: [{ data: ${JSON.stringify(pieValues)}, backgroundColor: ['#10B981','#EF4444','#F59E0B','#3B82F6'] }] },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }
        ` : ''}
      } catch (e) { console.error(e); }
    })();
  </script>
</body>
</html>`;
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertTemplate = (template) => {
    const total = Number(stats?.totalAccess ?? 0);
    const success = Number(stats?.successfulAccess ?? 0);
    const denied = Number(stats?.deniedAccess ?? 0);
    const sr = total ? ((success/total)*100).toFixed(1) : '-';
    const dr = total ? ((denied/total)*100).toFixed(1) : '-';
    const loc = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    const locRows = [...loc]
      .map(i => ({ name: i.name || i.location || '-', count: i.count || i.value || 0 }))
      .sort((a,b)=>b.count-a.count)
      .map(r => `| ${r.name} | ${r.count.toLocaleString('th-TH')} |`).join('\n');

    const templates = {
      summary: `\n## สรุป\n- การเข้าใช้ทั้งหมด: **${total.toLocaleString('th-TH')}** ครั้ง\n- อัตราสำเร็จ: **${sr}%** • ปฏิเสธ: **${dr}%**\n`,
      kpi: `\n## KPI\n\n| ตัวชี้วัด | จำนวน | สัดส่วน |\n|---|---:|---:|\n| การเข้าใช้ทั้งหมด | ${total.toLocaleString('th-TH')} | 100% |\n| อนุมัติ | ${success.toLocaleString('th-TH')} | ${sr}% |\n| ปฏิเสธ | ${denied.toLocaleString('th-TH')} | ${dr}% |\n`,
      chartBar: `\n## การเข้าใช้งานตามสถานที่\n\n| สถานที่ | จำนวน |\n|---|---:|\n${locRows || '| - | - |'}\n`,
      chartPie: `\n## อัตราความสำเร็จ\n\n| สถานะ | จำนวน | สัดส่วน |\n|---|---:|---:|\n| อนุมัติ | ${success.toLocaleString('th-TH')} | ${sr}% |\n| ปฏิเสธ | ${denied.toLocaleString('th-TH')} | ${dr}% |\n| รวม | ${total.toLocaleString('th-TH')} | 100% |\n\n[CHART:SUCCESS_RATE]\n`
    };

    setReportContent(prev => prev + (templates[template] || ''));
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-white border-r transition-all duration-200 ${sidebarOpen ? 'w-72' : 'w-0'}`}>
        {sidebarOpen && (
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="font-medium">ตั้งค่า</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Style */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  สไตล์
                </h3>
                <div className="space-y-2">
                  {stylePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedStyle(preset.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedStyle === preset.value
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-sm font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  โครง
                </h3>
                <div className="space-y-2">
                  {layoutPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedLayout(preset.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedLayout === preset.value
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-sm font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Templates */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  เทมเพลต
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => insertTemplate('summary')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📋</span> สรุป
                  </button>
                  <button
                    onClick={() => insertTemplate('kpi')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📊</span> KPI
                  </button>
                  <button
                    onClick={() => insertTemplate('chartBar')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📊</span> กราฟแท่ง
                  </button>
                  <button
                    onClick={() => insertTemplate('chartPie')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>🥧</span> กราฟวงกลม
                  </button>
                </div>
              </div>

              {/* Chart Options */}
              <div>
                <label className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={showCharts}
                    onChange={(e) => setShowCharts(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">แสดงกราฟในพรีวิว</span>
                </label>
              </div>

              {/* Stats */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600 space-y-1">
                  <div>📄 {uploadStats?.fileName}</div>
                  <div>📝 {wordCount} คำ</div>
                  <div>👥 {stats?.uniqueUsers?.toLocaleString()} คน</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold">รายงาน Access Log</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="h-9 rounded-lg border px-3 bg-white text-sm"
            >
              <option value="split">แยก</option>
              <option value="preview">พรีวิว</option>
              <option value="editor">แก้ไข</option>
            </select>

            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="h-9 rounded-lg border px-3 bg-white text-sm"
            >
              <option value="md">MD</option>
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
            </select>

            <button onClick={handleCopy} className="p-2 hover:bg-slate-100 rounded-lg" title="คัดลอก">
              {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>

            <button onClick={handleExport} className="p-2 hover:bg-slate-100 rounded-lg" title="ส่งออก">
              <FileDown className="w-5 h-5" />
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'สร้าง...' : 'สร้าง'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 bg-white min-h-0">
          {viewMode === 'split' && (
            <div className="h-full min-h-0 grid grid-cols-2">
              <textarea
                ref={editorRef}
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="กด 'สร้าง' เพื่อเริ่มต้น หรือใช้เทมเพลตกราฟจาก Sidebar"
                className="w-full h-full resize-none border-r border-slate-200 p-4 text-sm font-mono focus:outline-none"
              />
              <div className="h-full min-h-0 overflow-auto p-4 bg-slate-50">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                {showCharts && reportContent.includes('[CHART:ACCESS_BY_LOCATION]') && (
                  <ChartComponent
                    type="bar"
                    data={locationChartData}
                    title="การเข้าใช้งานตามสถานที่"
                  />
                )}
                {showCharts && reportContent.includes('[CHART:SUCCESS_RATE]') && (
                  <ChartComponent
                    type="pie"
                    data={successPieData}
                    title="อัตราความสำเร็จ"
                  />
                )}
              </div>
            </div>
          )}

          {viewMode === 'editor' && (
            <textarea
              ref={editorRef}
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder="กด 'สร้าง' เพื่อเริ่มต้น หรือใช้เทมเพลตกราฟจาก Sidebar"
              className="w-full h-full resize-none p-4 text-sm font-mono focus:outline-none"
            />
          )}

          {viewMode === 'preview' && (
            <div className="h-full min-h-0 overflow-auto p-4 bg-slate-50">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              {showCharts && reportContent.includes('[CHART:ACCESS_BY_LOCATION]') && (
                <ChartComponent
                  type="bar"
                  data={locationChartData}
                  title="การเข้าใช้งานตามสถานที่"
                />
              )}
              {showCharts && reportContent.includes('[CHART:SUCCESS_RATE]') && (
                <ChartComponent
                  type="pie"
                  data={successPieData}
                  title="อัตราความสำเร็จ"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportAssistant;
