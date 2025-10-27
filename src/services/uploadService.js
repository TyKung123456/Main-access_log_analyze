// src/services/uploadService.js - Refactored for Robustness and Performance
import apiService from './apiService.js';
import * as XLSX from 'xlsx';

class EnhancedUploadService {
  constructor() {
    this.MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit
    this.MAX_RECORDS = 2000000; // 2 million records limit
    this.VALIDATION_BATCH_SIZE = 2000; // Validate 2000 records at a time
    this.INSERT_BATCH_SIZE = 250; // Insert 250 records per batch to prevent timeout
  }

  /**
   * Main upload function.
   * NOTE: For optimal performance and to prevent UI blocking with very large files,
   * this entire function should be executed inside a Web Worker.
   * The worker would receive the file and post messages back with progress updates and the final result.
   */
  async uploadFile(file, progressCallback) {
    const startTime = Date.now();
    try {
      console.log('🚀 Starting large file upload process...');
      progressCallback(2, 'ตรวจสอบไฟล์...');

      // Phase 1: File validation
      this.validateFile(file);
      progressCallback(5, 'ตรวจสอบไฟล์สำเร็จ');

      // Phase 2: Parse file
      console.log('📖 Parsing large file...');
      const { rows, totalRows, headerMap } = await this.parseFile(file, progressCallback);
      progressCallback(25, 'อ่านไฟล์สำเร็จ');

      // Phase 3: Data validation
      console.log('🔍 Validating data...');
      const validationResult = await this.validateDataChunked(rows, headerMap, progressCallback, 25, 60);
      progressCallback(60, 'ตรวจสอบข้อมูลสำเร็จ');

      // Phase 4: Generate detailed preview
      const preview = this.generateDetailedPreview(validationResult, headerMap);
      progressCallback(65, 'สร้างตัวอย่างข้อมูล');

      // Phase 5: Database insertion
      console.log('💾 Inserting data...');
      const insertResult = await this.insertDataOptimized(validationResult.validRows, progressCallback, 65, 95);
      progressCallback(95, 'บันทึกข้อมูลใกล้เสร็จสิ้น');

      // Phase 6: Final Report
      const finalResult = this.createFinalReport(file, startTime, {
        totalRows,
        validationResult,
        insertResult,
        preview,
      });

      progressCallback(100, 'อัปโหลดสำเร็จ!');
      console.log('✅ Large file upload completed successfully:', finalResult.statistics);
      return finalResult;

    } catch (error) {
      console.error('❌ Large file upload failed:', error);
      progressCallback(0, 'การอัปโหลดล้มเหลว');
      // Rethrow a more user-friendly error message
      throw new Error(`การอัปโหลดไฟล์ล้มเหลว: ${error.message}`);
    }
  }

  // --- Phase 1: File Validation ---
  validateFile(file) {
    const validExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      throw new Error(`ประเภทไฟล์ไม่รองรับ (.${fileExtension}). กรุณาใช้ไฟล์ .xlsx, .xls หรือ .csv`);
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }
    console.log('✅ File validation passed.');
  }

  // --- Phase 2: File Parsing ---
  async parseFile(file, progressCallback) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = 5 + (e.loaded / e.total) * 15; // Progress from 5% to 20%
          progressCallback(Math.round(progress), 'กำลังอ่านไฟล์...');
        }
      };

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const fileName = file.name.toLowerCase();

          let rows = [];
          if (fileName.endsWith('.csv')) {
            // Decode CSV text with encoding fallback
            const bytes = new Uint8Array(data);
            let text = new TextDecoder('utf-8').decode(bytes);
            const looksMojibake = /à¸|Ã|â€™|â€/.test(text);
            if (looksMojibake) {
              try {
                text = new TextDecoder('windows-874').decode(bytes);
              } catch (e1) {
                try {
                  text = new TextDecoder('iso-8859-11').decode(bytes); // TIS-620 alias
                } catch (e2) {
                  console.warn('Failed to decode as windows-874/tis-620, using utf-8 text');
                }
              }
            }

            const wb = XLSX.read(text, { type: 'string' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
          } else {
            // Excel path
            const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error('ไม่พบแผ่นงาน (worksheet) ในไฟล์');
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });
          }

          if (rows.length < 2) throw new Error('ไฟล์ต้องมีอย่างน้อย 1 header และ 1 แถวข้อมูล');

          const headers = rows[0].map(h => String(h || '').trim());
          const headerMap = this.validateAndMapHeaders(headers);

          const dataRows = rows.slice(1).map(rowArray => {
            const rowObj = {};
            headers.forEach((header, index) => {
              if (header) rowObj[header] = rowArray[index];
            });
            return rowObj;
          });

          if (dataRows.length > this.MAX_RECORDS) {
            throw new Error(`ไฟล์มีข้อมูลมากเกินไป (สูงสุด ${this.MAX_RECORDS.toLocaleString()} แถว)`);
          }

          console.log(`✅ Parsed ${dataRows.length.toLocaleString()} rows.`);
          resolve({ rows: dataRows, totalRows: dataRows.length, headerMap });
        } catch (error) {
          reject(new Error(`ไม่สามารถอ่านไฟล์ได้: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดขณะอ่านไฟล์'));
      // Always read as ArrayBuffer; we handle CSV decoding ourselves
      reader.readAsArrayBuffer(file);
    });
  }

  validateAndMapHeaders(headers) {
    const requiredHeaders = {
      'Date Time': 'dateTime',
      'Card Name': 'cardName',
      'Location': 'location'
    };
    const optionalHeaders = {
      'Allow': 'allow', 'Direction': 'direction', 'User Type': 'userType', 
      'Transaction ID': 'transactionId', 'Door': 'door', 'Device': 'device',
      'Reason': 'reason', 'Channel': 'channel', 'Card Number Hash': 'cardNumberHash',
      'ID Hash': 'idHash', 'User Hash': 'userHash', 'Permission': 'permission', 'Temp.': 'temp'
    };

    const headerMap = {};
    const lowerCaseHeaders = headers.map(h => h.toLowerCase());
    const allMappings = { ...requiredHeaders, ...optionalHeaders };
    
    // Check for required headers
    for (const [key, value] of Object.entries(requiredHeaders)) {
      const index = lowerCaseHeaders.indexOf(key.toLowerCase());
      if (index === -1) {
        throw new Error(`ขาดคอลัมน์ที่จำเป็น: "${key}"`);
      }
      headerMap[value] = headers[index]; // Map standard name to actual header name
    }
    
    // Map optional headers
    for (const [key, value] of Object.entries(optionalHeaders)) {
        const index = lowerCaseHeaders.indexOf(key.toLowerCase());
        if (index !== -1) {
            headerMap[value] = headers[index];
        }
    }

    // Map common synonyms to our standard keys (best-effort)
    const synonyms = {
      'card number': 'cardNumberHash',
      'cardnumber': 'cardNumberHash',
      'card no': 'cardNumberHash',
      'id': 'idHash',
      'user': 'userHash'
    };
    lowerCaseHeaders.forEach((hName, idx) => {
      if (synonyms[hName] && !headerMap[synonyms[hName]]) {
        headerMap[synonyms[hName]] = headers[idx];
      }
    });
    
    console.log('✅ Headers validated and mapped:', headerMap);
    return headerMap;
  }

  // --- Phase 3: Data Validation ---
  async validateDataChunked(rows, headerMap, progressCallback, startProgress, endProgress) {
    const validRows = [];
    const errors = [];
    const warnings = [];
    const duplicateCheck = new Set();
    let skippedRows = 0;

    const totalChunks = Math.ceil(rows.length / this.VALIDATION_BATCH_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.VALIDATION_BATCH_SIZE;
      const end = start + this.VALIDATION_BATCH_SIZE;
      const chunk = rows.slice(start, end);

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowNumber = start + j + 2; // Excel row number

        if (this.isEmptyRow(row)) {
          skippedRows++;
          continue;
        }

        const validation = this.validateRow(row, rowNumber, headerMap, duplicateCheck);
        // ผ่อนกฎ: ไม่คัดทิ้งแถวแม้มี error เว้นแต่เป็นแถวว่างจริงๆ
        if (validation.errors.length > 0) {
          const onlyEmpty = validation.errors.length === 1 && /แถวว่าง|empty row/i.test(validation.errors[0]);
          if (onlyEmpty) {
            skippedRows++;
            continue;
          }
          // นอกนั้นเก็บเป็นคำเตือนเพื่อให้ยังบันทึกได้
          warnings.push(...validation.errors);
        }
        warnings.push(...validation.warnings);
        const cleanedRow = this.cleanRowData(row, headerMap);
        validRows.push(cleanedRow);

        // Add to duplicate check set
        if (cleanedRow.transactionId) {
            duplicateCheck.add(cleanedRow.transactionId);
        }
      }
      
      const progress = startProgress + ((i + 1) / totalChunks) * (endProgress - startProgress);
      progressCallback(Math.round(progress), `กำลังตรวจสอบข้อมูล (${i + 1}/${totalChunks})`);
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
    }

    console.log(`✅ Validation completed: ${validRows.length} valid, ${errors.length} errors.`);
    return { validRows, errors, warnings, skippedRows };
  }

  validateRow(row, rowNumber, headerMap, duplicateCheck) {
    const errors = [];
    const warnings = [];
    // ผ่อนกฎ: ตัดทิ้งเฉพาะแถวว่างเท่านั้น
    const hasAnyValue = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (!hasAnyValue) {
      errors.push(`แถวที่ ${rowNumber}: แถวว่าง (empty row)`);
      return { errors, warnings };
    }
    
    // Date validation
    const dateValue = row[headerMap.dateTime];
    const parsedDate = this.parseFlexibleDate(dateValue);
    if (!parsedDate && dateValue != null && String(dateValue).trim() !== '') {
      warnings.push(`แถวที่ ${rowNumber}: รูปแบบวันที่ใน "Date Time" ไม่ถูกต้อง: "${dateValue}"`);
    } else if (parsedDate && parsedDate > new Date()) {
      warnings.push(`แถวที่ ${rowNumber}: วันที่เป็นวันในอนาคต: "${dateValue}"`);
    }

    // Duplicate check
    const transactionId = row[headerMap.transactionId];
    if (transactionId && duplicateCheck.has(String(transactionId).trim())) {
      warnings.push(`แถวที่ ${rowNumber}: Transaction ID "${transactionId}" ซ้ำซ้อนภายในไฟล์`);
    }

    return { errors, warnings };
  }
  
  isEmptyRow(row) {
    return Object.values(row).every(val => val === null || val === undefined || String(val).trim() === '');
  }

  // --- Data Cleaning ---
  cleanRowData(row, headerMap) {
    const cleaned = {};
    const h = headerMap; // Alias for brevity

    const parsedDate = this.parseFlexibleDate(row[h.dateTime]);

    // Map standard keys to cleaned values
    cleaned.dateTime = parsedDate ? parsedDate.toISOString() : null;
    // Prefer Card Name; if absent, fallback to User / Card Number / ID
    const candidateName = this.cleanString(row[h.cardName])
      || (h.userHash && this.cleanString(row[h.userHash]))
      || (h.cardNumberHash && this.cleanString(row[h.cardNumberHash]))
      || (h.idHash && this.cleanString(row[h.idHash]))
      || null;
    cleaned.cardName = candidateName;
    cleaned.location = this.cleanString(row[h.location]);
    cleaned.allow = this.parseBoolean(row[h.allow]);
    cleaned.direction = this.normalizeDirection(row[h.direction]);
    cleaned.userType = this.cleanString(row[h.userType]);
    cleaned.transactionId = this.cleanString(row[h.transactionId]);
    // Optional fields (map if present)
    if (h.door) cleaned.door = this.cleanString(row[h.door]);
    if (h.device) cleaned.device = this.cleanString(row[h.device]);
    if (h.reason) cleaned.reason = this.cleanString(row[h.reason]);
    if (h.channel) cleaned.channel = this.cleanString(row[h.channel]);
    if (h.permission) cleaned.permission = this.cleanString(row[h.permission]);
    if (h.cardNumberHash) cleaned.cardNumberHash = this.cleanString(row[h.cardNumberHash]);
    if (h.idHash) cleaned.idHash = this.cleanString(row[h.idHash]);
    if (h.userHash) cleaned.userHash = this.cleanString(row[h.userHash]);

    // Add computed date fields
    cleaned.day = parsedDate ? parsedDate.getDate() : null;
    cleaned.month = parsedDate ? (parsedDate.getMonth() + 1) : null;
    cleaned.year = parsedDate ? parsedDate.getFullYear() : null;

    return cleaned;
  }
  
  // --- Phase 5: Data Insertion ---
  async insertDataOptimized(validRows, progressCallback, startProgress, endProgress) {
    if (validRows.length === 0) {
      return { insertedCount: 0, duplicatesSkipped: 0, failedRows: 0, failedBatches: [] };
    }
    
    let insertedCount = 0;
    let duplicatesSkipped = 0;
    let failedRows = 0;
    const failedBatches = [];
    const totalBatches = Math.ceil(validRows.length / this.INSERT_BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * this.INSERT_BATCH_SIZE;
        const batch = validRows.slice(start, start + this.INSERT_BATCH_SIZE);
        try {
            const result = await apiService.appendLogData(batch);
            insertedCount += result.insertedCount || 0;
            duplicatesSkipped += result.duplicatesSkipped || 0;
            failedRows += result.failedRows || 0;
        } catch (error) {
            console.error(`❌ Failed to insert batch ${i + 1}:`, error);
            failedBatches.push({ batchIndex: i, error: error.message });
        }
        const progress = startProgress + ((i + 1) / totalBatches) * (endProgress - startProgress);
        progressCallback(Math.round(progress), `กำลังบันทึกข้อมูล (${i + 1}/${totalBatches})`);
    }
    
    console.log(`✅ Insertion completed: ${insertedCount} inserted, ${failedRows} failed rows, ${failedBatches.length} failed batches.`);
    return { insertedCount, duplicatesSkipped, failedRows, failedBatches };
  }

  // --- Phase 6: Final Report ---
  createFinalReport(file, startTime, results) {
    const { totalRows, validationResult, insertResult, preview } = results;
    const { validRows, errors, warnings, skippedRows } = validationResult;
    const { insertedCount, duplicatesSkipped, failedRows, failedBatches } = insertResult;
    
    const processingTime = Date.now() - startTime;
    const success = errors.length === 0 && failedBatches.length === 0 && failedRows === 0;

    let message = `ประมวลผลสำเร็จ! บันทึกข้อมูลใหม่ ${insertedCount.toLocaleString()} รายการ`;
    if (!success) {
        message = `ประมวลผลเสร็จสิ้น แต่พบปัญหา: บันทึกได้ ${insertedCount.toLocaleString()} รายการ, แถวไม่ผ่านการตรวจสอบ ${errors.length} แถว, แถวบันทึกไม่สำเร็จ ${failedRows} แถว, และ ${failedBatches.length} batch ล้มเหลว`;
    }
    
    return {
      success,
      message,
      statistics: {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        processingTime: `${(processingTime / 1000).toFixed(2)} วินาที`,
        totalRows,
        validRows: validRows.length,
        insertedRows: insertedCount,
        failedRows,
        errorRows: errors.length,
        warningRows: warnings.length,
        skippedRows,
        duplicatesSkipped,
      },
      preview,
      errors: errors.slice(0, 50), // Show first 50 errors
      warnings: warnings.slice(0, 50),
    };
  }

  // --- Helper Functions ---
  parseFlexibleDate(dateInput) {
    if (!dateInput) return null;
    // Already a Date
    if (dateInput instanceof Date && !isNaN(dateInput)) return dateInput;

    // Excel serial number (days since 1899-12-30)
    if (typeof dateInput === 'number' && isFinite(dateInput)) {
      const excelEpoch = 25569; // days between 1899-12-30 and 1970-01-01
      const ms = (dateInput - excelEpoch) * 86400 * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    let s = String(dateInput).trim();
    if (!s) return null;

    // Normalize common ISO-like format without 'T'
    // e.g., '2024-09-01 08:15:00' -> '2024-09-01T08:15:00'
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
      s = s.replace(' ', 'T');
    }

    // Handle DD/MM/YYYY (or DD-MM-YYYY), with optional time
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      let [ , dd, mm, yyyy, hh='0', min='0', sec='0' ] = m;
      let y = parseInt(yyyy, 10);
      // Convert Buddhist year to Gregorian if needed
      if (y >= 2400) y -= 543;
      const d = new Date(
        y,
        Math.max(0, parseInt(mm, 10) - 1),
        parseInt(dd, 10),
        parseInt(hh, 10),
        parseInt(min, 10),
        parseInt(sec, 10)
      );
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback to native Date parser
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  
  cleanString(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === '' ? null : str;
  }

  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    const str = String(value || '').trim().toLowerCase();
    return ['true', 't', '1', 'yes', 'allow'].includes(str);
  }
  
  normalizeDirection(value) {
    const str = String(value || '').trim().toLowerCase();
    if (['in', 'enter', 'entry', 'เข้า'].includes(str)) return 'IN';
    if (['out', 'exit', 'ออก'].includes(str)) return 'OUT';
    return null;
  }
  
  // Placeholder for generateDetailedPreview, can be expanded as before
  generateDetailedPreview(validationResult, headerMap) {
    const { validRows } = validationResult;
    if (validRows.length === 0) return { sampleRows: [], summary: {} };
    return {
      sampleRows: validRows.slice(0, 10).map(row => {
          // Convert cleaned data back to original header format for display
          const displayRow = {};
          for (const key in headerMap) {
              displayRow[headerMap[key]] = row[key];
          }
          return displayRow;
      }),
      summary: {
        totalValid: validRows.length,
        // Other stats can be added here
      }
    };
  }
}

export default new EnhancedUploadService();
