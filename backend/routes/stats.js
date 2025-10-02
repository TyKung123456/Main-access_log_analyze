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

// Get per-user totals and breakdown counts
router.get('/user', async (req, res) => {
  try {
    const { user, startDate, endDate } = req.query;
    if (!user || String(user).trim() === '') {
      return res.status(400).json({ error: 'Missing required parameter: user' });
    }

    const conditions = [
      '("Card Name" = $1 OR "Card Number Hash" = $1)'
    ];
    const values = [user];
    let paramIndex = 2;

    if (startDate && endDate) {
      conditions.push(`"Date Time" BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      values.push(startDate, endDate);
      paramIndex += 2;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const q = `
      WITH user_rows AS (
        SELECT "Allow", "Date Time", "Location"
        FROM "public"."real_log_analyze"
        ${where}
      ),
      denied_by_loc AS (
        SELECT "Location", COUNT(*) AS denied_cnt
        FROM user_rows
        WHERE "Allow" = false
        GROUP BY "Location"
      ),
      hot_locs AS (
        SELECT "Location" FROM denied_by_loc WHERE denied_cnt >= 3
      )
      SELECT
        (SELECT COUNT(*) FROM user_rows)::int AS total,
        (SELECT COUNT(*) FROM user_rows WHERE "Allow" = true)::int AS success,
        (SELECT COUNT(*) FROM user_rows WHERE "Allow" = false)::int AS denied,
        (SELECT COUNT(*) FROM user_rows WHERE (EXTRACT(HOUR FROM "Date Time") >= 22 OR EXTRACT(HOUR FROM "Date Time") <= 6))::int AS off_hours,
        (SELECT COUNT(*) FROM user_rows WHERE (EXTRACT(DOW FROM "Date Time") IN (0,6)))::int AS weekend,
        (SELECT COUNT(DISTINCT "Location") FROM user_rows)::int AS unique_locations,
        (SELECT COUNT(*) FROM user_rows ur WHERE ur."Allow" = false AND ur."Location" IN (SELECT "Location" FROM hot_locs))::int AS multi_events,
        (SELECT COUNT(*) FROM user_rows ur WHERE (ur."Allow" = false) OR (EXTRACT(HOUR FROM ur."Date Time") >= 22 OR EXTRACT(HOUR FROM ur."Date Time") <= 6))::int AS violation
    `;

    const result = await query(q, values);
    const row = result.rows[0] || {};
    res.json({
      user,
      total: row.total || 0,
      success: row.success || 0,
      denied: row.denied || 0,
      offHours: row.off_hours || 0,
      weekend: row.weekend || 0,
      uniqueLocations: row.unique_locations || 0,
      multiEvents: row.multi_events || 0
    });
  } catch (err) {
    console.error('Failed to fetch user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get Top users by denied percentage (all-time baseline unless date range provided)
router.get('/users-top', async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const values = [];
    let where = '';
    if (startDate && endDate) {
      values.push(startDate, endDate);
      where = `WHERE "Date Time" BETWEEN $1 AND $2`;
    }

    const q = `
      WITH base AS (
        SELECT
          COALESCE(NULLIF(TRIM("Card Number Hash"), ''), NULLIF(TRIM("Card Name"), '')) AS user_key,
          NULLIF(TRIM("Card Name"), '') AS display_name,
          "Allow",
          "Date Time",
          "Location"
        FROM "public"."real_log_analyze"
        ${where}
      ),
      denied_by_user_loc AS (
        SELECT user_key, "Location", COUNT(*) AS denied_cnt
        FROM base
        WHERE "Allow" = false
        GROUP BY user_key, "Location"
      ),
      hot_user_locs AS (
        SELECT user_key, "Location"
        FROM denied_by_user_loc
        WHERE denied_cnt >= 3
      )
      SELECT
        b.user_key AS user,
        MAX(b.display_name) AS display_name,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN b."Allow" = false THEN 1 END)::int AS denied,
        COUNT(CASE WHEN (EXTRACT(HOUR FROM b."Date Time") >= 22 OR EXTRACT(HOUR FROM b."Date Time") <= 6) THEN 1 END)::int AS off_hours,
        COUNT(CASE WHEN (EXTRACT(DOW FROM b."Date Time") IN (0,6)) THEN 1 END)::int AS weekend,
        COUNT(DISTINCT b."Location")::int AS unique_locations,
        MAX(b."Date Time") AS last_time,
        SUM(CASE WHEN b."Allow" = false AND EXISTS(
          SELECT 1 FROM hot_user_locs h WHERE h.user_key = b.user_key AND h."Location" = b."Location"
        ) THEN 1 ELSE 0 END)::int AS multi_events
      FROM base b
      WHERE b.user_key IS NOT NULL AND b.user_key <> ''
      GROUP BY b.user_key
      HAVING COUNT(*) > 0
      ORDER BY (
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE (
               SUM(CASE WHEN (b."Allow" = false) OR (EXTRACT(HOUR FROM b."Date Time") >= 22 OR EXTRACT(HOUR FROM b."Date Time") <= 6) THEN 1 ELSE 0 END)::float / COUNT(*)
             )
        END
      ) DESC, total DESC
      LIMIT ${Number(limit) > 0 ? Number(limit) : 10}
    `;

    const result = await query(q, values);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Failed to fetch top users:', err);
    res.status(500).json({ error: 'Failed to fetch top users' });
  }
});

module.exports = router;
