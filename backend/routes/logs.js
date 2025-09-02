// backend/routes/logs.js
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

const buildWhereClause = (params) => {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (params.search) {
        // Enable searching across common fields, including Transaction ID
        conditions.push(`(
            CAST("Transaction ID" AS TEXT) ILIKE $${paramIndex}
            OR "Card Name" ILIKE $${paramIndex}
            OR "Location" ILIKE $${paramIndex}
            OR "Reason" ILIKE $${paramIndex}
            OR "Door" ILIKE $${paramIndex}
            OR "Device" ILIKE $${paramIndex}
        )`);
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
    if (params.location) {
        const locations = Array.isArray(params.location) ? params.location : params.location.split(',');
        if (locations.length > 0) {
            conditions.push(`"Location" = ANY($${paramIndex}::text[])`);
            values.push(locations);
            paramIndex++;
        }
    }
    if (params.direction) {
        const directions = Array.isArray(params.direction) ? params.direction : params.direction.split(',');
        if (directions.length > 0) {
            conditions.push(`"Direction" = ANY($${paramIndex}::text[])`);
            values.push(directions);
            paramIndex++;
        }
    }
    if (params.userType) {
        const userTypes = Array.isArray(params.userType) ? params.userType : params.userType.split(',');
        if (userTypes.length > 0) {
            conditions.push(`"User Type" = ANY($${paramIndex}::text[])`);
            values.push(userTypes);
            paramIndex++;
        }
    }
    if (params.doors) {
        const doors = Array.isArray(params.doors) ? params.doors : params.doors.split(',');
        if (doors.length > 0) {
            conditions.push(`"Door" = ANY($${paramIndex}::text[])`);
            values.push(doors);
            paramIndex++;
        }
    }
    if (params.severities) {
        const severities = Array.isArray(params.severities) ? params.severities : params.severities.split(',');
        if (severities.length > 0) {
            conditions.push(`"severity" = ANY($${paramIndex}::text[])`);
            values.push(severities);
            paramIndex++;
        }
    }

    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        values
    };
};

router.get('/', async (req, res) => {
    const { page = 1, limit = 20, sort = 'Date Time', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Backend: Received query parameters:', req.query);

    try {
        const where = buildWhereClause(req.query);
        console.log('Backend: Built WHERE clause:', where.clause);
        console.log('Backend: WHERE clause values:', where.values);
        
        const totalResult = await query(`SELECT COUNT(*) FROM "public"."real_log_analyze" ${where.clause}`, where.values);
        const total = parseInt(totalResult.rows[0].count, 10);
        
        const allowedSortColumns = ["Date Time", "Location", "Card Name", "User Type", "Direction", "Allow", "Transaction ID"];
        const sortColumn = allowedSortColumns.includes(sort) ? `"${sort}"` : `"Date Time"`;
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const logsResult = await query(
            `SELECT * FROM "public"."real_log_analyze"
             ${where.clause}
             ORDER BY ${sortColumn} ${sortOrder}
             LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`,
            [...where.values, limit, offset]
        );

        res.json({
            data: logsResult.rows,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

/**
 * GET /api/logs/locations - Get distinct locations
 * ✅ FIXED: Response is now wrapped in a { locations: [...] } object.
 */
router.get('/locations', async (req, res) => {
    try {
        const result = await query(`
            SELECT "Location" as value, "Location" as label, COUNT(*) as count 
            FROM "public"."real_log_analyze" 
            WHERE "Location" IS NOT NULL AND "Location" != '' 
            GROUP BY 1, 2 ORDER BY 3 DESC
        `);
        res.json({ locations: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

/**
 * GET /api/logs/directions - Get distinct directions
 * ✅ FIXED: Response is now wrapped in a { directions: [...] } object.
 */
router.get('/directions', async (req, res) => {
    try {
        const result = await query(`
            SELECT "Direction" as value, 
                   CASE WHEN "Direction" = 'IN' THEN 'เข้า (IN)' ELSE 'ออก (OUT)' END as label,
                   COUNT(*) as count
            FROM "public"."real_log_analyze" 
            WHERE "Direction" IS NOT NULL AND "Direction" != '' 
            GROUP BY 1, 2 ORDER BY 3 DESC
        `);
        res.json({ directions: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch directions' });
    }
});

/**
 * GET /api/logs/user-types - Get distinct user types
 * ✅ FIXED: Response is now wrapped in a { userTypes: [...] } object.
 */
router.get('/user-types', async (req, res) => {
    try {
        const result = await query(`
            SELECT "User Type" as value, "User Type" as label, COUNT(*) as count
            FROM "public"."real_log_analyze" 
            WHERE "User Type" IS NOT NULL AND "User Type" != '' 
            GROUP BY 1, 2 ORDER BY 3 DESC
        `);
        res.json({ userTypes: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user types' });
    }
});

/**
 * GET /api/logs/doors - Get distinct doors
 */
router.get('/doors', async (req, res) => {
    try {
        const result = await query(`
            SELECT "Door" as value, "Door" as label, COUNT(*) as count 
            FROM "public"."real_log_analyze" 
            WHERE "Door" IS NOT NULL AND "Door" != '' 
            GROUP BY 1, 2 ORDER BY 3 DESC
        `);
        res.json({ doors: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch doors' });
    }
});

/**
 * GET /api/logs/severity-levels - Get distinct severity levels
 */
router.get('/severity-levels', async (req, res) => {
    try {
        const result = await query(`
            SELECT "severity" as value, "severity" as label, COUNT(*) as count 
            FROM "public"."real_log_analyze" 
            WHERE "severity" IS NOT NULL AND "severity" != '' 
            GROUP BY 1, 2 ORDER BY 3 DESC
        `);
        res.json({ severityLevels: result.rows });
    } catch (error) {
        console.error('Error fetching severity levels:', error);
        res.status(500).json({ error: 'Failed to fetch severity levels' });
    }
});

module.exports = router;
