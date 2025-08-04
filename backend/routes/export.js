// backend/routes/export.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database'); // เพิ่มการนำเข้า query

// Helper function to generate CSV content
const generateCSV = (data) => {
  const headers = [
    'DateTime',
    'Location',
    'Direction',
    'Allow',
    'CardName',
    'CardNumber',
    'UserType',
    'Reason',
    'Device',
    'Door'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = [
      row.dateTime || '',
      row.location || '',
      row.direction || '',
      row.allow || '', // 't' or 'f' from DB
      row.cardName || '',
      row.cardNumber || '',
      row.userType || '',
      row.reason || '',
      row.device || '',
      row.door || ''
    ].map(value => {
      // Escape commas and quotes in CSV
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });

    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
};

// Helper function to generate JSON content
const generateJSON = (data) => {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    totalRecords: data.length,
    data: data
  }, null, 2);
};

// GET /api/export/:format - Export data in specified format
router.get('/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const {
      startDate,
      endDate,
      location,
      direction,
      allow,
      limit = 1000 // เพิ่ม limit สำหรับ query
    } = req.query;

    // Validate format
    if (!['csv', 'json', 'excel'].includes(format)) {
      return res.status(400).json({
        error: 'Invalid export format',
        supportedFormats: ['csv', 'json', 'excel']
      });
    }

    console.log(`📊 Generating ${format.toUpperCase()} export...`);

    // Build WHERE clause for database query
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (startDate && endDate) {
      paramCount++;
      conditions.push(`CAST("Date Time" AS TIMESTAMP) BETWEEN $${paramCount} AND $${paramCount + 1}`);
      values.push(startDate, endDate);
      paramCount++;
    }
    if (location) {
      paramCount++;
      conditions.push(`"Location" = $${paramCount}`);
      values.push(location);
    }
    if (direction) {
      paramCount++;
      conditions.push(`"Direction" = $${paramCount}`);
      values.push(direction);
    }
    if (allow !== undefined) {
      paramCount++;
      conditions.push(`"Allow" = $${paramCount}`);
      values.push(allow === 'true' ? 't' : 'f'); // แปลง 'true'/'false' จาก frontend เป็น 't'/'f'
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch data from database
    const dataQuery = `
      SELECT
        "Date Time" as "dateTime",
        "Location" as "location",
        "Direction" as "direction",
        "Allow" as "allow",
        "Card Name" as "cardName",
        "Card Number Hash" as "cardNumber",
        "User Type" as "userType",
        "Reason" as "reason",
        "Device" as "device",
        "Door" as "door"
      FROM "public"."real_log_analyze"
      ${whereClause}
      ORDER BY "Date Time" DESC
      LIMIT $${values.length + 1}
    `;

    const result = await query(dataQuery, [...values, parseInt(limit)]);
    const data = result.rows;

    const timestamp = new Date().toISOString().split('T')[0];

    // Generate file based on format
    switch (format) {
      case 'csv':
        const csvContent = generateCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=access_logs_${timestamp}.csv`);
        res.send(csvContent);
        break;

      case 'json':
        const jsonContent = generateJSON(data);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=access_logs_${timestamp}.json`);
        res.send(jsonContent);
        break;

      case 'excel':
        // For now, return CSV with .xlsx extension
        // In a real project, you'd use a library like xlsx or exceljs
        const excelContent = generateCSV(data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=access_logs_${timestamp}.xlsx`);
        res.send(excelContent);
        break;

      default:
        return res.status(400).json({ error: 'Unsupported format' });
    }

    console.log(`✅ Export completed: ${data.length} records in ${format} format`);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/export/preview/:format - Preview export data
router.get('/preview/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { limit = 10 } = req.query;

    // Fetch sample data from database for preview
    const dataQuery = `
      SELECT
        "Date Time" as "dateTime",
        "Location" as "location",
        "Direction" as "direction",
        "Allow" as "allow",
        "Card Name" as "cardName",
        "Card Number Hash" as "cardNumber",
        "User Type" as "userType",
        "Reason" as "reason",
        "Device" as "device",
        "Door" as "door"
      FROM "public"."real_log_analyze"
      ORDER BY "Date Time" DESC
      LIMIT $1
    `;
    const result = await query(dataQuery, [parseInt(limit)]);
    const sampleData = result.rows;

    res.json({
      format,
      sampleCount: sampleData.length,
      preview: sampleData.slice(0, 5), // Show first 5 records
      estimatedSize: format === 'csv' ?
        `${(generateCSV(sampleData).length / 1024).toFixed(2)} KB` :
        `${(JSON.stringify(sampleData).length / 1024).toFixed(2)} KB`
    });

  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({
      error: 'Failed to generate export preview',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
