// src/App.jsx - Updated with Simple Design (Fixed)
import React, { useState, useEffect } from 'react';
import aiService from './services/aiService.js';
import Header from './components/Layout/Header.jsx';
import NavigationTabs from './components/Layout/NavigationTabs.jsx';
import UploadPage from './components/Upload/UploadPage.jsx';
import DashboardPage from './components/Dashboard/DashboardPage.jsx';
import ChatPage from './components/Chat/ChatPage.jsx';
// SecurityDashboard removed - not using anymore
import SecurityAlerts from './components/Security/SecurityAlerts.jsx';
import { useLogData } from './hooks/useLogData.js';
import { useFilters } from './hooks/useFilters.js';
import { useChat } from './hooks/useChat.js';
import { useUpload } from './hooks/useUpload.js';

const AccessLogAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    ai: 'checking',
    database: 'checking',
    upload: 'checking'
  });

  // Custom hooks
  const { logData, filteredData, stats, chartData, refreshData } = useLogData();
  const { filters, handleFilterChange } = useFilters(logData);
  const { chatMessages, currentMessage, setCurrentMessage, handleSendMessage, isAnalyzing } = useChat(stats);
  const {
    isUploading,
    uploadProgress,
    uploadResult,
    uploadError,
    handleFileUpload
  } = useUpload();

  // Additional state
  const [uploadStats, setUploadStats] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  // Enhanced upload properties
  const canCancel = false;
  const isCompleted = !isUploading && (uploadResult !== null || uploadError !== null);
  const hasErrors = uploadError !== null;
  const hasWarnings = uploadResult?.warnings?.length > 0;
  const uploadSuccessRate = uploadResult?.statistics
    ? ((uploadResult.statistics.validRows / uploadResult.statistics.totalRows) * 100).toFixed(1)
    : null;

  // System health check
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        setIsLoading(true);

        // Check AI Service
        try {
          const aiStatus = await aiService.checkAvailability();
          setSystemStatus(prev => ({ ...prev, ai: 'connected' }));
          console.log('✅ AI Service Status:', aiStatus);
        } catch (aiError) {
          setSystemStatus(prev => ({ ...prev, ai: 'disconnected' }));
          console.warn('⚠️ AI Service unavailable:', aiError);
        }

        // Check Database connectivity
        try {
          const response = await fetch('/api/health');
          if (response.ok) {
            setSystemStatus(prev => ({ ...prev, database: 'connected' }));
          } else {
            throw new Error(`Database health check failed: ${response.status}`);
          }
        } catch (dbError) {
          setSystemStatus(prev => ({ ...prev, database: 'disconnected' }));
          console.warn('⚠️ Database connectivity issue:', dbError.message);
        }

        // Check Upload service
        try {
          const response = await fetch('/api/upload/stats');
          if (response.ok) {
            setSystemStatus(prev => ({ ...prev, upload: 'connected' }));
          } else if (response.status === 404) {
            const altResponse = await fetch('/api/logs');
            if (altResponse.ok) {
              setSystemStatus(prev => ({ ...prev, upload: 'connected' }));
            } else {
              throw new Error('Upload service endpoints not found');
            }
          } else {
            throw new Error(`Upload service check failed: ${response.status}`);
          }
        } catch (uploadError) {
          setSystemStatus(prev => ({ ...prev, upload: 'disconnected' }));
          console.warn('⚠️ Upload service issue:', uploadError.message);

          if (process.env.NODE_ENV === 'development') {
            console.info('💡 Development mode: Upload service will be available when backend starts');
          }
        }

        const connectedServices = Object.values(systemStatus).filter(status => status === 'connected').length;
        if (connectedServices === 0 && process.env.NODE_ENV !== 'development') {
          setError('ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่าย');
        } else {
          setError(null);
        }

      } catch (error) {
        console.error('❌ System health check failed:', error);
        if (process.env.NODE_ENV === 'production') {
          setError('ระบบบางส่วนไม่พร้อมใช้งาน - กรุณาติดต่อผู้ดูแลระบบ');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSystemHealth();

    let healthCheckInterval;
    if (process.env.NODE_ENV === 'production') {
      healthCheckInterval = setInterval(checkSystemHealth, 5 * 60 * 1000);
    }

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, []);

  // Enhanced upload success handler
  useEffect(() => {
    if (uploadResult && uploadResult.success) {
      const stats = {
        fileName: uploadResult.fileName || 'Unknown',
        fileSize: uploadResult.fileSize || 0,
        totalRecords: uploadResult.recordCount || 0,
        validRecords: uploadResult.recordCount || 0,
        insertedRecords: uploadResult.recordCount || 0,
        processingTime: uploadResult.processingTime || 'N/A',
        success: true,
        uploadTime: new Date().toISOString()
      };
      setUploadStats(stats);

      localStorage.setItem('lastUploadStats', JSON.stringify(stats));

      setTimeout(() => {
        refreshData();
        console.log('🔄 Refreshing data after successful upload');
      }, 1000);
    }
  }, [uploadResult, refreshData]);

  // Error handlers
  const handleError = (error, errorInfo) => {
    console.error('Application Error:', error, errorInfo);
    setError('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
  };

  const clearError = () => {
    setError(null);
  };

  // Enhanced export report
  const exportReport = async () => {
    try {
      setIsLoading(true);

      const systemInfo = `สถานะระบบ:
- AI Service: ${systemStatus.ai === 'connected' ? '✅ พร้อมใช้งาน' : '❌ ไม่พร้อมใช้งาน'}
- Database: ${systemStatus.database === 'connected' ? '✅ เชื่อมต่อแล้ว' : '❌ ไม่สามารถเชื่อมต่อ'}
- Upload Service: ${systemStatus.upload === 'connected' ? '✅ พร้อมใช้งาน' : '❌ ไม่พร้อมใช้งาน'}`;

      const uploadInfo = uploadStats ? `
📤 ข้อมูลการอัปโหลดล่าสุด:
- ไฟล์: ${uploadStats.fileName || 'N/A'}
- ขนาดไฟล์: ${uploadStats.fileSize ? (uploadStats.fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}
- จำนวนรายการทั้งหมด: ${uploadStats.totalRecords?.toLocaleString() || 'N/A'}
- รายการที่ถูกต้อง: ${uploadStats.validRecords?.toLocaleString() || 'N/A'}
- รายการที่บันทึกแล้ว: ${uploadStats.insertedRecords?.toLocaleString() || 'N/A'}
- เวลาประมวลผล: ${uploadStats.processingTime || 'N/A'}
- อัตราความสำเร็จ: ${uploadSuccessRate ? uploadSuccessRate + '%' : 'N/A'}
- สถานะ: ${uploadStats.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}` : '\n📤 ยังไม่มีการอัปโหลดไฟล์';

      const report = `รายงานการวิเคราะห์ Access Log ฉบับสมบูรณ์
========================================================

${systemInfo}

📊 สถิติรวม:
- การเข้าถึงทั้งหมด: ${stats.totalAccess?.toLocaleString() || 0} ครั้ง
- การเข้าถึงสำเร็จ: ${stats.successfulAccess?.toLocaleString() || 0} ครั้ง (${stats.totalAccess ? ((stats.successfulAccess / stats.totalAccess) * 100).toFixed(1) : 0}%)
- การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess?.toLocaleString() || 0} ครั้ง (${stats.totalAccess ? ((stats.deniedAccess / stats.totalAccess) * 100).toFixed(1) : 0}%)
- ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers?.toLocaleString() || 0} คน
- ช่วงเวลาข้อมูล: ${stats.dateRange || 'ไม่ระบุ'}

📍 การเข้าถึงตามสถานที่ (Top 10):
${chartData.locationData?.slice(0, 10).map(item => `- ${item.name}: ${item.value.toLocaleString()} ครั้ง`).join('\n') || 'ไม่มีข้อมูล'}

🕐 การเข้าถึงตามช่วงเวลา:
${chartData.timeData?.map(item => `- ${item.name}: ${item.value.toLocaleString()} ครั้ง`).join('\n') || 'ไม่มีข้อมูล'}

🎯 ทิศทางการเข้าถึง:
${chartData.directionData?.map(item => `- ${item.name}: ${item.value.toLocaleString()} ครั้ง`).join('\n') || 'ไม่มีข้อมูล'}

${uploadInfo}

💬 ประวัติการสนทนากับ AI:
${chatMessages.length > 0 ?
          chatMessages.map(msg => `${msg.type === 'user' ? '👤 คำถาม' : '🤖 คำตอบ'}: ${msg.content}`).join('\n\n') :
          'ยังไม่มีการสนทนากับ AI'
        }

🚨 ข้อมูลด้านความปลอดภัย:
- ความผิดปกติที่ตรวจพบ: รายละเอียดใน Security Alerts
- การแจ้งเตือนด้านความปลอดภัย: ดูในแท็บ "การวิเคราะห์"

📋 ข้อมูลการสร้างรายงาน:
- สร้างรายงานเมื่อ: ${new Date().toLocaleString('th-TH')}
- ข้อมูลที่วิเคราะห์: ${logData.length.toLocaleString()} รายการ
- เวอร์ชันระบบ: Simple Design v1.0

========================================================
รายงานนี้สร้างโดยระบบ Access Log Analyzer
`;

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `access-log-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Report exported successfully');
    } catch (exportError) {
      console.error('❌ Export failed:', exportError);
      setError('ไม่สามารถส่งออกรายงานได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Tab change handler
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    clearError();

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tab_change', {
        event_category: 'navigation',
        event_label: tabId,
        custom_parameters: {
          previous_tab: activeTab,
          has_upload_data: logData.length > 0,
          system_health: Object.values(systemStatus).every(status => status === 'connected')
        }
      });
    }
  };

  const handleUploadError = (error) => {
    console.error('❌ Upload error in App:', error);
    setError(`การอัปโหลดล้มเหลว: ${error}`);
  };

  const getSystemStatusColor = () => {
    const connected = Object.values(systemStatus).filter(status => status === 'connected').length;
    const total = Object.keys(systemStatus).length;

    if (process.env.NODE_ENV === 'development') {
      if (connected >= 1) return 'text-blue-600';
      return 'text-yellow-600';
    }

    if (connected === total) return 'text-green-600';
    if (connected >= total / 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Render main content
  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'upload':
          return (
            <UploadPage
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onFileUpload={handleFileUpload}
              logDataCount={logData.length}
              uploadError={uploadError}
            />
          );

        case 'dashboard':
          return (
            <DashboardPage
              filteredData={filteredData}
              stats={stats}
              chartData={chartData}
              filters={filters}
              onFilterChange={handleFilterChange}
              onExportReport={exportReport}
              isLoading={isLoading}
              onError={setError}
              uploadStats={uploadStats}
              systemStatus={systemStatus}
            />
          );

        case 'chat':
          return (
            <ChatPage
              chatMessages={chatMessages}
              currentMessage={currentMessage}
              setCurrentMessage={setCurrentMessage}
              onSendMessage={handleSendMessage}
              isAnalyzing={isAnalyzing}
              isAIAvailable={systemStatus.ai === 'connected'}
              onError={setError}
              logDataStats={stats}
              uploadStats={uploadStats}
            />
          );

        case 'analytics':
          return (
            <div className="space-y-4">
              {/* Analytics Header */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                      <span className="mr-3">🛡️</span>
                      การวิเคราะห์ความปลอดภัย
                    </h1>
                    <p className="text-gray-600 mt-1">
                      วิเคราะห์และติดตามความผิดปกติในระบบการเข้า-ออก
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>อัปเดตแบบเรียลไทม์</span>
                    </div>
                    {uploadStats && (
                      <div className="text-xs text-gray-400">
                        อัปโหลดล่าสุด: {uploadStats.fileName || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">📊</span>
                      <div>
                        <p className="text-sm font-medium text-blue-600">เหตุการณ์ทั้งหมด</p>
                        <p className="text-2xl font-bold text-blue-700">{stats.totalAccess?.toLocaleString() || 0}</p>
                        <p className="text-xs text-blue-500">
                          {uploadStats?.totalRecords && `จากไฟล์ ${uploadStats.totalRecords.toLocaleString()} รายการ`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">✅</span>
                      <div>
                        <p className="text-sm font-medium text-green-600">การเข้าถึงสำเร็จ</p>
                        <p className="text-2xl font-bold text-green-700">{stats.successfulAccess?.toLocaleString() || 0}</p>
                        <p className="text-xs text-green-500">
                          {stats.totalAccess ? `${((stats.successfulAccess / stats.totalAccess) * 100).toFixed(1)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🚫</span>
                      <div>
                        <p className="text-sm font-medium text-red-600">การเข้าถึงถูกปฏิเสธ</p>
                        <p className="text-2xl font-bold text-red-700">{stats.deniedAccess?.toLocaleString() || 0}</p>
                        <p className="text-xs text-red-500">
                          {stats.totalAccess ? `${((stats.deniedAccess / stats.totalAccess) * 100).toFixed(1)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">👥</span>
                      <div>
                        <p className="text-sm font-medium text-purple-600">ผู้ใช้ที่ไม่ซ้ำ</p>
                        <p className="text-2xl font-bold text-purple-700">{stats.uniqueUsers?.toLocaleString() || 0}</p>
                        <p className="text-xs text-purple-500">
                          {uploadStats?.validRecords && `จาก ${uploadStats.validRecords.toLocaleString()} รายการ`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Quality Indicator */}
                {uploadStats && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">คุณภาพข้อมูลล่าสุด</h4>
                        <p className="text-sm text-gray-600">
                          อัปโหลดจากไฟล์: {uploadStats.fileName || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${uploadSuccessRate >= 90 ? 'bg-green-100 text-green-800' :
                            uploadSuccessRate >= 80 ? 'bg-blue-100 text-blue-800' :
                              uploadSuccessRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                          }`}>
                          {uploadSuccessRate || 'N/A'}% ความถูกต้อง
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ประมวลผลใน {uploadStats.processingTime || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* The SecurityDashboard component was removed from here to fix the error */}
              <SecurityAlerts
                logData={logData}
                uploadStats={uploadStats}
              />
            </div>
          );

        default:
          return (
            <div className="bg-white rounded-lg shadow-sm p-12">
              <div className="text-center">
                <span className="text-4xl mb-4 block">🤔</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ไม่พบหน้าที่คุณต้องการ
                </h3>
                <p className="text-gray-600 mb-4">
                  กรุณาเลือกแท็บที่ต้องการจากด้านบน
                </p>
                <button
                  onClick={() => handleTabChange('upload')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  กลับไปหน้าอัปโหลด
                </button>
              </div>
            </div>
          );
      }
    } catch (renderError) {
      console.error('❌ Content render error:', renderError);
      return (
        <div className="bg-white rounded-lg shadow-sm p-12">
          <div className="text-center">
            <span className="text-4xl mb-4 block">❌</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              เกิดข้อผิดพลาดในการแสดงผล
            </h3>
            <p className="text-gray-600 mb-4">
              กรุณาลองรีเฟรชหน้าเว็บหรือติดต่อผู้ดูแลระบบ
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              รีเฟรชหน้า
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">เกิดข้อผิดพลาด</p>
                  <p className="text-sm text-yellow-700">{error}</p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-yellow-400 hover:text-yellow-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-gray-900">กำลังประมวลผล...</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation and Status */}
        <div className="mb-4 flex items-center justify-between">
          <NavigationTabs
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />

          {/* System Status */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.ai === 'connected' ? 'bg-green-500' :
                  systemStatus.ai === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              <span className="text-gray-600">AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.database === 'connected' ? 'bg-green-500' :
                  systemStatus.database === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              <span className="text-gray-600">DB</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.upload === 'connected' ? 'bg-green-500' :
                  systemStatus.upload === 'checking' ? 'bg-yellow-500' : 'bg-orange-500'
                }`}></div>
              <span className="text-gray-600">Upload</span>
            </div>
            <span className={`text-xs font-medium ${getSystemStatusColor()}`}>
              {Object.values(systemStatus).every(status => status === 'connected') ? 'ระบบพร้อม' :
                Object.values(systemStatus).some(status => status === 'checking') ? 'ตรวจสอบ...' :
                  process.env.NODE_ENV === 'development' ? 'โหมดพัฒนา' : 'มีปัญหา'}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <main role="main" aria-label="เนื้อหาหลัก">
          {renderContent()}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p>© 2024 Access Log Analyzer - ระบบวิเคราะห์การเข้า-ออก</p>
              <p className="text-xs mt-1">รองรับการวิเคราะห์ข้อมูลแบบเรียลไทม์</p>
            </div>
            <div className="flex items-center space-x-6 text-xs">
              <span className={`flex items-center ${getSystemStatusColor()}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${Object.values(systemStatus).every(status => status === 'connected') ? 'bg-green-500' :
                    Object.values(systemStatus).some(status => status === 'checking') ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                {Object.values(systemStatus).every(status => status === 'connected') ? 'ระบบทำงานปกติ' :
                  Object.values(systemStatus).some(status => status === 'checking') ? 'กำลังตรวจสอบระบบ' : 'ระบบมีปัญหา'}
              </span>
              <span>📊 ข้อมูล: {logData.length.toLocaleString()} รายการ</span>
              {uploadStats && (
                <span>📤 อัปโหลดล่าสุด: {uploadStats.fileName || 'N/A'}</span>
              )}
              <span>🚀 Simple Design v1.0</span>
            </div>
          </div>

          {/* Upload Statistics in Footer */}
          {uploadStats && uploadStats.success && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  ไฟล์ล่าสุด: {uploadStats.fileName} ({uploadStats.fileSize ? `${(uploadStats.fileSize / 1024 / 1024).toFixed(2)}MB` : 'N/A'})
                </span>
                <span>
                  ประมวลผล: {uploadStats.processingTime || 'N/A'} •
                  อัตราสำเร็จ: {uploadSuccessRate || 'N/A'}% •
                  รายการ: {uploadStats.insertedRecords?.toLocaleString() || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <span className="text-6xl mb-4 block">💥</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              เกิดข้อผิดพลาดที่ไม่คาดคิด
            </h1>
            <p className="text-gray-600 mb-4">
              ระบบ Access Log Analyzer พบข้อผิดพลาด
            </p>
            <p className="text-sm text-gray-500 mb-6">
              รหัสข้อผิดพลาด: {this.state.error?.message || 'Unknown error'}
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                รีเฟรชหน้า
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ลองอีกครั้ง
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">รายละเอียดข้อผิดพลาด (Development)</summary>
                <pre className="text-xs text-gray-400 mt-2 bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App wrapper with Error Boundary
const App = () => (
  <ErrorBoundary>
    <AccessLogAnalyzer />
  </ErrorBoundary>
);

export default App;