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
