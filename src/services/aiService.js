// services/aiService.js - Simple Fixed Version
class AIService {
  constructor() {
    this.provider = import.meta.env.VITE_AI_PROVIDER || 'mock';
    this.debug = import.meta.env.VITE_DEBUG_AI === 'true';
    this.ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'qwen3:0.6b';
    this.timeout = 30000;
    this.isAvailable = null;
    
    if (this.debug) {
      console.log('[AI Service] Initialized with provider:', this.provider);
    }
  }

  async checkAvailability() {
    if (this.provider === 'mock') {
      return { available: true, provider: 'mock' };
    }

    if (this.provider === 'local') {
      try {
        const response = await fetch(`${this.ollamaUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const hasModel = data.models?.some(model => 
            model.name.includes(this.ollamaModel.split(':')[0])
          );
          return { available: hasModel, provider: 'ollama', models: data.models || [] };
        }
        return { available: false, error: `HTTP ${response.status}` };
      } catch (error) {
        return { available: false, error: error.message };
      }
    }

    return { available: false, error: 'Unknown provider' };
  }

  async generateResponse(userMessage, context = {}) {
    if (this.debug) {
      console.log('[AI Service] Generating response for:', userMessage.substring(0, 50) + '...');
    }

    try {
      if (this.provider === 'local') {
        return await this.generateOllamaResponse(userMessage, context);
      }
      
      // Fallback to mock for all other providers
      return this.getMockResponse(userMessage, context);
    } catch (error) {
      console.error('[AI Service] Error:', error);
      return this.getMockResponse(userMessage, context);
    }
  }

  async generateOllamaResponse(userMessage, context) {
    const prompt = this.buildPrompt(userMessage, context);
    
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 500
          }
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.processResponse(data.response);
    } catch (error) {
      console.warn('[AI Service] Ollama failed, using mock response');
      return this.getMockResponse(userMessage, context);
    }
  }

  buildPrompt(userMessage, context) {
    const { stats = {} } = context;
    
    return `คุณเป็น AI ที่เชี่ยวชาญวิเคราะห์ Access Log

ข้อมูลปัจจุบัน:
- การเข้าถึงทั้งหมด: ${stats.totalAccess || 0} ครั้ง
- การเข้าถึงสำเร็จ: ${stats.successfulAccess || 0} ครั้ง  
- การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess || 0} ครั้ง
- ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers || 0} คน

คำถาม: ${userMessage}

ตอบเป็นภาษาไทยและให้คำแนะนำที่เป็นประโยชน์:`;
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
      ollamaUrl: this.ollamaUrl,
      ollamaModel: this.ollamaModel
    };
  }
}

// Export เดียวเท่านั้น - ใช้ default export
const aiService = new AIService();
export default aiService;