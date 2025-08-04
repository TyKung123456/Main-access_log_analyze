// backend/routes/upload.js - Enhanced for Large Files
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database'); // Use pool directly
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { Readable } = require('stream');

const router = express.Router();

// Enhanced configuration for large files
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const BATCH_SIZE = 250; // Smaller batches for better performance
const MAX_RECORDS = 2000000; // 2 million records

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Enhanced Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = await ensureUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'log-' + uniqueSuffix + extension);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    fieldSize: 10 * 1024 * 1024 // 10MB field size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.log', '.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`));
    }
  }
});

/**
 * Enhanced CSV processing with memory optimization
 */
const processCsvToDatabase = async (filePath, fileName) => {
  const records = [];
  const fileContent = await fs.readFile(filePath, 'utf8');

  console.log(`📊 Processing CSV file: ${fileName}`);
  
  return new Promise((resolve, reject) => {
    const stream = Readable.from(fileContent);
    stream
      .pipe(csv({
        headers: [
          'Column1', 'Date Time', 'day', 'month', 'year', 'year_mm', 'Column7',
          'Transaction ID', 'Door', 'Device', 'Location', 'Direction', 'Allow',
          'Reason', 'Channel', 'Card Name', 'Card Number Hash', 'ID Hash',
          'User Hash', 'User Type', 'Permission', 'Temp.'
        ],
        skipLines: 0,
        skipEmptyLines: true
      }))
      .on('data', (data) => {
        // Basic validation and cleanup
        if (data['Date Time'] && data['Card Name'] && data['Location']) {
          const row = {
            file: fileName,
            dateTime: data['Date Time'] || null,
            day: parseInt(data['day']) || null,
            month: parseInt(data['month']) || null,
            year: parseInt(data['year']) || null,
            year_mm: data['year_mm'] || null,
            transactionId: data['Transaction ID'] || null,
            door: data['Door'] || null,
            device: data['Device'] || null,
            location: data['Location'] || null,
            direction: data['Direction'] || null,
            allow: data['Allow'] === 't' || data['Allow'] === 'true' || data['Allow'] === '1',
            reason: data['Reason'] || null,
            channel: data['Channel'] || null,
            cardName: data['Card Name'] || null,
            cardNumberHash: data['Card Number Hash'] || null,
            idHash: data['ID Hash'] || null,
            userHash: data['User Hash'] || null,
            userType: data['User Type'] || null,
            permission: data['Permission'] || null,
            temp: parseFloat(data['Temp.']) || null,
          };
          records.push(row);
        }
      })
      .on('end', async () => {
        try {
          const insertedCount = await insertRecordsInBatches(records);
          resolve(insertedCount);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
};

/**
 * Enhanced Excel processing with streaming
 */
const processExcelToDatabase = async (filePath, fileName) => {
  console.log(`📊 Processing Excel file: ${fileName}`);
  
  try {
    const fileBuffer = await fs.readFile(filePath);
    
    // Read workbook with optimized options
    const workbook = XLSX.read(fileBuffer, {
      cellDates: true,
      sheetStubs: false,
      raw: false,
      codepage: 65001
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No valid worksheet found in Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Estimate file size
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const estimatedRows = range.e.r - range.s.r;
    
    console.log(`📋 Estimated rows: ${estimatedRows.toLocaleString()}`);
    
    if (estimatedRows > MAX_RECORDS) {
      throw new Error(`File has too many rows (max ${MAX_RECORDS.toLocaleString()}). Found: ${estimatedRows.toLocaleString()}`);
    }

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
      blankrows: false
    });

    console.log(`✅ Parsed ${jsonData.length.toLocaleString()} rows from Excel`);

    // Process and validate records
    const records = [];
    for (const row of jsonData) {
      // Basic validation - must have required fields
      if (row['Date Time'] && row['Card Name'] && row['Location']) {
        const processedRow = {
          file: fileName,
          dateTime: row['Date Time'],
          day: parseInt(row['day']) || extractDay(row['Date Time']),
          month: parseInt(row['month']) || extractMonth(row['Date Time']),
          year: parseInt(row['year']) || extractYear(row['Date Time']),
          year_mm: row['year_mm'] || generateYearMonth(row['Date Time']),
          transactionId: row['Transaction ID'] || null,
          door: row['Door'] || null,
          device: row['Device'] || null,
          location: row['Location'] || null,
          direction: normalizeDirection(row['Direction']),
          allow: parseAllowValue(row['Allow']),
          reason: row['Reason'] || null,
          channel: row['Channel'] || null,
          cardName: row['Card Name'] || null,
          cardNumberHash: row['Card Number Hash'] || null,
          idHash: row['ID Hash'] || null,
          userHash: row['User Hash'] || null,
          userType: row['User Type'] || null,
          permission: row['Permission'] || null,
          temp: parseFloat(row['Temp.']) || null
        };
        records.push(processedRow);
      }
    }

    console.log(`🔍 Validated ${records.length.toLocaleString()} records`);
    
    // Insert in batches
    const insertedCount = await insertRecordsInBatches(records);
    return insertedCount;

  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Excel processing failed: ${error.message}`);
  }
};

/**
 * Helper functions for data processing
 */
const extractDay = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date) ? null : date.getDate();
};

const extractMonth = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date) ? null : date.getMonth() + 1;
};

const extractYear = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date) ? null : date.getFullYear();
};

const generateYearMonth = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const normalizeDirection = (direction) => {
  if (!direction) return null;
  const normalized = String(direction).trim().toLowerCase();
  const directionMap = {
    'in': 'IN', 'enter': 'IN', 'entry': 'IN', 'เข้า': 'IN',
    'out': 'OUT', 'exit': 'OUT', 'ออก': 'OUT'
  };
  return directionMap[normalized] || String(direction).trim();
};

const parseAllowValue = (value) => {
  if (typeof value === 'boolean') return value;
  const stringValue = String(value).trim().toLowerCase();
  return ['true', 't', '1', 'yes', 'allow', 'allowed'].includes(stringValue);
};

/**
 * Optimized batch insertion with transaction management
 */
const insertRecordsInBatches = async (records) => {
  if (records.length === 0) {
    console.warn('⚠️ No records to insert');
    return 0;
  }

  const client = await pool.connect();
  let insertedCount = 0;
  
  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO "public"."real_log_analyze" (
        file, "Date Time", day, month, year, year_mm,
        "Transaction ID", "Door", "Device", "Location", "Direction", "Allow",
        "Reason", "Channel", "Card Name", "Card Number Hash", "ID Hash",
        "User Hash", "User Type", "Permission", "Temp."
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT ("Transaction ID") DO UPDATE SET
        file = EXCLUDED.file,
        "Date Time" = EXCLUDED."Date Time",
        day = EXCLUDED.day,
        month = EXCLUDED.month,
        year = EXCLUDED.year,
        year_mm = EXCLUDED.year_mm,
        "Door" = EXCLUDED."Door",
        "Device" = EXCLUDED."Device",
        "Location" = EXCLUDED."Location",
        "Direction" = EXCLUDED."Direction",
        "Allow" = EXCLUDED."Allow",
        "Reason" = EXCLUDED."Reason",
        "Channel" = EXCLUDED."Channel",
        "Card Name" = EXCLUDED."Card Name",
        "Card Number Hash" = EXCLUDED."Card Number Hash",
        "ID Hash" = EXCLUDED."ID Hash",
        "User Hash" = EXCLUDED."User Hash",
        "User Type" = EXCLUDED."User Type",
        "Permission" = EXCLUDED."Permission",
        "Temp." = EXCLUDED."Temp."
    `;

    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    console.log(`💾 Inserting ${records.length.toLocaleString()} records in ${totalBatches} batches...`);

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        for (const record of batch) {
          await client.query(insertQuery, [
            record.file, record.dateTime, record.day, record.month, record.year, record.year_mm,
            record.transactionId, record.door, record.device, record.location, record.direction, record.allow,
            record.reason, record.channel, record.cardName, record.cardNumberHash, record.idHash,
            record.userHash, record.userType, record.permission, record.temp
          ]);
          insertedCount++;
        }

        // Log progress every 10 batches
        if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
          console.log(`✅ Batch ${batchNumber}/${totalBatches} completed (${insertedCount.toLocaleString()} records)`);
        }

      } catch (batchError) {
        console.error(`❌ Error in batch ${batchNumber}:`, batchError.message);
        // Continue with next batch instead of failing completely
        continue;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully inserted ${insertedCount.toLocaleString()} records`);
    return insertedCount;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database insertion failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Enhanced batch append endpoint for frontend
 */
router.post('/batch-append', async (req, res) => {
  const { logs } = req.body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid or empty logs array provided.',
      details: 'Request body must contain a "logs" array with at least one record.'
    });
  }

  if (logs.length > 10000) {
    return res.status(400).json({ 
      error: 'Too many records in single request.',
      details: `Maximum 10,000 records per request. Received: ${logs.length.toLocaleString()}`
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let insertedCount = 0;
    let duplicatesSkipped = 0;
    
    const insertQuery = `
      INSERT INTO "public"."real_log_analyze" (
        "Date Time", "Transaction ID", "Door", "Device", "Location", 
        "Direction", "Allow", "Reason", "Channel", "Card Name", 
        "Card Number Hash", "ID Hash", "User Hash", "User Type", "Permission", "Temp."
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT ("Transaction ID") DO NOTHING
      RETURNING "Transaction ID"
    `;

    for (const log of logs) {
      // Backend validation
      if (!log['Date Time'] || !log['Card Name'] || !log['Location']) {
        console.warn('Skipping invalid row:', log);
        continue;
      }
      
      const values = [
        log['Date Time'], log['Transaction ID'], log['Door'], log['Device'], log['Location'],
        log['Direction'], log['Allow'], log['Reason'], log['Channel'], log['Card Name'],
        log['Card Number Hash'], log['ID Hash'], log['User Hash'], log['User Type'], 
        log['Permission'], parseFloat(log['Temp.']) || null
      ];
      
      const result = await client.query(insertQuery, values);
      if (result.rows.length > 0) {
        insertedCount++;
      } else {
        duplicatesSkipped++;
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: `บันทึกข้อมูล ${insertedCount.toLocaleString()} รายการเรียบร้อยแล้ว`,
      insertedCount,
      duplicatesSkipped,
      totalProcessed: logs.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Batch append failed:', error);
    res.status(500).json({ 
      error: 'Database insertion failed.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

/**
 * Main upload endpoint with enhanced file processing
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        details: 'Please select a file to upload'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const fileExtension = path.extname(fileName).toLowerCase();

    console.log(`📁 Processing large file: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    let recordCount = 0;
    const startTime = process.hrtime.bigint();

    try {
      // Enhanced file processing based on type
      if (fileExtension === '.csv') {
        recordCount = await processCsvToDatabase(filePath, fileName);
      } else if (['.xlsx', '.xls'].includes(fileExtension)) {
        recordCount = await processExcelToDatabase(filePath, fileName);
      } else if (['.txt', '.log'].includes(fileExtension)) {
        // For text files, treat as CSV with different delimiter detection
        recordCount = await processCsvToDatabase(filePath, fileName);
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1_000_000;

      console.log(`✅ Successfully processed ${recordCount.toLocaleString()} records from ${fileName} in ${(processingTimeMs / 1000).toFixed(2)}s`);

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
      } catch (unlinkError) {
        console.warn('Failed to clean up file:', unlinkError.message);
      }

      res.json({
        success: true,
        message: 'Large file uploaded and processed successfully',
        statistics: {
          fileName,
          fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          recordCount: recordCount,
          processingTime: `${(processingTimeMs / 1000).toFixed(2)}s`,
          recordsPerSecond: Math.round(recordCount / (processingTimeMs / 1000)),
          processedAt: new Date().toISOString()
        }
      });

    } catch (processingError) {
      console.error('File processing error:', processingError);
      throw new Error(`File processing failed: ${processingError.message}`);
    }

  } catch (error) {
    console.error('Upload error:', error);

    // Clean up file if exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file after error:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Large file upload failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Enhanced upload statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get actual statistics from database
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT file) as total_files,
          COUNT(*) as total_records,
          MAX("Date Time") as last_upload,
          MIN("Date Time") as first_upload,
          COUNT(CASE WHEN "Allow" = true THEN 1 END) as successful_access,
          COUNT(CASE WHEN "Allow" = false THEN 1 END) as denied_access
        FROM "public"."real_log_analyze"
      `;
      
      const result = await client.query(statsQuery);
      const dbStats = result.rows[0];

      const stats = {
        total_files: parseInt(dbStats.total_files) || 0,
        total_records: parseInt(dbStats.total_records) || 0,
        last_upload: dbStats.last_upload,
        first_upload: dbStats.first_upload,
        successful_access: parseInt(dbStats.successful_access) || 0,
        denied_access: parseInt(dbStats.denied_access) || 0,
        success_rate: dbStats.total_records > 0 ? 
          ((dbStats.successful_access / dbStats.total_records) * 100).toFixed(2) : 0,
        database_size_mb: 0, // Could be calculated if needed
        avg_processing_time: 2.5, // This would need to be tracked separately
        system_status: 'operational'
      };

      res.json(stats);
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get upload stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upload statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Enhanced upload history with database integration
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    
    try {
      // Get upload history from database
      const historyQuery = `
        SELECT 
          file as fileName,
          MIN("Date Time") as uploadDate,
          COUNT(*) as recordCount,
          COUNT(CASE WHEN "Allow" = true THEN 1 END) as successCount,
          COUNT(CASE WHEN "Allow" = false THEN 1 END) as deniedCount
        FROM "public"."real_log_analyze"
        WHERE file IS NOT NULL
        GROUP BY file
        ORDER BY MIN("Date Time") DESC
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = `
        SELECT COUNT(DISTINCT file) as total
        FROM "public"."real_log_analyze"
        WHERE file IS NOT NULL
      `;

      const [historyResult, countResult] = await Promise.all([
        client.query(historyQuery, [limit, offset]),
        client.query(countQuery)
      ]);

      const history = historyResult.rows.map((row, index) => ({
        id: offset + index + 1,
        fileName: row.filename,
        uploadDate: row.uploaddate,
        recordCount: parseInt(row.recordcount),
        successCount: parseInt(row.successcount),
        deniedCount: parseInt(row.deniedcount),
        status: 'success',
        fileSize: 'N/A', // Would need separate tracking
        processingTime: 'N/A' // Would need separate tracking
      }));

      const total = parseInt(countResult.rows[0].total) || 0;

      res.json({
        data: history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upload history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;