// src/hooks/useChat.js - Ollama Optimized
import { useState, useCallback, useEffect } from 'react';
import aiService from '../services/aiService'; // Import the aiService

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
  const [modelInfo, setModelInfo] = useState({
    name: '',
    url: '',
    timeout: 30000,
    debug: false,
    availableModels: []
  });

  // Initialize model info from aiService
  useEffect(() => {
    const updateModelInfo = async () => {
      const info = aiService.getProviderInfo();
      // Ensure checkAvailability has been run to populate availableModels and ollamaModel
      await aiService.checkAvailability(); 
      const updatedInfo = aiService.getProviderInfo();
      setModelInfo({
        name: updatedInfo.ollamaModel || 'N/A',
        url: updatedInfo.ollamaUrl,
        timeout: aiService.timeout,
        debug: aiService.debug,
        availableModels: updatedInfo.availableModels.map(m => m.name)
      });
    };
    updateModelInfo();
  }, []);

  // Check Ollama availability
  const checkOllamaStatus = useCallback(async () => {
    const status = await aiService.checkAvailability();
    const info = aiService.getProviderInfo();
    setModelInfo({
      name: info.ollamaModel || 'N/A',
      url: info.ollamaUrl,
      timeout: aiService.timeout,
      debug: aiService.debug,
      availableModels: info.availableModels.map(m => m.name)
    });
    return status;
  }, []);

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
    if (!messageContent || typeof messageContent !== 'string' || !messageContent.trim()) {
      setError('กรุณาใส่ข้อความที่ต้องการส่ง');
      return;
    }

    setError(null);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ollamaStatus = await checkOllamaStatus();
      
      if (!ollamaStatus.available) {
        throw new Error(`ไม่สามารถเชื่อมต่อ Ollama ได้: ${ollamaStatus.error}\n\nกรุณาตรวจสอบว่า Ollama ทำงานอยู่ที่ ${modelInfo.url}`);
      }
      
      if (!modelInfo.name) {
        throw new Error(`ไม่พบโมเดลที่เลือก\n\nกรุณาเลือกโมเดลจากรายการที่มีอยู่`);
      }

      if (!ollamaStatus.models.some(m => m.name === modelInfo.name)) {
        throw new Error(`ไม่พบโมเดล "${modelInfo.name}"\n\nโมเดลที่มีอยู่: ${ollamaStatus.models.map(m => m.name).join(', ')}\n\nใช้คำสั่ง: ollama pull ${modelInfo.name}`);
      }

      const systemPrompt = createSystemPrompt(userMessage.content);
      const aiResponse = await aiService.generateResponse(systemPrompt);

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        model: modelInfo.name
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('❌ AI response error:', err);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `❌ เกิดข้อผิดพลาด: ${err.message}

🔧 วิธีแก้ไข:
1. ตรวจสอบว่า Ollama ทำงานอยู่: \`ollama serve\`
2. ตรวจสอบโมเดล: \`ollama list\`
3. ติดตั้งโมเดลถ้าจำเป็น: \`ollama pull ${modelInfo.name}\`
4. ตรวจสอบ URL: ${modelInfo.url}

💡 หรือเปลี่ยนไปใช้ Mock AI ชั่วคราวในไฟล์ .env:
\`VITE_AI_PROVIDER=mock\``,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setError('เกิดข้อผิดพลาดในการติดต่อ AI Service');
    } finally {
      setIsLoading(false);
    }
  }, [modelInfo]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `สวัสดีครับ! ผมพร้อมช่วยวิเคราะห์ Access Log แล้ว 🤖

🔧 **ข้อมูลระบบ:**
- โมเดล: ${modelInfo.name}
- Ollama URL: ${modelInfo.url}
- Debug Mode: ${modelInfo.debug ? 'เปิด' : 'ปิด'}

มีอะไรให้ช่วยไหมครับ?`,
        timestamp: new Date()
      }
    ]);
    setError(null);
  }, [modelInfo]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Test Ollama connection
  const testOllamaConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await checkOllamaStatus();
      const info = aiService.getProviderInfo(); // Get latest info after check
      const testMessage = {
        id: Date.now(),
        type: 'ai',
        content: `🧪 **ผลการทดสอบ Ollama:**

📡 **การเชื่อมต่อ:** ${status.available ? '✅ สำเร็จ' : '❌ ล้มเหลว'}
🤖 **โมเดลเป้าหมาย:** ${info.ollamaModel || 'ยังไม่ได้เลือก'}
🎯 **โมเดลพร้อมใช้:** ${info.ollamaModel && info.availableModels.some(m => m.name === info.ollamaModel) ? '✅ พร้อม' : '❌ ไม่พบ'}

📋 **โมเดลที่มีในระบบ:**
${info.availableModels.length > 0 ? info.availableModels.map(model => `• ${model.name}`).join('\n') : 'ไม่มีข้อมูล'}

${!status.available ? `\n❗ **คำแนะนำ:**\n1. เริ่มต้น Ollama: \`ollama serve\`\n2. ตรวจสอบ URL: ${info.ollamaUrl}` : ''}
${status.available && info.ollamaModel && !info.availableModels.some(m => m.name === info.ollamaModel) ? `\n❗ **ติดตั้งโมเดล:** \`ollama pull ${info.ollamaModel}\`` : ''}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, testMessage]);
    } catch (err) {
      console.error('Connection test failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkOllamaStatus]);

  // Function to set the Ollama model
  const setOllamaModel = useCallback(async (modelName) => {
    const success = aiService.setOllamaModel(modelName);
    if (success) {
      await checkOllamaStatus(); // Re-check status to update modelInfo
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: `✅ เปลี่ยนโมเดลเป็น **${modelName}** เรียบร้อยแล้ว`,
        timestamp: new Date()
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: `❌ ไม่สามารถเปลี่ยนโมเดลเป็น **${modelName}** ได้`,
        timestamp: new Date(),
        isError: true
      }]);
    }
  }, [checkOllamaStatus]);

  return {
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearMessages,
    clearError,
    testOllamaConnection,
    setOllamaModel, // Expose the new function
    aiProvider: 'ollama',
    modelInfo // Return the stateful modelInfo
  };
};
