import React, { useState, useEffect } from 'react';
import aiService from './services/aiService.js';
import Header from './components/Layout/Header.jsx';
// import NavigationTabs from './components/Layout/NavigationTabs.jsx';
import SidebarNav from './components/Layout/SidebarNav.jsx';
import UploadPage from './components/Upload/UploadPage.jsx';
import ChatPage from './components/Chat/ChatPage.jsx';
import CombinedDashboardAnalyticsPage from './Analytics/CombinedDashboardAnalyticsPage.jsx';
import TransactionLogPage from './components/Logs/TransactionLogPage.jsx';
import CasesPage from './components/Cases/CasesPage.jsx';
import PivotTable from './components/Analytics/PivotTable.jsx';
import { useLogData } from './hooks/useLogData.js';
import { useFilters } from './hooks/useFilters.js';
import { useChat } from './hooks/useChat.js';
import { useUpload } from './hooks/useUpload.js';
import LogDetailModal from './components/Dashboard/LogDetailModal.jsx';
import { AlertCircle, CheckCircle, X, RefreshCw, ChevronRight } from 'lucide-react';

const AccessLogAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    ai: 'checking',
    database: 'checking',
    upload: 'checking'
  });
  const [selectedLogEntry, setSelectedLogEntry] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Custom hooks
  const { logData, filteredData, stats, chartData, refreshData } = useLogData();
  const { filters, updateFilter, clearFilters, getFilterCount } = useFilters();
  const { chatMessages, currentMessage, setCurrentMessage, handleSendMessage, isAnalyzing } = useChat(stats);
  const { isUploading, uploadProgress, uploadResult, uploadError, handleFileUpload } = useUpload();

  // Additional state
  const [uploadStats, setUploadStats] = useState(null);

  // Handlers
  const handleRowClick = (logEntry) => setSelectedLogEntry(logEntry);
  const handleCloseModal = () => setSelectedLogEntry(null);
  const clearError = () => setError(null);

  // System health check
  useEffect(() => {
    const checkSystemHealth = async () => {
      setIsLoading(true);

      const checks = [
        // AI Service
        aiService.checkAvailability()
          .then(() => ({ ai: 'connected' }))
          .catch(() => ({ ai: 'disconnected' })),

        // Database
        fetch('/api/health')
          .then(res => ({ database: res.ok ? 'connected' : 'disconnected' }))
          .catch(() => ({ database: 'disconnected' })),

        // Upload service
        fetch('/api/upload/stats')
          .then(res => ({ upload: res.ok ? 'connected' : 'disconnected' }))
          .catch(() =>
            fetch('/api/logs')
              .then(res => ({ upload: res.ok ? 'connected' : 'disconnected' }))
              .catch(() => ({ upload: 'disconnected' }))
          )
      ];

      try {
        const results = await Promise.all(checks);
        const newStatus = results.reduce((acc, result) => ({ ...acc, ...result }), {});
        setSystemStatus(newStatus);

        const connectedCount = Object.values(newStatus).filter(status => status === 'connected').length;
        if (connectedCount === 0 && process.env.NODE_ENV === 'production') {
          setError('ไม่สามารถเชื่อมต่อกับระบบได้');
        }
      } catch (error) {
        console.error('System health check failed:', error);
        if (process.env.NODE_ENV === 'production') {
          setError('ระบบบางส่วนไม่พร้อมใช้งาน');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSystemHealth();
  }, []);

  // Upload success handler
  useEffect(() => {
    if (uploadResult?.success) {
      const stats = {
        fileName: uploadResult.fileName || 'Unknown',
        fileSize: uploadResult.fileSize || 0,
        totalRecords: uploadResult.recordCount || 0,
        insertedRecords: uploadResult.recordCount || 0,
        processingTime: uploadResult.processingTime || 'N/A',
        success: true,
        uploadTime: new Date().toISOString()
      };
      setUploadStats(stats);
      localStorage.setItem('lastUploadStats', JSON.stringify(stats));
    }
  }, [uploadResult]);

  // Tab change handler
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    clearError();
  };

  // Allow children to request tab changes (from GoAccess page etc.)
  useEffect(() => {
    const onSetTab = (e) => {
      if (!e || !e.detail) return;
      setActiveTab(e.detail);
    };
    window.addEventListener('setActiveTab', onSetTab);
    return () => window.removeEventListener('setActiveTab', onSetTab);
  }, []);

  // System status helpers
  const getSystemStatusInfo = () => {
    const connected = Object.values(systemStatus).filter(s => s === 'connected').length;
    const checking = Object.values(systemStatus).filter(s => s === 'checking').length;

    if (checking > 0) return { text: 'ตรวจสอบ...', color: 'yellow' };
    if (connected === 3) return { text: 'พร้อมใช้งาน', color: 'green' };
    if (connected >= 1) return { text: 'พร้อมใช้งานบางส่วน', color: 'yellow' };
    return { text: 'ไม่พร้อมใช้งาน', color: 'red' };
  };

  const systemInfo = getSystemStatusInfo();

  const getPageTitle = () => {
    const map = {
      logs: { title: 'ประวัติการใช้งาน', subtitle: 'ดูและค้นหาข้อมูลการเข้า–ออก' },
      dashboard: { title: 'แดชบอร์ด & วิเคราะห์', subtitle: 'ภาพรวมเชิงลึกของระบบ' },
      pivot: { title: 'ตาราง Pivot', subtitle: 'สรุปข้อมูลแบบกำหนดเอง' },
      cases: { title: 'รายงานเคส', subtitle: 'เคสสืบค้นความผิดปกติ' },
      chat: { title: 'Chat กับ AI', subtitle: 'สอบถามและสรุปผลอัตโนมัติ' },
      upload: { title: 'อัปโหลดข้อมูล', subtitle: 'นำเข้าข้อมูลเพื่อวิเคราะห์' }
    };
    return map[activeTab] || { title: '', subtitle: '' };
  };
  // Close Upload modal on ESC
  useEffect(() => {
    if (!showUploadModal) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowUploadModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showUploadModal]);

  // Close sidebar on ESC for smoother UX
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarCollapsed(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Persist sidebar state & keyboard shortcut
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ala_sidebar_collapsed');
      if (saved !== null) setSidebarCollapsed(saved === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('ala_sidebar_collapsed', String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    const onKey = (e) => {
      // Ctrl/Cmd+M toggles sidebar, ignore inside inputs
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      const isToggle = (e.key === 'm' || e.key === 'M') && (e.ctrlKey || e.metaKey);
      if (isToggle) {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Error Alert Component
  const ErrorAlert = ({ error, onClose }) => (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-600 transition-colors ml-3"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  // Loading Overlay Component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <div className="flex items-center">
          <RefreshCw className="animate-spin h-5 w-5 text-blue-600 mr-3" />
          <span className="text-gray-900">กำลังตรวจสอบระบบ...</span>
        </div>
      </div>
    </div>
  );

  // System Status Indicator
  const SystemStatus = () => (
    <div className="flex items-center gap-3 text-sm">
      {Object.entries(systemStatus).map(([service, status]) => (
        <div key={service} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' :
              status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          <span className="text-gray-600 capitalize">
            {service === 'ai' ? 'AI' : service === 'database' ? 'DB' : 'Upload'}
          </span>
        </div>
      ))}
      <div className={`text-xs font-medium px-2 py-1 rounded-full ${systemInfo.color === 'green' ? 'bg-green-100 text-green-700' :
          systemInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
        }`}>
        {systemInfo.text}
      </div>
    </div>
  );

  // (removed page accent banner by request)

  // Main content renderer
  const renderContent = () => {
    const contentMap = {
      logs: (
        <TransactionLogPage onRowClick={handleRowClick} onOpenUpload={() => setShowUploadModal(true)} />
      ),
      upload: (
        <UploadPage
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onFileUpload={handleFileUpload}
          logDataCount={logData.length}
          uploadError={uploadError}
        />
      ),
      chat: (
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
      ),
      dashboard: (
        <CombinedDashboardAnalyticsPage
          logData={logData}
          filteredData={filteredData}
          stats={stats}
          chartData={chartData}
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          getFilterCount={getFilterCount}
          loading={isLoading}
          error={error}
          refreshData={refreshData}
          useRealData={true}
          uploadStats={uploadStats}
          systemStatus={systemStatus}
          onRowClick={handleRowClick}
        />
      ),
      cases: (
        <CasesPage />
      ),
      pivot: (
        <PivotTable />
      ),
      analytics: (
        <CombinedDashboardAnalyticsPage
          logData={logData}
          filteredData={filteredData}
          stats={stats}
          chartData={chartData}
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          getFilterCount={getFilterCount}
          loading={isLoading}
          error={error}
          refreshData={refreshData}
          useRealData={true}
          uploadStats={uploadStats}
          systemStatus={systemStatus}
          onRowClick={handleRowClick}
        />
      )
    };

    return contentMap[activeTab] || (
      <div className="bg-white rounded-lg shadow-sm p-12 border">
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
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
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <Header pageTitle={getPageTitle().title} pageSubtitle={getPageTitle().subtitle} />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {error && <ErrorAlert error={error} onClose={clearError} />}
        {isLoading && <LoadingOverlay />}

        <div className="flex">
          <div
            className={`transition-[width,margin] duration-300 ease-out overflow-hidden ${sidebarCollapsed ? 'w-0 mr-0' : 'w-64 mr-6'} sticky top-[92px] sm:top-[84px] h-[calc(100vh-92px)] sm:h-[calc(100vh-84px)]`}
            style={{ willChange: 'width, margin' }}
          >
            {!sidebarCollapsed && (
              <SidebarNav
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                collapsed={false}
                onToggle={() => setSidebarCollapsed(true)}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-4 flex items-center justify-end">
              <SystemStatus />
            </div>
            <main>
              {renderContent()}
            </main>
          </div>
        </div>

        {/* Floating open button when sidebar hidden */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed left-3 top-[92px] sm:top-[84px] z-[70] inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-200 text-blue-900 shadow-md ring-1 ring-blue-300 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-transform hover:scale-105"
            title="เปิดเมนู"
            aria-label="เปิดเมนู"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Removed overlay; sidebar now pushes content smoothly */}
      </div>

      {/* Log Detail Modal */}
      {selectedLogEntry && (
        <LogDetailModal
          logEntry={selectedLogEntry}
          onClose={handleCloseModal}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">อัปโหลดไฟล์ Access Log</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <UploadPage
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                onFileUpload={handleFileUpload}
                logDataCount={logData.length}
                uploadError={uploadError}
              />
            </div>
            <div className="px-4 py-3 border-t flex justify-end bg-gray-50">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100">ปิด</button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p>© 2024 Access Log Analyzer</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${systemInfo.color === 'green' ? 'bg-green-500' :
                    systemInfo.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                {systemInfo.text}
              </span>
              <span>📊 {logData.length.toLocaleString()} รายการ</span>
              {uploadStats && (
                <span>📤 {uploadStats.fileName}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}; 

// Simplified Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              เกิดข้อผิดพลาด
            </h1>
            <p className="text-gray-600 mb-6">
              ระบบพบข้อผิดพลาดที่ไม่คาดคิด
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                รีเฟรชหน้า
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App wrapper
const App = () => (
  <ErrorBoundary>
    <AccessLogAnalyzer />
  </ErrorBoundary>
);

export default App;
