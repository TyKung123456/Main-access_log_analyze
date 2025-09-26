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
import aiService from '../../services/aiService'; // Adjust path as needed

const stylePresets = [
  { value: 'business_concise', label: 'ธุรกิจ', icon: '💼', description: 'กระชับ เน้นสาระสำคัญ' },
  { value: 'formal', label: 'ทางการ', icon: '📋', description: 'เป็นทางการ ครบถ้วน' },
  { value: 'analytical', label: 'วิเคราะห์', icon: '📊', description: 'เชิงลึก มีข้อมูลสนับสนุน' },
  { value: 'narrative', label: 'เล่าเรื่อง', icon: '📖', description: 'บรรยายเป็นเรื่องราว' },
  { value: 'technical', label: 'เทคนิค', icon: '⚙️', description: 'รายละเอียดทางเทคนิค' }
];

const layoutPresets = [
  { value: 'standard', label: 'มาตรฐาน', icon: '📄', description: 'โครงสร้างครบถ้วน' },
  { value: 'summary', label: 'แบบย่อ', icon: '📝', description: 'สรุปสั้น ได้ใจความ' },
  { value: 'executive', label: 'ผู้บริหาร', icon: '👔', description: 'สำหรับการตัดสินใจ' },
  { value: 'dashboard', label: 'แดชบอร์ด', icon: '📊', description: 'เน้นตัวเลขและกราฟ' },
  { value: 'detailed', label: 'รายละเอียด', icon: '📋', description: 'ครอบคลุมทุกมิติ' }
];

const toneOptions = [
  { value: 'professional', label: 'มืออาชีพ', icon: '🎯' },
  { value: 'formal', label: 'เป็นทางการ', icon: '📜' },
  { value: 'casual', label: 'สบายๆ', icon: '😊' },
  { value: 'urgent', label: 'เร่งด่วน', icon: '🚨' },
  { value: 'conversational', label: 'สนทนา', icon: '💬' }
];

const depthOptions = [
  { value: 'shallow', label: 'ภาพรวม', description: 'สรุปสั้น' },
  { value: 'medium', label: 'ปานกลาง', description: 'สมดุล' },
  { value: 'deep', label: 'เชิงลึก', description: 'วิเคราะห์ละเอียด' },
  { value: 'comprehensive', label: 'ครอบคลุม', description: 'ทุกมิติ' }
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
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedDepth, setSelectedDepth] = useState('medium');
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('md');
  const [viewMode, setViewMode] = useState('split');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  // AI Advanced Options
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeRiskAssessment, setIncludeRiskAssessment] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [language, setLanguage] = useState('thai');

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

  // Generate comprehensive data analysis for AI
  const generateDataAnalysis = (data) => {
    const total = Number(stats?.totalAccess ?? 0);
    const success = Number(stats?.successfulAccess ?? 0);
    const denied = Number(stats?.deniedAccess ?? 0);
    const unique = Number(stats?.uniqueUsers ?? 0);
    const successRate = total > 0 ? ((success / total) * 100) : 0;
    const deniedRate = total > 0 ? ((denied / total) * 100) : 0;

    // Process location data
    const locations = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    const locationStats = locations.map(loc => ({
      name: loc.name || loc.location || 'ไม่ระบุ',
      count: loc.count || loc.value || 0
    })).sort((a, b) => b.count - a.count);

    const mostActiveLocation = locationStats[0]?.name || 'ไม่ระบุ';
    const locationDistribution = locationStats.reduce((acc, loc) => {
      acc[loc.name] = loc.count;
      return acc;
    }, {});

    return {
      totalAccess: total,
      successfulAccess: success,
      deniedAccess: denied,
      uniqueUsers: unique,
      successRate: parseFloat(successRate.toFixed(2)),
      deniedRate: parseFloat(deniedRate.toFixed(2)),
      overview: {
        totalAccess: total,
        successfulAccess: success,
        deniedAccess: denied,
        successRate,
        deniedRate
      },
      summary: {
        mostActiveLocation,
        locationCount: locationStats.length,
        averageAccessPerLocation: locationStats.length > 0 ? Math.round(total / locationStats.length) : 0
      },
      breakdowns: {
        locations: locationDistribution,
        locationStats: locationStats
      }
    };
  };

  // AI Report Generation with Real Service Integration
  const generateAIReport = async () => {
    if (!aiService || !aiService.generateReport) {
      throw new Error('AI Service ไม่พร้อมใช้งาน กรุณาตรวจสอบการเชื่อมต่อ');
    }

    const analysis = generateDataAnalysis(stats);
    const caseTitle = uploadStats?.fileName || 'รายงานการใช้งาน Access Log';

    // Build comprehensive AI request
    const aiRequest = {
      stats: analysis,
      style: selectedStyle,
      layout: selectedLayout,
      options: {
        language: language,
        tone: selectedTone,
        depth: selectedDepth,
        includeCharts: showCharts,
        includeRecommendations: includeRecommendations,
        includeRiskAssessment: includeRiskAssessment,
        caseTitle: caseTitle,
        customPrompt: customPrompt.trim() || undefined,
        // Additional context
        fileName: uploadStats?.fileName,
        uploadDate: uploadStats?.uploadDate,
        totalRecords: stats?.totalAccess || 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'ReportAssistant',
        version: '2.0',
        settings: {
          style: selectedStyle,
          layout: selectedLayout,
          tone: selectedTone,
          depth: selectedDepth
        }
      }
    };

    // Call the actual AI service
    const aiReport = await aiService.generateReport(aiRequest);

    if (!aiReport || !aiReport.markdown) {
      throw new Error('AI ไม่สามารถสร้างรายงานได้ กรุณาลองใหม่อีกครั้ง');
    }

    return aiReport.markdown;
  };

  // Fallback report generation (if AI fails)
  const buildFallbackReport = () => {
    const total = Number(stats?.totalAccess ?? 0);
    const success = Number(stats?.successfulAccess ?? 0);
    const denied = Number(stats?.deniedAccess ?? 0);
    const unique = Number(stats?.uniqueUsers ?? 0);
    const sr = total > 0 ? ((success / total) * 100).toFixed(1) : '-';
    const dr = total > 0 ? ((denied / total) * 100).toFixed(1) : '-';
    const loc = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    const locRows = [...loc]
      .map(i => ({ name: i.name || i.location || '-', count: i.count || i.value || 0 }))
      .sort((a, b) => b.count - a.count)
      .map(r => `| ${r.name} | ${format(r.count)} |`).join('\n');

    const currentStylePreset = stylePresets.find(s => s.value === selectedStyle) || stylePresets[0];
    const currentToneOption = toneOptions.find(t => t.value === selectedTone) || toneOptions[0];
    const currentDepthOption = depthOptions.find(d => d.value === selectedDepth) || depthOptions[1]; // medium

    let introText = currentStylePreset.description;
    let recommendationText = currentStylePreset.rec;
    let riskAssessmentText = '';

    // Adjust intro/recommendations based on tone and depth
    if (selectedTone === 'urgent') {
      introText = `**ด่วน:** ${introText}`;
      recommendationText = `**ดำเนินการทันที:** ${recommendationText}`;
    } else if (selectedTone === 'casual') {
      introText = `สวัสดี! นี่คือสรุปง่ายๆ: ${introText}`;
    }

    if (selectedDepth === 'deep' || selectedDepth === 'comprehensive') {
      introText += ` (วิเคราะห์เชิงลึก)`;
      recommendationText += ` (พร้อมรายละเอียดเพิ่มเติม)`;
    } else if (selectedDepth === 'shallow') {
      introText += ` (ภาพรวม)`;
    }

    if (includeRecommendations) {
      recommendationText = `\n### ข้อเสนอแนะ\n${recommendationText}\n`;
    } else {
      recommendationText = '';
    }

    if (includeRiskAssessment) {
      riskAssessmentText = `\n### การประเมินความเสี่ยง\n- ตรวจพบการเข้าถึงที่ถูกปฏิเสธ **${format(denied)}** ครั้ง (${dr}%). อาจบ่งชี้ถึงความพยายามในการเข้าถึงที่ไม่ได้รับอนุญาตหรือการกำหนดค่าสิทธิ์ที่ไม่ถูกต้อง\n- สถานที่ที่มีการเข้าถึงสูงสุด: **${loc[0]?.name || 'ไม่ระบุ'}** ควรตรวจสอบเป็นพิเศษ\n`;
    } else {
      riskAssessmentText = '';
    }

    const summary = `## ${currentStylePreset.label} - ${currentToneOption.label} (${currentDepthOption.label})\n${introText}\n\n- การเข้าใช้ทั้งหมด: **${format(total)}** ครั้ง\n- ผู้ใช้ไม่ซ้ำ: **${format(unique)}** คน\n- อัตราสำเร็จ: **${sr}%** • ปฏิเสธ: **${dr}%**\n${recommendationText}${riskAssessmentText}`;

    const kpi = `## KPI\n\n| ตัวชี้วัด | จำนวน | สัดส่วน |\n|---|---:|---:|\n| การเข้าใช้ทั้งหมด | ${format(total)} | 100% |\n| อนุมัติ | ${format(success)} | ${sr}% |\n| ปฏิเสธ | ${format(denied)} | ${dr}% |\n`;

    const byLocation = showCharts ? `## การเข้าใช้งานตามสถานที่\n\n| สถานที่ | จำนวน |\n|---|---:|\n${locRows || '| - | - |'}\n\n[CHART:ACCESS_BY_LOCATION]\n` : `## การเข้าใช้งานตามสถานที่\n\n| สถานที่ | จำนวน |\n|---|---:|\n${locRows || '| - | - |'}\n`;

    const successRate = showCharts ? `## อัตราความสำเร็จ\n\n| สถานะ | จำนวน | สัดส่วน |\n|---|---:|---:|\n| อนุมัติ | ${format(success)} | ${sr}% |\n| ปฏิเสธ | ${format(denied)} | ${dr}% |\n| รวม | ${format(total)} | 100% |\n\n[CHART:SUCCESS_RATE]\n` : `## อัตราความสำเร็จ\n\n| สถานะ | จำนวน | สัดส่วน |\n|---|---:|---:|\n| อนุมัติ | ${format(success)} | ${sr}% |\n| ปฏิเสธ | ${format(denied)} | ${dr}% |\n| รวม | ${format(total)} | 100% |\n`;

    const sectionsByLayout = {
      standard: [summary, kpi, byLocation, successRate],
      summary: [summary, successRate],
      executive: [summary, kpi],
      dashboard: [kpi, byLocation, successRate],
      detailed: [summary, kpi, byLocation, successRate]
    }[selectedLayout] || [summary, kpi, byLocation, successRate];

    return ['# รายงานการใช้งาน Access Log', '', `*สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}*`, `*ไฟล์: ${uploadStats?.fileName || 'ไม่ระบุ'}*`, '', ...sectionsByLayout].join('\n');
  };

  // Main generation handler with AI integration
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('เริ่มสร้างรายงานด้วย AI...', {
        style: selectedStyle,
        layout: selectedLayout,
        tone: selectedTone,
        depth: selectedDepth
      });

      // Try AI first
      let report;
      try {
        report = await generateAIReport();
        console.log('AI สร้างรายงานสำเร็จ');
      } catch (aiError) {
        console.warn('AI ล้มเหลว ใช้ fallback:', aiError.message);
        setError(`AI ไม่พร้อมใช้งาน: ${aiError.message} - ใช้รูปแบบมาตรฐาน`);
        report = buildFallbackReport();
      }

      setReportContent(report);

    } catch (err) {
      console.error('การสร้างรายงานล้มเหลว:', err);
      setError(`ไม่สามารถสร้างรายงานได้: ${err.message}`);
      // Last resort fallback
      setReportContent(buildFallbackReport());
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
            <p style="color: #64748b;">สไตล์: ${stylePresets.find(s => s.value === selectedStyle)?.label} | โครง: ${layoutPresets.find(l => l.value === selectedLayout)?.label}</p>
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
      const locLabels = (locationChartData || []).map(d => d.name.replace(/"/g, '\\"'));
      const locCounts = (locationChartData || []).map(d => d.count);
      const pieLabels = (successPieData || []).map(d => d.name.replace(/"/g, '\\"'));
      const pieValues = (successPieData || []).map(d => d.value);
      content = `<!DOCTYPE html>
<html>
<head>
  <title>รายงาน Access Log</title>
  <meta charset="utf-8">
  <style>
    :root { --page-max: 960px; }
    body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.6; color: #0f172a; }
    .report-container { max-width: var(--page-max); margin: 0 auto; }
    h1, h2, h3 { color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
    th { background-color: #f1f5f9; }
    img, svg, canvas { max-width: 100%; }
    .chart-wrap { margin: 16px auto; max-width: 720px; }
    .chart-wrap h3 { margin: 0 0 8px 0; font-size: 16px; color: #334155; }
    .chart-wrap canvas { display: block; width: 100% !important; height: 280px !important; }
    @media (min-width: 1200px) { .chart-wrap canvas { height: 320px !important; } }
    @media (max-width: 480px) { .chart-wrap canvas { height: 220px !important; } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="report-container">
    ${htmlBody}
    ${hasLoc ? '<div class="chart-wrap"><h3>การเข้าใช้งานตามสถานที่</h3><canvas id="locChart"></canvas></div>' : ''}
    ${hasPie ? '<div class="chart-wrap"><h3>อัตราความสำเร็จ</h3><canvas id="pieChart"></canvas></div>' : ''}
  </div>
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
    const sr = total ? ((success / total) * 100).toFixed(1) : '-';
    const dr = total ? ((denied / total) * 100).toFixed(1) : '-';
    const loc = Array.isArray(chartData?.locationData) ? chartData.locationData : [];
    const locRows = [...loc]
      .map(i => ({ name: i.name || i.location || '-', count: i.count || i.value || 0 }))
      .sort((a, b) => b.count - a.count)
      .map(r => `| ${r.name} | ${r.count.toLocaleString('th-TH')} |`).join('\n');

    const templates = {
      summary: `\n## สรุป\n- การเข้าใช้ทั้งหมด: **${total.toLocaleString('th-TH')}** ครั้ง\n- อัตราสำเร็จ: **${sr}%** • ปฏิเสธ: **${dr}%**\n`,
      kpi: `\n## KPI\n\n| ตัวชี้วัด | จำนวน | สัดส่วน |\n|---|---:|---:|\n| การเข้าใช้ทั้งหมด | ${total.toLocaleString('th-TH')} | 100% |\n| อนุมัติ | ${success.toLocaleString('th-TH')} | ${sr}% |\n| ปฏิเสธ | ${denied.toLocaleString('th-TH')} | ${dr}% |\n`,
      chartBar: `\n## การเข้าใช้งานตามสถานที่\n\n| สถานที่ | จำนวน |\n|---|---:|\n${locRows || '| - | - |'}\n\n[CHART:ACCESS_BY_LOCATION]\n`,
      chartPie: `\n## อัตราความสำเร็จ\n\n| สถานะ | จำนวน | สัดส่วน |\n|---|---:|---:|\n| อนุมัติ | ${success.toLocaleString('th-TH')} | ${sr}% |\n| ปฏิเสธ | ${denied.toLocaleString('th-TH')} | ${dr}% |\n| รวม | ${total.toLocaleString('th-TH')} | 100% |\n\n[CHART:SUCCESS_RATE]\n`
    };

    setReportContent(prev => prev + (templates[template] || ''));
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-white border-r transition-all duration-200 ${sidebarOpen ? 'w-80' : 'w-0'}`}>
        {sidebarOpen && (
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-medium">AI การตั้งค่า</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* AI Status */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                  <Zap className="w-4 h-4" />
                  AI Report Generator
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  เชื่อมต่อกับ aiService.generateReport()
                </div>
              </div>

              {/* Style */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  สไตล์การเขียน
                </h3>
                <div className="space-y-2">
                  {stylePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedStyle(preset.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedStyle === preset.value
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-sm font-medium">{preset.label}</span>
                      </div>
                      <div className="text-xs text-slate-500">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  โครงสร้างรายงาน
                </h3>
                <div className="space-y-2">
                  {layoutPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedLayout(preset.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedLayout === preset.value
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-sm font-medium">{preset.label}</span>
                      </div>
                      <div className="text-xs text-slate-500">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced AI Options */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ตัวเลือกขั้นสูง
                </h3>

                {/* Tone */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-600 mb-2">โทนการเขียน</label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full text-sm border rounded px-3 py-2"
                  >
                    {toneOptions.map(tone => (
                      <option key={tone.value} value={tone.value}>
                        {tone.icon} {tone.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Depth */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-600 mb-2">ความลึกการวิเคราะห์</label>
                  <select
                    value={selectedDepth}
                    onChange={(e) => setSelectedDepth(e.target.value)}
                    className="w-full text-sm border rounded px-3 py-2"
                  >
                    {depthOptions.map(depth => (
                      <option key={depth.value} value={depth.value}>
                        {depth.label} - {depth.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-600 mb-2">ภาษา</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-sm border rounded px-3 py-2"
                  >
                    <option value="thai">ไทย</option>
                    <option value="english">English</option>
                    <option value="mixed">ไทย-English (ผสม)</option>
                  </select>
                </div>

                {/* Content Options */}
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeRecommendations}
                      onChange={(e) => setIncludeRecommendations(e.target.checked)}
                      className="rounded"
                    />
                    <span>💡 ข้อเสนอแนะและการปรับปรุง</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeRiskAssessment}
                      onChange={(e) => setIncludeRiskAssessment(e.target.checked)}
                      className="rounded"
                    />
                    <span>⚠️ การประเมินความเสี่ยง</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showCharts}
                      onChange={(e) => setShowCharts(e.target.checked)}
                      className="rounded"
                    />
                    <span>📊 แสดงกราฟในรายงาน</span>
                  </label>
                </div>

                {/* Custom Prompt */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-600 mb-2">คำสั่งพิเศษ (Custom Prompt)</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="เช่น: เปรียบเทียบกับเดือนที่แล้ว, เน้นประเด็นความปลอดภัย, แสดงแนวโน้มรายชั่วโมง..."
                    className="w-full text-sm border rounded px-3 py-2 h-20 resize-none"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    ระบุข้อกำหนดเพิ่มเติมที่ต้องการให้ AI วิเคราะห์
                  </div>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  เทมเพลตด่วน
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => insertTemplate('summary')}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📋</span> สรุป
                  </button>
                  <button
                    onClick={() => insertTemplate('kpi')}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📊</span> KPI
                  </button>
                  <button
                    onClick={() => insertTemplate('chartBar')}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>📈</span> กราฟแท่ง
                  </button>
                  <button
                    onClick={() => insertTemplate('chartPie')}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 text-sm"
                  >
                    <span>🥧</span> กราฟวงกลม
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-slate-50 rounded-lg p-3 border-t">
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>📄 ไฟล์:</span>
                    <span className="font-medium">{uploadStats?.fileName || 'ไม่ระบุ'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>📝 จำนวนคำ:</span>
                    <span className="font-medium">{wordCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>👥 ผู้ใช้:</span>
                    <span className="font-medium">{stats?.uniqueUsers?.toLocaleString('th-TH') || 0} คน</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🔢 รายการ:</span>
                    <span className="font-medium">{stats?.totalAccess?.toLocaleString('th-TH') || 0}</span>
                  </div>
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
              <h1 className="text-lg font-semibold">AI รายงาน Access Log</h1>
              <div className="text-xs text-slate-500">
                สไตล์: {stylePresets.find(s => s.value === selectedStyle)?.label} •
                โครง: {layoutPresets.find(l => l.value === selectedLayout)?.label} •
                โทน: {toneOptions.find(t => t.value === selectedTone)?.label}
              </div>
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

            <button
              onClick={handleCopy}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="คัดลอก"
              disabled={!reportContent}
            >
              {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>

            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-100 rounded-lg"
              title="ส่งออก"
              disabled={!reportContent}
            >
              <FileDown className="w-5 h-5" />
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'AI กำลังคิด...' : 'สร้างด้วย AI'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <div className="mx-4 mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-purple-800">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI กำลังวิเคราะห์ข้อมูลและสร้างรายงาน...</span>
            </div>
            <div className="text-xs text-purple-600 mt-1">
              กำลังประมวลผล: {stats?.totalAccess?.toLocaleString('th-TH') || 0} รายการ •
              สไตล์: {stylePresets.find(s => s.value === selectedStyle)?.label} •
              ความลึก: {depthOptions.find(d => d.value === selectedDepth)?.label}
            </div>
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
                placeholder={`กด 'สร้างด้วย AI' เพื่อให้ AI วิเคราะห์และสร้างรายงานตามที่ตั้งค่าไว้

หรือใช้เทมเพลตด่วนจาก Sidebar ทางซ้าย

การตั้งค่าปัจจุบัน:
• สไตล์: ${stylePresets.find(s => s.value === selectedStyle)?.label}
• โครงสร้าง: ${layoutPresets.find(l => l.value === selectedLayout)?.label}
• โทน: ${toneOptions.find(t => t.value === selectedTone)?.label}
• ความลึก: ${depthOptions.find(d => d.value === selectedDepth)?.label}`}
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
              placeholder={`กด 'สร้างด้วย AI' เพื่อให้ AI วิเคราะห์และสร้างรายงานตามที่ตั้งค่าไว้`}
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
