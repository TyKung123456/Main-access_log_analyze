// src/components/Chat/ChatPage.jsx - Beautiful & User-Friendly UI
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  FileText,
  BarChart3,
  Clock,
  XCircle,
  Sparkles,
  TrendingUp,
  Database,
  Zap,
  ChevronDown,
  Settings,
  Shield,
  ArrowRight,
  Activity,
  Trash2,
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare,
  Server,
  Brain,
  Globe
} from 'lucide-react';
import { useLogData } from '../../hooks/useLogData';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import aiService from '../../services/aiService';

const ChatPage = () => {
  const { stats } = useLogData();

  const {
    messages,
    isLoading,
    error,
    handleSendMessage,
    clearMessages,
    clearError,
    testOllamaConnection,
    modelInfo,
    setOllamaModel,
    setFileContext
  } = useChat(stats);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isLoading]);

  // Check Ollama connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!modelInfo.url) {
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
  }, [modelInfo.url, modelInfo.name]);

  // Clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Enhanced connection status
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'เชื่อมต่อแล้ว',
          detail: `โมเดล ${modelInfo.name || 'N/A'}`,
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          dotColor: 'bg-emerald-400'
        };
      case 'model-missing':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'ต้องติดตั้งโมเดล',
          detail: `ยังไม่มี ${modelInfo.name || 'โมเดล'}`,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          dotColor: 'bg-amber-400'
        };
      case 'error':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'เชื่อมต่อไม่ได้',
          detail: 'ตรวจสอบ Ollama',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          dotColor: 'bg-red-400'
        };
      default:
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'กำลังตรวจสอบ',
          detail: 'กรุณารอ...',
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-600',
          borderColor: 'border-slate-200',
          dotColor: 'bg-slate-400'
        };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  // Setup commands for troubleshooting
  const setupCommands = [
    {
      title: 'เริ่มต้น Ollama',
      command: 'ollama serve',
      description: 'เปิดเซิร์ฟเวอร์ AI',
      icon: <Server className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'ดูรายการโมเดล',
      command: 'ollama list',
      description: 'ตรวจสอบโมเดลที่มี',
      icon: <Database className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'ติดตั้งโมเดลหลัก',
      command: `ollama pull ${modelInfo.name || 'llama3.2:3b'}`,
      description: `ดาวน์โหลด ${modelInfo.name || 'llama3.2:3b'}`,
      icon: <Brain className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'โมเดลเล็ก (แนะนำ)',
      command: 'ollama pull llama3.2:1b',
      description: 'โมเดลขนาดเล็ก เร็วกว่า',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-orange-500 to-yellow-500'
    }
  ];

  // Enhanced sample questions with better visuals
  const sampleQuestions = [
    {
      text: 'วิเคราะห์สถิติการเข้าถึงรวมของระบบ',
      icon: <BarChart3 className="w-5 h-5" />,
      category: 'วิเคราะห์ข้อมูล',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50'
    },
    {
      text: 'ตรวจสอบพฤติกรรมการเข้าถึงที่ผิดปกติ',
      icon: <Shield className="w-5 h-5" />,
      category: 'ความปลอดภัย',
      color: 'from-red-500 to-pink-600',
      bgColor: 'bg-red-50'
    },
    {
      text: 'แสดงแนวโน้มการเข้าถึงตามช่วงเวลา',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'แนวโน้ม',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50'
    },
    {
      text: 'สร้างรายงานสรุปสำหรับผู้บริหาร',
      icon: <FileText className="w-5 h-5" />,
      category: 'รายงาน',
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50'
    },
    {
      text: 'วิเคราะห์การใช้งานของแต่ละสถานที่',
      icon: <Globe className="w-5 h-5" />,
      category: 'ที่ตั้ง',
      color: 'from-cyan-500 to-teal-600',
      bgColor: 'bg-cyan-50'
    },
    {
      text: 'ตรวจสอบการเข้าถึงนอกเวลาทำการ',
      icon: <Clock className="w-5 h-5" />,
      category: 'เวลาทำงาน',
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const handleModelChange = (event) => {
    setOllamaModel(event.target.value);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      clearError();
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploadingFile(true);
    try {
      const response = await aiService.uploadFileForAI(selectedFile);
      if (response.success) {
        setFileContext(response.fileContent);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        handleSendMessage(`ฉันได้อัปโหลดไฟล์ชื่อ "${selectedFile.name}" เรียบร้อยแล้ว คุณสามารถถามคำถามเกี่ยวกับข้อมูลในไฟล์นี้ได้เลย`);
      } else {
        clearError(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${response.message}`);
      }
    } catch (err) {
      clearError(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Enhanced send message with file support
  const handleEnhancedSendMessage = (message) => {
    if (selectedFile && !isUploadingFile) {
      handleFileUpload();
    } else {
      handleSendMessage(message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Modern Header */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-lg">
        <div className="px-6 py-4">
          {/* Brand Section */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              {/* Enhanced Brand Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 ${statusInfo.dotColor} rounded-full border-2 border-white shadow-md animate-pulse`}></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    AI Assistant
                  </h1>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    <span>ปลอดภัย</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <Zap className="w-3 h-3" />
                    <span>รวดเร็ว</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <Activity className="w-3 h-3" />
                    <span>ออฟไลน์</span>
                  </p>
                </div>
              </div>

              {/* Enhanced Status Badge */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} shadow-md`}>
                {statusInfo.icon}
                <div>
                  <div className="font-semibold text-sm">{statusInfo.text}</div>
                  <div className="text-xs opacity-80">{statusInfo.detail}</div>
                </div>
              </div>
            </div>

            {/* Enhanced Control Panel */}
            <div className="flex items-center gap-3">
              {/* Model Selector */}
              {modelInfo.availableModels && modelInfo.availableModels.length > 0 && (
                <div className="relative">
                  <select
                    value={modelInfo.name || ''}
                    onChange={handleModelChange}
                    disabled={isLoading || connectionStatus === 'error' || isUploadingFile}
                    className="appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modelInfo.availableModels.map((modelName) => (
                      <option key={modelName} value={modelName}>
                        {modelName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={testOllamaConnection}
                disabled={isLoading || isUploadingFile}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">ทดสอบ</span>
              </button>

              <button
                onClick={clearMessages}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-red-50 hover:border-red-300 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">เคลียร์</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Error States */}
      {connectionStatus === 'error' && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-3xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-2xl">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  ไม่สามารถเชื่อมต่อได้
                </h3>
                <p className="text-red-700 mb-4">
                  ตรวจสอบว่า Ollama Server ทำงานที่
                  <code className="bg-red-100 px-2 py-1 rounded mx-1 font-mono text-sm">
                    {modelInfo.url}
                  </code>
                </p>

                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-red-800 hover:text-red-900 font-semibold mb-4">
                    <Settings className="w-5 h-5" />
                    <span>วิธีแก้ไข</span>
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {setupCommands.map((cmd, index) => (
                      <div key={index} className="bg-white/80 p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${cmd.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                            {cmd.icon}
                          </div>
                          <div className="font-semibold text-slate-800">{cmd.title}</div>
                        </div>
                        <code className="block bg-slate-900 text-green-400 p-3 rounded-xl font-mono text-sm border overflow-x-auto">
                          {cmd.command}
                        </code>
                        <div className="text-sm text-slate-600 mt-2">{cmd.description}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'model-missing' && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-800 mb-2">
                  เกือบพร้อมแล้ว!
                </h3>
                <p className="text-amber-700 mb-4">
                  เหลือแค่ติดตั้งโมเดล <strong>{modelInfo.name || 'โมเดล'}</strong> เท่านั้น
                </p>
                <div className="bg-white/80 p-4 rounded-2xl border border-amber-100">
                  <div className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    รันคำสั่งนี้:
                  </div>
                  <code className="block bg-slate-900 text-green-400 p-3 rounded-xl font-mono text-sm">
                    ollama pull {modelInfo.name || 'llama3.2:3b'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
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
          // Enhanced Welcome Screen
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-6xl">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
                    <MessageSquare className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>

                <h2 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
                  ยินดีต้อนรับสู่ AI Assistant
                </h2>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                  ผู้ช่วย AI ที่ทำงานบนเครื่องคุณ พร้อมช่วยวิเคราะห์ข้อมูลอย่างปลอดภัยและเป็นส่วนตัว
                </p>

                {/* Enhanced System Info Cards */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 mb-12 border border-slate-200 shadow-xl">
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <Settings className="w-6 h-6 text-slate-600" />
                    <h3 className="text-2xl font-bold text-slate-800">ข้อมูลระบบ</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 hover:shadow-lg transition-all">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-slate-800 mb-1">โมเดล AI</div>
                      <div className="text-sm text-slate-600 font-mono bg-blue-100 px-2 py-1 rounded">{modelInfo.name || 'ไม่ระบุ'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100 hover:shadow-lg transition-all">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                        <Server className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-slate-800 mb-1">เซิร์ฟเวอร์</div>
                      <div className="text-sm text-slate-600 font-mono bg-green-100 px-2 py-1 rounded">{(modelInfo.url || '').replace('http://', '') || 'ไม่ระบุ'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-100 hover:shadow-lg transition-all">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-slate-800 mb-1">Timeout</div>
                      <div className="text-sm text-slate-600 bg-orange-100 px-2 py-1 rounded">{(modelInfo.timeout || 30000) / 1000} วินาที</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-100 hover:shadow-lg transition-all">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-md">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-slate-800 mb-1">Debug</div>
                      <div className="text-sm text-slate-600 bg-purple-100 px-2 py-1 rounded">{modelInfo.debug ? 'เปิด' : 'ปิด'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Sample Questions */}
              <div className="space-y-8">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Sparkles className="w-7 h-7 text-indigo-600" />
                  <h3 className="text-3xl font-bold text-slate-800">ลองถามคำถามเหล่านี้ดู!</h3>
                  <Sparkles className="w-7 h-7 text-indigo-600" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(question.text)}
                      disabled={isLoading || connectionStatus === 'error'}
                      className="group text-left p-6 bg-white/90 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl transform hover:-translate-y-3 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 bg-gradient-to-r ${question.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110`}>
                            {question.icon}
                          </div>
                          <div className="flex-1">
                            <div className={`text-xs font-bold text-slate-600 ${question.bgColor} px-3 py-1.5 rounded-full inline-block mb-2`}>
                              {question.category}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 mb-3 leading-snug group-hover:text-indigo-700 transition-colors text-lg">
                            {question.text}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 group-hover:text-indigo-600 transition-colors font-medium">
                            <span>คลิกเพื่อส่งคำถาม</span>
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Quick Setup for Error State */}
              {connectionStatus === 'error' && (
                <div className="mt-12 p-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-3xl border border-slate-200 shadow-xl">
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <Settings className="w-7 h-7 text-slate-600" />
                    <h4 className="text-3xl font-bold text-slate-800">ติดตั้งง่ายๆ ใน 4 ขั้นตอน</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {setupCommands.map((cmd, index) => (
                      <div key={index} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all text-center group">
                        <div className={`w-16 h-16 bg-gradient-to-r ${cmd.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110`}>
                          {cmd.icon}
                        </div>
                        <div className="font-bold text-slate-800 mb-3 text-lg">{cmd.title}</div>
                        <code className="text-xs bg-slate-900 text-green-400 p-3 rounded-xl block border font-mono overflow-x-auto mb-3">
                          {cmd.command}
                        </code>
                        <div className="text-sm text-slate-600">{cmd.description}</div>
                      </div>
                    ))}
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

      {/* Enhanced Chat Input with File Upload */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/60 px-6 py-4 shadow-lg">
        {/* File Upload Indicator */}
        {selectedFile && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700 truncate">
                  📎 {selectedFile.name}
                </div>
                <div className="text-xs text-slate-500">
                  ขนาด: {(selectedFile.size / 1024).toFixed(1)} KB • พร้อมอัปโหลด
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 rounded-xl hover:bg-red-100 transition-colors group"
                title="ลบไฟล์ที่เลือก"
              >
                <XCircle className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>
        )}

        {/* Chat Input with File Controls */}
        <div className="flex items-end gap-3">
          {/* File Upload Button */}
          <label htmlFor="file-upload-ai" className="cursor-pointer group">
            <div className="p-3 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-blue-100 hover:to-indigo-100 border border-slate-300 hover:border-blue-300 rounded-2xl transition-all shadow-sm hover:shadow-md group-hover:scale-105">
              <Upload className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" />
            </div>
            <input
              id="file-upload-ai"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLoading || isUploadingFile}
              className="hidden"
              accept=".csv,.xlsx,.xls,.txt"
            />
          </label>

          {/* Enhanced Chat Input */}
          <div className="flex-1">
            <ChatInput
              onSendMessage={handleEnhancedSendMessage}
              isLoading={isLoading || isUploadingFile}
              disabled={connectionStatus === 'error'}
              placeholder={
                selectedFile
                  ? `พิมพ์คำถามเกี่ยวกับไฟล์ ${selectedFile.name}...`
                  : "พิมพ์คำถามของคุณที่นี่..."
              }
            />
          </div>

          {/* Upload File Button (when file is selected) */}
          {selectedFile && (
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || isLoading || isUploadingFile}
              className="p-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
              title="อัปโหลดไฟล์"
            >
              {isUploadingFile ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </button>
          )}
        </div>

        {/* Enhanced Tips */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span>💡 ลองพิมพ์ "ช่วย" เพื่อดูคำสั่งทั้งหมด หรือ "สถิติ" เพื่อดูข้อมูลภาพรวม</span>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-t border-slate-200/60 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <span>Ollama AI</span>
          </div>

          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <Shield className="w-4 h-4" />
            <span>ปลอดภัย 100%</span>
          </div>

          <div className="flex items-center gap-2 text-blue-600 font-medium">
            <Zap className="w-4 h-4" />
            <span>ประมวลผลเร็ว</span>
          </div>

          <div className="flex items-center gap-2 text-purple-600 font-medium">
            <Database className="w-4 h-4" />
            <span>ทำงานออฟไลน์</span>
          </div>

          <a
            href="https://ollama.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors font-medium hover:underline"
          >
            <Info className="w-4 h-4" />
            <span>เรียนรู้เพิ่ม</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;