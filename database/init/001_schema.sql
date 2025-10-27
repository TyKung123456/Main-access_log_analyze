-- สคีมาฐานข้อมูลสำหรับ Access Log Analyzer (PostgreSQL)
-- คุณสมบัติ: รันซ้ำได้ (idempotent) และครอบคลุมคอลัมน์ที่โค้ดใช้งานจริง

SET search_path = public;

-- ตารางหลักที่ระบบใช้งานจริง
CREATE TABLE IF NOT EXISTS "real_log_analyze" (
  "Transaction ID"       TEXT,
  file                    TEXT,
  "Date Time"            TIMESTAMP WITHOUT TIME ZONE,
  day                     INTEGER,
  month                   INTEGER,
  year                    INTEGER,
  year_mm                 VARCHAR(10),
  "Door"                 TEXT,
  "Device"               TEXT,
  "Location"             TEXT,
  "Direction"            VARCHAR(4), -- 'IN'|'OUT'
  "Allow"                BOOLEAN,
  "Reason"               TEXT,
  "Channel"              TEXT,
  "Card Name"            TEXT,
  "Card Number Hash"     TEXT,
  "ID Hash"              TEXT,
  "User Hash"            TEXT,
  "User Type"            TEXT,
  "Permission"           TEXT,
  "Temp."                DOUBLE PRECISION,
  severity                TEXT
);

-- เพิ่มคอลัมน์ที่อาจขาด (เพื่อความ idempotent เมื่อสคีมามีบางส่วนอยู่แล้ว)
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Transaction ID"   TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS file                TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Date Time"        TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS day                 INTEGER;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS month               INTEGER;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS year                INTEGER;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS year_mm             VARCHAR(10);
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Door"             TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Device"           TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Location"         TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Direction"        VARCHAR(4);
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Allow"            BOOLEAN;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Reason"           TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Channel"          TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Card Name"        TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Card Number Hash" TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "ID Hash"          TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "User Hash"        TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "User Type"        TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Permission"       TEXT;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS "Temp."            DOUBLE PRECISION;
ALTER TABLE "real_log_analyze" ADD COLUMN IF NOT EXISTS severity            TEXT;

-- ข้อกำหนดค่าที่เหมาะสม
DO $$
BEGIN
  ALTER TABLE "real_log_analyze"
    ADD CONSTRAINT real_log_analyze_direction_chk
    CHECK ("Direction" IN ('IN','OUT') OR "Direction" IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ดัชนีสำคัญที่ถูกใช้ในคำสั่งค้นหา/จัดกลุ่ม
CREATE UNIQUE INDEX IF NOT EXISTS idx_rla_txid
  ON "real_log_analyze" ("Transaction ID"); -- รองรับ UPSERT ใน upload (ON CONFLICT)

CREATE INDEX IF NOT EXISTS idx_rla_datetime
  ON "real_log_analyze" ("Date Time");

CREATE INDEX IF NOT EXISTS idx_rla_location
  ON "real_log_analyze" ("Location");

CREATE INDEX IF NOT EXISTS idx_rla_direction
  ON "real_log_analyze" ("Direction");

CREATE INDEX IF NOT EXISTS idx_rla_allow
  ON "real_log_analyze" ("Allow");

CREATE INDEX IF NOT EXISTS idx_rla_user_type
  ON "real_log_analyze" ("User Type");

CREATE INDEX IF NOT EXISTS idx_rla_card_name
  ON "real_log_analyze" ("Card Name");

CREATE INDEX IF NOT EXISTS idx_rla_card_number_hash
  ON "real_log_analyze" ("Card Number Hash");

CREATE INDEX IF NOT EXISTS idx_rla_door
  ON "real_log_analyze" ("Door");

CREATE INDEX IF NOT EXISTS idx_rla_device
  ON "real_log_analyze" ("Device");

CREATE INDEX IF NOT EXISTS idx_rla_yearmm
  ON "real_log_analyze" (year_mm);

CREATE INDEX IF NOT EXISTS idx_rla_severity
  ON "real_log_analyze" (severity);

-- หมายเหตุ:
-- 1) ระบบตั้งค่าวันที่ใน session เป็น 'ISO, DMY' ที่ระดับ connection (ดู backend/config/database.js)
-- 2) การค้นหาแบบ ILIKE หลายคอลัมน์อาจพิจารณาเสริม GIN/pg_trgm หากข้อมูลมีขนาดใหญ่มาก

