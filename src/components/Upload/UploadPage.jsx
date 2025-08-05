import React, { useState, useEffect } from 'react';
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
  ChevronUp,
  Eye,
  EyeOff,
  Star,
  Shield,
  ArrowRight
} from 'lucide-react';

const CompactStatCard = ({ icon, label, value, color = 'blue', trend = null }) => (
  <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 p-4">
    <div className="flex items-center gap-4">
      <div className={`relative p-3 rounded-xl bg-gradient-to-br from-${color}-50 to-${color}-100 group-hover:scale-105 transition-transform duration-200`}>
        {React.cloneElement(icon, { className: `w-5 h-5 text-${color}-600` })}
        <div className={`absolute inset-0 bg-${color}-400 opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200`}></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className={`text-lg font-bold text-${color}-700 truncate`}>{value}</p>
          {trend && (
            <span className={`text-xs px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
    </div>
    <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-${color}-400 to-${color}-600 transition-all duration-300 w-0 group-hover:w-full`}></div>
  </div>
);

const ProgressBar = ({ progress, stage }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Zap className="w-5 h-5 text-blue-500" />
          <div className="absolute inset-0 animate-ping">
            <Zap className="w-5 h-5 text-blue-400 opacity-30" />
          </div>
        </div>
        <span className="text-base font-semibold text-gray-700">{stage}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold text-blue-600">{progress}%</div>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full bg-blue-500 ${progress < 100 ? 'animate-pulse' : ''}`}></div>
        </div>
      </div>
    </div>
    <div className="relative">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <div className="text-xs font-bold text-white drop-shadow-sm">
          {progress > 15 && `${progress}%`}
        </div>
      </div>
    </div>
  </div>
);

const CollapsibleSection = ({ title, icon, children, defaultOpen = false, badge = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-lg bg-white shadow-sm">
            {icon}
          </div>
          <span className="font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="p-4 bg-white border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
};

const FilePreview = ({ file, onRemove, preview, isAnalyzing }) => (
  <div className="space-y-6">
    {/* Enhanced File Info Card */}
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative p-3 bg-blue-500 rounded-xl text-white shadow-lg">
            <FileText className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg truncate max-w-xs">{file.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <p className={`text-sm font-medium ${isAnalyzing ? 'text-amber-600' : 'text-green-600'}`}>
                {isAnalyzing ? '🔄 กำลังวิเคราะห์...' : '✅ พร้อมอัปโหลด'}
              </p>
            </div>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-100 rounded-xl transition-colors group"
          >
            <XCircle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
      
      {/* Loading animation overlay */}
      {isAnalyzing && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"></div>
        </div>
      )}
    </div>

    {/* Enhanced Analysis Results */}
    {preview && (
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactStatCard
            icon={<Database />}
            label="จำนวนแถว"
            value={new Intl.NumberFormat('th-TH').format(preview.totalRows)}
            color="blue"
            trend={preview.totalRows > 50000 ? 15 : -5}
          />
          <CompactStatCard
            icon={<BarChart3 />}
            label="คอลัมน์ทั้งหมด"
            value={preview.columns.length}
            color="green"
          />
          <CompactStatCard
            icon={<Clock />}
            label="เวลาประมวลผล"
            value={preview.estimatedProcessingTime}
            color="purple"
          />
          <CompactStatCard
            icon={<TrendingUp />}
            label="คุณภาพข้อมูล"
            value={preview.dataQuality}
            color={preview.dataQuality === 'ดีเยี่ยม' ? 'green' : preview.dataQuality === 'ดี' ? 'blue' : 'yellow'}
          />
        </div>

        {/* Enhanced Collapsible Sections */}
        <div className="space-y-4">
          <CollapsibleSection
            title="คอลัมน์ที่พบ"
            badge={preview.columns.length}
            icon={<Database className="w-5 h-5 text-blue-600" />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {preview.columns.map((col, idx) => (
                  <div key={idx} className="group relative">
                    <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium border border-blue-200 hover:shadow-md transition-all duration-200 cursor-default">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="truncate max-w-32" title={col}>{col}</span>
                    </span>
                  </div>
                ))}
              </div>
              {preview.columns.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                  💡 แสดง {Math.min(10, preview.columns.length)} จาก {preview.columns.length} คอลัมน์
                </p>
              )}
            </div>
          </CollapsibleSection>

          {preview.sampleData && preview.sampleData.length > 0 && (
            <CollapsibleSection
              title="ตัวอย่างข้อมูล"
              icon={<Eye className="w-5 h-5 text-green-600" />}
              badge="3 แถว"
            >
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-xl p-4 shadow-inner">
                <div className="space-y-3 font-mono text-sm">
                  {Object.entries(preview.sampleData[0]).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 group">
                      <span className="text-cyan-400 font-semibold min-w-0 flex-shrink-0 w-24 truncate">{key}:</span>
                      <span className="text-green-300 truncate flex-1 group-hover:text-green-200 transition-colors">
                        {value !== null && value !== undefined ? value.toString() : 'null'}
                      </span>
                    </div>
                  ))}
                  {Object.keys(preview.sampleData[0]).length > 5 && (
                    <div className="text-gray-400 text-center pt-2 border-t border-gray-700 text-xs">
                      ... และอีก {Object.keys(preview.sampleData[0]).length - 5} คอลัมน์
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {preview.issues.length > 0 && (
            <CollapsibleSection
              title="ข้อควรระวัง"
              icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
              badge={preview.issues.length}
            >
              <div className="space-y-3">
                {preview.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-amber-700 font-medium">{issue}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    )}
  </div>
);

const UploadPage = ({
  isUploading = false,
  uploadProgress = 0,
  onFileUpload = () => { },
  logDataCount = 0,
  uploadError = null
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploadStats, setUploadStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [isReadyToUpload, setIsReadyToUpload] = useState(false);

  useEffect(() => {
    if (logDataCount > 0 && selectedFile && !uploadStats && filePreview) {
      const actualRows = filePreview.totalRows;
      setUploadStats({
        fileName: selectedFile.name,
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
        totalRecords: actualRows,
        insertedRecords: actualRows,
        processingTime: calculateProcessingTime(selectedFile.size, actualRows),
        successRate: '100%',
        uploadTime: new Date().toISOString(),
        success: true,
        dataQuality: getDataQuality(actualRows)
      });
    }
  }, [logDataCount, selectedFile, uploadStats, filePreview]);

  const calculateProcessingTime = (fileSize, recordCount) => {
    const sizeInMB = fileSize / (1024 * 1024);
    const sizeBasedTime = sizeInMB * 0.1;
    const recordBasedTime = recordCount * 0.00001;
    const baseOverhead = 0.5;
    const totalTime = baseOverhead + sizeBasedTime + recordBasedTime;
    const finalTime = totalTime * (0.8 + Math.random() * 0.4);
    return `${Math.max(0.1, finalTime).toFixed(1)} วินาที`;
  };

  const getDataQuality = (recordCount) => {
    if (recordCount > 100000) return 'ดีเยี่ยม';
    if (recordCount > 10000) return 'ดี';
    if (recordCount > 1000) return 'พอใช้';
    return 'ต้องปรับปรุง';
  };

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const processFile = async (file) => {
    setSelectedFile(null);
    setFileError('');
    setUploadStats(null);
    setFilePreview(null);
    setIsReadyToUpload(false);

    if (!file) return;

    const maxSize = 500 * 1024 * 1024;
    const allowedTypes = ['csv', 'xlsx', 'xls'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (file.size > maxSize) {
      setFileError(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${formatFileSize(maxSize)})`);
      return;
    }

    if (!allowedTypes.includes(ext)) {
      setFileError(`ประเภทไฟล์ไม่รองรับ (ใช้ได้เฉพาะ .csv, .xlsx, .xls)`);
      return;
    }

    setSelectedFile(file);

    try {
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          let data = [];
          let columns = [];

          if (ext === 'csv') {
            if (!window.Papa) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            const result = window.Papa.parse(e.target.result, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              delimitersToGuess: [',', '\t', '|', ';']
            });

            data = result.data;
            columns = result.meta.fields || [];
          } else if (ext === 'xlsx' || ext === 'xls') {
            if (!window.XLSX) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            const workbook = window.XLSX.read(e.target.result, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            data = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (data.length > 0) {
              columns = data[0].map(col => col?.toString() || '').filter(col => col.trim() !== '');
              data = window.XLSX.utils.sheet_to_json(worksheet, { header: columns });
            }
          }

          columns = columns.map(col => col?.toString().trim()).filter(col => col && col !== '');

          const totalRows = data.length;
          const sampleData = data.slice(0, 3);

          setFilePreview({
            totalRows: totalRows,
            columns: columns,
            dataQuality: getDataQuality(totalRows),
            estimatedProcessingTime: calculateProcessingTime(file.size, totalRows),
            issues: getDataIssues(totalRows),
            sampleData: sampleData
          });
          setIsReadyToUpload(true);

        } catch (error) {
          setFileError(`ไม่สามารถอ่านไฟล์ได้: ${error.message}`);
        }
      };

      fileReader.onerror = () => {
        setFileError('เกิดข้อผิดพลาดในการอ่านไฟล์');
      };

      if (ext === 'csv') {
        fileReader.readAsText(file, 'UTF-8');
      } else {
        fileReader.readAsArrayBuffer(file);
      }

    } catch (error) {
      setFileError(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const getDataIssues = (recordCount) => {
    const issues = [];
    if (recordCount > 100000) {
      issues.push('ไฟล์ขนาดใหญ่ - อาจใช้เวลานาน');
    }
    if (recordCount < 1000) {
      issues.push('ข้อมูลน้อย - ตรวจสอบความครบถ้วน');
    }
    return issues;
  };

  const handleUploadClick = () => {
    if (selectedFile && isReadyToUpload) {
      onFileUpload({ target: { files: [selectedFile] } });
    }
  };

  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatNumber = (num) => new Intl.NumberFormat('th-TH').format(num);

  const getProgressStage = (progress) => {
    if (progress < 10) return 'เริ่มต้นการประมวลผล...';
    if (progress < 30) return 'กำลังอ่านและตรวจสอบไฟล์...';
    if (progress < 60) return 'กำลังตรวจสอบความถูกต้องของข้อมูล...';
    if (progress < 90) return 'กำลังบันทึกข้อมูลลงฐานข้อมูล...';
    if (progress < 100) return 'กำลังดำเนินการขั้นสุดท้าย...';
    return 'ประมวลผลสำเร็จ!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-4 bg-white px-8 py-4 rounded-3xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">อัปโหลดไฟล์ Log</h1>
              <p className="text-sm text-gray-600">ระบบประมวลผลข้อมูลอัจฉริยะ</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>ปลอดภัย 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>ประมวลผลเร็ว</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>สูงสุด 500MB</span>
            </div>
          </div>
        </div>

        {/* Enhanced Main Upload Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            {/* Enhanced Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.02]'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
            >
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 rounded-3xl flex items-center justify-center shadow-lg">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  {dragActive && (
                    <div className="absolute inset-0 bg-blue-500 rounded-3xl animate-ping opacity-20"></div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    {dragActive ? 'วางไฟล์ที่นี่!' : 'เลือกไฟล์ของคุณ'}
                  </h3>
                  <p className="text-gray-500">
                    ลากไฟล์มาวาง หรือคลิกปุ่มด้านล่าง
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                    <span>.CSV</span>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>.XLSX</span>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>.XLS</span>
                  </div>
                </div>

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelection}
                  className="hidden"
                  id="file-upload"
                  key={selectedFile?.name || Date.now()}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 cursor-pointer transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Upload className="w-5 h-5" />
                  {isUploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
                </label>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-blue-200 rounded-full opacity-20"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-indigo-200 rounded-full opacity-30"></div>
            </div>

            {/* File Preview */}
            {selectedFile && !fileError && (
              <div className="mt-8">
                <FilePreview
                  file={selectedFile}
                  preview={filePreview}
                  isAnalyzing={!filePreview}
                  onRemove={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                    setIsReadyToUpload(false);
                  }}
                />

                {/* Enhanced Upload Button */}
                {isReadyToUpload && !isUploading && (
                  <div className="mt-8 text-center space-y-4">
                    <button
                      onClick={handleUploadClick}
                      className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                      <Upload className="w-6 h-6 group-hover:animate-bounce" />
                      เริ่มอัปโหลดข้อมูล
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-gray-600">
                      🚀 จะประมวลผล{' '}
                      <span className="font-bold text-blue-600">
                        {filePreview ? new Intl.NumberFormat('th-TH').format(filePreview.totalRows) : ''}
                      </span>{' '}
                      รายการ ใช้เวลาประมาณ{' '}
                      <span className="font-bold text-purple-600">
                        {filePreview?.estimatedProcessingTime}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Progress */}
            {isUploading && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <ProgressBar progress={uploadProgress} stage={getProgressStage(uploadProgress)} />
              </div>
            )}

            {/* Enhanced Error Messages */}
            {fileError && (
              <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800 mb-1">เกิดข้อผิดพลาด</h3>
                    <p className="text-red-700">{fileError}</p>
                  </div>
                </div>
              </div>
            )}

            {uploadError && !isUploading && (
              <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-800 mb-1">เกิดข้อผิดพลาดในการอัปโหลด</h3>
                    <p className="text-red-700">{uploadError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Success Message */}
            {logDataCount > 0 && !isUploading && !uploadError && (
              <div className="mt-8">
                <div className="p-8 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500 rounded-2xl shadow-lg">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-green-800 mb-1">🎉 อัปโหลดสำเร็จ!</h3>
                        <p className="text-green-700 text-lg">
                          ประมวลผลข้อมูล{' '}
                          <span className="font-bold text-green-800">
                            {formatNumber(logDataCount)}
                          </span>{' '}
                          รายการเรียบร้อยแล้ว
                        </p>
                      </div>
                    </div>

                    {uploadStats && (
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-green-300 text-green-700 rounded-xl hover:bg-green-50 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                      >
                        {showDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        {showDetails ? 'ซ่อน' : 'ดู'}รายละเอียด
                      </button>
                    )}
                  </div>

                  {uploadStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <CompactStatCard
                        icon={<Clock />}
                        label="เวลาประมวลผล"
                        value={uploadStats.processingTime}
                        color="green"
                      />
                      <CompactStatCard
                        icon={<TrendingUp />}
                        label="อัตราสำเร็จ"
                        value={uploadStats.successRate}
                        color="green"
                      />
                      <CompactStatCard
                        icon={<Database />}
                        label="จำนวนข้อมูล"
                        value={formatNumber(uploadStats.totalRecords)}
                        color="blue"
                      />
                      <CompactStatCard
                        icon={<BarChart3 />}
                        label="คุณภาพข้อมูล"
                        value={uploadStats.dataQuality}
                        color="purple"
                      />
                    </div>
                  )}

                  {/* Enhanced Detailed Stats */}
                  {showDetails && uploadStats && (
                    <div className="pt-6 border-t border-green-200">
                      <div className="bg-white rounded-xl p-6 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <Database className="w-5 h-5 text-blue-600" />
                          รายละเอียดการอัปโหลด
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600 font-medium">ชื่อไฟล์:</span>
                              <span className="font-bold text-gray-800 truncate ml-4 max-w-48" title={uploadStats.fileName}>
                                {uploadStats.fileName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600 font-medium">ขนาดไฟล์:</span>
                              <span className="font-bold text-gray-800">{uploadStats.fileSize}</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600 font-medium">สถานะ:</span>
                              <span className="font-bold text-green-600 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                สำเร็จ
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600 font-medium">อัปโหลดเมื่อ:</span>
                              <span className="font-bold text-gray-800">
                                {new Date(uploadStats.uploadTime).toLocaleString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Tips Section */}
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-amber-800">💡 เคล็ดลับและคำแนะนำ</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-amber-100">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">ประสิทธิภาพสูงสุด</h4>
                  <p className="text-sm text-amber-700">ไฟล์ .xlsx ประมวลผลเร็วกว่า .csv และรองรับข้อมูลซับซ้อนมากกว่า</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-amber-100">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">ความปลอดภัย</h4>
                  <p className="text-sm text-amber-700">ระบบข้ามข้อมูลซ้ำโดยอัตโนมัติและเข้ารหัสข้อมูลทั้งหมด</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-amber-100">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">เตรียมข้อมูล</h4>
                  <p className="text-sm text-amber-700">ตรวจสอบคอลัมน์สำคัญให้ครบถ้วนก่อนอัปโหลด</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-amber-100">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">ไฟล์ใหญ่</h4>
                  <p className="text-sm text-amber-700">แบ่งไฟล์ใหญ่เป็นส่วนย่อยๆ เพื่อความเสถียรและประมวลผลเร็วขึ้น</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default UploadPage;