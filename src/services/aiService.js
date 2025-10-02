// services/aiService.js - MCP Version
class AIService {
  constructor() {
    this.provider = import.meta.env.VITE_AI_PROVIDER || 'mock'; // 'mock', 'local', or 'mcp'
    this.debug = import.meta.env.VITE_DEBUG_AI === 'true';

    // Ollama Local Model Configuration
    this.ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
    this.ollamaTimeout = parseInt(import.meta.env.VITE_OLLAMA_TIMEOUT || '60000', 10);
    this.ollamaMaxRetries = parseInt(import.meta.env.VITE_OLLAMA_MAX_RETRIES || '3', 10);

    // MCP Configuration (if applicable)
    this.mcpServerName = 'ai-mcp-server';
    this.mcpToolName = 'generate_ai_response';

    this.isAvailable = null; // Cache availability status
    this.availableModels = []; // Store available models from Ollama

    if (this.debug) {
      console.log('[AI Service] Initialized with provider:', this.provider);
      console.log('[AI Service] Ollama URL:', this.ollamaUrl);
      console.log('[AI Service] Ollama Model:', this.ollamaModel);
    }
  }

  async checkAvailability() {
    if (this.provider === 'mock') {
      this.isAvailable = { available: true, provider: 'mock' };
      this.availableModels = ['mock-model']; // Provide a dummy model for mock
      return this.isAvailable;
    } else if (this.provider === 'local') {
      try {
        if (this.debug) console.log(`[AI Service] Checking Ollama availability at ${this.ollamaUrl}/api/tags`);
        const response = await fetch(`${this.ollamaUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(this.ollamaTimeout),
        });

        if (response.ok) {
          const data = await response.json();
          this.availableModels = data.models?.map(model => model.name) || [];
          const hasModel = this.availableModels.some(model => model === this.ollamaModel);

          if (hasModel) {
            this.isAvailable = { available: true, provider: 'local', model: this.ollamaModel, url: this.ollamaUrl };
          } else {
            this.isAvailable = { available: false, provider: 'local', error: `Model '${this.ollamaModel}' not found. Available models: ${this.availableModels.join(', ') || 'None'}`, url: this.ollamaUrl };
          }
        } else {
          this.isAvailable = { available: false, provider: 'local', error: `Ollama server responded with status ${response.status}`, url: this.ollamaUrl };
        }
      } catch (error) {
        console.error('[AI Service] Ollama connection error:', error);
        this.isAvailable = { available: false, provider: 'local', error: `Cannot connect to Ollama server: ${error.message}`, url: this.ollamaUrl };
      }
      return this.isAvailable;
    } else if (this.provider === 'mcp') {
      // In a real scenario, you might have an MCP tool to check server/model availability.
      // For now, we assume the MCP server is always available if configured.
      this.isAvailable = { available: true, provider: 'mcp' };
      this.availableModels = ['mcp-model']; // Provide a dummy model for MCP
      return this.isAvailable;
    } else {
      this.isAvailable = { available: false, error: 'Unknown provider' };
      this.availableModels = [];
      return this.isAvailable;
    }
  }

  // New: Function to upload file content for AI context
  async uploadFileForAI(file) {
    if (this.debug) {
      console.log('[AI Service] Uploading file for AI:', file.name);
    }

    try {
      const reader = new FileReader();
      const fileContentPromise = new Promise((resolve, reject) => {
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file); // Read file as text
      });

      const fileContent = await fileContentPromise;

      // In a real scenario, you might send this to a backend endpoint
      // that then makes it available to the AI model.
      // For now, we'll just return it to the frontend to be passed as context.
      if (this.debug) {
        console.log(`[AI Service] File "${file.name}" content read successfully.`);
      }
      return { success: true, fileContent: fileContent, message: 'File uploaded successfully.' };
    } catch (error) {
      console.error('[AI Service] Error reading or uploading file:', error);
      return { success: false, message: `Failed to read file: ${error.message}` };
    }
  }

  async generateResponse(userMessage, context = {}) {
    if (this.debug) {
      console.log('[AI Service] Generating response for:', userMessage.substring(0, 50) + '...');
    }

    if (!this.isAvailable || !this.isAvailable.available) {
      console.warn('[AI Service] AI service not available or not checked, using mock response.');
      // Attempt to check availability if not already checked or if it failed previously
      await this.checkAvailability();
      if (!this.isAvailable || !this.isAvailable.available) {
        throw new Error(`AI Service ไม่พร้อมใช้งาน: ${this.isAvailable?.error || 'Unknown error'}`);
      }
    }

    try {
      if (this.provider === 'local') {
        return await this.generateLocalResponse(userMessage, context);
      }
      if (this.provider === 'mcp') {
        return await this.generateMcpResponse(userMessage, context);
      }
      
      // Fallback to mock for all other providers
      return this.getMockResponse(userMessage, context);
    } catch (error) {
      console.error('[AI Service] Error generating response:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  async generateLocalResponse(userMessage, context) {
    const prompt = this.buildPrompt(userMessage, context);
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/ai/chat`; // Assuming a backend endpoint for AI chat

    if (this.debug) {
      console.log('[AI Service] Calling local AI backend with prompt:', prompt);
      console.log('[AI Service] Backend API URL:', apiUrl);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: this.ollamaModel,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        }),
        signal: AbortSignal.timeout(this.ollamaTimeout),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Backend responded with status ${response.status}`);
      }

      const data = await response.json();
      return this.processResponse(data.response);

    } catch (error) {
      console.error('[AI Service] Local AI backend call failed:', error);
      throw new Error(`Failed to connect to local AI backend: ${error.message}`);
    }
  }

  async generateMcpResponse(userMessage, context) {
    const prompt = this.buildPrompt(userMessage, context);
    
    try {
      // This is a conceptual call to an MCP tool.
      // In a real implementation, this would involve using the 'use_mcp_tool' tool.
      // For demonstration, we'll simulate a response or indicate where the call would go.
      console.log(`[AI Service] Calling MCP tool '${this.mcpToolName}' on server '${this.mcpServerName}' with prompt:`, prompt);
      
      // For now, return a mock response to avoid breaking the application without a real MCP setup
      // In a real scenario, mcpResponse would contain the AI's generated text.
      const simulatedMcpResponse = `(MCP Response) ${this.getMockResponse(userMessage, context)}`;
      return this.processResponse(simulatedMcpResponse);

    } catch (error) {
      console.warn('[AI Service] MCP tool failed, using mock response');
      throw new Error(`MCP tool failed: ${error.message}`);
    }
  }

  buildPrompt(userMessage, context) {
    const { stats = {}, fileContext = '' } = context; // New: Destructure fileContext

    let prompt = `คุณเป็น AI ที่เชี่ยวชาญวิเคราะห์ Access Log`;

    if (fileContext) {
      prompt += `

ข้อมูลจากไฟล์ที่อัปโหลด:
\`\`\`
${fileContext}
\`\`\``;
    }

    prompt += `

ข้อมูลปัจจุบัน:
- การเข้าถึงทั้งหมด: ${stats.totalAccess || 0} ครั้ง
- การเข้าถึงสำเร็จ: ${stats.successfulAccess || 0} ครั้ง  
- การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess || 0} ครั้ง
- ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers || 0} คน

คำถาม: ${userMessage}

ตอบเป็นภาษาไทยและให้คำแนะนำที่เป็นประโยชน์:`;

    return prompt;
  }

  processResponse(rawResponse) {
    if (!rawResponse) return 'ไม่สามารถสร้างคำตอบได้';
    
    let response = rawResponse.trim();
    response = response.replace(/^(คำตอบ:|ตอบ:|Response:)/i, '').trim();
    
    return response;
  }

  getMockResponse(userMessage, context) {
    const { stats = {} } = context;
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('สถิติ') || lowerMessage.includes('สรุป')) {
      return this.generateStatsResponse(stats);
    }
    
    if (lowerMessage.includes('ปฏิเสธ') || lowerMessage.includes('denied')) {
      return this.generateDeniedResponse(stats);
    }
    
    if (lowerMessage.includes('ความปลอดภัย') || lowerMessage.includes('security')) {
      return this.generateSecurityResponse(stats);
    }

    return this.generateDefaultResponse(userMessage, stats);
  }

  generateStatsResponse(stats) {
    const successRate = stats.totalAccess > 0 ? 
      ((stats.successfulAccess / stats.totalAccess) * 100).toFixed(1) : 0;
    const deniedRate = stats.totalAccess > 0 ? 
      ((stats.deniedAccess / stats.totalAccess) * 100).toFixed(1) : 0;

    return `📊 **สถิติการเข้าถึงระบบ**

🔢 **ข้อมูลรวม:**
• การเข้าถึงทั้งหมด: ${stats.totalAccess || 0} ครั้ง
• การเข้าถึงสำเร็จ: ${stats.successfulAccess || 0} ครั้ง (${successRate}%)
• การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess || 0} ครั้ง (${deniedRate}%)
• ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers || 0} คน

📈 **สถานะระบบ:** ${this.getSystemStatus(stats)}

💡 **คำแนะนำ:** ตรวจสอบและอัปเดตสิทธิ์การเข้าถึงเป็นประจำ`;
  }

  generateDeniedResponse(stats) {
    const deniedRate = stats.totalAccess > 0 ? 
      ((stats.deniedAccess / stats.totalAccess) * 100).toFixed(1) : 0;

    return `🔒 **การวิเคราะห์การเข้าถึงที่ถูกปฏิเสธ**

📊 **สถิติ:**
• จำนวนการปฏิเสธ: ${stats.deniedAccess || 0} ครั้ง
• อัตราการปฏิเสธ: ${deniedRate}%

🔍 **สาเหตุที่เป็นไปได้:**
• บัตรหมดอายุหรือถูกยกเลิก
• ไม่มีสิทธิ์เข้าถึงพื้นที่ดังกล่าว
• บัตรเสียหายหรืออ่านไม่ได้
• การพยายามเข้าถึงนอกเวลาที่กำหนด

💡 **แนวทางแก้ไข:** ${this.getDeniedRecommendation(deniedRate)}`;
  }

  generateSecurityResponse(stats) {
    const deniedRate = stats.totalAccess > 0 ? 
      (stats.deniedAccess / stats.totalAccess) * 100 : 0;
    
    let level = '🟢 ดี';
    let assessment = 'ระบบทำงานปกติ';
    
    if (deniedRate === 0) {
      level = '🟢 ดีเยี่ยม';
      assessment = 'ไม่พบการเข้าถึงที่ผิดปกติ';
    } else if (deniedRate > 15) {
      level = '🔴 ต้องระวัง';
      assessment = 'อัตราการปฏิเสธสูง ต้องตรวจสอบ';
    } else if (deniedRate > 5) {
      level = '🟡 ปานกลาง';
      assessment = 'มีการปฏิเสธปานกลาง ควรติดตาม';
    }

    return `🛡️ **การประเมินความปลอดภัยระบบ**

🎯 **ระดับความปลอดภัย:** ${level}
📊 **การประเมิน:** ${assessment}

🔒 **แนวทางปรับปรุง:**
1. ตรวจสอบและอัปเดตสิทธิ์การเข้าถึง
2. ติดตั้งระบบแจ้งเตือนแบบ Real-time
3. ทำ Security Audit เป็นประจำ
4. สำรองข้อมูล Log เป็นประจำ`;
  }

  generateDefaultResponse(userMessage, stats) {
    return `🤖 **การวิเคราะห์คำถาม:** "${userMessage}"

📊 **สถิติปัจจุบัน:**
• การเข้าถึงทั้งหมด: ${stats.totalAccess || 0} ครั้ง
• การเข้าถึงสำเร็จ: ${stats.successfulAccess || 0} ครั้ง
• การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess || 0} ครั้ง
• ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers || 0} คน

💡 **คำแนะนำ:** ติดตามและวิเคราะห์ข้อมูลเป็นประจำเพื่อความปลอดภัย

❓ **ลองถามเกี่ยวกับ:** สถิติ, ความปลอดภัย, การปฏิเสธ, แนวโน้ม`;
  }

  getSystemStatus(stats) {
    if (stats.totalAccess === 0) return '📭 ไม่มีข้อมูล';
    
    const successRate = (stats.successfulAccess / stats.totalAccess) * 100;
    
    if (successRate >= 95) return '🟢 ดีเยี่ยม';
    if (successRate >= 90) return '🟡 ดี';
    if (successRate >= 80) return '🟠 ต้องติดตาม';
    return '🔴 ต้องตรวจสอบ';
  }

  getDeniedRecommendation(deniedRate) {
    if (deniedRate > 20) return 'ตรวจสอบระบบด่วน อัตราปฏิเสธสูงมาก';
    if (deniedRate > 10) return 'ติดตามอย่างใกล้ชิด อัตราปฏิเสธค่อนข้างสูง';
    if (deniedRate > 0) return 'อัตราปฏิเสธอยู่ในระดับปกติ';
    return 'ไม่พบการปฏิเสธ ระบบทำงานดี';
  }

  async generateReport({
    stats = {},
    uploadStats = null,
    filters = {},
    chartData = {},
    style = 'business_concise',
    layout = 'standard',
    // New, optional advanced options (from UI)
    options = {}
  } = {}) {
    try {
      // Try real AI first if provider is not mock and service is available
      if ((this.provider === 'local' || this.provider === 'mcp') && (await this.checkAvailability())?.available) {
        const metrics = this.extractCoreMetrics(stats);
        const locationHighlights = this.getLocationHighlights(stats, chartData).slice(0, 5);
        const peakHour = this.getPeakHour(chartData);
        const filterSummary = this.summariseFilters(filters);
        const language = options.language || 'thai';

        const header = `สร้างรายงานเชิงวิเคราะห์จากข้อมูลต่อไปนี้ โดยตอบเป็นภาษาไทยล้วน และให้เนื้อหาแตกต่างตามตัวเลือก:
สไตล์: ${style}
โทน: ${options.tone || 'professional'}
ความลึก: ${options.depth || 'medium'}
รูปแบบ: ${layout}
ตัวเลือกเพิ่มเติม: แผนภูมิ=${options.includeCharts?'มี':'ไม่มี'}, ข้อเสนอแนะ=${options.includeRecommendations?'มี':'ไม่มี'}, ความเสี่ยง=${options.includeRiskAssessment?'มี':'ไม่มี'}
คำสั่งพิเศษ: ${options.customPrompt || '-'}
บริบทตัวกรอง: ${filterSummary || '-'}

`;        
        const facts = [
          `รวม ${metrics.total} ครั้ง`,
          `สำเร็จ ${metrics.success} ครั้ง`,
          `ปฏิเสธ ${metrics.denied} ครั้ง (${metrics.deniedRateText})`,
          peakHour ? `ชั่วโมงพีก: ${peakHour}` : null,
          locationHighlights.length ? `Top สถานที่: ${locationHighlights.map(l=>`${l.label} (${l.valueText})`).join(', ')}` : null,
        ].filter(Boolean).join('\n');

        const userMessage = `${header}${facts}\n\nสร้างหัวข้อชัดเจน: (1) บทสรุปผู้บริหาร (2) KPI (3) วิเคราะห์ตามสถานที่/ช่วงเวลา (4) ข้อเสนอแนะ และสรุปปิดท้าย`;

        const aiText = await this.generateResponse(userMessage, { stats: metrics });
        if (aiText && String(aiText).trim().length > 0) {
          // Return AI result as markdown
          return { markdown: String(aiText).trim(), style, layout };
        }
      }

      // Fallback to deterministic builder
      const markdown = this.buildReportMarkdown({ stats, uploadStats, filters, chartData, style, layout, options });
      return { markdown, style, layout };
    } catch (error) {
      console.error('[AI Service] generateReport failed:', error);
      // Final fallback
      const markdown = this.buildReportMarkdown({ stats, uploadStats, filters, chartData, style, layout, options });
      return { markdown, style, layout };
    }
  }

  buildReportMarkdown({ stats, uploadStats, filters, chartData, style, layout, options = {} }) {
    const styleConfig = this.getReportStyleConfig(style);
    const layoutConfig = this.getReportLayoutConfig(layout);
    const tone = options.tone || 'professional'; // 'professional' | 'formal' | 'casual' | 'urgent' | 'conversational'
    const depth = options.depth || 'medium'; // 'shallow' | 'medium' | 'deep' | 'comprehensive'
    const language = options.language || 'thai'; // currently supports 'thai' (default)
    const includeCharts = options.includeCharts === true;
    const includeRecommendations = options.includeRecommendations !== false; // default on
    const includeRiskAssessment = options.includeRiskAssessment !== false;   // default on
    const caseTitle = options.caseTitle || null;
    const customPrompt = (options.customPrompt || '').trim();
    const metrics = this.extractCoreMetrics(stats);
    const locationHighlights = this.getLocationHighlights(stats, chartData);
    const directionSummary = this.getDirectionSummary(chartData);
    const peakHour = this.getPeakHour(chartData);
    const filterSummary = this.summariseFilters(filters);
    const now = new Date();

    const header = [
      '# ' + (language === 'thai' ? 'รายงานวิเคราะห์การเข้าใช้งานระบบ' : 'Access Log Analysis Report'),
      '',
      (caseTitle ? `**${language === 'thai' ? 'เรื่อง' : 'Case'}:** ${caseTitle}` : null),
      `**${language === 'thai' ? 'วันที่จัดทำ' : 'Generated at'}:** ${now.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}`,
      `**${language === 'thai' ? 'รูปแบบรายงาน' : 'Layout/Style'}:** ${layoutConfig.label} • ${styleConfig.label}`,
      (customPrompt ? (language === 'thai' ? `> ข้อกำหนดเพิ่มเติม: ${customPrompt}` : `> Custom instructions: ${customPrompt}`) : null),
    ].filter(Boolean);

    if (uploadStats?.fileName) {
      const records = typeof uploadStats.totalRecords === 'number'
        ? `${uploadStats.totalRecords.toLocaleString('th-TH')} รายการ`
        : '- รายการ';
      header.push(`**ข้อมูลนำเข้า:** ${uploadStats.fileName} (${records})`);
    }

    header.push('');
    header.push('---');
    header.push('');

    // Determine sections based on layout, depth, and toggles
    let sectionKeys = [...layoutConfig.sections];
    if (!includeRecommendations) {
      sectionKeys = sectionKeys.filter((s) => s !== 'recommendations' && s !== 'next_steps');
    }
    if (!includeRiskAssessment) {
      sectionKeys = sectionKeys.filter((s) => s !== 'risks');
    }
    if (depth === 'shallow') {
      // Keep only essentials
      sectionKeys = sectionKeys.filter((s) => ['executive_summary', 'kpi'].includes(s));
    } else if (depth === 'deep') {
      // Ensure detailed parts remain; keep all except appendix if not in layout
      // no-op here as default already includes details
    } else if (depth === 'comprehensive') {
      // Add next_steps if missing
      if (!sectionKeys.includes('next_steps')) sectionKeys.push('next_steps');
    }

    const context = {
      styleConfig,
      layoutConfig,
      styleKey: style,
      metrics,
      locationHighlights,
      directionSummary,
      peakHour,
      filterSummary,
      uploadStats,
      stats,
      chartData,
      includeCharts,
      tone,
      depth,
      language
    };

    const sections = sectionKeys
      .map((sectionKey) => this.renderReportSection(sectionKey, context))
      .filter(Boolean);

    return [...header, ...sections].join('\n').trim();
  }

  renderReportSection(sectionKey, context) {
    const { styleConfig, styleKey, metrics, locationHighlights, directionSummary, peakHour, filterSummary, uploadStats, stats, chartData, includeCharts, tone, language, depth } = context;
    const numberOrDash = (value, suffix = 'ครั้ง') =>
      typeof value === 'number' && !Number.isNaN(value) ? `${value.toLocaleString('th-TH')} ${suffix}` : `- ${suffix}`;

    switch (sectionKey) {
      case 'executive_summary': {
        const title = language === 'thai' ? '## บทสรุปผู้บริหาร' : '## Executive Summary';
        const intro = styleConfig.summaryIntro;
        const lines = [title, this.applyTone(intro, tone, language), ''];

        // Style-specific summary emphasis
        if (styleKey === 'business_concise') {
          lines.push(
            `- ปริมาณรวม ${numberOrDash(metrics.total, 'ครั้ง')}`,
            `- อัตราอนุมัติ ${metrics.successRateText} • ปฏิเสธ ${metrics.deniedRateText}`
          );
        } else if (styleKey === 'analytical') {
          lines.push(
            `- ปริมาณรวม ${numberOrDash(metrics.total, 'ครั้ง')}`,
            `- อัตราอนุมัติ ${metrics.successRateText} • ปฏิเสธ ${metrics.deniedRateText}`,
            `- ผู้ใช้ที่ไม่ซ้ำ ${numberOrDash(metrics.uniqueUsers, 'คน')}`
          );
          const drivers = [];
          if (peakHour) drivers.push(`ช่วงเวลาสูงสุด: ${peakHour}`);
          if (locationHighlights.length > 0) drivers.push(`พื้นที่นำ: ${locationHighlights[0].label} (${locationHighlights[0].valueText})`);
          if (directionSummary) drivers.push(`ทิศทางเข้า/ออก: ${directionSummary}`);
          if (drivers.length) {
            lines.push('', (language === 'thai' ? '**ตัวขับเคลื่อนหลัก:**' : '**Key drivers:**'));
            lines.push(...drivers.map(d => `- ${d}`));
          }
        } else if (styleKey === 'technical') {
          lines.push(
            `- ปริมาณรวม ${numberOrDash(metrics.total, 'ครั้ง')} • ผู้ใช้ ${numberOrDash(metrics.uniqueUsers, 'คน')}`,
            `- อัตราอนุมัติ ${metrics.successRateText} • ปฏิเสธ ${metrics.deniedRateText}`,
            '- วิธีคำนวณ: success/total, denied/total; คัดเลือก peak จาก hourlyData; top location จาก locationData'
          );
        } else if (styleKey === 'narrative') {
          const story = language === 'thai'
            ? `วันนี้ระบบมีการใช้งานรวม ${metrics.total?.toLocaleString('th-TH') || '-'} ครั้ง โดยอัตราอนุมัติ ${metrics.successRateText} และปฏิเสธ ${metrics.deniedRateText}${peakHour ? ` ช่วงคับคั่งคือ ${peakHour}` : ''}${locationHighlights[0] ? ` จุดที่ใช้งานมากคือ ${locationHighlights[0].label}` : ''}.`
            : 'Activity proceeded steadily with high approval and some denials.';
          lines.push(story);
        } else {
          // formal or default
          lines.push(
            `- ปริมาณการเข้าใช้งานรวม ${numberOrDash(metrics.total, 'ครั้ง')}`,
            `- อัตราอนุมัติ ${metrics.successRateText}`,
            `- การปฏิเสธ ${numberOrDash(metrics.denied, 'ครั้ง')} (${metrics.deniedRateText})`,
            `- ผู้ใช้ที่ไม่ซ้ำ ${numberOrDash(metrics.uniqueUsers, 'คน')}`
          );
        }

        if (peakHour && depth !== 'shallow') {
          lines.push(`- ช่วงเวลาที่มีการใช้งานสูงสุด: ${peakHour}`);
        }

        if (locationHighlights.length > 0) {
          const locText = depth === 'shallow'
            ? `- จุดใช้งานสูงสุด: ${locationHighlights[0].label}`
            : `- พื้นที่ที่ใช้บ่อยที่สุด: ${locationHighlights[0].label} (${locationHighlights[0].valueText})`;
          lines.push(locText);
        }

        // Tone-aware rewrite and ordering
        const toned = this.adjustSummaryLinesByTone(lines, tone, metrics, language);

        if (includeCharts) {
          toned.push('', '[CHART:ACCESS_BY_LOCATION]', '[CHART:SUCCESS_RATE]');
        }

        return toned.join('\n');
      }

      case 'scope': {
        const title = language === 'thai' ? '## ขอบเขตและข้อมูลที่ใช้' : '## Scope & Data Used';
        const lines = [
          title,
          this.applyTone(styleConfig.scopeIntro, tone, language),
          ''
        ];

        if (filterSummary.length > 0) {
          lines.push('**เงื่อนไขการคัดกรอง:**');
          lines.push(...filterSummary.map((item) => `- ${item}`));
        } else {
          lines.push('- ไม่มีการคัดกรองเพิ่มเติม ใช้ข้อมูลทั้งหมดที่มีอยู่');
        }

        if (uploadStats?.processingTime) {
          lines.push(`- เวลาประมวลผลไฟล์ล่าสุด: ${uploadStats.processingTime}`);
        }

        return lines.join('\n');
      }

      case 'kpi': {
        const title = language === 'thai' ? '## KPI / สถิติภาพรวม' : '## KPI / Overview Metrics';
        const lines = [
          title,
          this.applyTone(styleConfig.kpiIntro, tone, language),
          '',
          `- จำนวนการเข้าใช้งานทั้งหมด: ${numberOrDash(metrics.total)}`,
          `- การเข้าใช้งานสำเร็จ: ${numberOrDash(metrics.success)} (${metrics.successRateText})`,
          `- การเข้าใช้งานถูกปฏิเสธ: ${numberOrDash(metrics.denied)} (${metrics.deniedRateText})`,
          `- ผู้ใช้ที่ไม่ซ้ำ: ${numberOrDash(metrics.uniqueUsers, 'คน')}`
        ];

        if (directionSummary) {
          lines.push(`- สัดส่วนทิศทางการเข้า/ออก: ${directionSummary}`);
        }

        // Style/depth additions
        if (styleKey === 'analytical') {
          const avgPerUser = metrics.uniqueUsers ? (metrics.total / metrics.uniqueUsers).toFixed(2) : null;
          if (avgPerUser) lines.push(`- ค่าเฉลี่ยการเข้าใช้งานต่อผู้ใช้: ${avgPerUser} ครั้ง/คน`);
          const hourlyAvg = this.getHourlyAverage(chartData);
          if (hourlyAvg) lines.push(`- ค่าเฉลี่ยต่อชั่วโมง: ${hourlyAvg} ครั้ง/ชั่วโมง`);
        }
        if (styleKey === 'business_concise') {
          // keep tight: drop redundant item in shallow
          if (depth === 'shallow') {
            lines.splice(4, 1); // remove unique users line
          }
        }

        // Tone-aware KPI phrasing and order (e.g., urgent highlights denied first)
        const tonedKpi = this.adjustKpiLinesByTone(lines, tone, language);

        if (includeCharts) {
          tonedKpi.push('', '[CHART:ACCESS_BY_LOCATION]', '[CHART:SUCCESS_RATE]');
        }

        return tonedKpi.join('\n');
      }

      case 'findings': {
        const title = language === 'thai' ? '## ข้อค้นพบที่สำคัญ' : '## Key Findings';
        const lines = [
          title,
          this.applyTone(styleConfig.findingIntro, tone, language),
          ''
        ];

        const severity = this.classifySeverity(metrics.deniedRate);
        lines.push(
          metrics.successRate >= 0.95
            ? '- อัตราอนุมัติสูง (>95%) แสดงถึงการตั้งสิทธิ์เหมาะสม'
            : '- อัตราอนุมัติต่ำ (<95%) ควรตรวจสอบกลุ่มที่ถูกปฏิเสียบ่อย',
          severity === 'HIGH'
            ? (tone === 'urgent' ? '- [สูง] พบความเสี่ยงการปฏิเสธสูง ต้องดำเนินการทันที' : '- [สูง] อัตราปฏิเสธสูง ควรตรวจสอบเร่งด่วน')
            : (metrics.deniedRate > 0.1 ? '- [กลาง] ปฏิเสธเกิน 10% ควรหาสาเหตุ' : '- [ต่ำ] ปฏิเสธอยู่ในเกณฑ์ควบคุมได้')
        );

        if (locationHighlights.length > 0) {
          const limit = depth === 'shallow' ? 1 : locationHighlights.length;
          const topLocations = locationHighlights.slice(0, limit)
            .map((item, idx) => `${idx + 1}. ${item.label} (${item.valueText})`).join('\n');
          lines.push('', '**พื้นที่ที่ใช้งานสูงสุด:**', topLocations);
        }

        if (styleKey === 'analytical' && peakHour) {
          lines.push(`- ช่วงเวลาหนาแน่น: ${peakHour}`);
        }

        return lines.join('\n');
      }

      case 'risks': {
        const title = language === 'thai' ? '## ความเสี่ยงและผลกระทบ' : '## Risks & Impact';
        const lines = [
          title,
          this.applyTone(styleConfig.riskIntro, tone, language),
          ''
        ];

        const severity = this.classifySeverity(metrics.deniedRate);
        const sevText = severity === 'HIGH' ? 'สูง' : severity === 'MED' ? 'ปานกลาง' : 'ต่ำ';
        lines.push(`- ระดับความเสี่ยงโดยรวม: ${sevText}`);
        lines.push(
          metrics.deniedRate > 0.15
            ? '- ความเสี่ยงสิทธิ์เข้าถึง: ปฏิเสธ >15% อาจตั้งสิทธิ์ไม่เหมาะสม หรือมีความพยายามผิดปกติ'
            : '- ความเสี่ยงสิทธิ์เข้าถึง: อยู่ในเกณฑ์ควบคุมได้ แต่ควรติดตาม'
        );
        if (styleKey === 'technical') {
          lines.push('- สมมติฐานข้อมูล: ไม่มีข้อมูลช่วงเทียบเคียง, ใช้ threshold 10%/15% สำหรับ MED/HIGH');
        }

        if (peakHour) {
          lines.push(`- ความเสี่ยงจากการหนาแน่นของระบบในช่วง ${peakHour}`);
        }

        lines.push('- ผลกระทบที่อาจเกิดขึ้น: ระบบติดขัด, การร้องเรียนจากผู้ใช้, และช่องโหว่ด้านความปลอดภัย');

        return lines.join('\n');
      }

      case 'recommendations': {
        const title = language === 'thai' ? '## ข้อเสนอแนะ' : '## Recommendations';
        const lines = [
          title,
          this.applyTone(styleConfig.recommendationIntro, tone, language),
          '',
          ...(styleKey === 'business_concise' ? [
            '- ทบทวนสิทธิ์เข้าถึงรายไตรมาส',
            '- ตั้งแจ้งเตือนเมื่อปฏิเสธซ้ำที่จุดเดิม',
            '- สื่อสารการใช้บัตร/รหัสผ่านให้ถูกต้อง'
          ] : styleKey === 'analytical' ? [
            '- ตั้ง threshold การปฏิเสธ (เช่น >10%) และแจ้งเตือนอัตโนมัติ',
            '- วิเคราะห์ top-3 จุด/ช่วงเวลาที่มีปฏิเสธสูง พร้อม RCA รายสัปดาห์',
            '- ติดตาม KPI success/denied รายสัปดาห์ และทำ control chart'
          ] : styleKey === 'technical' ? [
            '- เพิ่มดัชนี/ดัด schema สำหรับคิวรีรายชั่วโมงและตามสถานที่',
            '- สร้าง job ตรวจจับ spike แบบ moving average + z-score',
            '- บันทึกเหตุผลการปฏิเสธแบบมาตรฐานสำหรับการวิเคราะห์ย้อนหลัง'
          ] : [
            '- กำหนดกระบวนการทบทวนสิทธิ์เข้าถึงของผู้ใช้งานตามรอบเวลา (เช่น รายไตรมาส)',
            '- ติดตั้งการแจ้งเตือนทันทีเมื่อพบการปฏิเสธซ้ำในพื้นที่เดียวกัน',
            '- ออกคู่มือการใช้งานและสร้าง Awareness ให้บุคลากรเรื่องการใช้บัตร/รหัสผ่านอย่างปลอดภัย'
          ])
        ];

        if (stats?.alerts?.length) {
          lines.push(`- จัดลำดับความสำคัญเหตุการณ์ ${stats.alerts.length} รายการที่ระบบตั้งข้อสังเกตไว้`);
        }

        return lines.join('\n');
      }

      case 'appendix': {
        const title = language === 'thai' ? '## ภาคผนวก' : '## Appendix';
        const lines = [
          title,
          this.applyTone(styleConfig.appendixIntro, tone, language),
          ''
        ];

        lines.push('- รายงานจัดทำโดยระบบ Access Log Analyzer');
        if (uploadStats?.fileName) {
          lines.push(`- ไฟล์ที่ใช้ล่าสุด: ${uploadStats.fileName}`);
        }
        if (uploadStats?.uploadTime) {
          lines.push(`- เวลาที่อัปโหลด: ${new Date(uploadStats.uploadTime).toLocaleString('th-TH')}`);
        }
        lines.push('- รูปแบบไฟล์ส่งออก: Markdown / HTML (พร้อมสำหรับการแปลงเป็น PDF)');

        return lines.join('\n');
      }

      case 'next_steps': {
        const title = language === 'thai' ? '## ขั้นตอนถัดไปที่แนะนำ' : '## Next Steps';
        return [
          title,
          '- ' + (language === 'thai' ? 'นัดประชุมสรุปรายงานกับผู้มีส่วนได้ส่วนเสียภายใน 1 สัปดาห์' : 'Schedule a review meeting within 1 week'),
          '- ' + (language === 'thai' ? 'จัดทำแผนดำเนินการแก้ไขสำหรับประเด็นที่พบและกำหนดผู้รับผิดชอบ' : 'Prepare an action plan and assign owners'),
          '- ' + (language === 'thai' ? 'ติดตามผลลัพธ์และอัปเดตรายงานในรอบถัดไป' : 'Track outcomes and update in next cycle')
        ].join('\n');
      }

      default:
        return '';
    }
  }

  // Apply tone to an intro/paragraph without changing semantics
  applyTone(text, tone = 'professional', language = 'thai') {
    if (!text) return '';
    if (language !== 'thai') return text; // For now, only Thai tone modifiers
    switch (tone) {
      case 'urgent':
        return `ด่วน: ${text}`;
      case 'casual':
        return `สรุปแบบสบายๆ: ${text}`;
      case 'conversational':
        return `สรุปให้เข้าใจง่าย: ${text}`;
      case 'formal':
        return `เรียนผู้เกี่ยวข้อง, ${text}`;
      default:
        return text;
    }
  }

  classifySeverity(deniedRate = 0) {
    if (typeof deniedRate !== 'number') return 'LOW';
    if (deniedRate > 0.15) return 'HIGH';
    if (deniedRate > 0.1) return 'MED';
    return 'LOW';
  }

  getHourlyAverage(chartData = {}) {
    if (!Array.isArray(chartData.hourlyData) || chartData.hourlyData.length === 0) return null;
    const total = chartData.hourlyData.reduce((s, it) => s + (it.count || 0), 0);
    const n = chartData.hourlyData.length;
    if (!n) return null;
    return Math.round(total / n);
  }

  // Reorder and rephrase summary bullets by tone
  adjustSummaryLinesByTone(lines, tone = 'professional', metrics = {}, language = 'thai') {
    if (!Array.isArray(lines)) return [];
    if (language !== 'thai') return lines; // Thai-focused phrasing for now

    // Separate header + intro from bullets
    const [title, intro, empty, ...bullets] = lines;
    let resultBullets = bullets.filter(Boolean);

    if (tone === 'urgent') {
      // Move denied bullet to first and emphasize
      const deniedIdx = resultBullets.findIndex(l => l.includes('ปฏิเสธ'));
      if (deniedIdx > -1) {
        const [denied] = resultBullets.splice(deniedIdx, 1);
        resultBullets.unshift(denied.replace('- ', '- [เร่งด่วน] '));
      }
      // Add immediate action at end
      resultBullets.push('- ดำเนินการแก้ไขเบื้องต้นทันที: ตรวจสอบจุดที่ปฏิเสธสูงสุด และปรับสิทธิ์');
    } else if (tone === 'casual' || tone === 'conversational') {
      // Simpler phrases
      resultBullets = resultBullets.map(line =>
        line
          .replace('ปริมาณการเข้าใช้งานรวม', 'มีการใช้งานรวม')
          .replace('อัตราอนุมัติ', 'ผ่าน')
          .replace('การเข้าใช้งานถูกปฏิเสธ', 'ปฏิเสธ')
          .replace('ผู้ใช้ที่ไม่ซ้ำ', 'ผู้ใช้ไม่ซ้ำ')
          .replace('พื้นที่ที่ใช้บ่อยที่สุด', 'จุดที่ฮิตสุด')
      );
    } else if (tone === 'formal') {
      resultBullets = resultBullets.map(line =>
        line
          .replace('ปริมาณการเข้าใช้งานรวม', 'จำนวนการเข้าใช้งานรวมทั้งสิ้น')
          .replace('ผู้ใช้ที่ไม่ซ้ำ', 'จำนวนผู้ใช้ที่ไม่ซ้ำ')
      );
    }

    return [title, intro, empty, ...resultBullets];
  }

  // Adjust KPI list for tone (ordering and phrasing)
  adjustKpiLinesByTone(lines, tone = 'professional', language = 'thai') {
    if (!Array.isArray(lines)) return [];
    if (language !== 'thai') return lines;
    const [title, intro, empty, ...bullets] = lines;
    let b = [...bullets];

    if (tone === 'urgent') {
      // Move denied KPI up
      const idxDenied = b.findIndex(x => x.includes('ถูกปฏิเสธ'));
      if (idxDenied > 0) {
        const [denied] = b.splice(idxDenied, 1);
        b.unshift(denied.replace('- ', '- [สำคัญ] '));
      }
    } else if (tone === 'casual' || tone === 'conversational') {
      // Simplify KPI wording
      b = b.map(x => x
        .replace('จำนวนการเข้าใช้งานทั้งหมด:', 'รวม:')
        .replace('การเข้าใช้งานสำเร็จ:', 'ผ่าน:')
        .replace('การเข้าใช้งานถูกปฏิเสธ:', 'ปฏิเสธ:')
        .replace('ผู้ใช้ที่ไม่ซ้ำ:', 'ผู้ใช้ไม่ซ้ำ:'));
    } else if (tone === 'formal') {
      b = b.map(x => x
        .replace('จำนวนการเข้าใช้งานทั้งหมด:', 'จำนวนการเข้าใช้งานรวมทั้งหมด:')
        .replace('การเข้าใช้งานสำเร็จ:', 'จำนวนการเข้าใช้งานที่สำเร็จ:')
        .replace('การเข้าใช้งานถูกปฏิเสธ:', 'จำนวนการเข้าใช้งานที่ถูกปฏิเสธ:'));
    }

    return [title, intro, empty, ...b];
  }

  getReportStyleConfig(style) {
    switch (style) {
      case 'formal':
        return {
          label: 'ทางการ',
          summaryIntro: 'รายงานฉบับนี้จัดทำขึ้นอย่างเป็นทางการเพื่อสรุปสถานะการเข้าใช้งานระบบและมาตรการที่เกี่ยวข้อง.',
          scopeIntro: 'ข้อมูลและผลการวิเคราะห์ในรายงานนี้อ้างอิงจากชุดข้อมูลล่าสุดที่ได้รับมอบหมายภายใต้ขอบเขตงานที่กำหนด.',
          kpiIntro: 'สถิติหลักที่ใช้ในการประเมินได้ถูกจัดเรียงตามมาตรฐานขององค์กรเพื่อให้ตรวจสอบได้ง่าย.',
          findingIntro: 'การวิเคราะห์ภาพรวมพบประเด็นที่ควรแจ้งให้ผู้บริหารทราบดังต่อไปนี้:',
          riskIntro: 'จากข้อมูลที่ได้รับ มีความเสี่ยงหลักที่ต้องพิจารณาและจัดการอย่างเหมาะสม:',
          recommendationIntro: 'เพื่อให้การบริหารจัดการมีประสิทธิภาพ ขอเสนอแนวทางดังต่อไปนี้:',
          appendixIntro: 'ภาคผนวกนี้สรุปรายละเอียดของข้อมูลและการอ้างอิงที่ใช้ในรายงาน.'
        };
      case 'analytical':
        return {
          label: 'เชิงวิเคราะห์',
          summaryIntro: 'รายงานฉบับนี้เน้นการวิเคราะห์เชิงลึกเพื่อหาความเชื่อมโยงและแนวโน้มที่สำคัญจากข้อมูลการเข้าใช้งาน.',
          scopeIntro: 'การวิเคราะห์ครอบคลุมข้อมูลเชิงเวลา พื้นที่ และประเภทผู้ใช้งาน เพื่อหาความผิดปกติหรือจุดที่ควรเพิ่มการควบคุม.',
          kpiIntro: 'ดัชนีชี้วัด (KPI) ถูกจัดลำดับตามผลกระทบต่อประสิทธิภาพและความปลอดภัยของระบบ.',
          findingIntro: 'จากข้อมูลที่ประมวลผล พบประเด็นเชิงลึกที่ควรติดตามดังนี้:',
          riskIntro: 'ประเมินความเสี่ยงจากมุมมองเชิงสถิติและแนวโน้ม พบประเด็นที่อาจกระทบต่อความต่อเนื่องของบริการ:',
          recommendationIntro: 'เพื่อรองรับการเติบโตและลดความเสี่ยง แนะนำให้ดำเนินการดังต่อไปนี้:',
          appendixIntro: 'รวบรวมสมมติฐานและแหล่งข้อมูลที่ใช้ในการวิเคราะห์ เพื่อความโปร่งใสและตรวจสอบย้อนกลับได้.'
        };
      default:
        return {
          label: 'เชิงธุรกิจ (กระชับ)',
          summaryIntro: 'รายงานฉบับนี้สรุปประเด็นเชิงธุรกิจที่จำเป็นต่อการตัดสินใจ โดยย่อยข้อมูลให้กระชับและเข้าใจง่าย.',
          scopeIntro: 'ชุดข้อมูลนี้ครอบคลุมเหตุการณ์ล่าสุดที่เกี่ยวข้องกับการเข้าออกพื้นที่ เพื่อรองรับการตัดสินใจเชิงบริหาร.',
          kpiIntro: 'KPI หลักต่อไปนี้ถูกคัดเลือกเพื่อสะท้อนภาพรวมประสิทธิภาพของระบบและประสบการณ์ผู้ใช้งาน.',
          findingIntro: 'ประเด็นที่ควรสื่อสารกับผู้บริหารและทีมปฏิบัติการมีดังนี้:',
          riskIntro: 'สรุปความเสี่ยงที่ควรจับตาและผลกระทบหากไม่ได้รับการแก้ไขทันท่วงที:',
          recommendationIntro: 'ข้อเสนอแนะเชิงบริหารเพื่อให้การจัดการเป็นไปอย่างคล่องตัวและลดความเสี่ยง:',
          appendixIntro: 'รายละเอียดประกอบและข้อมูลเพิ่มเติมสำหรับทีมที่ต้องการตรวจสอบย้อนหลัง.'
        };
    }
  }

  getReportLayoutConfig(layout) {
    switch (layout) {
      case 'summary':
        return {
          label: 'แบบย่อ',
          sections: ['executive_summary', 'kpi', 'findings', 'recommendations']
        };
      case 'executive':
        return {
          label: 'เชิงผู้บริหาร',
          sections: ['executive_summary', 'findings', 'risks', 'recommendations', 'next_steps']
        };
      default:
        return {
          label: 'มาตรฐาน',
          sections: ['executive_summary', 'scope', 'kpi', 'findings', 'risks', 'recommendations', 'appendix']
        };
    }
  }

  extractCoreMetrics(stats = {}) {
    const total = this.pickNumberFromStats(stats, ['totalAccess', 'totalLogs', 'total', 'totalRecords', 'count']);
    const success = this.pickNumberFromStats(stats, ['successfulAccess', 'success', 'allowed', 'allowCount']);
    const denied = this.pickNumberFromStats(stats, ['deniedAccess', 'denied', 'blocked', 'denyCount']);
    const uniqueUsers = this.pickNumberFromStats(stats, ['uniqueUsers', 'uniqueCards', 'uniqueCardHolders']);

    const successRate = total ? success / total : 0;
    const deniedRate = total ? denied / total : 0;

    return {
      total: total ?? 0,
      success: success ?? 0,
      denied: denied ?? 0,
      uniqueUsers: uniqueUsers ?? 0,
      successRate,
      deniedRate,
      successRateText: total ? `${(successRate * 100).toFixed(1)}%` : 'ไม่พบข้อมูล',
      deniedRateText: total ? `${(deniedRate * 100).toFixed(1)}%` : 'ไม่พบข้อมูล'
    };
  }

  pickNumberFromStats(stats, keys) {
    const sources = [stats, stats?.overview, stats?.summary];
    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      for (const key of keys) {
        const value = source[key];
        if (typeof value === 'number' && !Number.isNaN(value)) {
          return value;
        }
      }
    }
    return null;
  }

  summariseFilters(filters = {}) {
    if (!filters || typeof filters !== 'object') return [];
    return Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(', ')}`;
        }
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      });
  }

  getLocationHighlights(stats = {}, chartData = {}) {
    const candidates = [];

    if (Array.isArray(stats.topLocations)) {
      candidates.push(...stats.topLocations);
    }
    if (Array.isArray(chartData.locationData)) {
      candidates.push(...chartData.locationData);
    }

    const normalised = candidates
      .map((item) => {
        const label = item.name || item.location || item.label;
        const value = item.count || item.value || item.total;
        return label && typeof value === 'number'
          ? { label, value, valueText: `${value.toLocaleString('th-TH')} ครั้ง` }
          : null;
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    for (const item of normalised) {
      if (seen.has(item.label)) continue;
      seen.add(item.label);
      unique.push(item);
    }

    return unique.sort((a, b) => b.value - a.value).slice(0, 3);
  }

  getDirectionSummary(chartData = {}) {
    if (!Array.isArray(chartData.directionData) || chartData.directionData.length === 0) return '';
    const mapped = chartData.directionData.map((item) => ({
      label: (item.direction || item.name || item.label || '').toString().toUpperCase(),
      value: item.count || item.value || 0,
    })).filter((x) => x.label === 'IN' || x.label === 'OUT');
    const total = mapped.reduce((sum, it) => sum + (it.value || 0), 0);
    if (!total) return '';
    const parts = mapped
      .filter((it) => it.value > 0)
      .map((it) => {
        const percent = ((it.value / total) * 100).toFixed(1);
        const th = it.label === 'IN' ? 'เข้า' : 'ออก';
        return `${th}: ${percent}%`;
      });
    return parts.join(' / ');
  }

  getPeakHour(chartData = {}) {
    if (!Array.isArray(chartData.hourlyData) || chartData.hourlyData.length === 0) return '';
    const sorted = [...chartData.hourlyData].sort((a, b) => (b.count || 0) - (a.count || 0));
    const top = sorted[0];
    if (!top || !top.count) return '';
    // normalize label to HH:mm
    let hourLabel = top.hour || top.label || '';
    const m = hourLabel.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const h = String(parseInt(m[1], 10)).padStart(2, '0');
      const mm = m[2] || '00';
      hourLabel = `${h}:${mm}`;
    }
    return `${hourLabel} — ${top.count.toLocaleString('th-TH')} ครั้ง`;
  }

  getProviderInfo() {
    return {
      provider: this.provider,
      isAvailable: this.isAvailable,
      mcpServerName: this.mcpServerName,
      mcpToolName: this.mcpToolName,
      url: this.ollamaUrl, // Expose Ollama URL
      name: this.ollamaModel, // Expose current Ollama model name
      timeout: this.ollamaTimeout, // Expose Ollama timeout
      debug: this.debug, // Expose debug status
      availableModels: this.availableModels, // Expose available models
    };
  }

  setOllamaModel(modelName) {
    this.ollamaModel = modelName;
    // Reset availability to force re-check with new model
    this.isAvailable = null; 
    if (this.debug) {
      console.log(`[AI Service] Ollama model set to: ${modelName}`);
    }
  }
}

// Export เดียวเท่านั้น - ใช้ default export
const aiService = new AIService();
export default aiService;
