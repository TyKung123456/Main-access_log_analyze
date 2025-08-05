// src/components/Chat/ChatPage.jsx - Friendly UI Version
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const ChatPage = () => {
  const {
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearMessages,
    clearError,
    testOllamaConnection,
    modelInfo,
    setOllamaModel // Destructure setOllamaModel
  } = useChat();

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isLoading]);

  // Check Ollama connection on mount and when modelInfo changes
  useEffect(() => {
    const checkConnection = async () => {
      if (!modelInfo.url) { // Wait for modelInfo.url to be available
        setConnectionStatus('checking');
        return;
      }
      try {
        const response = await fetch(`${modelInfo.url}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const data = await response.json();
          const hasModel = data.models?.some(model => model.name === modelInfo.name);
          setConnectionStatus(hasModel ? 'connected' : 'model-missing');
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        setConnectionStatus('error');
      }
    };

    checkConnection();
  }, [modelInfo.url, modelInfo.name]); // Depend on modelInfo.url and modelInfo.name

  // Clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Connection status indicator
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'green',
          icon: '✨',
          text: `เชื่อมต่อแล้ว`,
          detail: `กำลังใช้ ${modelInfo.name || 'N/A'}`,
          bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'model-missing':
        return {
          color: 'yellow',
          icon: '🔍',
          text: `ยังไม่พร้อม`,
          detail: `ต้องติดตั้ง ${modelInfo.name || 'โมเดล'}`,
          bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      case 'error':
        return {
          color: 'red',
          icon: '😔',
          text: 'ขัดข้อง',
          detail: 'ไม่สามารถเชื่อมต่อได้',
          bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      default:
        return {
          color: 'gray',
          icon: '🔄',
          text: 'กำลังตรวจสอบ',
          detail: 'กรุณารอสักครู่...',
          bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  // Quick setup commands
  const setupCommands = [
    {
      title: '🚀 เริ่มต้น Ollama',
      command: 'ollama serve',
      description: 'เปิดเซิร์ฟเวอร์ AI บนเครื่องคุณ',
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      title: '📋 ดูรายการโมเดล',
      command: 'ollama list',
      description: 'ตรวจสอบว่าติดตั้งโมเดลไหนไว้แล้วบ้าง',
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      title: '⬇️ ติดตั้งโมเดลหลัก',
      command: `ollama pull ${modelInfo.name || 'llama3.2:3b'}`, // Use modelInfo.name or a default
      description: `ดาวน์โหลดโมเดล AI ที่ใช้ในระบบนี้ (${modelInfo.name || 'llama3.2:3b'})`,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      title: '⚡ โมเดลเล็ก (แนะนำ)',
      command: 'ollama pull llama3.2:1b',
      description: 'โมเดลขนาดเล็ก ทำงานเร็ว เหมาะกับการทดสอบ',
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    }
  ];

  // Sample questions optimized for Thai context with emojis
  const sampleQuestions = [
    {
      text: 'วิเคราะห์สถิติการเข้าถึงรวมของระบบ',
      emoji: '📊',
      category: 'วิเคราะห์'
    },
    {
      text: 'ตรวจสอบพฤติกรรมการเข้าถึงที่ผิดปกติ',
      emoji: '🔍',
      category: 'ความปลอดภัย'
    },
    {
      text: 'แสดงแนวโน้มการเข้าถึงตามช่วงเวลา',
      emoji: '📈',
      category: 'แนวโน้ม'
    },
    {
      text: 'สร้างรายงานสรุปสำหรับผู้บริหาร',
      emoji: '📝',
      category: 'รายงาน'
    },
    {
      text: 'วิเคราะห์การใช้งานของแต่ละสถานที่',
      emoji: '🌍',
      category: 'ที่ตั้ง'
    },
    {
      text: 'ตรวจสอบการเข้าถึงนอกเวลาทำการ',
      emoji: '🌙',
      category: 'เวลา'
    }
  ];

  const handleModelChange = (event) => {
    setOllamaModel(event.target.value);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header with friendly design */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <p className="text-sm text-gray-600">
                  🏠 ทำงานบนเครื่องคุณ • 🔒 ข้อมูลปลอดภัย • ⚡ รวดเร็ว
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Model Selection Dropdown */}
            {modelInfo.availableModels && modelInfo.availableModels.length > 0 && (
              <div className="relative">
                <select
                  value={modelInfo.name || ''}
                  onChange={handleModelChange}
                  disabled={isLoading || connectionStatus === 'error'}
                  className="block w-full pl-3 pr-10 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {modelInfo.availableModels.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Friendly Connection Status */}
            <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} shadow-sm`}>
              <span className="mr-2 text-base">{statusInfo.icon}</span>
              <div className="text-left">
                <div className="font-semibold">{statusInfo.text}</div>
                <div className="text-xs opacity-75">{statusInfo.detail}</div>
              </div>
            </div>

            {/* Friendly Action Buttons */}
            <button
              onClick={testOllamaConnection}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 px-4 py-2 rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 shadow-sm"
            >
              <span>🔄</span>
              ทดสอบ
            </button>

            <button
              onClick={clearMessages}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 px-4 py-2 rounded-full border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 shadow-sm"
            >
              <span>🗑️</span>
              เคลียร์
            </button>
          </div>
        </div>
      </div>

      {/* Friendly Connection Error Banner */}
      {connectionStatus === 'error' && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😔</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  อุ๊ปส์! เชื่อมต่อไม่ได้
                </h3>
                <p className="text-red-700 mb-4">
                  ดูเหมือนว่า Ollama จะยังไม่พร้อมใช้งาน ลองตรวจสอบที่
                  <code className="bg-red-100 px-2 py-1 rounded mx-1 font-mono text-sm">
                    {modelInfo.url}
                  </code>
                  ดูนะ
                </p>

                {/* Friendly Setup Commands */}
                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-red-800 hover:text-red-900 font-medium mb-3">
                    <span>🛠️</span>
                    <span>วิธีแก้ไขง่ายๆ</span>
                    <span className="text-xs bg-red-100 px-2 py-1 rounded-full">คลิกดู</span>
                  </summary>
                  <div className="space-y-3">
                    {setupCommands.map((cmd, index) => (
                      <div key={index} className={`p-4 rounded-xl border ${cmd.color} shadow-sm`}>
                        <div className="font-semibold mb-2">{cmd.title}</div>
                        <code className="block bg-white/70 p-2 rounded-lg font-mono text-sm border border-white/50">
                          {cmd.command}
                        </code>
                        <div className="text-sm mt-2 opacity-80">{cmd.description}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friendly Model Missing Banner */}
      {connectionStatus === 'model-missing' && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔍</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  เกือบพร้อมแล้ว!
                </h3>
                <p className="text-yellow-700 mb-4">
                  เหลือแค่ติดตั้งโมเดล <strong>{modelInfo.name || 'โมเดล'}</strong> เท่านั้น
                </p>
                <div className="bg-white/70 p-4 rounded-xl border border-white/50">
                  <div className="text-sm font-medium text-yellow-800 mb-2">🚀 รันคำสั่งนี้:</div>
                  <code className="block bg-yellow-100 p-3 rounded-lg font-mono text-sm text-yellow-900">
                    ollama pull {modelInfo.name || 'llama3.2:3b'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friendly Regular Error Banner */}
      {error && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.length === 1 ? (
          // Friendly Welcome State
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-4xl">
              <div className="mb-8">
                {/* Animated AI Avatar */}
                <div className="w-24 h-24 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                  <span className="text-4xl">🤖</span>
                </div>

                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  สวัสดี! ฉันพร้อมช่วยคุณแล้ว ✨
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  ฉันเป็น AI Assistant ที่ทำงานบนเครื่องคุณ พร้อมช่วยวิเคราะห์ Access Log อย่างปลอดภัย
                </p>

                {/* Friendly Model Info Card */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-2xl">⚙️</span>
                    <h3 className="text-xl font-semibold text-gray-800">ข้อมูลระบบ</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <div className="text-2xl mb-1">🧠</div>
                      <div className="font-medium text-blue-900">โมเดล</div>
                      <div className="text-blue-700 text-xs">{modelInfo.name || 'N/A'}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <div className="text-2xl mb-1">🌐</div>
                      <div className="font-medium text-green-900">เซิร์ฟเวอร์</div>
                      <div className="text-green-700 text-xs font-mono">{modelInfo.url.replace('http://', '')}</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <div className="text-2xl mb-1">⏱️</div>
                      <div className="font-medium text-orange-900">Timeout</div>
                      <div className="text-orange-700 text-xs">{modelInfo.timeout / 1000} วินาที</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                      <div className="text-2xl mb-1">🔧</div>
                      <div className="font-medium text-purple-900">Debug</div>
                      <div className="text-purple-700 text-xs">{modelInfo.debug ? 'เปิด' : 'ปิด'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Friendly Sample Questions */}
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-2xl font-bold text-gray-800">ลองถามคำถามเหล่านี้ดู!</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(question.text)}
                      disabled={isLoading || connectionStatus === 'error'}
                      className="group text-left p-5 bg-white/70 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg transform hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                          {question.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mb-2">
                            {question.category}
                          </div>
                          <div className="font-medium text-gray-900 mb-2 leading-snug">
                            {question.text}
                          </div>
                          <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                            คลิกเพื่อส่งคำถาม →
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Friendly Quick Setup */}
              {connectionStatus === 'error' && (
                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-2xl">🚀</span>
                    <h4 className="text-xl font-bold text-gray-800">ติดตั้งง่ายๆ ใน 3 ขั้นตอน</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border text-center">
                      <div className="text-3xl mb-2">1️⃣</div>
                      <div className="font-medium mb-2">ติดตั้ง Ollama</div>
                      <code className="text-xs bg-gray-100 p-2 rounded block">curl -fsSL https://ollama.ai/install.sh | sh</code>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center">
                      <div className="text-3xl mb-2">2️⃣</div>
                      <div className="font-medium mb-2">เริ่มเซิร์ฟเวอร์</div>
                      <code className="text-xs bg-gray-100 p-2 rounded block">ollama serve</code>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center">
                      <div className="text-3xl mb-2">3️⃣</div>
                      <div className="font-medium mb-2">ติดตั้งโมเดล</div>
                      <code className="text-xs bg-gray-100 p-2 rounded block">ollama pull {modelInfo.name || 'llama3.2:3b'}</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Messages list
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLoading={false}
              />
            ))}

            {/* Loading message for AI response */}
            {isLoading && (
              <ChatMessage
                message={{
                  id: 'loading',
                  type: 'ai',
                  content: '',
                  timestamp: new Date()
                }}
                isLoading={true}
              />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        disabled={connectionStatus === 'error'}
      />

      {/* Friendly Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200/50 px-6 py-3">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>🤖</span>
            <span className="font-medium">Ollama AI</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center gap-1">
            <span>🔒</span>
            <span>ปลอดภัย 100%</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span>รวดเร็ว</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <a
            href="https://ollama.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span>📚</span>
            <span>เรียนรู้เพิ่ม</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
