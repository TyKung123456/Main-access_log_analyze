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
  Eye,
  EyeOff,
  Star,
  Shield,
  ArrowRight,
  FileSpreadsheet,
  Activity,
  Trash2,
  Download,
  Info
} from 'lucide-react';

const StatCard = ({ icon, label, value, color = 'blue', trend = null, size = 'normal' }) => {
  const sizeClasses = size === 'large' ? 'p-6' : 'p-4';
  const iconClasses = size === 'large' ? 'w-6 h-6' : 'w-5 h-5';
  const valueClasses = size === 'large' ? 'text-2xl' : 'text-lg';

  return (
    <div className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
      <div className={`${sizeClasses}`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-${color}-50 group-hover:scale-105 transition-transform duration-200`}>
            {React.cloneElement(icon, { className: `${iconClasses} text-${color}-600` })}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-center gap-2">
              <p className={`${valueClasses} font-bold text-gray-900 truncate`}>{value}</p>
              {trend && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-${color}-400 to-${color}-600 transition-all duration-300 w-0 group-hover:w-full`}></div>
    </div>
  );
};

const ProgressIndicator = ({ progress, stage }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Activity className="w-5 h-5 text-blue-500" />
          {progress < 100 && (
            <div className="absolute inset-0 animate-ping">
              <Activity className="w-5 h-5 text-blue-400 opacity-40" />
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700">{stage}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-blue-600">{progress}%</span>
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full bg-blue-500 ${progress < 100 ? 'animate-pulse' : ''}`}></div>
        </div>
      </div>
    </div>
    <div className="relative">
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

const FilePreview = ({ file, onRemove, preview, isAnalyzing }) => (
  <div className="space-y-6">
    {/* File Info Card */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative p-3 bg-blue-500 rounded-lg text-white shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 text-base truncate">{file.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <p className={`text-sm font-medium ${isAnalyzing ? 'text-amber-600' : 'text-green-600'}`}>
                {isAnalyzing ? '🔄 กำลังวิเคราะห์...' : '✅ พร้อมใช้งาน'}
              </p>
            </div>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
            title="ลบไฟล์"
          >
            <Trash2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

      {isAnalyzing && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}
    </div>

    {/* Analysis Results */}
    {preview && (
      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Database />}
            label="จำนวนแถว"
            value={new Intl.NumberFormat('th-TH').format(preview.totalRows)}
            color="blue"
          />
          <StatCard
            icon={<BarChart3 />}
            label="คอลัมน์"
            value={preview.columns.length}
            color="green"
          />
          <StatCard
            icon={<Clock />}
            label="เวลาประมาณ"
            value={preview.estimatedTime}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp />}
            label="คุณภาพ"
            value={preview.quality}
            color={preview.quality === 'ดีเยี่ยม' ? 'green' : 'blue'}
          />
        </div>

        {/* Column Preview */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              คอลัมน์ที่พบ ({preview.columns.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {preview.columns.slice(0, 8).map((col, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                {col}
              </span>
            ))}
            {preview.columns.length > 8 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{preview.columns.length - 8} คอลัมน์
              </span>
            )}
          </div>
        </div>

        {/* Sample Data */}
        {preview.sampleData && preview.sampleData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-green-600" />
              ตัวอย่างข้อมูล
            </h4>
            <div className="bg-gray-900 rounded-lg p-3 text-sm font-mono max-h-32 overflow-y-auto">
              {Object.entries(preview.sampleData[0]).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 mb-1">
                  <span className="text-cyan-400 font-medium w-20 truncate flex-shrink-0">{key}:</span>
                  <span className="text-green-300 truncate">
                    {value !== null && value !== undefined ? value.toString() : 'null'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {preview.issues && preview.issues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              ข้อควรระวัง
            </h4>
            <div className="space-y-2">
              {preview.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                  <div className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);

  const resetState = () => {
    setSelectedFile(null);
    setFileError('');
    setFilePreview(null);
    setIsAnalyzing(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadStats(null);
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
    if (!file) return;

    resetState();

    // File validation
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowedTypes = ['csv', 'xlsx', 'xls'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (file.size > maxSize) {
      setFileError(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${(maxSize / (1024 * 1024)).toFixed(0)} MB)`);
      return;
    }

    if (!allowedTypes.includes(ext)) {
      setFileError('ประเภทไฟล์ไม่รองรับ (ใช้ได้เฉพาะ .csv, .xlsx, .xls)');
      return;
    }

    setSelectedFile(file);
    setIsAnalyzing(true);

    try {
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          let data = [];
          let columns = [];

          if (ext === 'csv') {
            // Load Papa Parse dynamically
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
            // Load XLSX library dynamically
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

            // Convert to array format first to get headers
            const dataArray = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (dataArray.length > 0) {
              columns = dataArray[0].map(col => col?.toString().trim() || '').filter(col => col !== '');
              // Convert to object format with proper headers
              data = window.XLSX.utils.sheet_to_json(worksheet, { header: columns });
            }
          }

          // Clean up columns
          columns = columns.map(col => col?.toString().trim()).filter(col => col && col !== '');

          const totalRows = data.length;
          const sampleData = data.slice(0, 3);

          // Calculate processing time based on actual data size
          const estimatedTime = calculateProcessingTime(file.size, totalRows);
          const quality = getDataQuality(totalRows, columns.length);
          const issues = getDataIssues(totalRows, columns.length, data);

          setFilePreview({
            totalRows: totalRows,
            columns: columns,
            quality,
            estimatedTime,
            sampleData: sampleData,
            issues
          });

        } catch (error) {
          console.error('File parsing error:', error);
          setFileError(`ไม่สามารถอ่านไฟล์ได้: ${error.message}`);
        } finally {
          setIsAnalyzing(false);
        }
      };

      fileReader.onerror = () => {
        setFileError('เกิดข้อผิดพลาดในการอ่านไฟล์');
        setIsAnalyzing(false);
      };

      // Read file based on type
      if (ext === 'csv') {
        fileReader.readAsText(file, 'UTF-8');
      } else {
        fileReader.readAsArrayBuffer(file);
      }

    } catch (error) {
      setFileError(`เกิดข้อผิดพลาด: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  const calculateProcessingTime = (fileSize, recordCount) => {
    const sizeInMB = fileSize / (1024 * 1024);
    const sizeBasedTime = sizeInMB * 0.1; // 0.1 second per MB
    const recordBasedTime = recordCount * 0.00001; // 0.00001 second per record
    const baseOverhead = 0.5; // Base processing time
    const totalTime = baseOverhead + sizeBasedTime + recordBasedTime;
    return `${Math.max(0.1, totalTime).toFixed(1)} วินาที`;
  };

  const getDataQuality = (recordCount, columnCount) => {
    if (recordCount > 100000 && columnCount > 15) return 'ดีเยี่ยม';
    if (recordCount > 50000 && columnCount > 10) return 'ดี';
    if (recordCount > 10000 && columnCount > 5) return 'พอใช้';
    return 'ต้องปรับปรุง';
  };

  const getDataIssues = (recordCount, columnCount, data) => {
    const issues = [];

    if (recordCount > 100000) {
      issues.push('ไฟล์ขนาดใหญ่ - อาจใช้เวลานาน');
    }
    if (recordCount < 1000) {
      issues.push('ข้อมูลน้อย - ตรวจสอบความครบถ้วน');
    }
    if (columnCount < 5) {
      issues.push('คอลัมน์น้อย - ข้อมูลอาจไม่ครบถ้วน');
    }

    // Check for empty cells in sample data
    if (data && data.length > 0) {
      const sampleSize = Math.min(100, data.length);
      let emptyCells = 0;
      let totalCells = 0;

      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        for (const [key, value] of Object.entries(row)) {
          totalCells++;
          if (value === null || value === undefined || value === '') {
            emptyCells++;
          }
        }
      }

      const emptyPercentage = (emptyCells / totalCells) * 100;
      if (emptyPercentage > 10) {
        issues.push(`พบข้อมูลว่าง ${emptyPercentage.toFixed(1)}% - ตรวจสอบความสมบูรณ์`);
      }
    }

    return issues;
  };

  const handleUpload = async () => {
    if (!selectedFile || !filePreview) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const duration = 3000 + Math.random() * 2000;
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = Math.min(100, (currentStep / steps) * 100);
      setUploadProgress(Math.floor(progress));

      if (progress >= 100) {
        clearInterval(progressInterval);
        setIsUploading(false);
        setUploadComplete(true);

        // Set upload stats
        setUploadStats({
          fileName: selectedFile.name,
          fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
          totalRecords: filePreview.totalRows,
          processingTime: filePreview.estimatedTime,
          successRate: '100%',
          uploadTime: new Date().toISOString(),
          dataQuality: filePreview.quality
        });
      }
    }, interval);
  };

  const getProgressStage = (progress) => {
    if (progress < 20) return 'เริ่มต้นการประมวลผล...';
    if (progress < 40) return 'กำลังอ่านไฟล์...';
    if (progress < 60) return 'ตรวจสอบข้อมูล...';
    if (progress < 80) return 'บันทึกลงฐานข้อมูล...';
    if (progress < 100) return 'เสร็จสิ้นการประมวลผล...';
    return 'สำเร็จ!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-lg border border-gray-200">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">อัปโหลดไฟล์ข้อมูล</h1>
              <p className="text-sm text-gray-600">ระบบประมวลผลอัจฉริยะ</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-500" />
              <span>ปลอดภัย</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>รวดเร็ว</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>สูงสุด 500MB</span>
            </div>
          </div>
        </div>

        {/* Main Upload Area */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8">
            {!selectedFile && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-300 ${dragActive
                    ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center shadow-lg">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {dragActive ? 'วางไฟล์ที่นี่!' : 'เลือกไฟล์ของคุณ'}
                    </h3>
                    <p className="text-gray-500">
                      ลากไฟล์มาวาง หรือคลิกปุ่มด้านล่าง
                    </p>
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
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
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 cursor-pointer transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Upload className="w-4 h-4" />
                    เลือกไฟล์
                  </label>
                </div>
              </div>
            )}

            {/* File Preview */}
            {selectedFile && (
              <div className="space-y-6">
                <FilePreview
                  file={selectedFile}
                  preview={filePreview}
                  isAnalyzing={isAnalyzing}
                  onRemove={resetState}
                />

                {/* Upload Button */}
                {filePreview && !isUploading && !uploadComplete && (
                  <div className="text-center space-y-3">
                    <button
                      onClick={handleUpload}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Upload className="w-5 h-5" />
                      เริ่มอัปโหลด
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-gray-600">
                      จะประมวลผล <span className="font-bold text-blue-600">
                        {new Intl.NumberFormat('th-TH').format(filePreview.totalRows)}
                      </span> รายการ ใช้เวลาประมาณ <span className="font-bold text-purple-600">
                        {filePreview.estimatedTime}
                      </span>
                    </p>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <ProgressIndicator
                      progress={uploadProgress}
                      stage={getProgressStage(uploadProgress)}
                    />
                  </div>
                )}

                {/* Success Message */}
                {uploadComplete && uploadStats && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-800">🎉 อัปโหลดสำเร็จ!</h3>
                        <p className="text-green-700">
                          ประมวลผลข้อมูล <span className="font-bold">
                            {new Intl.NumberFormat('th-TH').format(uploadStats.totalRecords)}
                          </span> รายการเรียบร้อยแล้ว
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard
                        icon={<Clock />}
                        label="เวลาประมวลผล"
                        value={uploadStats.processingTime}
                        color="green"
                        size="normal"
                      />
                      <StatCard
                        icon={<TrendingUp />}
                        label="อัตราสำเร็จ"
                        value={uploadStats.successRate}
                        color="green"
                        size="normal"
                      />
                      <StatCard
                        icon={<Database />}
                        label="จำนวนข้อมูล"
                        value={new Intl.NumberFormat('th-TH').format(uploadStats.totalRecords)}
                        color="blue"
                        size="normal"
                      />
                      <StatCard
                        icon={<BarChart3 />}
                        label="คุณภาพข้อมูล"
                        value={uploadStats.dataQuality}
                        color="purple"
                        size="normal"
                      />
                    </div>

                    <div className="mt-4 pt-4 border-t border-green-200">
                      <button
                        onClick={resetState}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium"
                      >
                        <Upload className="w-4 h-4" />
                        อัปโหลดไฟล์ใหม่
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Messages */}
            {fileError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-1">เกิดข้อผิดพลาด</h3>
                    <p className="text-red-700">{fileError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">💡 เคล็ดลับการใช้งาน</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-amber-800">ประสิทธิภาพสูงสุด</p>
                  <p className="text-sm text-amber-700">ไฟล์ .xlsx ประมวลผลเร็วกว่า .csv</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-amber-800">ข้อมูลคุณภาพ</p>
                  <p className="text-sm text-amber-700">ตรวจสอบคอลัมน์สำคัญให้ครบถ้วนก่อนอัปโหลด</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-amber-800">ความปลอดภัย</p>
                  <p className="text-sm text-amber-700">ข้อมูลได้รับการเข้ารหัสและป้องกัน</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-amber-800">ไฟล์ขนาดใหญ่</p>
                  <p className="text-sm text-amber-700">แบ่งไฟล์ใหญ่เป็นส่วนย่อยเพื่อประสิทธิภาพดีขึ้น</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;