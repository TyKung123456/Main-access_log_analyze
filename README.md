# Access Log Analyzer

## คำอธิบาย
โปรเจกต์นี้คือ Access Log Analyzer ซึ่งออกแบบมาเพื่อประมวลผล วิเคราะห์ และแสดงภาพข้อมูล Access Log มีส่วนหน้า (Frontend) ที่พัฒนาด้วย React สำหรับแดชบอร์ดแบบโต้ตอบ และส่วนหลัง (Backend) ที่พัฒนาด้วย Node.js/Express สำหรับการประมวลผลข้อมูลและบริการ API แอปพลิเคชันนี้ยังรองรับ Docker เพื่อการติดตั้งใช้งานที่ง่ายดาย

## คุณสมบัติ
- อัปโหลดและประมวลผลไฟล์ Access Log
- แดชบอร์ดสำหรับแสดงภาพข้อมูล Log (เช่น แนวโน้มการเข้าชม, IP ยอดนิยม, เหตุผลการปฏิเสธการเข้าถึง)
- คุณสมบัติการวิเคราะห์ความปลอดภัย
- ฟังก์ชันการแชท (น่าจะสำหรับการให้ข้อมูลเชิงลึกที่ขับเคลื่อนด้วย AI หรือการโต้ตอบกับผู้ใช้)

## เทคโนโลยีที่ใช้
**ส่วนหน้า (Frontend):**
- React
- Vite
- Tailwind CSS

**ส่วนหลัง (Backend):**
- Node.js
- Express.js
- MongoDB (น่าจะใช้, อ้างอิงจาก `backend/config/database.js`)

**อื่นๆ:**
- Docker

## การติดตั้ง

### ข้อกำหนดเบื้องต้น
- Node.js (แนะนำเวอร์ชัน LTS)
- npm (Node Package Manager)
- Docker (หากคุณวางแผนที่จะใช้ Docker ในการติดตั้งใช้งาน)
- MongoDB (หากรันในเครื่องโดยไม่ใช้ Docker)

### การตั้งค่าในเครื่อง (Local Setup)

#### 1. โคลน Repository
```bash
git clone https://github.com/TyKung123456/Main-access_log_analyze.git
cd access-log-analyzer
```

#### 2. การตั้งค่าส่วนหลัง (Backend Setup)
ไปยังไดเรกทอรี `backend` ติดตั้ง Dependencies และเริ่ม Server
```bash
cd backend
npm install
# สร้างไฟล์ .env ในไดเรกทอรี backend พร้อมกับ MongoDB URI และการตั้งค่าอื่นๆ ของคุณ
# ตัวอย่างเนื้อหาไฟล์ .env:
# MONGO_URI=mongodb://localhost:27017/accesslogs
# PORT=5000
npm start
```

#### 3. การตั้งค่าส่วนหน้า (Frontend Setup)
เปิด Terminal ใหม่ ไปยังไดเรกทอรีหลักของโปรเจกต์ ติดตั้ง Dependencies และเริ่ม Development Server
```bash
cd .. # กลับไปยังไดเรกทอรีหลักหากคุณอยู่ใน backend
npm install
npm run dev
```

### การตั้งค่า Docker (ไม่บังคับ)
คุณสามารถรันแอปพลิเคชันโดยใช้ Docker ได้

#### 1. สร้าง Docker Images
จากไดเรกทอรีหลัก:
```bash
docker build -t access-log-analyzer-frontend .
docker build -t access-log-analyzer-backend -f backend/Dockerfile ./backend
```

#### 2. รัน Docker Containers
คุณอาจต้องใช้ไฟล์ `docker-compose.yml` เพื่อการจัดการที่ง่ายขึ้น แต่ตอนนี้คุณสามารถรันแยกกันได้:
```bash
# รัน MongoDB (หากยังไม่ได้รัน)
docker run -d -p 27017:27017 --name mongo-db mongo:latest

# รัน Backend (เชื่อมโยงกับ MongoDB container)
docker run -d -p 5000:5000 --name access-log-backend --link mongo-db:mongo access-log-analyzer-backend

# รัน Frontend
docker run -d -p 5173:5173 --name access-log-frontend access-log-analyzer-frontend
```
*หมายเหตุ: คำสั่ง Docker ที่แน่นอนอาจแตกต่างกันไปขึ้นอยู่กับการตั้งค่า Docker และการกำหนดค่าเครือข่ายของคุณ*

## การใช้งาน
1. เมื่อทั้ง Backend และ Frontend Server ทำงานอยู่ ให้เปิดเว็บเบราว์เซอร์ของคุณและไปที่ `http://localhost:5173` (หรือพอร์ตที่ Frontend ของคุณกำลังทำงานอยู่)
2. ใช้คุณสมบัติการอัปโหลดเพื่อนำเข้าไฟล์ Access Log ของคุณ
3. สำรวจส่วนแดชบอร์ดและการวิเคราะห์เพื่อรับข้อมูลเชิงลึกจากข้อมูล Log ของคุณ
4. ใช้คุณสมบัติการแชทสำหรับการโต้ตอบที่ขับเคลื่อนด้วย AI


