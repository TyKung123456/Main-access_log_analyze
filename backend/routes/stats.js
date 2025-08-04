// backend/routes/stats.js
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

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

router.get('/', async (req, res) => {
  try {
    const where = buildWhereClause(req.query);
    const statsQuery = `
      SELECT
        COUNT(*) AS "totalAccess",
        COUNT(CASE WHEN "Allow" = true THEN 1 END) AS "successfulAccess",
        COUNT(CASE WHEN "Allow" = false THEN 1 END) AS "deniedAccess",
        COUNT(DISTINCT "Card Name") AS "uniqueUsers"
      FROM "public"."real_log_analyze"
      ${where.clause}
    `;
    const statsResult = await query(statsQuery, where.values);
    
    const stats = {
      totalAccess: parseInt(statsResult.rows[0].totalAccess, 10) || 0,
      successfulAccess: parseInt(statsResult.rows[0].successfulAccess, 10) || 0,
      deniedAccess: parseInt(statsResult.rows[0].deniedAccess, 10) || 0,
      uniqueUsers: parseInt(statsResult.rows[0].uniqueUsers, 10) || 0
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Failed to fetch summary stats:', err);
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
});

module.exports = router;
