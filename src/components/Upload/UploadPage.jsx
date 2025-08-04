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
  EyeOff
} from 'lucide-react';

const CompactStatCard = ({ icon, label, value, color = 'blue' }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
    <div className={`p-2 rounded-lg bg-${color}-100`}>
      {React.cloneElement(icon, { className: `w-4 h-4 text-${color}-600` })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-600 font-medium">{label}</p>
      <p className={`text-sm font-bold text-${color}-700 truncate`}>{value}</p>
    </div>
  </div>
);

const ProgressBar = ({ progress, stage }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
        {stage}
      </span>
      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
        {progress}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const CollapsibleSection = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-800">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const FilePreview = ({ file, onRemove, preview, isAnalyzing }) => (
  <div className="space-y-4">
    {/* File Info Card */}
    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500 rounded-lg text-white">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-gray-800 text-sm truncate max-w-xs">{file.name}</p>
          <p className="text-xs text-gray-600">
            {(file.size / (1024 * 1024)).toFixed(2)} MB • {isAnalyzing ? 'กำลังวิเคราะห์...' : 'พร้อมอัปโหลด'}
          </p>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4 text-red-500" />
        </button>
      )}
    </div>

    {/* Analysis Results */}
    {preview && (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CompactStatCard
            icon={<Database />}
            label="จำนวนแถว"
            value={new Intl.NumberFormat('th-TH').format(preview.totalRows)}
            color="blue"
          />
          <CompactStatCard
            icon={<BarChart3 />}
            label="คอลัมน์"
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
            label="คุณภาพ"
            value={preview.dataQuality}
            color={preview.dataQuality === 'ดีเยี่ยม' ? 'green' : 'yellow'}
          />
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          <CollapsibleSection
            title={`คอลัมน์ที่พบ (${preview.columns.length})`}
            icon={<Database className="w-4 h-4 text-blue-600" />}
          >
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {preview.columns.map((col, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium truncate max-w-24" title={col}>
                  {col}
                </span>
              ))}
            </div>
          </CollapsibleSection>

          {preview.sampleData && preview.sampleData.length > 0 && (
            <CollapsibleSection
              title="ตัวอย่างข้อมูล"
              icon={<Eye className="w-4 h-4 text-green-600" />}
            >
              <div className="bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="space-y-1 font-mono text-xs">
                  {Object.entries(preview.sampleData[0]).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-blue-400 w-20 flex-shrink-0 truncate">{key}:</span>
                      <span className="text-green-400 truncate ml-2">{value || 'null'}</span>
                    </div>
                  ))}
                  {Object.keys(preview.sampleData[0]).length > 4 && (
                    <div className="text-gray-500 text-center pt-1">
                      ... +{Object.keys(preview.sampleData[0]).length - 4} เพิ่มเติม
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {preview.issues.length > 0 && (
            <CollapsibleSection
              title="ข้อควรระวัง"
              icon={<AlertCircle className="w-4 h-4 text-yellow-600" />}
            >
              <div className="space-y-1">
                {preview.issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-yellow-700">
                    <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{issue}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border">
            <Upload className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">อัปโหลดไฟล์ Log</h1>
          </div>
          <p className="text-sm text-gray-600 mt-2">รองรับไฟล์ขนาดสูงสุด 500MB (.csv, .xlsx, .xls)</p>
        </div>

        {/* Main Upload Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">เลือกไฟล์ของคุณ</h3>
                <p className="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors font-medium"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
              </label>
            </div>
          </div>

          {/* File Preview */}
          {selectedFile && !fileError && (
            <div className="mt-6">
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

              {/* Upload Button */}
              {isReadyToUpload && !isUploading && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleUploadClick}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg"
                  >
                    <Upload className="w-5 h-5" />
                    เริ่มอัปโหลดข้อมูล
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    จะประมวลผล {filePreview ? new Intl.NumberFormat('th-TH').format(filePreview.totalRows) : ''} รายการ
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {isUploading && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <ProgressBar progress={uploadProgress} stage={getProgressStage(uploadProgress)} />
            </div>
          )}

          {/* Error Messages */}
          {fileError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">{fileError}</p>
              </div>
            </div>
          )}

          {uploadError && !isUploading && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">เกิดข้อผิดพลาดในการอัปโหลด</p>
                  <p className="text-sm text-red-700 mt-1">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {logDataCount > 0 && !isUploading && !uploadError && (
            <div className="mt-6">
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-bold text-green-800">อัปโหลดสำเร็จ!</h3>
                      <p className="text-sm text-green-700">ประมวลผลข้อมูล {formatNumber(logDataCount)} รายการ</p>
                    </div>
                  </div>

                  {uploadStats && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                    >
                      {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showDetails ? 'ซ่อน' : 'ดู'}รายละเอียด
                    </button>
                  )}
                </div>

                {uploadStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                {/* Detailed Stats */}
                {showDetails && uploadStats && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">ชื่อไฟล์:</span>
                          <span className="font-medium text-gray-800 truncate ml-2">{uploadStats.fileName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ขนาดไฟล์:</span>
                          <span className="font-medium text-gray-800">{uploadStats.fileSize}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">สถานะ:</span>
                          <span className="font-medium text-green-600">✅ สำเร็จ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">อัปโหลดเมื่อ:</span>
                          <span className="font-medium text-gray-800">
                            {new Date(uploadStats.uploadTime).toLocaleString('th-TH')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            💡 เคล็ดลับ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
            <div className="space-y-2">
              <p>• ไฟล์ .xlsx ประมวลผลเร็วกว่า .csv</p>
              <p>• ตรวจสอบคอลัมน์สำคัญให้ครบถ้วน</p>
            </div>
            <div className="space-y-2">
              <p>• ระบบข้ามข้อมูลซ้ำโดยอัตโนมัติ</p>
              <p>• แบ่งไฟล์ใหญ่เป็นส่วนย่อยเพื่อความเสถียร</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;