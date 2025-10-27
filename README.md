# Access Log Analyzer (เอกสารภาษาไทย)

โปรเจกต์สำหรับวิเคราะห์ Access Log แบบครบวงจร ประกอบด้วย Frontend (React + Vite) และ Backend (Node.js/Express + PostgreSQL) พร้อมความสามารถอัปโหลดไฟล์ CSV/XLSX, วิเคราะห์ความผิดปกติ (Security/Anomaly), สร้างสถิติ/แผนภูมิ และเชื่อมต่อ AI (Ollama/Mock) เพื่อสรุปผลเชิงบริหาร

**พารามิเตอร์อ้างอิง**
- ชื่อโปรเจ็กต์: Access Log Analyzer
- Stack หลัก: React (Vite), Tailwind CSS, Node.js/Express, PostgreSQL, CSV/XLSX, Optional AI (Ollama)
- DB ที่ใช้: PostgreSQL (ค่าเริ่มต้นพอร์ต 5433)
- พอร์ตบริการ: FE=5173, BE=3001, DB=5433 (ทั่วไป PostgreSQL มักใช้ 5432)
- ฟีเจอร์หลัก: อัปโหลดไฟล์, ชุดตัวกรอง, Charts, สถิติรวม, เคสความปลอดภัย, Export CSV/JSON/Excel (CSV), AI สร้างรายงาน/สรุปอัตโนมัติ (Mock/Ollama)
- โฟลเดอร์อัปโหลด/สำรอง: backend/uploads (ชั่วคราว), ไม่มีโฟลเดอร์สำรองถาวร

**จุดเด่น**
- ประสิทธิภาพการประมวลผลไฟล์ใหญ่ รองรับ CSV/XLSX สูงสุดระดับล้านแถว (ประมวลผลเป็น batch)
- สคีมา PostgreSQL ชัดเจน ใช้ตารางเดียว `public."real_log_analyze"` พร้อมดัชนีหลักที่จำเป็น
- Dashboard สถิติ/แผนภูมิ (Hourly/Location/Direction) และ Faceted filters (Location, Direction, User Type, Door, Severity)
- Security Cases/Anomaly Detection แบบ SQL สำเร็จรูป และ Endpoint รวมผล
- รองรับ AI (ผ่าน Ollama หรือ Mock) สำหรับสรุปรายงานและโต้ตอบ

**ข้อกำหนดระบบ**
- Node.js >= 16 และ npm >= 8
- PostgreSQL 13+ (แนะนำ 14 ขึ้นไป)
- พื้นที่ดิสก์เพียงพอสำหรับไฟล์ log และฐานข้อมูล
- ถ้าใช้ AI แบบ local: Ollama server ที่ `http://localhost:11434` (ปรับได้)

## โครงสร้างโปรเจกต์ (สรุป)
- โค้ดส่วนหน้า: `src/` (React + Vite)
- โค้ดส่วนหลัง: `backend/` (Express + pg)
- คอนฟิกฐานข้อมูล: `backend/config/database.js`
- เส้นทาง API หลัก: `backend/routes/*.js`
- ไฟล์อัปโหลดชั่วคราว: `backend/uploads/` (ระบบจะสร้างอัตโนมัติและลบหลังประมวลผล)
- สคีมาฐานข้อมูล (เอกสารนี้สร้าง): `database/init/001_schema.sql`
- ไฟล์ตัวอย่าง .env (เอกสารนี้สร้าง): `.env.example`
- โครงสร้าง/แนวทาง: `docs/PROJECT_STRUCTURE.md`

ตัวอย่าง alias import (ดู `vite.config.js`)
- `@` → `./src`
- `@components`, `@hooks`, `@services`, `@utils`, `@constants`

## การตั้งค่า .env (สรุปตัวแปรสำคัญ)

Backend
- `PORT` (ค่าเริ่มต้น 3001): พอร์ต API Backend
- `FRONTEND_URL` (ดีฟอลต์ http://localhost:5173): ตั้ง CORS origin ให้ตรงกับ Frontend
- `DB_POSTGRESDB_HOST` (เช่น localhost)
- `DB_POSTGRESDB_PORT` (ดีฟอลต์ 5433): หาก PostgreSQL ในเครื่องใช้ 5432 ให้แก้ค่านี้
- `DB_POSTGRESDB_DATABASE` (ดีฟอลต์ n8n)
- `DB_POSTGRESDB_USER` (ดีฟอลต์ admin)
- `DB_POSTGRESDB_PASSWORD` (ดีฟอลต์ P@ssw0rd)
- `DB_SSL` (true/false): เปิดใช้ SSL ต่อฐานข้อมูลถ้าจำเป็น
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT`: ตั้งค่าการเรียก Ollama (ถ้าใช้ AI แบบ local)
- `ENABLE_SECURITY_CASES_MOCK` (true/false): อนุญาต fallback เป็น mock เมื่อดึงเคสไม่ได้

Frontend (Vite ต้องใช้ตัวแปร prefix `VITE_`)
- `VITE_API_BASE_URL` (แนะนำ `http://localhost:3001`): โคน URL ของ Backend (ไม่ต้องใส่ `/api` ต่อท้าย เพื่อเลี่ยงการซ้ำ `/api/api` ในบาง service)
- `VITE_AI_PROVIDER` (`mock` | `local` | `mcp`): โหมด AI; dev แนะนำ `mock`
- `VITE_DEBUG_AI` (true/false): โหมดดีบัก AI
- `VITE_OLLAMA_URL`, `VITE_OLLAMA_MODEL`, `VITE_OLLAMA_TIMEOUT`, `VITE_OLLAMA_MAX_RETRIES`: ตั้งค่า Ollama ฝั่ง FE (เมื่อ `VITE_AI_PROVIDER=local`)
- `VITE_ENABLE_AI_CHAT`, `VITE_ENABLE_LOG_ANALYSIS`, `VITE_ENABLE_DEMO_MODE`, `VITE_ENABLE_SAMPLE_DATA`
- `VITE_ENABLE_AI_EXPORT_SUMMARY` (true/false): เปิดสรุปรายงานด้วย AI เมื่อ export
- `VITE_FORCE_CASES_MOCK` (true/false), `VITE_CASES_FROM_DATA` (true/false): ใช้ mock/สร้างเคสจากข้อมูลฝั่ง FE
- Branding: `VITE_BRAND_LOGO_URL`, `VITE_BRAND_NAME`, `VITE_BRAND_LINK`, `VITE_BRAND_LOGO_HEIGHT`

เมื่อย้ายไปเครื่องใหม่ ต้องเปลี่ยนค่าอะไรบ้าง
- ค่าเชื่อมต่อฐานข้อมูลทั้งหมด (HOST/PORT/DATABASE/USER/PASSWORD/DB_SSL)
- พอร์ตบริการที่ชนกัน (PORT, VITE_API_BASE_URL)
- FRONTEND_URL ให้ตรงกับโดเมน/พอร์ตของ FE
- ถ้าใช้ AI แบบ local ให้ตั้ง OLLAMA_* ให้ถูกกับเครื่องใหม่

## วิธีติดตั้งแบบ Local (ทีละขั้น)
1) เตรียมสภาพแวดล้อม
- ติดตั้ง Node.js >= 16 และ PostgreSQL 13+

2) ตั้งค่าฐานข้อมูล PostgreSQL
- สร้างฐานข้อมูลและผู้ใช้ให้ตรงกับ `.env` (ดู `.env.example`)
- รันสคีมา (idempotent):
  - `psql -h <HOST> -p <PORT> -U <USER> -d <DB> -f database/init/001_schema.sql`

3) ตั้งค่า .env
- คัดลอก `.env.example` เป็น `.env` และแก้ค่าให้ตรงกับเครื่อง

4) ติดตั้งและรัน Backend
- `cd backend && npm install`
- `npm run dev` (หรือ `npm start` สำหรับโหมดปกติ)
- ตรวจสอบ health: เรียก `GET http://localhost:3001/api/health`

5) ติดตั้งและรัน Frontend
- กลับมารากโปรเจกต์ `npm install`
- `npm run dev` แล้วเปิด `http://localhost:5173`

หมายเหตุพอร์ต Dev
- Frontend: 5173 (ตั้งที่ `vite.config.js`)
- Backend: 3001 (`PORT`) และ prefix `/api`
- PostgreSQL: ดีฟอลต์โค้ดใช้ 5433 (หากเครื่องคุณใช้ 5432 ให้แก้ `.env`)

## วิธีติดตั้งแบบ Docker (ย่อ)
- ในโปรเจกต์นี้ไฟล์ Dockerfile ยังเป็น placeholder แนะนำวิธีผสม: ใช้ Docker สำหรับ PostgreSQL แล้วรัน FE/BE แบบ local
- ตัวอย่างรัน Postgres ด้วย Docker:
  - `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:14`
  - สร้าง DB/USER ตาม `.env` แล้วรันสคีมาด้วย `database/init/001_schema.sql`
- ตั้งค่า FE/BE ตามขั้นตอน Local ด้านบน (ชี้ `DB_POSTGRESDB_HOST=localhost` และ `DB_POSTGRESDB_PORT=5433`)

## คำสั่งรันและพอร์ต
- รัน Backend: `cd backend && npm run dev` (พอร์ต 3001)
- รัน Frontend: `npm run dev` (พอร์ต 5173)
- Health check: `GET /api/health` → ตรวจ DB และคืนเวลาปัจจุบันพร้อมจำนวนระเบียน

## Endpoints สำคัญ + ตัวอย่าง curl
- GET `/api/health`
  - ตรวจสถานะฐานข้อมูล
  - ตัวอย่าง: `curl http://localhost:3001/api/health`

- Logs
  - GET `/api/logs?search=&startDate=&endDate=&allow=&location=&direction=&userType=&doors=&severities=&page=&limit=&sort=&order=`
  - GET `/api/logs/locations`, `/api/logs/directions`, `/api/logs/user-types`, `/api/logs/doors`, `/api/logs/severity-levels`
  - ตัวอย่าง: `curl "http://localhost:3001/api/logs?limit=10&order=DESC"`

- Stats
  - GET `/api/stats` (สรุปรวม), `/api/stats/user?user=<name_or_hash>`, `/api/stats/users-top`
  - ตัวอย่าง: `curl "http://localhost:3001/api/stats"`

- Charts
  - GET `/api/charts/hourly`, `/api/charts/location`, `/api/charts/direction`
  - ตัวอย่าง: `curl "http://localhost:3001/api/charts/hourly?startDate=2024-01-01&endDate=2024-12-31"`

- Upload
  - POST `/api/upload` (multipart form key=`file`) รองรับ .csv/.xlsx/.xls/.txt/.log
  - POST `/api/upload/batch-append` (JSON: `{ logs: [...] }`)
  - GET `/api/upload/stats`, `/api/upload/history`
  - ตัวอย่าง: `curl -F file=@access_log_template.csv http://localhost:3001/api/upload`

- Export
  - GET `/api/export/csv|json|excel?startDate=&endDate=&location=&direction=&allow=&limit=`
  - ตัวอย่าง: `curl -L "http://localhost:3001/api/export/csv?limit=100" -o export.csv`

- Security / Cases / Anomalies
  - GET `/api/security/anomalies` (รวมผลหลายดีเทคเตอร์)
  - GET `/api/security/cases/list`, `/api/security/cases?id=<case_id>`
  - GET `/api/anomalies/:type` (เช่น `deviceMultiDevice`, `locationMultiLoc`, ...)

- AI สร้างรายงาน (ถ้าใช้ Ollama)
  - POST `/api/ai/chat` (Body: `{ prompt, model, options }`)

## Troubleshooting
- CORS: ถ้า FE เรียก API ไม่ได้ ให้ตั้ง `FRONTEND_URL` ให้ตรง และเช็ค proxy ของ Vite (`/api` → 3001)
- DB ต่อไม่ได้: ตรวจ `DB_POSTGRESDB_*` โดยเฉพาะพอร์ต (โค้ดดีฟอลต์ 5433 ส่วนเครื่องทั่วไปมัก 5432)
- Schema ไม่ตรง: รัน `database/init/001_schema.sql` อีกครั้ง (idempotent)
- VITE_API_BASE_URL ผิด: แนะนำตั้งเป็น `http://localhost:3001` (อย่าใส่ `/api` ต่อท้าย เพื่อเลี่ยง `/api/api` ใน `aiService`)
- AI/Ollama: ถ้าไม่ติดตั้ง ให้ตั้ง `VITE_AI_PROVIDER=mock` และงดเรียก `/api/ai/chat`
- Security Cases ว่าง: ตั้ง `ENABLE_SECURITY_CASES_MOCK=true` เพื่ออนุญาต fallback ข้อมูลตัวอย่าง

## ความปลอดภัยและหมายเหตุโปรดักชัน
- ตั้ง `DB_SSL=true` เมื่อเชื่อมต่อฐานข้อมูลข้ามเครือข่ายที่ไม่ปลอดภัย
- เก็บความลับ (รหัสผ่าน/คีย์) ในระบบ secret manager ไม่ commit ขึ้น Git
- เปิด Log/Monitoring ฝั่งเซิร์ฟเวอร์ (morgan/helmet/compression มีใช้แล้ว)
- พิจารณา Rate limiting/Authentication ตามนโยบายองค์กร
- สำรองฐานข้อมูลตามรอบเวลา และทดสอบการกู้คืน

## แนวทาง Deploy (ย่อ)
- เตรียมฐานข้อมูลและรันสคีมา
- สร้างไฟล์ `.env` สำหรับ environment นั้น ๆ (ปรับ URL/PORT/DB/AI)
- ติดตั้ง deps และรัน `backend/server.js` บน Process manager (PM2/systemd)
- สร้าง FE ด้วย `npm run build` แล้วเสิร์ฟผ่าน Nginx/Static hosting หรือใช้ Vite preview ชั่วคราว

## Branding / โลโก้สนับสนุน
- ตั้งค่าในไฟล์ `.env` ฝั่ง Frontend:
  - `VITE_BRAND_LOGO_URL=https://your.cdn.example.com/path/to/logo.svg`
  - `VITE_BRAND_NAME=Krungthai Bank`
  - `VITE_BRAND_LINK=https://example.com` (ถ้ามี)
  - `VITE_BRAND_LOGO_HEIGHT=48`
- หากไม่ตั้งค่า ระบบจะลองโหลด `public/ktb-logo.svg`

## เช็คลิสต์ย้ายเครื่อง/ย้ายเซิร์ฟเวอร์
- [ ] ปรับ `DB_POSTGRESDB_*` ให้ตรงกับฐานข้อมูลใหม่ (รวม `DB_SSL` ถ้าจำเป็น)
- [ ] ปรับ `VITE_API_BASE_URL`, `FRONTEND_URL`, `PORT` ตามพอร์ต/โดเมนจริง
- [ ] ตรวจ proxy `/api` ใน `vite.config.js` ให้ชี้ไปยัง Backend
- [ ] ตั้งค่า AI (Ollama/OpenAI ฯลฯ) หรือใช้ `VITE_AI_PROVIDER=mock`
- [ ] รัน `database/init/001_schema.sql` ให้แน่ใจว่าสคีมาครบ
- [ ] ทดสอบ `GET /api/health` และหน้า FE หลัก
