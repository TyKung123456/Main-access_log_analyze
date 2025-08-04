// backend/routes/security.js - ระบบวิเคราะห์ความผิดปกติ
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// ============================================
// 🚨 ระบบตรวจจับความผิดปกติ (Anomaly Detection)
// ============================================

// GET /api/security/anomalies - ตรวจสอบความผิดปกติทั้งหมด
router.get('/anomalies', async (req, res) => {
  try {
    console.log('🔍 กำลังวิเคราะห์ความผิดปกติ...');

    const anomalies = await Promise.all([
      detectMultipleFailedAttempts(),
      detectUnusualTimeAccess(),
      detectTailgating(),
      detectSuspiciousCardUsage(),
      detectLocationAnomalies(),
      detectFrequencyAnomalies(),
      detectUnauthorizedAccess(),
      detectDormantCardActivity()
    ]);

    const result = {
      summary: {
        totalAnomalies: anomalies.reduce((sum, cat) => sum + cat.data.length, 0),
        highRisk: anomalies.reduce((sum, cat) => sum + cat.data.filter(item => item.riskLevel === 'high').length, 0),
        mediumRisk: anomalies.reduce((sum, cat) => sum + cat.data.filter(item => item.riskLevel === 'medium').length, 0),
        lowRisk: anomalies.reduce((sum, cat) => sum + cat.data.filter(item => item.riskLevel === 'low').length, 0)
      },
      categories: anomalies.reduce((obj, cat) => {
        obj[cat.type] = cat;
        return obj;
      }, {}),
      analysisTime: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error('❌ Security analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze security anomalies' });
  }
});

// 1. 🚫 การพยายามเข้าถึงที่ล้มเหลวหลายครั้ง
const detectMultipleFailedAttempts = async () => {
  const sqlQuery = `
    SELECT
      "Card Name" as cardName,
      "Card Number Hash" as cardNumber,
      "User Type" as userType,
      "Location" as location,
      COUNT(*) as failedAttempts,
      MIN(CAST("Date Time" AS TIMESTAMP)) as firstAttempt, -- แก้ไข: เพิ่ม CAST
      MAX(CAST("Date Time" AS TIMESTAMP)) as lastAttempt,  -- แก้ไข: เพิ่ม CAST
      EXTRACT(EPOCH FROM (CAST("Date Time" AS TIMESTAMP) - MIN(CAST("Date Time" AS TIMESTAMP)))) / 60 as timeSpanMinutes
    FROM "public"."real_log_analyze"
    WHERE "Allow" = 'f'
      AND "Date Time" IS NOT NULL AND "Date Time" != ''
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '24 hours'
      AND "Card Name" IS NOT NULL
    GROUP BY "Card Name", "Card Number Hash", "User Type", "Location"
    HAVING COUNT(*) >= 3
    ORDER BY failedAttempts DESC, timeSpanMinutes ASC
    LIMIT 50
  `;

  const result = await query(sqlQuery);

  return {
    type: 'multipleFailedAttempts',
    title: 'การพยายามเข้าถึงที่ล้มเหลวหลายครั้ง',
    description: 'ตรวจจับบัตรที่มีการพยายามเข้าถึงล้มเหลวหลายครั้งใน 24 ชั่วโมงที่ผ่านมา',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      userType: row.usertype,
      location: row.location,
      failedAttempts: parseInt(row.failedattempts),
      firstAttempt: row.firstattempt,
      lastAttempt: row.lastattempt,
      timeSpanMinutes: parseFloat(row.timespanminutes),
      riskLevel: parseInt(row.failedattempts) >= 10 ? 'high' :
        parseInt(row.failedattempts) >= 5 ? 'medium' : 'low',
      description: `${row.cardname} พยายามเข้าถึง ${row.location} ล้มเหลว ${row.failedattempts} ครั้ง`
    }))
  };
};

// 2. 🕐 การเข้าถึงในเวลาผิดปกติ
const detectUnusualTimeAccess = async () => {
  const sqlQuery = `
    SELECT
      "Card Name" as cardName,
      "Card Number Hash" as cardNumber,
      "Location" as location,
      "Date Time" as accessTime,
      EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) as hour,
      EXTRACT(dow FROM CAST("Date Time" AS TIMESTAMP)) as dayOfWeek,
      "User Type" as userType,
      "Reason" as reason
    FROM "public"."real_log_analyze"
    WHERE "Allow" = 't'
      AND "Date Time" IS NOT NULL AND "Date Time" != ''
      AND (
        -- นอกเวลาทำการ (22:00-06:00)
        EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) >= 22 OR EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) <= 6
        -- หรือวันหยุดสุดสัปดาห์
        OR EXTRACT(dow FROM CAST("Date Time" AS TIMESTAMP)) IN (0, 6)
      )
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '7 days'
      AND "Card Name" IS NOT NULL
      AND "User Type" != 'SECURITY' -- ยกเว้นเจ้าหน้าที่รักษาความปลอดภัย
    ORDER BY "Date Time" DESC
    LIMIT 100
  `;

  const result = await query(sqlQuery);

  return {
    type: 'unusualTimeAccess',
    title: 'การเข้าถึงในเวลาผิดปกติ',
    description: 'ตรวจจับการเข้าถึงนอกเวลาทำการหรือวันหยุด',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      location: row.location,
      accessTime: row.accesstime,
      hour: parseInt(row.hour),
      dayOfWeek: parseInt(row.dayofweek),
      userType: row.usertype,
      reason: row.reason,
      riskLevel: (parseInt(row.hour) >= 23 || parseInt(row.hour) <= 5) ? 'high' : 'medium',
      description: `${row.cardname} เข้าถึง ${row.location} เวลา ${row.hour}:xx น. ${parseInt(row.dayofweek) === 0 ? '(วันอาทิตย์)' :
          parseInt(row.dayofweek) === 6 ? '(วันเสาร์)' : '(นอกเวลาทำการ)'
        }`
    }))
  };
};

// 3. 🚪 การเข้าตาม (Tailgating) - การใช้บัตรเดียวกันหลายครั้งใกล้เคียงกัน
const detectTailgating = async () => {
  const sqlQuery = `
    WITH consecutive_access AS (
      SELECT
        "Card Name" as cardName,
        "Card Number Hash" as cardNumber,
        "Location" as location,
        "Date Time" as accessTime,
        "Direction" as direction,
        LAG(CAST("Date Time" AS TIMESTAMP)) OVER (
          PARTITION BY "Card Number Hash", "Location"
          ORDER BY CAST("Date Time" AS TIMESTAMP)
        ) as previousAccess
      FROM "public"."real_log_analyze"
      WHERE "Allow" = 't'
        AND "Date Time" IS NOT NULL AND "Date Time" != ''
        AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '24 hours'
        AND "Card Name" IS NOT NULL
    )
    SELECT
      cardName,
      cardNumber,
      location,
      accessTime,
      previousAccess,
      direction,
      EXTRACT(EPOCH FROM (CAST(accessTime AS TIMESTAMP) - CAST(previousAccess AS TIMESTAMP))) as secondsBetween
    FROM consecutive_access
    WHERE previousAccess IS NOT NULL
      AND EXTRACT(EPOCH FROM (CAST(accessTime AS TIMESTAMP) - CAST(previousAccess AS TIMESTAMP))) <= 30
      AND direction = 'IN'
    ORDER BY secondsBetween ASC
    LIMIT 50
  `;

  const result = await query(sqlQuery);

  return {
    type: 'tailgating',
    title: 'สงสัยการเข้าตาม (Tailgating)',
    description: 'ตรวจจับการใช้บัตรเดียวกันเข้าสถานที่เดียวกันในระยะเวลาใกล้เคียง',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      location: row.location,
      accessTime: row.accesstime,
      previousAccess: row.previousaccess,
      direction: row.direction,
      secondsBetween: parseInt(row.secondsbetween),
      riskLevel: parseInt(row.secondsbetween) <= 10 ? 'high' : 'medium',
      description: `${row.cardname} ใช้บัตรเข้า ${row.location} ซ้ำภายใน ${row.secondsbetween} วินาที`
    }))
  };
};

// 4. 💳 การใช้งานบัตรที่น่าสงสัย
const detectSuspiciousCardUsage = async () => {
  const sqlQuery = `
    SELECT
      "Card Name" as cardName,
      "Card Number Hash" as cardNumber,
      "User Type" as userType,
      COUNT(DISTINCT "Location") as uniqueLocations,
      COUNT(*) as totalAccess,
      MIN(CAST("Date Time" AS TIMESTAMP)) as firstAccess, -- แก้ไข: เพิ่ม CAST
      MAX(CAST("Date Time" AS TIMESTAMP)) as lastAccess,   -- แก้ไข: เพิ่ม CAST
      ROUND(
        COUNT(*)::DECIMAL /
        NULLIF(EXTRACT(EPOCH FROM (MAX(CAST("Date Time" AS TIMESTAMP)) - MIN(CAST("Date Time" AS TIMESTAMP)))) / 3600, 0),
        2
      ) as accessPerHour
    FROM "public"."real_log_analyze"
    WHERE "Allow" = 't'
      AND "Date Time" IS NOT NULL AND "Date Time" != ''
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '24 hours'
      AND "Card Name" IS NOT NULL
    GROUP BY "Card Name", "Card Number Hash", "User Type"
    HAVING COUNT(*) >= 50
        OR COUNT(DISTINCT "Location") >= 10
    ORDER BY totalAccess DESC
    LIMIT 30
  `;

  const result = await query(sqlQuery);

  return {
    type: 'suspiciousCardUsage',
    title: 'การใช้งานบัตรที่น่าสงสัย',
    description: 'ตรวจจับบัตรที่มีการใช้งานผิดปกติ (ความถี่สูงหรือหลายสถานที่)',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      userType: row.usertype,
      uniqueLocations: parseInt(row.uniquelocations),
      totalAccess: parseInt(row.totalaccess),
      firstAccess: row.firstaccess,
      lastAccess: row.lastaccess,
      accessPerHour: parseFloat(row.accessperhour) || 0,
      riskLevel: parseInt(row.totalaccess) >= 100 || parseInt(row.uniquelocations) >= 15 ? 'high' : 'medium',
      description: `${row.cardname} เข้าถึง ${row.uniquelocations} สถานที่, รวม ${row.totalaccess} ครั้ง (${parseFloat(row.accessperhour) || 0} ครั้ง/ชม.)`
    }))
  };
};

// 5. 📍 ความผิดปกติตามสถานที่
const detectLocationAnomalies = async () => {
  const sqlQuery = `
    WITH location_stats AS (
      SELECT
        "Location" as location,
        COUNT(*) as totalAccess,
        COUNT(CASE WHEN "Allow" = 'f' THEN 1 END) as deniedAccess,
        COUNT(DISTINCT "Card Name") as uniqueUsers,
        ROUND(
          COUNT(CASE WHEN "Allow" = 'f' THEN 1 END)::DECIMAL /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as denialRate
      FROM "public"."real_log_analyze"
      WHERE "Date Time" IS NOT NULL AND "Date Time" != ''
        AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '7 days'
        AND "Location" IS NOT NULL
      GROUP BY "Location"
    )
    SELECT *
    FROM location_stats
    WHERE denialRate >= 20
       OR totalAccess >= 1000
    ORDER BY denialRate DESC, totalAccess DESC
    LIMIT 20
  `;

  const result = await query(sqlQuery);

  return {
    type: 'locationAnomalies',
    title: 'ความผิดปกติตามสถานที่',
    description: 'ตรวจจับสถานที่ที่มีอัตราปฏิเสธสูงหรือการเข้าถึงผิดปกติ',
    data: result.rows.map(row => ({
      location: row.location,
      totalAccess: parseInt(row.totalaccess),
      deniedAccess: parseInt(row.deniedaccess),
      uniqueUsers: parseInt(row.uniqueusers),
      denialRate: parseFloat(row.denialrate),
      riskLevel: parseFloat(row.denialrate) >= 50 ? 'high' :
        parseFloat(row.denialrate) >= 30 ? 'medium' : 'low',
      description: `${row.location}: ${row.denialrate}% ปฏิเสธ, ${row.totalaccess} ครั้งรวม, ${row.uniqueusers} คนใช้`
    }))
  };
};

// 6. 📊 ความผิดปกติต้านความถี่
const detectFrequencyAnomalies = async () => {
  const sqlQuery = `
    WITH hourly_patterns AS (
      SELECT
        EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) as hour,
        COUNT(*) as accessCount,
        AVG(COUNT(*)) OVER() as avgAccess,
        STDDEV(COUNT(*)) OVER() as stddevAccess
      FROM "public"."real_log_analyze"
      WHERE "Allow" = 't'
        AND "Date Time" IS NOT NULL AND "Date Time" != ''
        AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP))
    )
    SELECT
      hour,
      accessCount,
      avgAccess,
      stddevAccess,
      ROUND((accessCount - avgAccess) / NULLIF(stddevAccess, 0), 2) as zScore
    FROM hourly_patterns
    WHERE ABS((accessCount - avgAccess) / NULLIF(stddevAccess, 0)) >= 2
    ORDER BY ABS((accessCount - avgAccess) / NULLIF(stddevAccess, 0)) DESC
  `;

  const result = await query(sqlQuery);

  return {
    type: 'frequencyAnomalies',
    title: 'ความผิดปกติต้านความถี่การเข้าถึง',
    description: 'ตรวจจับช่วงเวลาที่มีการเข้าถึงผิดปกติจากค่าเฉลี่ย',
    data: result.rows.map(row => ({
      hour: parseInt(row.hour),
      accessCount: parseInt(row.accesscount),
      avgAccess: parseFloat(row.avgaccess),
      zScore: parseFloat(row.zscore),
      riskLevel: Math.abs(parseFloat(row.zScore)) >= 3 ? 'high' : 'medium', // แก้ไข: ใช้ Math.abs(parseFloat(row.zScore))
      description: `ช่วงเวลา ${row.hour}:00 น. มีการเข้าถึง ${row.accesscount} ครั้ง (ผิดปกติ ${row.zScore > 0 ? 'สูง' : 'ต่ำ'}กว่าปกติ)`
    }))
  };
};

// 7. 🔐 การเข้าถึงโดยไม่ได้รับอนุญาต
const detectUnauthorizedAccess = async () => {
  const sqlQuery = `
    SELECT
      "Card Name" as cardName,
      "Card Number Hash" as cardNumber,
      "Location" as location,
      "Date Time" as accessTime,
      "User Type" as userType,
      "Permission" as permission,
      "Reason" as reason
    FROM "public"."real_log_analyze"
    WHERE "Allow" = 't'
      AND "Date Time" IS NOT NULL AND "Date Time" != ''
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '24 hours'
      AND (
        "Permission" ILIKE '%DENIED%'
        OR "Permission" ILIKE '%RESTRICTED%'
        OR ("User Type" = 'VISITOR' AND EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) NOT BETWEEN 8 AND 18)
      )
      AND "Card Name" IS NOT NULL
    ORDER BY "Date Time" DESC
    LIMIT 50
  `;

  const result = await query(sqlQuery);

  return {
    type: 'unauthorizedAccess',
    title: 'การเข้าถึงที่อาจไม่ได้รับอนุญาต',
    description: 'ตรวจจับการเข้าถึงที่อาจฝ่าฝืนกฎระเบียบ',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      location: row.location,
      accessTime: row.accesstime,
      userType: row.usertype,
      permission: row.permission,
      reason: row.reason,
      riskLevel: row.permission && row.permission.includes('DENIED') ? 'high' : 'medium',
      description: `${row.cardname} (${row.usertype}) เข้าถึง ${row.location} - สิทธิ์: ${row.permission}`
    }))
  };
};

// 8. 😴 การใช้งานบัตรที่ไม่ได้ใช้มานาน
const detectDormantCardActivity = async () => {
  const sqlQuery = `
    WITH dormant_cards AS (
      SELECT DISTINCT
        "Card Name" as cardName,
        "Card Number Hash" as cardNumber,
        "User Type" as userType
      FROM "public"."real_log_analyze"
      WHERE "Date Time" IS NOT NULL AND "Date Time" != ''
        AND CAST("Date Time" AS TIMESTAMP) <= NOW() - INTERVAL '30 days'
        AND "Card Name" IS NOT NULL
    )
    SELECT
      dc.cardName,
      dc.cardNumber,
      dc.userType,
      la."Location" as location,
      la."Date Time" as recentAccess,
      la."Allow" as allowed
    FROM dormant_cards dc
    JOIN "public"."real_log_analyze" la ON dc.cardNumber = la."Card Number Hash"
    WHERE "Date Time" IS NOT NULL AND "Date Time" != ''
      AND CAST(la."Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '7 days'
      AND la."Allow" = 't'
    ORDER BY la."Date Time" DESC
    LIMIT 30
  `;

  const result = await query(sqlQuery);

  return {
    type: 'dormantCardActivity',
    title: 'การใช้งานบัตรที่ไม่ได้ใช้มานาน',
    description: 'ตรวจจับบัตรที่ไม่ได้ใช้งานมากกว่า 30 วัน แต่มีการใช้งานล่าสุด',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      userType: row.usertype,
      location: row.location,
      recentAccess: row.recentaccess,
      allowed: row.allowed,
      riskLevel: 'medium',
      description: `${row.cardname} (ไม่ได้ใช้ >30 วัน) กลับมาใช้งานที่ ${row.location}`
    }))
  };
};

// GET /api/security/alerts/realtime - การแจ้งเตือนแบบเรียลไทม์
router.get('/alerts/realtime', async (req, res) => {
  try {
    const realtimeQuery = `
      SELECT
        "Card Name" as cardName,
        "Location" as location,
        "Date Time" as accessTime,
        "Allow" as allowed,
        "Reason" as reason,
        "User Type" as userType
      FROM "public"."real_log_analyze"
      WHERE "Date Time" IS NOT NULL AND "Date Time" != ''
        AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '1 hour'
        AND (
          "Allow" = 'f'
          OR EXTRACT(hour FROM CAST("Date Time" AS TIMESTAMP)) NOT BETWEEN 6 AND 22
        )
      ORDER BY "Date Time" DESC
      LIMIT 20
    `;

    const result = await query(realtimeQuery);

    res.json({
      alerts: result.rows.map(row => ({
        cardName: row.cardname,
        location: row.location,
        accessTime: row.accesstime,
        allowed: row.allowed,
        reason: row.reason,
        userType: row.usertype,
        alertType: row.allowed === 'f' ? 'ACCESS_DENIED' : 'UNUSUAL_TIME',
        severity: row.allowed === 'f' ? 'high' : 'medium'
      })),
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Realtime alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch realtime alerts' });
  }
});

module.exports = router;
