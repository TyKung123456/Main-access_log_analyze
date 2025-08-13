// src/hooks/useChat.js - MCP Optimized
import { useState, useCallback, useEffect } from 'react';
import aiService from '../services/aiService'; // Import the aiService

export const useChat = (currentStats) => { // Accept currentStats as a parameter
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
    provider: '',
    serverName: '',
    toolName: '',
    url: '', // Ollama URL
    name: '', // Ollama Model Name
    timeout: 30000,
    debug: false,
    availableModels: [], // List of available models
  });
  const [fileContext, setFileContext] = useState(''); // New: State for file content context

  // Initialize model info from aiService
  const updateModelInfo = useCallback(async () => {
    await aiService.checkAvailability(); 
    const info = aiService.getProviderInfo();
    setModelInfo({
      provider: info.provider,
      serverName: info.mcpServerName,
      toolName: info.mcpToolName,
      url: info.url,
      name: info.name,
      timeout: info.timeout,
      debug: info.debug,
      availableModels: info.availableModels,
    });
  }, []);

  useEffect(() => {
    updateModelInfo();
  }, [updateModelInfo]);

  // Check AI service availability
  const checkAIServiceStatus = useCallback(async () => {
    const status = await aiService.checkAvailability();
    const info = aiService.getProviderInfo();
    setModelInfo({
      provider: info.provider,
      serverName: info.mcpServerName,
      toolName: info.mcpToolName,
      url: info.url,
      name: info.name,
      timeout: info.timeout,
      debug: info.debug,
      availableModels: info.availableModels,
    });
    return status;
  }, []);

  // Function to set Ollama model
  const setOllamaModel = useCallback(async (modelName) => {
    aiService.setOllamaModel(modelName);
    await updateModelInfo(); // Re-fetch model info and availability
  }, [updateModelInfo]);

  // Create system prompt for Thai Access Log context
  const createSystemPrompt = useCallback((userMessage, currentFileContext) => { // New: Accept currentFileContext
    const { totalAccess, successfulAccess, deniedAccess, uniqueUsers } = currentStats || {};

    let prompt = `คุณเป็น AI Assistant ผู้เชี่ยวชาญด้านการวิเคราะห์ Access Log ระบบเข้าออกอาคาร คุณมีความรู้เกี่ยวกับ:

📊 การวิเคราะห์ข้อมูล Access Log
🔐 ความปลอดภัยและการตรวจจับพฤติกรรมผิดปกติ  
📈 การสร้างรายงานและสถิติ
🏢 ระบบควบคุมการเข้าถึงอาคาร`;

    if (currentFileContext) { // New: Add file context to prompt
      prompt += `

ข้อมูลจากไฟล์ที่อัปโหลด:
\`\`\`
${currentFileContext}
\`\`\``;
    }

    prompt += `

ข้อมูลปัจจุบันในระบบ (จาก Access Log):
- การเข้าถึงทั้งหมด: ${totalAccess || 0} ครั้ง
- การเข้าถึงสำเร็จ: ${successfulAccess || 0} ครั้ง
- การเข้าถึงถูกปฏิเสธ: ${deniedAccess || 0} ครั้ง
- ผู้ใช้ที่ไม่ซ้ำ: ${uniqueUsers || 0} คน
- สถานที่หลัก: สำนักงานใหญ่ อาคาร 1 (นานาเหนือ) ชั้น 5 (ตัวอย่าง)
- ประเภทผู้ใช้: EMPLOYEE, VISITOR, AFFILIATE (ตัวอย่าง)
- ทิศทาง: IN (เข้า), OUT (ออก) (ตัวอย่าง)

กรุณาตอบเป็นภาษาไทยที่เข้าใจง่าย ให้ข้อมูลที่เป็นประโยชน์ และใช้ emoji เพื่อให้น่าสนใจ

คำถาม: ${userMessage}

คำตอบ:`;
    return prompt;
  }, [currentStats]); // Add currentStats to dependencies

  // Send message handler with AI service integration
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
      const aiStatus = await checkAIServiceStatus();
      
      if (!aiStatus.available) {
        throw new Error(`AI Service ไม่พร้อมใช้งาน: ${aiStatus.error}\n\nกรุณาตรวจสอบการตั้งค่า AI Provider ในไฟล์ .env`);
      }
      
      const systemPrompt = createSystemPrompt(userMessage.content, fileContext); // New: Pass fileContext
      const aiResponse = await aiService.generateResponse(systemPrompt, { stats: currentStats, fileContext }); // New: Pass fileContext as part of context object

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        model: modelInfo.provider === 'mcp' ? `${modelInfo.serverName}/${modelInfo.toolName}` : modelInfo.provider
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('❌ AI response error:', err);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `❌ เกิดข้อผิดพลาดในการติดต่อ AI Service: ${err.message}

💡 **คำแนะนำ:**
1. ตรวจสอบว่า AI Provider ถูกตั้งค่าถูกต้องในไฟล์ .env (เช่น VITE_AI_PROVIDER=mcp หรือ VITE_AI_PROVIDER=mock)
2. หากใช้ MCP ตรวจสอบว่า MCP Server ทำงานอยู่และมี Tool ที่ชื่อ '${modelInfo.toolName}' อยู่บน Server '${modelInfo.serverName}'
3. ตรวจสอบการเชื่อมต่อเครือข่าย`,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setError('เกิดข้อผิดพลาดในการติดต่อ AI Service');
    } finally {
      setIsLoading(false);
    }
  }, [modelInfo, checkAIServiceStatus, createSystemPrompt, currentStats, fileContext]); // New: Add fileContext to dependencies

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `สวัสดีครับ! ผมพร้อมช่วยวิเคราะห์ Access Log แล้ว 🤖

🔧 **ข้อมูลระบบ:**
- AI Provider: ${modelInfo.provider}
${modelInfo.provider === 'local' ? `- Ollama Model: ${modelInfo.name || 'N/A'}\n- Ollama URL: ${modelInfo.url || 'N/A'}\n- Available Models: ${modelInfo.availableModels.join(', ') || 'None'}` : ''}
${modelInfo.provider === 'mcp' ? `- MCP Server: ${modelInfo.serverName}\n- MCP Tool: ${modelInfo.toolName}` : ''}
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

  return {
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearMessages,
    clearError,
    testOllamaConnection: checkAIServiceStatus, // Expose checkAIServiceStatus as testOllamaConnection
    modelInfo, // Return the stateful modelInfo
    setOllamaModel, // Expose setOllamaModel
    setFileContext, // New: Expose setFileContext
  };
};
