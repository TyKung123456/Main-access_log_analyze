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

    // Run detectors defensively; do not fail the whole request
    const detectors = [
      { key: 'multipleFailedAttempts', fn: detectMultipleFailedAttempts },
      { key: 'unusualTimeAccess', fn: detectUnusualTimeAccess },
      { key: 'tailgating', fn: detectTailgating },
      { key: 'suspiciousCardUsage', fn: detectSuspiciousCardUsage },
      { key: 'locationAnomalies', fn: detectLocationAnomalies },
      { key: 'frequencyAnomalies', fn: detectFrequencyAnomalies },
      { key: 'unauthorizedAccess', fn: detectUnauthorizedAccess },
      { key: 'dormantCardActivity', fn: detectDormantCardActivity },
    ];

    const settled = await Promise.allSettled(detectors.map(d => d.fn()));

    const categoriesArr = settled.map((r, i) => {
      const key = detectors[i].key;
      if (r.status === 'fulfilled' && r.value && Array.isArray(r.value.data)) {
        return r.value;
      }
      console.warn(`⚠️ Detector '${key}' failed:`, r.reason?.message || r.reason);
      return {
        type: key,
        title: key,
        description: 'Detector failed or unavailable',
        data: [],
        error: true,
      };
    });

    const summary = {
      totalAnomalies: categoriesArr.reduce((sum, cat) => sum + (cat.data?.length || 0), 0),
      highRisk: categoriesArr.reduce((sum, cat) => sum + ((cat.data || []).filter(item => (item.riskLevel || '').toLowerCase() === 'high').length), 0),
      mediumRisk: categoriesArr.reduce((sum, cat) => sum + ((cat.data || []).filter(item => (item.riskLevel || '').toLowerCase() === 'medium').length), 0),
      lowRisk: categoriesArr.reduce((sum, cat) => sum + ((cat.data || []).filter(item => (item.riskLevel || '').toLowerCase() === 'low').length), 0),
    };

    const categories = categoriesArr.reduce((obj, cat) => {
      obj[cat.type] = cat;
      return obj;
    }, {});

    res.json({ summary, categories, analysisTime: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Security analysis error (outer):', error);
    // Return safe empty payload to avoid breaking the UI
    res.json({ summary: { totalAnomalies: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 }, categories: {}, analysisTime: new Date().toISOString() });
  }
});

// ================================
// 📋 Case-based Security Reports
// ================================

const CASE_SQL = {
  // 1) OUT=TRUE without prior IN for same user
  unmatched_out: `WITH base AS (
    SELECT r.*, 
      SUM(CASE WHEN r."Direction"='IN' AND r."Allow" THEN 1 ELSE 0 END)
        OVER (PARTITION BY r."User Hash" ORDER BY r."Date Time", r."Transaction ID" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS seq_in,
      SUM(CASE WHEN r."Direction"='OUT' AND r."Allow" THEN 1 ELSE 0 END)
        OVER (PARTITION BY r."User Hash" ORDER BY r."Date Time", r."Transaction ID" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS seq_out
    FROM public."real_log_analyze" r
  ),
  ins AS (
    SELECT "User Hash", seq_in AS pair_no, "Date Time" AS in_time
    FROM base
    WHERE "Direction"='IN' AND "Allow"=TRUE
  ),
  outs AS (
    SELECT "User Hash", seq_out AS pair_no, "Date Time" AS out_time,
           "Transaction ID" AS out_txid, "Device" AS out_device,
           "Location" AS out_location, "Door" AS out_door, "Permission" AS out_permission
    FROM base
    WHERE "Direction"='OUT' AND "Allow"=TRUE
  )
  SELECT o."User Hash", o.pair_no, o.out_txid, o.out_time, o.out_device, o.out_location, o.out_door, o.out_permission
  FROM outs o LEFT JOIN ins i ON i."User Hash"=o."User Hash" AND i.pair_no=o.pair_no
  WHERE i."User Hash" IS NULL
  ORDER BY o."User Hash", o.out_time` ,

  // 1.1) Count unmatched OUT per user
  unmatched_out_counts: `WITH ordered AS (
    SELECT r.*,
      SUM(CASE WHEN r."Direction"='IN'  AND r."Allow" THEN 1 ELSE 0 END)
        OVER (PARTITION BY r."User Hash" ORDER BY r."Date Time", r."Transaction ID" ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS cum_in_before,
      SUM(CASE WHEN r."Direction"='OUT' AND r."Allow" THEN 1 ELSE 0 END)
        OVER (PARTITION BY r."User Hash" ORDER BY r."Date Time", r."Transaction ID" ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS cum_out_before
    FROM public."real_log_analyze" r
  ),
  unmatched_out AS (
    SELECT * FROM ordered
    WHERE "Direction"='OUT' AND "Allow"=TRUE
      AND COALESCE(cum_in_before,0) <= COALESCE(cum_out_before,0)
  )
  SELECT "User Hash",
         MIN("Card Name") AS sample_card_name,
         COUNT(*) AS unmatched_out_count,
         MIN("Date Time") AS first_unmatched_out_at,
         MAX("Date Time") AS last_unmatched_out_at,
         MIN("Transaction ID") AS sample_txid
  FROM unmatched_out
  GROUP BY "User Hash"
  ORDER BY unmatched_out_count DESC, "User Hash"`,

  // 2) Visitor/Affiliate IN when no employees inside
  visitor_in_no_employees: `WITH emp_events AS (
    SELECT e."Date Time" AS ts, e."Transaction ID" AS txid,
      CASE WHEN e."Allow"=TRUE AND e."Direction"='IN' THEN 1
           WHEN e."Allow"=TRUE AND e."Direction"='OUT' THEN -1 ELSE 0 END AS delta
    FROM public."real_log_analyze" e
    WHERE lower(e."User Type")='employee' AND e."Direction" IN ('IN','OUT') AND e."Allow"=TRUE
  ), emp_running AS (
    SELECT ts, txid, delta,
      SUM(delta) OVER (ORDER BY ts, txid ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS emp_inside_cum
    FROM emp_events
  ), visitor_entries AS (
    SELECT r.* FROM public."real_log_analyze" r
    WHERE lower(r."User Type") IN ('visitor','affiliate') AND r."Direction"='IN' AND r."Allow"=TRUE
  )
  SELECT v.*, COALESCE(le.emp_inside_cum,0) AS employee_inside_before
  FROM visitor_entries v
  LEFT JOIN LATERAL (
    SELECT e.emp_inside_cum FROM emp_running e
    WHERE e.ts < v."Date Time" OR (e.ts = v."Date Time" AND e.txid < v."Transaction ID")
    ORDER BY e.ts DESC, e.txid DESC LIMIT 1
  ) le ON TRUE
  WHERE COALESCE(le.emp_inside_cum,0)=0
  ORDER BY "Date Time", "Transaction ID"`,

  // 3) Door-Device-Location ambiguity
  door_device_location_ambiguity: `WITH base AS (
    SELECT btrim("Door") AS door, btrim("Device") AS device, btrim("Location") AS location
    FROM public."real_log_analyze"
    WHERE "Door" IS NOT NULL AND btrim("Door")<>''
      AND "Device" IS NOT NULL AND btrim("Device")<>''
      AND "Location" IS NOT NULL AND btrim("Location")<>''
  ), amb_door AS (
    SELECT door FROM base GROUP BY door
    HAVING COUNT(DISTINCT device) > 1 OR COUNT(DISTINCT location) > 1
  )
  SELECT door, device, location, COUNT(*) AS events
  FROM base WHERE door IN (SELECT door FROM amb_door)
  GROUP BY door, device, location
  ORDER BY door, events DESC, device, location` ,

  // 5) Allow=false but Reason empty
  denied_without_reason: `SELECT *
  FROM public."real_log_analyze"
  WHERE "Allow" = FALSE
    AND ("Reason" IS NULL OR btrim("Reason") = '')
  ORDER BY "Date Time"`,

  // 6) Allow=true but Permission empty
  allowed_without_permission: `SELECT *
  FROM public."real_log_analyze"
  WHERE "Allow" = TRUE
    AND ("Permission" IS NULL OR btrim("Permission") = '')
  ORDER BY "Date Time"`,

  // 7) Card used >5 times in 10 minutes (risky)
  high_frequency_card: `WITH freq_10 AS (
    SELECT "Card Number Hash" AS card_hash,
           date_trunc('hour', "Date Time") + make_interval(mins => (floor(extract(minute from "Date Time")/10)::int * 10)) AS bucket_start,
           COUNT(*) AS cnt
    FROM public."real_log_analyze"
    GROUP BY 1,2
    HAVING COUNT(*) > 5
  )
  SELECT r.*
  FROM public."real_log_analyze" r
  JOIN freq_10 f ON r."Card Number Hash" = f.card_hash
    AND (date_trunc('hour', r."Date Time") + make_interval(mins => (floor(extract(minute from r."Date Time")/10)::int * 10))) = f.bucket_start
  ORDER BY r."Card Number Hash", r."Date Time"`,

  // 8) Same Permission used across different User Types
  permission_multi_usertype: `WITH perm_ut AS (
    SELECT "Permission", COUNT(DISTINCT "User Type") AS ut_count
    FROM public."real_log_analyze"
    WHERE "Permission" IS NOT NULL AND btrim("Permission") <> ''
    GROUP BY 1
    HAVING COUNT(DISTINCT "User Type") > 1
  )
  SELECT r.*
  FROM public."real_log_analyze" r
  JOIN perm_ut p ON r."Permission" = p."Permission"
  ORDER BY r."Permission", r."Date Time"`,

  // 9) Missing device or location
  missing_device_or_location: `SELECT *
  FROM public."real_log_analyze"
  WHERE ("Device" IS NULL OR btrim("Device") = '')
     OR ("Location" IS NULL OR btrim("Location") = '')
  ORDER BY "Date Time"`,

  // 10) Cards that never allowed true
  cards_never_allowed: `WITH never_ok AS (
    SELECT "Card Number Hash" AS card_hash
    FROM public."real_log_analyze"
    WHERE "Card Number Hash" IS NOT NULL
    GROUP BY "Card Number Hash"
    HAVING SUM(CASE WHEN "Allow" THEN 1 ELSE 0 END) = 0
  )
  SELECT n.card_hash,
         MIN(r."Card Name") AS sample_card_name,
         MIN(r."User Hash") AS sample_user_hash,
         COUNT(r.*) AS total_logs,
         MIN(r."Date Time") AS first_seen,
         MAX(r."Date Time") AS last_seen,
         MIN(r."Transaction ID") AS sample_txid
  FROM never_ok n
  JOIN public."real_log_analyze" r ON r."Card Number Hash" = n.card_hash
  GROUP BY n.card_hash
  ORDER BY total_logs DESC, n.card_hash`,

  // 11) Duplicate Transaction ID with conflicting Allow
  txid_conflict: `SELECT "Transaction ID" AS txid
  FROM public."real_log_analyze"
  GROUP BY "Transaction ID"
  HAVING COUNT(*) > 1 AND COUNT(DISTINCT "Allow") > 1
  ORDER BY txid`,

  // 12) Card Name repeats across different User Hash
  cardname_multi_userhash: `WITH cn_uh AS (
    SELECT "Card Name", COUNT(DISTINCT "User Hash") AS uh_count
    FROM public."real_log_analyze"
    WHERE "Card Name" IS NOT NULL AND btrim("Card Name") <> ''
    GROUP BY 1
    HAVING COUNT(DISTINCT "User Hash") > 1
  )
  SELECT r.*
  FROM public."real_log_analyze" r
  JOIN cn_uh c ON r."Card Name" = c."Card Name"
  ORDER BY r."Card Name", r."Date Time"`,

  // 13) Permission-Door pairs never allowed
  permission_door_never_allowed: `WITH pairs AS (
    SELECT "Permission","Door",
           SUM(CASE WHEN "Allow" THEN 1 ELSE 0 END) AS allow_cnt,
           COUNT(*) AS total_cnt
    FROM public."real_log_analyze"
    WHERE "Permission" IS NOT NULL AND btrim("Permission") <> ''
      AND "Door" IS NOT NULL AND btrim("Door") <> ''
    GROUP BY 1,2
  )
  SELECT r.*
  FROM public."real_log_analyze" r
  JOIN pairs p ON r."Permission" = p."Permission" AND r."Door" = p."Door"
  WHERE p.allow_cnt = 0 AND p.total_cnt >= 3
  ORDER BY r."Permission", r."Door", r."Date Time"`,

  // 14) Same Channel used with different Devices within 5 minutes
  channel_device_conflict: `WITH ch_5min AS (
    SELECT "Channel",
           date_trunc('hour', "Date Time") + make_interval(mins => (floor(extract(minute from "Date Time")/5)::int * 5)) AS bucket_start,
           COUNT(DISTINCT "Device") AS device_count
    FROM public."real_log_analyze"
    WHERE "Channel" IS NOT NULL AND btrim("Channel") <> ''
    GROUP BY 1,2
    HAVING COUNT(DISTINCT "Device") > 1
  )
  SELECT r.*
  FROM public."real_log_analyze" r
  JOIN ch_5min c ON r."Channel" = c."Channel"
   AND (date_trunc('hour', r."Date Time") + make_interval(mins => (floor(extract(minute from r."Date Time")/5)::int * 5))) = c.bucket_start
  ORDER BY r."Channel", r."Date Time"`,

  // Extra summary cases
  top_failed_doors: `SELECT btrim("Door") AS door, COUNT(*) AS fail_count
  FROM public."real_log_analyze" WHERE "Allow"=FALSE
  GROUP BY btrim("Door")
  ORDER BY fail_count DESC, door LIMIT 20`,

  top_locations_events: `SELECT btrim("Location") AS location, COUNT(*) AS events
  FROM public."real_log_analyze"
  WHERE "Location" IS NOT NULL AND btrim("Location")<>''
  GROUP BY btrim("Location")
  ORDER BY events DESC, location LIMIT 20`,

  daily_inout: `SELECT DATE("Date Time") AS day,
    SUM(CASE WHEN "Direction"='IN' THEN 1 ELSE 0 END) AS in_events,
    SUM(CASE WHEN "Direction"='OUT' THEN 1 ELSE 0 END) AS out_events,
    SUM(CASE WHEN "Allow"=TRUE THEN 1 ELSE 0 END) AS ok_events,
    SUM(CASE WHEN "Allow"=FALSE THEN 1 ELSE 0 END) AS denied_events
  FROM public."real_log_analyze"
  GROUP BY DATE("Date Time")
  ORDER BY day`
};

// --- Security Room specific cases ---
CASE_SQL.security_room_events = `
  SELECT
    "Date Time"       AS ts,
    "Location"       AS location,
    "Direction"      AS direction,
    "Allow"          AS allow,
    "Reason"         AS reason,
    "Card Name"      AS card_name,
    "User Type"      AS user_type,
    "Door"           AS door,
    "Device"         AS device,
    "Permission"     AS permission,
    "Channel"        AS channel,
    "Transaction ID" AS txid
  FROM public."real_log_analyze"
  WHERE (
      LOWER(COALESCE("Location", '')) LIKE '%security%'
      OR "Location" ILIKE '%ห้องความปลอดภัย%'
      OR "Location" ILIKE '%ห้องควบคุมความปลอดภัย%'
      OR "Location" ILIKE '%ศูนย์รักษาความปลอดภัย%'
    )
  ORDER BY CAST("Date Time" AS TIMESTAMP) DESC
  LIMIT 500`;

CASE_SQL.security_room_offhours = `
  SELECT
    "Date Time"       AS ts,
    "Location"       AS location,
    "Direction"      AS direction,
    "Allow"          AS allow,
    "Reason"         AS reason,
    "Card Name"      AS card_name,
    "User Type"      AS user_type,
    "Door"           AS door,
    "Device"         AS device,
    "Permission"     AS permission,
    "Channel"        AS channel,
    "Transaction ID" AS txid,
    EXTRACT(HOUR FROM CAST("Date Time" AS TIMESTAMP)) AS hour,
    EXTRACT(DOW FROM CAST("Date Time" AS TIMESTAMP))  AS dow
  FROM public."real_log_analyze"
  WHERE (
      LOWER(COALESCE("Location", '')) LIKE '%security%'
      OR "Location" ILIKE '%ห้องความปลอดภัย%'
      OR "Location" ILIKE '%ห้องควบคุมความปลอดภัย%'
      OR "Location" ILIKE '%ศูนย์รักษาความปลอดภัย%'
    )
    AND "Direction" = 'IN'
    AND "Allow" = TRUE
    AND (
      EXTRACT(HOUR FROM CAST("Date Time" AS TIMESTAMP)) >= 22
      OR EXTRACT(HOUR FROM CAST("Date Time" AS TIMESTAMP)) <= 6
      OR EXTRACT(DOW  FROM CAST("Date Time" AS TIMESTAMP)) IN (0,6)
    )
    AND LOWER(COALESCE("User Type", '')) <> 'security'
  ORDER BY CAST("Date Time" AS TIMESTAMP) DESC
  LIMIT 500`;

// List cases
router.get('/cases/list', async (req, res) => {
  const list = [
    {
      id: 'unmatched_out',
      title: 'รายการออกที่ไม่มีรายการเข้าก่อนหน้า',
      category: 'Access Flow',
      description: 'ตรวจสอบเหตุการณ์ OUT ที่ไม่พบรายการ IN ก่อนหน้าในช่วงเวลาที่กำหนด อาจบ่งชี้การอ่านบัตรผิดพลาดหรือกระบวนการเข้า–ออกไม่ครบถ้วน'
    },
    {
      id: 'unmatched_out_counts',
      title: 'สรุปจำนวน OUT ไม่มีคู่ แยกตามบุคคล',
      category: 'Access Flow',
      description: 'จัดทำสรุปความถี่ของเหตุการณ์ OUT ที่ไม่มีคู่ IN แยกตามบุคคล เพื่อระบุความเสี่ยงเชิงพฤติกรรมหรือปัญหาการใช้งาน'
    },
    {
      id: 'visitor_in_no_employees',
      title: 'ผู้มาติดต่อเข้าพื้นที่ในช่วงที่ไม่มีพนักงาน',
      category: 'Policy',
      description: 'ระบุเหตุการณ์ที่ผู้มาติดต่อเข้าถึงพื้นที่ในช่วงเวลาที่ไม่มีการลงบันทึกของพนักงาน ซึ่งควรตรวจสอบมาตรการควบคุมและการกำกับดูแล'
    },
    {
      id: 'door_device_location_ambiguity',
      title: 'ความไม่สอดคล้องของประตู/อุปกรณ์/สถานที่',
      category: 'Data Quality',
      description: 'ตรวจพบความไม่สอดคล้องของข้อมูลระหว่างชื่อประตู อุปกรณ์ และสถานที่ อาจสะท้อนถึงคุณภาพข้อมูลหรือการตั้งค่าระบบ'
    },
    {
      id: 'denied_without_reason',
      title: 'รายการถูกปฏิเสธโดยไม่ระบุเหตุผล',
      category: 'Data Quality',
      description: 'เหตุการณ์ที่ผลลัพธ์เป็นปฏิเสธ (Allow=false) แต่ไม่มีข้อมูลเหตุผล (Reason) อาจชี้ถึงการบันทึกเหตุผลไม่ครบถ้วนหรือการกำหนดค่าไม่เหมาะสม'
    },
    {
      id: 'allowed_without_permission',
      title: 'รายการอนุญาตที่ไม่พบสิทธิ์กำกับ',
      category: 'Policy',
      description: 'เหตุการณ์อนุญาต (Allow=true) แต่ไม่มีข้อมูล Permission กำกับ อาจส่งผลต่อการตรวจสอบย้อนกลับและการควบคุมสิทธิ์'
    },
    {
      id: 'high_frequency_card',
      title: 'การใช้บัตรความถี่สูงในระยะเวลาสั้น',
      category: 'Behavior',
      description: 'ตรวจจับการใช้บัตรเกินเกณฑ์ภายใน 10 นาที บ่งชี้ความเสี่ยงการยืมบัตรหรือการทดสอบระบบ'
    },
    {
      id: 'permission_multi_usertype',
      title: 'สิทธิ์เดียวกันถูกใช้โดยหลายประเภทผู้ใช้',
      category: 'Policy',
      description: 'ตรวจพบสิทธิ์ (Permission) ที่ถูกใช้งานโดยหลายกลุ่มผู้ใช้ อาจสะท้อนถึงการกำหนดสิทธิ์กว้างเกินจำเป็น'
    },
    {
      id: 'missing_device_or_location',
      title: 'ข้อมูลอุปกรณ์หรือสถานที่ว่าง/ไม่ครบถ้วน',
      category: 'Data Quality',
      description: 'เหตุการณ์ที่ไม่มีข้อมูลอุปกรณ์ (Device) หรือสถานที่ (Location) ครบถ้วน ส่งผลต่อความถูกต้องของการติดตามและสอบทาน'
    },
    {
      id: 'cards_never_allowed',
      title: 'บัตรที่ไม่เคยได้รับอนุญาต',
      category: 'Access Effectiveness',
      description: 'ระบุบัตรที่ไม่เคยมีเหตุการณ์อนุญาตเลย อาจเกิดจากบัตรผิดพลาด ไม่ได้ใช้งาน หรือสิทธิ์กำหนดไม่ถูกต้อง'
    },
    {
      id: 'txid_conflict',
      title: 'ความขัดแย้งของรหัสธุรกรรม',
      category: 'Integrity',
      description: 'พบรหัสธุรกรรม (Transaction ID) ซ้ำที่มีผลลัพธ์ต่างกัน สื่อถึงปัญหาความถูกต้องของข้อมูลหรือการผสานข้อมูล'
    },
    {
      id: 'cardname_multi_userhash',
      title: 'ชื่อบัตรเดียวสัมพันธ์กับผู้ใช้หลายราย',
      category: 'Identity',
      description: 'ชื่อบัตร (Card Name) เดียวเชื่อมโยงกับผู้ใช้หลายคน อาจชี้ความเสี่ยงการแชร์บัตรหรือข้อมูลบุคคลทับซ้อน'
    },
    {
      id: 'permission_door_never_allowed',
      title: 'สิทธิ์–ประตูที่ไม่เคยได้รับอนุญาต',
      category: 'Policy',
      description: 'คู่สิทธิ์ (Permission) – ประตู (Door) ที่ไม่เคยมีการอนุญาตสำเร็จ อาจสะท้อนการกำหนดสิทธิ์ไม่เหมาะสม'
    },
    {
      id: 'channel_device_conflict',
      title: 'ความไม่สอดคล้องของช่องทางและอุปกรณ์',
      category: 'Integrity',
      description: 'เหตุการณ์ที่ใช้ Channel เดียวกันแต่ต่างอุปกรณ์ภายในช่วงเวลาใกล้เคียง (เช่น 5 นาที) ส่อถึงความผิดปกติของอุปกรณ์หรือข้อมูลซ้ำซ้อน'
    },
    {
      id: 'top_failed_doors',
      title: 'ประตูที่มีการปฏิเสธสูงสุด',
      category: 'Summary',
      description: 'จัดอันดับประตูตามจำนวนเหตุการณ์ที่ถูกปฏิเสธ เพื่อใช้กำหนดลำดับความสำคัญในการแก้ไขและปรับปรุง'
    },
    {
      id: 'top_locations_events',
      title: 'สถานที่ที่มีปริมาณเหตุการณ์สูงสุด',
      category: 'Summary',
      description: 'จัดอันดับสถานที่ตามจำนวนเหตุการณ์ทั้งหมด เพื่อระบุพื้นที่ที่ต้องให้ความสำคัญในการเฝ้าระวัง'
    },
    {
      id: 'daily_inout',
      title: 'สรุปจำนวนการเข้า–ออกรายวัน',
      category: 'Summary',
      description: 'แสดงแนวโน้มปริมาณเหตุการณ์เข้า–ออกในแต่ละวัน เพื่อประกอบการวางแผนกำลังและการเฝ้าระวัง'
    },
    // New: Security Room related
    {
      id: 'security_room_events',
      title: 'เหตุการณ์การเข้าถึงห้องควบคุมความปลอดภัย',
      category: 'Security Room',
      description: 'รายการเหตุการณ์เข้า–ออกภายในศูนย์/ห้องควบคุมความปลอดภัย เพื่อการติดตามและตรวจสอบย้อนหลัง'
    },
    {
      id: 'security_room_offhours',
      title: 'การเข้าถึงห้องควบคุมความปลอดภัยนอกเวลาทำการ',
      category: 'Security Room',
      description: 'ระบุเหตุการณ์เข้าห้องควบคุมความปลอดภัยนอกเวลาทำการ (เช่น 22:00–06:00 หรือวันหยุด) โดยแยกกรณีที่ไม่ใช่เจ้าหน้าที่รักษาความปลอดภัย'
    },
  ];
  res.json({ cases: list });
});

// Execute a case
router.get('/cases', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id || !CASE_SQL[id]) return res.status(400).json({ error: 'Unknown case id' });

    // Local mock dataset for selected cases
    const CASE_MOCK = {
      security_room_events: [
        {
          ts: '2024-09-02T09:05:00.000Z', location: 'ห้องควบคุมความปลอดภัย A', direction: 'IN', allow: true, reason: '',
          card_name: 'ดาบตำรวจ วิรัช', user_type: 'SECURITY', door: 'SEC-A-01', device: 'Reader-SecA-01', permission: 'SEC_ROOM_A', channel: 'CARD', txid: 'TX-SEC-000001'
        },
        {
          ts: '2024-09-02T23:45:12.000Z', location: 'ห้องควบคุมความปลอดภัย A', direction: 'IN', allow: true, reason: '',
          card_name: 'สิบตำรวจตรี ก้องภพ', user_type: 'SECURITY', door: 'SEC-A-01', device: 'Reader-SecA-02', permission: 'SEC_ROOM_A', channel: 'CARD', txid: 'TX-SEC-000003'
        },
        {
          ts: '2024-09-03T01:12:09.000Z', location: 'ห้องควบคุมความปลอดภัย A', direction: 'IN', allow: false, reason: 'UNAUTHORIZED AREA',
          card_name: 'สุทธิชัย ผู้เยี่ยม', user_type: 'VISITOR', door: 'SEC-A-01', device: 'Reader-SecA-01', permission: 'VIS_TEMP', channel: 'CARD', txid: 'TX-SEC-000005'
        },
        {
          ts: '2024-09-03T10:02:33.000Z', location: 'ห้องควบคุมความปลอดภัย B', direction: 'IN', allow: true, reason: '',
          card_name: 'ร.ต.อ. ชาญชัย', user_type: 'SECURITY', door: 'SEC-B-02', device: 'Reader-SecB-01', permission: 'SEC_ROOM_B', channel: 'CARD', txid: 'TX-SEC-000007'
        },
        {
          ts: '2024-09-03T22:10:01.000Z', location: 'ห้องควบคุมความปลอดภัย B', direction: 'IN', allow: false, reason: 'NO OFF-HOUR PERMISSION',
          card_name: 'สมปอง ใจดี', user_type: 'EMPLOYEE', door: 'SEC-B-02', device: 'Reader-SecB-02', permission: 'EMP_GENERAL', channel: 'CARD', txid: 'TX-SEC-000009'
        }
      ],
      security_room_offhours: [
        {
          ts: '2024-09-02T23:45:12.000Z', location: 'ห้องควบคุมความปลอดภัย A', direction: 'IN', allow: true, reason: '',
          card_name: 'สิบตำรวจตรี ก้องภพ', user_type: 'SECURITY', hour: 23, dow: 1, door: 'SEC-A-01', device: 'Reader-SecA-02', permission: 'SEC_ROOM_A', channel: 'CARD', txid: 'TX-SEC-000003'
        },
        {
          ts: '2024-09-03T22:10:01.000Z', location: 'ห้องควบคุมความปลอดภัย B', direction: 'IN', allow: false, reason: 'NO OFF-HOUR PERMISSION',
          card_name: 'สมปอง ใจดี', user_type: 'EMPLOYEE', hour: 22, dow: 2, door: 'SEC-B-02', device: 'Reader-SecB-02', permission: 'EMP_GENERAL', channel: 'CARD', txid: 'TX-SEC-000009'
        },
        {
          ts: '2024-09-03T23:20:00.000Z', location: 'ห้องควบคุมความปลอดภัย B', direction: 'IN', allow: true, reason: '',
          card_name: 'พนักงานเวรดึก', user_type: 'EMPLOYEE', hour: 23, dow: 2, door: 'SEC-B-02', device: 'Reader-SecB-02', permission: 'EMP_SPECIAL', channel: 'CARD', txid: 'TX-SEC-000013'
        },
        {
          ts: '2024-09-04T23:59:59.000Z', location: 'ห้องควบคุมความปลอดภัย C', direction: 'IN', allow: false, reason: 'INVALID PIN',
          card_name: 'Visitor 99', user_type: 'VISITOR', hour: 23, dow: 3, door: 'SEC-C-03', device: 'Reader-SecC-02', permission: 'VIS_TEMP', channel: 'PIN', txid: 'TX-SEC-000012'
        }
      ],
      denied_without_reason: [
        { 'Date Time': '2024-09-05 20:15:10', Location: 'อาคาร B ชั้น 1', Direction: 'IN', Allow: false, Reason: '', 'Card Name': 'ผู้มาติดต่อ 01', 'User Type': 'VISITOR', Door: 'B1-01', Device: 'Reader-07', Permission: 'VIS_TEMP', Channel: 'CARD', 'Transaction ID': 'TX-MOCK-0001' },
        { 'Date Time': '2024-09-05 20:16:45', Location: 'อาคาร B ชั้น 1', Direction: 'IN', Allow: false, Reason: null, 'Card Name': 'ผู้มาติดต่อ 02', 'User Type': 'VISITOR', Door: 'B1-01', Device: 'Reader-07', Permission: 'VIS_TEMP', Channel: 'CARD', 'Transaction ID': 'TX-MOCK-0002' }
      ]
    };

    const forceMock = (req.query.mock || '').toString() === 'true';

    if (forceMock && CASE_MOCK[id]) {
      return res.json({ id, rows: CASE_MOCK[id], count: CASE_MOCK[id].length, mock: true });
    }

    try {
      const result = await query(CASE_SQL[id]);
      // Optional fallback to mock only when explicitly enabled via env
      const allowZeroFallback = (process.env.ENABLE_SECURITY_CASES_MOCK === 'true');
      if ((result.rowCount || 0) === 0 && CASE_MOCK[id] && allowZeroFallback && !forceMock) {
        console.warn(`Zero rows for case ${id}; serving mock due to env/DEV mode`);
        return res.json({ id, rows: CASE_MOCK[id], count: CASE_MOCK[id].length, mock: true });
      }
      return res.json({ id, rows: result.rows, count: result.rowCount });
    } catch (err) {
      console.error('Case query error', err);
      if (CASE_MOCK[id]) {
        console.warn(`Serving mock data for case ${id}`);
        return res.json({ id, rows: CASE_MOCK[id], count: CASE_MOCK[id].length, mock: true });
      }
      return res.status(500).json({ error: 'Failed to run case query' });
    }
  } catch (err) {
    console.error('Case query error', err);
    res.status(500).json({ error: 'Failed to run case query' });
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
    HAVING COUNT(*) >= 2 -- ลดเกณฑ์การตรวจจับเพื่อรวมเหตุการณ์มากขึ้น
    ORDER BY failedAttempts DESC, timeSpanMinutes ASC
    LIMIT 100 -- เพิ่ม limit เพื่อดึงข้อมูลมากขึ้น
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
      riskLevel: parseInt(row.failedattempts) >= 5 ? 'high' : // ปรับเกณฑ์ความเสี่ยง
        parseInt(row.failedattempts) >= 2 ? 'medium' : 'low',
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
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '30 days' -- เพิ่มช่วงเวลาเป็น 30 วัน
      AND "Card Name" IS NOT NULL
      AND "User Type" != 'SECURITY' -- ยกเว้นเจ้าหน้าที่รักษาความปลอดภัย
    ORDER BY "Date Time" DESC
    LIMIT 500 -- เพิ่ม limit เพื่อดึงข้อมูลมากขึ้น
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
    WHERE denialRate >= 10 -- ลดเกณฑ์อัตราปฏิเสธ
       OR totalAccess >= 500 -- ลดเกณฑ์ totalAccess
    ORDER BY denialRate DESC, totalAccess DESC
    LIMIT 50 -- เพิ่ม limit เพื่อดึงข้อมูลมากขึ้น
  `;

  const result = await query(sqlQuery);

  return {
    type: 'locationAnomalies',
    title: 'สถานที่เสี่ยง',
    description: 'ตรวจจับสถานที่ที่มีอัตราปฏิเสธสูงหรือการเข้าถึงผิดปกติ',
    data: result.rows.map(row => ({
      location: row.location,
      totalAccess: parseInt(row.totalaccess),
      deniedAccess: parseInt(row.deniedaccess),
      uniqueUsers: parseInt(row.uniqueusers),
      denialRate: parseFloat(row.denialrate),
      riskLevel: parseFloat(row.denialrate) >= 30 ? 'high' : // ปรับเกณฑ์ความเสี่ยง
        parseFloat(row.denialrate) >= 10 ? 'medium' : 'low',
      description: `${row.location}: ${row.denialrate}% ปฏิเสธ, ${row.totalaccess} ครั้งรวม, ${row.uniqueUsers} คนใช้`
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

// 7. 🔐 การเข้าถึงโดยไม่ได้รับอนุญาต (Access Denied)
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
    WHERE "Allow" = 'f' -- เน้นเฉพาะการเข้าถึงที่ถูกปฏิเสธ
      AND "Date Time" IS NOT NULL AND "Date Time" != ''
      AND CAST("Date Time" AS TIMESTAMP) >= NOW() - INTERVAL '30 days' -- เพิ่มช่วงเวลาเป็น 30 วัน
      AND "Card Name" IS NOT NULL
    ORDER BY "Date Time" DESC
    LIMIT 1000 -- เพิ่ม limit เพื่อดึงข้อมูลมากขึ้น
  `;

  const result = await query(sqlQuery);

  return {
    type: 'unauthorizedAccess',
    title: 'การเข้าถึงที่ถูกปฏิเสธ',
    description: 'ตรวจจับการเข้าถึงที่ถูกปฏิเสธทั้งหมด',
    data: result.rows.map(row => ({
      cardName: row.cardname,
      cardNumber: row.cardnumber,
      location: row.location,
      accessTime: row.accesstime,
      userType: row.usertype,
      permission: row.permission,
      reason: row.reason,
      riskLevel: row.reason && row.reason.includes('INVALID') ? 'high' : 'medium', // ปรับเกณฑ์ความเสี่ยง
      description: `${row.cardname} พยายามเข้าถึง ${row.location} แต่ถูกปฏิเสธ: ${row.reason}`
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


// POST /api/security/risk-analysis - สำหรับรัน SQL Query วิเคราะห์ความเสี่ยงแต่ละหมวดหมู่
router.post('/risk-analysis', async (req, res) => {
  const { dbConfig, sqlQuery, category, timeRange } = req.body;
  try {
    // ตรวจสอบว่ามี sqlQuery และ dbConfig ที่จำเป็น
    if (!sqlQuery || !dbConfig) {
      return res.status(400).json({ error: 'Missing sqlQuery or dbConfig in request body' });
    }

    // สามารถเพิ่มการตรวจสอบความปลอดภัยของ sqlQuery ที่นี่ได้
    // เช่น การตรวจสอบคำสั่งที่ไม่ได้รับอนุญาต หรือการจำกัดสิทธิ์ผู้ใช้

    const result = await query(sqlQuery, [], dbConfig); // ส่ง dbConfig ไปยังฟังก์ชัน query

    res.json({
      category,
      timeRange,
      data: result.rows,
      rowCount: result.rowCount
    });

  } catch (error) {
    console.error(`❌ Error executing risk analysis query for category ${category}:`, error);
    res.status(500).json({ error: `Failed to execute risk analysis query: ${error.message}` });
  }
});

module.exports = router;
