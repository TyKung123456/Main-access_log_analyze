const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

const anomalyQueries = {
    deviceMultiDevice: {
        sql: `WITH device_per_day AS (
      SELECT "Card Number Hash", DATE("Date Time") AS day, COUNT(DISTINCT "Device") AS device_count
      FROM real_log_analyze
      GROUP BY "Card Number Hash", day
      HAVING COUNT(DISTINCT "Device") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN device_per_day d ON r."Card Number Hash" = d."Card Number Hash" AND DATE(r."Date Time") = d.day;`,
        weight: 5,
        thresholds: { low: 10, medium: 30 },
        description: 'บัตรถูกใช้ในหลายอุปกรณ์ (Device) ต่างกันในวันเดียวกัน'
    },
    locationMultiLoc: {
        sql: `WITH location_per_hour AS (
      SELECT "Card Number Hash", date_trunc('hour', "Date Time") AS hr, COUNT(DISTINCT "Location") AS loc_count
      FROM real_log_analyze
      GROUP BY "Card Number Hash", hr
      HAVING COUNT(DISTINCT "Location") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN location_per_hour l ON r."Card Number Hash" = l."Card Number Hash" AND date_trunc('hour', r."Date Time") = l.hr;`,
        weight: 4,
        thresholds: { low: 15, medium: 40 },
        description: 'บัตรถูกใช้ที่หลาย Location ต่างกันใน 1 ชั่วโมง'
    },
    userTypeChangeFreq: {
        sql: `WITH usertype_per_day AS (
      SELECT "User Hash", DATE("Date Time") AS day, COUNT(DISTINCT "User Type") AS ut_count
      FROM real_log_analyze
      GROUP BY "User Hash", day
      HAVING COUNT(DISTINCT "User Type") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN usertype_per_day u ON r."User Hash" = u."User Hash" AND DATE(r."Date Time") = u.day;`,
        weight: 3,
        thresholds: { low: 20, medium: 50 },
        description: 'ผู้ใช้เปลี่ยน User Type บ่อยเกินใน 1 วัน'
    },
    allowTrueReasonNotEmpty: {
        sql: `SELECT "ID Hash"
          FROM real_log_analyze
          WHERE "Allow" = true AND ("Reason" IS NOT NULL AND TRIM("Reason") <> '');`,
        weight: 2,
        thresholds: { low: 20, medium: 40 },
        description: 'รายการที่ Allow = true แต่ Reason ไม่ว่าง (ผิดปกติ)'
    },
    allowFalseReasonEmpty: {
        sql: `SELECT "ID Hash"
          FROM real_log_analyze
          WHERE "Allow" = false AND ("Reason" IS NULL OR TRIM("Reason") = '');`,
        weight: 3,
        thresholds: { low: 15, medium: 35 },
        description: 'รายการที่ Allow = false แต่ Reason ว่างเปล่า (ควรมีเหตุผล)'
    },
    allowTruePermissionEmpty: {
        sql: `SELECT "ID Hash"
          FROM real_log_analyze
          WHERE "Allow" = true AND ("Permission" IS NULL OR TRIM("Permission") = '');`,
        weight: 3,
        thresholds: { low: 15, medium: 35 },
        description: 'รายการที่ Permission ว่างแต่ Allow = true (ควรมีสิทธิ์)'
    },
    freqCardUse: {
        sql: `WITH freq_10min AS (
      SELECT "Card Number Hash",
             date_trunc('minute', "Date Time") - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM "Date Time")::int % 10) AS ten_min_bucket,
             COUNT(*) AS cnt
      FROM real_log_analyze
      WHERE "Allow" = true
      GROUP BY "Card Number Hash", ten_min_bucket
      HAVING COUNT(*) > 5
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN freq_10min f ON r."Card Number Hash" = f."Card Number Hash"
      AND date_trunc('minute', r."Date Time") - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM r."Date Time")::int % 10) = f.ten_min_bucket;`,
        weight: 6,
        thresholds: { low: 10, medium: 20 },
        description: 'บัตรถูกใช้มากกว่า 5 ครั้งใน 10 นาที (เสี่ยง)'
    },
    permSameDiffUserType: {
        sql: `WITH perm_user AS (
      SELECT "Permission", COUNT(DISTINCT "User Type") AS user_type_count
      FROM real_log_analyze
      GROUP BY "Permission"
      HAVING COUNT(DISTINCT "User Type") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN perm_user p ON r."Permission" = p."Permission";`,
        weight: 4,
        thresholds: { low: 10, medium: 25 },
        description: 'บัตรที่ Permission ซ้ำกันแต่ User Type ต่างกัน (น่าสงสัย)'
    },
    deviceOrLocationNullEmpty: {
        sql: `SELECT "ID Hash"
          FROM real_log_analyze
          WHERE ("Device" IS NULL OR TRIM("Device") = '') OR ("Location" IS NULL OR TRIM("Location") = '');`,
        weight: 1,
        thresholds: { low: 30, medium: 70 },
        description: 'รายการที่ Device หรือ Location มีค่า NULL หรือว่างเปล่า'
    },
    cardNeverAllowed: {
        sql: `WITH allowed_cards AS (
      SELECT DISTINCT "Card Number Hash"
      FROM real_log_analyze
      WHERE "Allow" = true
    )
    SELECT DISTINCT "Card Number Hash"
    FROM real_log_analyze
    WHERE "Card Number Hash" NOT IN (SELECT "Card Number Hash" FROM allowed_cards);`,
        weight: 7,
        thresholds: { low: 5, medium: 15 },
        description: 'บัตรที่ไม่เคยถูก Allow = true เลย (เฉพาะที่มี log)'
    },
    txnAllowConflict: {
        sql: `WITH txn_counts AS (
      SELECT "Transaction ID", COUNT(DISTINCT "Allow") AS allow_variety
      FROM real_log_analyze
      GROUP BY "Transaction ID"
      HAVING COUNT(DISTINCT "Allow") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN txn_counts t ON r."Transaction ID" = t."Transaction ID";`,
        weight: 5,
        thresholds: { low: 10, medium: 30 },
        description: 'รายการซ้ำ Transaction ID แต่ Allow ต่างกัน (conflict)'
    },
    cardNameShared: {
        sql: `WITH cardname_user AS (
      SELECT "Card Name", COUNT(DISTINCT "User Hash") AS user_count
      FROM real_log_analyze
      GROUP BY "Card Name"
      HAVING COUNT(DISTINCT "User Hash") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN cardname_user c ON r."Card Name" = c."Card Name";`,
        weight: 4,
        thresholds: { low: 10, medium: 25 },
        description: 'รายการที่ใช้ Card Name ซ้ำกับ User Hash ต่างกัน (น่าจะเป็นบัตรแชร์)'
    },
    permDoorMismatch: {
        sql: `WITH perm_door_pairs AS (
      SELECT DISTINCT "Permission", "Door"
      FROM real_log_analyze
      WHERE "Permission" = "Door"
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    WHERE NOT EXISTS (
      SELECT 1
      FROM perm_door_pairs p
      WHERE p."Permission" = r."Permission" AND p."Door" = r."Door"
    );`,
        weight: 3,
        thresholds: { low: 15, medium: 35 },
        description: 'รายการที่ Permission กับ Door ไม่เคยตรงกันเลย (ผิดปกติ)'
    },
    channelDeviceMismatch5min: {
        sql: `WITH channel_device_5min AS (
      SELECT "Channel", "Device",
             date_trunc('minute', "Date Time") - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM "Date Time")::int % 5) AS five_min_bucket,
             COUNT(DISTINCT "Device") AS device_count
      FROM real_log_analyze
      GROUP BY "Channel", "Device", five_min_bucket
      HAVING COUNT(DISTINCT "Device") > 1
    )
    SELECT r."ID Hash"
    FROM real_log_analyze r
    JOIN channel_device_5min c ON r."Channel" = c."Channel" AND r."Device" = c."Device"
      AND (date_trunc('minute', r."Date Time") - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM r."Date Time")::int % 5)) = c.five_min_bucket;`,
        weight: 4,
        thresholds: { low: 10, medium: 25 },
        description: 'รายการที่ Channel ซ้ำกับ Device ต่างกันในเวลา 5 นาที'
    },
};

// ฟังก์ชันคำนวณ severity
function calcSeverity(count, weight, thresholds) {
    const score = count * weight;
    if (score > thresholds.medium) return { score, severity: 'high' };
    if (score > thresholds.low) return { score, severity: 'medium' };
    return { score, severity: 'low' };
}

router.get('/:type', async (req, res) => {
    const type = req.params.type;
    const anomaly = anomalyQueries[type];
    if (!anomaly) {
        return res.status(400).json({ error: 'Unknown anomaly type' });
    }
    try {
        const result = await query(anomaly.sql);
        const count = result.rows.length;
        const { score, severity } = calcSeverity(count, anomaly.weight, anomaly.thresholds);

        res.json({
            type,
            description: anomaly.description,
            count,
            score,
            severity,
            data: result.rows,
        });
    } catch (error) {
        console.error(`Error fetching anomaly ${type}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
