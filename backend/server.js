// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const anomalyRoutes = require('./routes/anomalyRoutes');
const { query } = require('./config/database');
const logsRoutes = require('./routes/logs');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to build WHERE clause for queries
const buildWhereClause = (params) => {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (params.search) {
        conditions.push(`("Card Name" ILIKE $${paramIndex} OR "Location" ILIKE $${paramIndex} OR "Reason" ILIKE $${paramIndex})`);
        values.push(`%${params.search}%`);
        paramIndex++;
    }
    if (params.startDate && params.endDate) {
        conditions.push(`"Date Time" BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(params.startDate);
        values.push(params.endDate);
        paramIndex += 2;
    }
    if (params.allow !== undefined && params.allow !== null) {
        conditions.push(`"Allow" = $${paramIndex}`);
        values.push(params.allow === 'true'); // Convert string 'true'/'false' to boolean
        paramIndex++;
    }
    if (params.location && Array.isArray(params.location) && params.location.length > 0) {
        conditions.push(`"Location" = ANY($${paramIndex}::text[])`);
        values.push(params.location);
        paramIndex++;
    }
    if (params.direction && Array.isArray(params.direction) && params.direction.length > 0) {
        conditions.push(`"Direction" = ANY($${paramIndex}::text[])`);
        values.push(params.direction);
        paramIndex++;
    }
    if (params.userType && Array.isArray(params.userType) && params.userType.length > 0) {
        conditions.push(`"User Type" = ANY($${paramIndex}::text[])`);
        values.push(params.userType);
        paramIndex++;
    }

    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        values
    };
};

// --- Middleware ---
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// --- Routes ---
app.use('/api/logs', logsRoutes);
app.use('/api/stats', statsRoutes);

// --- Anomaly routes (dynamic anomaly detection by type) ---
app.use('/api/anomalies', anomalyRoutes);

// --- Health Check & Chart Endpoints ---
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await query(`
      SELECT NOW() as current_time, COUNT(*) as total_records
      FROM "public"."real_log_analyze"
    `);
    res.json({ status: 'ok', database: 'connected', data: dbResult.rows[0] });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.get('/api/charts/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const where = buildWhereClause(req.query);
    let chartQuery;
    let queryValues = where.values;

    switch (type) {
      case 'hourly':
        chartQuery = `
          SELECT EXTRACT(hour FROM "Date Time") as hour, COUNT(*) as count,
            COUNT(CASE WHEN "Allow" = true THEN 1 END) as success,
            COUNT(CASE WHEN "Allow" = false THEN 1 END) as denied
          FROM "public"."real_log_analyze"
          ${where.clause}
          GROUP BY 1 ORDER BY 1;
        `;
        break;
      case 'location':
        chartQuery = `
          SELECT "Location" as location, COUNT(*) as count,
            COUNT(CASE WHEN "Allow" = true THEN 1 END) as success,
            COUNT(CASE WHEN "Allow" = false THEN 1 END) as denied
          FROM "public"."real_log_analyze"
          ${where.clause}
          GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
        `;
        break;
      case 'direction':
        chartQuery = `
          SELECT "Direction" as direction, COUNT(*) as count
          FROM "public"."real_log_analyze"
          ${where.clause}
          GROUP BY 1 ORDER BY 2 DESC;
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid chart type' });
    }
    const result = await query(chartQuery, queryValues);
    res.json({ data: result.rows });
  } catch (error) {
    console.error(`❌ Error fetching chart data for type '${req.params.type}':`, error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// --- Security anomaly query ---
const anomalyQuery = `
  SELECT * FROM "public"."real_log_analyze"
  WHERE
    "Allow" = false OR
    EXTRACT(hour FROM "Date Time") < 6 OR
    EXTRACT(hour FROM "Date Time") > 22
  ORDER BY "Date Time" DESC
  LIMIT 1500;
`;

// --- Helpers for security alerts ---
const determineAccessDeniedSeverity = (log) => {
  if (log.Reason) {
    if (log.Reason.toUpperCase().includes('INVALID') || log.Reason.toUpperCase().includes('EXPIRED')) {
      return 'high';
    }
    return 'medium';
  }
  return 'low';
};

const generateSecurityAlerts = (logData) => {
  const alerts = [];
  logData.forEach(log => {
    if (log.Allow === false || log.Allow === 0 || log.Reason) {
      alerts.push({
        alertType: 'ACCESS_DENIED',
        severity: determineAccessDeniedSeverity(log),
        cardName: log["Card Name"] || 'ไม่ระบุ',
        location: log.Location || log.Door || 'ไม่ระบุ',
        accessTime: log["Date Time"],
        reason: log.Reason || 'การเข้าถึงถูกปฏิเสธ',
      });
    }
    if (log["Date Time"]) {
      const hour = new Date(log["Date Time"]).getHours();
      if (hour < 6 || hour > 22) {
        alerts.push({
          alertType: 'UNUSUAL_TIME',
          severity: hour < 4 || hour > 23 ? 'high' : 'medium',
          cardName: log["Card Name"] || 'ไม่ระบุ',
          location: log.Location || log.Door || 'ไม่ระบุ',
          accessTime: log["Date Time"],
          reason: `การเข้าถึงนอกเวลาปกติ (${hour}:00)`,
        });
      }
    }
  });
  return alerts.sort((a, b) => new Date(b.accessTime) - new Date(a.accessTime));
};

// --- API: Security alerts ---
app.get('/api/analysis/alerts', async (req, res) => {
  try {
    const anomalyResult = await query(anomalyQuery);
    const alerts = generateSecurityAlerts(anomalyResult.rows);
    res.json({ alerts: alerts.slice(0, 50) }); // ส่ง 50 รายการล่าสุด
  } catch (error) {
    console.error('❌ Error on /api/analysis/alerts:', error);
    res.status(500).json({ error: 'Failed to generate security alerts' });
  }
});

// --- API: Security summary ---
app.get('/api/analysis/security', async (req, res) => {
  try {
    const anomalyResult = await query(anomalyQuery);
    const rows = anomalyResult.rows;
    const summary = {
      total: rows.length,
      highRisk: rows.filter(log => determineAccessDeniedSeverity(log) === 'high').length,
      mediumRisk: rows.filter(log => determineAccessDeniedSeverity(log) === 'medium').length,
      lowRisk: rows.filter(log => determineAccessDeniedSeverity(log) === 'low').length,
    };
    res.json({ summary, data: rows });
  } catch (error) {
    console.error('❌ Error on /api/analysis/security:', error);
    res.status(500).json({ error: 'Failed to perform security analysis' });
  }
});

// --- Error handling middleware ---
app.use((error, req, res, next) => {
  console.error('💥 Unhandled Error:', error);
  res.status(500).json({ error: 'An internal server error occurred' });
});

// --- Start server ---
const startServer = async () => {
  try {
    await query('SELECT NOW()');
    console.log('✅ Database connection successful.');
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Could not start server. Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();
