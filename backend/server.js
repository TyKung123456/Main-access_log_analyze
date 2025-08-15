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
const securityRoutes = require('./routes/security'); // Add this line
const uploadRoutes = require('./routes/upload'); // Add this line

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
// --- Routes ---
app.use('/api/logs', logsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/security', securityRoutes); // Add this line
app.use('/api/upload', uploadRoutes); // Add this line

// --- Anomaly routes (dynamic anomaly detection by type) ---
app.use('/api/anomalies', anomalyRoutes);

// --- AI Chat Proxy Endpoint ---
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, model, options } = req.body;
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';
  const ollamaTimeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || ollamaModel,
        prompt: prompt,
        options: options,
        stream: false, // Ensure we get the full response at once
      }),
      signal: AbortSignal.timeout(ollamaTimeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ message: `Ollama API error: ${errorText}` });
    }

    const data = await response.json();
    res.json({ response: data.response });

  } catch (error) {
    if (error.name === 'AbortError') {
      res.status(504).json({ message: 'Ollama server response timed out.' });
    } else {
      res.status(500).json({ message: `Failed to connect to Ollama server: ${error.message}` });
    }
  }
});

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
          GROUP BY 1 ORDER BY 2 DESC LIMIT 11;
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
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// --- Error handling middleware ---
app.use((error, req, res, next) => {
  res.status(500).json({ error: 'An internal server error occurred' });
});

// --- Start server ---
const startServer = async () => {
  try {
    await query('SELECT NOW()');
    app.listen(PORT, () => {
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
