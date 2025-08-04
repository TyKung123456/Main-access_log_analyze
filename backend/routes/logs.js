// backend/routes/logs.js
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
    const { page = 1, limit = 20, sort = 'Date Time', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    try {
        const where = buildWhereClause(req.query);
        
        const totalResult = await query(`SELECT COUNT(*) FROM "public"."real_log_analyze" ${where.clause}`, where.values);
        const total = parseInt(totalResult.rows[0].count, 10);
        
        const allowedSortColumns = ["Date Time", "Location", "Card Name", "User Type", "Direction", "Allow"];
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

router.get('/user-types', async (req, res) => {
    try {
        const result = await query(`SELECT DISTINCT "User Type" FROM "public"."real_log_analyze" WHERE "User Type" IS NOT NULL AND "User Type" != '' ORDER BY "User Type"`);
        res.json(result.rows.map(row => row['User Type']));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user types' });
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

module.exports = router;
