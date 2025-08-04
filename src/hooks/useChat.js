// src/hooks/useChat.js - Ollama Optimized
import { useState, useCallback } from 'react';

export const useChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'สวัสดีครับ! ผมคือ AI Assistant สำหรับวิเคราะห์ Access Log \n\nผมทำงานด้วย Ollama Local Model และสามารถช่วยคุณได้ในเรื่อง:\n\n📊 วิเคราะห์แนวโน้มการเข้าถึง\n🔍 ตรวจสอบพฤติกรรมผิดปกติ  \n📋 สรุปสถิติและรายงาน\n❓ ตอบคำถามเกี่ยวกับข้อมูล\n\nมีอะไรให้ช่วยไหมครับ?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ollama configuration
  const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
  const ollamaTimeout = parseInt(import.meta.env.VITE_OLLAMA_TIMEOUT) || 30000;
  const maxRetries = parseInt(import.meta.env.VITE_OLLAMA_MAX_RETRIES) || 3;
  const debugMode = import.meta.env.VITE_DEBUG_AI === 'true';

  // Check Ollama availability
  const checkOllamaStatus = async () => {
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      
      if (!response.ok) {
        throw new Error(`Ollama server returned ${response.status}`);
      }
      
      const data = await response.json();
      const availableModels = data.models || [];
      const hasModel = availableModels.some(model => model.name === ollamaModel);
      
      if (debugMode) {
        console.log('🤖 Ollama Status:', {
          available: true,
          models: availableModels.map(m => m.name),
          targetModel: ollamaModel,
          hasTargetModel: hasModel
        });
      }
      
      return {
        available: true,
        hasModel,
        availableModels: availableModels.map(m => m.name)
      };
    } catch (error) {
      if (debugMode) {
        console.error('❌ Ollama not available:', error.message);
      }
      return {
        available: false,
        error: error.message
      };
    }
  };

  // Optimized Ollama API call with retry logic
  const callOllamaAPI = async (prompt, retryCount = 0) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ollamaTimeout);

    try {
      if (debugMode) {
        console.log(`🤖 Calling Ollama (attempt ${retryCount + 1}):`, {
          model: ollamaModel,
          promptLength: prompt.length,
          timeout: ollamaTimeout
        });
      }

      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            num_predict: 1000, // Maximum tokens to generate
            num_ctx: 4096,     // Context window size
            repeat_penalty: 1.1
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      if (debugMode) {
        console.log('✅ Ollama Response:', {
          responseLength: data.response?.length || 0,
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
          promptEvalCount: data.prompt_eval_count,
          evalCount: data.eval_count
        });
      }

      return data.response || 'ขออภัยครับ ไม่สามารถสร้างคำตอบได้';

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`คำขอหมดเวลา (${ollamaTimeout / 1000} วินาที)`);
      }
      
      // Retry logic
      if (retryCount < maxRetries && error.message.includes('fetch')) {
        console.warn(`🔄 Retry ${retryCount + 1}/${maxRetries} for Ollama call`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return callOllamaAPI(prompt, retryCount + 1);
      }
      
      throw error;
    }
  };

  // Create system prompt for Thai Access Log context
  const createSystemPrompt = (userMessage) => {
    return `คุณเป็น AI Assistant ผู้เชี่ยวชาญด้านการวิเคราะห์ Access Log ระบบเข้าออกอาคาร คุณมีความรู้เกี่ยวกับ:

📊 การวิเคราะห์ข้อมูล Access Log
🔐 ความปลอดภัยและการตรวจจับพฤติกรรมผิดปกติ  
📈 การสร้างรายงานและสถิติ
🏢 ระบบควบคุมการเข้าถึงอาคาร

ข้อมูลปัจจุบันในระบบ:
- ข้อมูลทั้งหมด: 143,898 รายการ
- สถานที่หลัก: สำนักงานใหญ่ อาคาร 1 (นานาเหนือ) ชั้น 5
- ประเภทผู้ใช้: EMPLOYEE, VISITOR, AFFILIATE
- ทิศทาง: IN (เข้า), OUT (ออก)

กรุณาตอบเป็นภาษาไทยที่เข้าใจง่าย ให้ข้อมูลที่เป็นประโยชน์ และใช้ emoji เพื่อให้น่าสนใจ

คำถาม: ${userMessage}

คำตอบ:`;
  };

  // Send message handler with Ollama integration
  const handleSendMessage = useCallback(async (messageContent) => {
    // Validate input
    if (!messageContent || typeof messageContent !== 'string') {
      setError('กรุณาใส่ข้อความที่ต้องการส่ง');
      return;
    }

    const trimmedMessage = messageContent.trim();
    if (!trimmedMessage) {
      setError('กรุณาใส่ข้อความที่ต้องการส่ง');
      return;
    }

    // Clear any previous errors
    setError(null);

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmedMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Check Ollama status first
      const ollamaStatus = await checkOllamaStatus();
      
      if (!ollamaStatus.available) {
        throw new Error(`ไม่สามารถเชื่อมต่อ Ollama ได้: ${ollamaStatus.error}\n\nกรุณาตรวจสอบว่า Ollama ทำงานอยู่ที่ ${ollamaUrl}`);
      }
      
      if (!ollamaStatus.hasModel) {
        throw new Error(`ไม่พบโมเดล "${ollamaModel}"\n\nโมเดลที่มีอยู่: ${ollamaStatus.availableModels.join(', ')}\n\nใช้คำสั่ง: ollama pull ${ollamaModel}`);
      }

      // Create system prompt
      const systemPrompt = createSystemPrompt(trimmedMessage);
      
      // Call Ollama API
      const aiResponse = await callOllamaAPI(systemPrompt);

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        model: ollamaModel
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('❌ Ollama response error:', error);
      
      // Add error message with helpful information
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `❌ เกิดข้อผิดพลาด: ${error.message}

🔧 วิธีแก้ไข:
1. ตรวจสอบว่า Ollama ทำงานอยู่: \`ollama serve\`
2. ตรวจสอบโมเดล: \`ollama list\`
3. ติดตั้งโมเดลถ้าจำเป็น: \`ollama pull ${ollamaModel}\`
4. ตรวจสอบ URL: ${ollamaUrl}

💡 หรือเปลี่ยนไปใช้ Mock AI ชั่วคราวในไฟล์ .env:
\`VITE_AI_PROVIDER=mock\``,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setError('เกิดข้อผิดพลาดในการติดต่อ Ollama');
    } finally {
      setIsLoading(false);
    }
  }, [ollamaUrl, ollamaModel, ollamaTimeout, maxRetries, debugMode]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `สวัสดีครับ! ผมพร้อมช่วยวิเคราะห์ Access Log แล้ว 🤖

🔧 **ข้อมูลระบบ:**
- โมเดล: ${ollamaModel}
- Ollama URL: ${ollamaUrl}
- Debug Mode: ${debugMode ? 'เปิด' : 'ปิด'}

มีอะไรให้ช่วยไหมครับ?`,
        timestamp: new Date()
      }
    ]);
    setError(null);
  }, [ollamaModel, ollamaUrl, debugMode]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Test Ollama connection
  const testOllamaConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await checkOllamaStatus();
      const testMessage = {
        id: Date.now(),
        type: 'ai',
        content: `🧪 **ผลการทดสอบ Ollama:**

📡 **การเชื่อมต่อ:** ${status.available ? '✅ สำเร็จ' : '❌ ล้มเหลว'}
🤖 **โมเดลเป้าหมาย:** ${ollamaModel}
🎯 **โมเดลพร้อมใช้:** ${status.hasModel ? '✅ พร้อม' : '❌ ไม่พบ'}

📋 **โมเดลที่มีในระบบ:**
${status.availableModels ? status.availableModels.map(model => `• ${model}`).join('\n') : 'ไม่มีข้อมูล'}

${!status.available ? `\n❗ **คำแนะนำ:**\n1. เริ่มต้น Ollama: \`ollama serve\`\n2. ตรวจสอบ URL: ${ollamaUrl}` : ''}
${status.available && !status.hasModel ? `\n❗ **ติดตั้งโมเดล:** \`ollama pull ${ollamaModel}\`` : ''}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, testMessage]);
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ollamaUrl, ollamaModel]);

  return {
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearMessages,
    clearError,
    testOllamaConnection,
    aiProvider: 'ollama',
    modelInfo: {
      name: ollamaModel,
      url: ollamaUrl,
      timeout: ollamaTimeout,
      debug: debugMode
    }
  };
};