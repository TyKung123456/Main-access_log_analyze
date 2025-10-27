โครงสร้างโปรเจ็กต์และแนวทาง (Project Structure & Conventions)

ภาพรวมโครงสร้างไดเรกทอรี
- root
  - backend
    - config/          (ตั้งค่าฐานข้อมูล PostgreSQL)
    - middleware/      (CORS/อื่น ๆ — ถ้ามี)
    - models/          (โมเดล — ปัจจุบันแทบไม่ใช้ เพราะใช้ SQL ตรง)
    - routes/          (ไฟล์เส้นทาง API: logs, stats, security, upload, export, anomalies)
    - server.js        (บู๊ตเซิร์ฟเวอร์ Express, health check, charts)
  - database
    - init/001_schema.sql  (สคีมา PostgreSQL แบบ idempotent)
  - docs
    - PROJECT_STRUCTURE.md (เอกสารนี้)
  - public/           (ไฟล์ statics และ templates)
  - src/              (Frontend React)
    - components/     (UI, Layout, Pages, Analytics, Security, Logs)
    - hooks/          (React hooks เช่น useLogData/useFilters)
    - services/       (apiService, aiService, exportService)
    - utils/          (ตัวช่วย เช่น dataProcessing, filterUtils, suspicionScore)
    - Analytics/      (หน้า/คอมโพเนนต์รวม)
    - main.jsx, App.jsx, vite.config.js (entry/config)

แนวทางตั้งชื่อและการจัดวางไฟล์
- คอมโพเนนต์หน้าหลัก: `XyzPage.jsx`
- คอมโพเนนต์ย่อยตามบทบาท: `XyzCard.jsx`, `XyzChart.jsx`, `XyzTable.jsx`
- UI primitives/Reusable: อยู่ภายใต้ `src/components/ui/`
- Hook: `useXyz.js`
- Service: `xyzService.js` (เรียก API/AI/Export)
- Utils: ฟังก์ชันช่วยเหลือที่ไร้ state และไม่มี side-effect กับ UI

Import Alias (vite.config.js → resolve.alias)
- `@` → `./src`
- `@components`, `@hooks`, `@services`, `@utils`, `@constants` → โฟลเดอร์ย่อยใน `src`

Barrel Exports (แนะนำ)
- สำหรับโฟลเดอร์คอมโพเนนต์ที่มีหลายไฟล์ แนะนำสร้าง `index.js` เพื่อรวม export ช่วยให้ import สั้นและชัดเจน

ข้อควรทำ
- แยก concerns: UI (components) / data (services) / logic (utils) ให้ชัดเจน
- ใช้พารามิเตอร์เส้นทาง API จาก services เดียว (`apiService.js`) เพื่อบังคับรูปแบบการเรียกที่เหมือนกัน
- เพิ่มดัชนี/ฟิลด์ที่ใช้ค้นหาบ่อยในสคีมาฐานข้อมูล (เช่น Date Time, Location, Allow, Direction) ให้สอดคล้องกับโค้ด backend
- ใช้ ENV แบบ Vite (prefix `VITE_`) ในฝั่ง FE เท่านั้น และใช้ `process.env` ในฝั่ง BE

ข้อห้าม/ข้อควรระวัง
- หลีกเลี่ยงการประกาศตัวแปรสภาพแวดล้อมฝั่ง FE ที่ไม่มี prefix `VITE_` (จะไม่ถูกอ่านใน build)
- อย่าแนบ `/api` ซ้ำใน `VITE_API_BASE_URL` (เช่น `http://localhost:3001/api`) เพราะบาง service จะเติม `/api` เพิ่มอีกครั้ง
- อย่าพึ่งข้อมูลคอลัมน์ที่ไม่มีในสคีมาจริง (เช่น `severity`) โดยไม่ตรวจสอบว่ามีคอลัมน์ใน DB แล้วหรือไม่
- ไฟล์อัปโหลดจะถูกเก็บชั่วคราวใน `backend/uploads` และถูกลบหลังประมวลผล ไม่ควรใช้เป็นที่เก็บถาวร

คำแนะนำเพิ่มเติม
- ถ้าต้องเพิ่มตาราง/คอลัมน์ใหม่ ให้แก้ `database/init/001_schema.sql` โดยใช้ `CREATE TABLE IF NOT EXISTS` และ `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- เมื่อเพิ่มฟิลด์ที่ใช้ค้นหาบ่อย ให้เพิ่มดัชนี `CREATE INDEX IF NOT EXISTS`

