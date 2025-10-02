graph TD
    subgraph "Old Workflow (การวิเคราะห์ Access Log แบบเก่า)"
        A_old[รวบรวม Access Log] --> B_old[วิเคราะห์/กรอง Log ด้วยตนเอง (เช่น grep, awk)]
        B_old --> C_old[ตรวจสอบความผิดปกติ/เหตุการณ์ด้านความปลอดภัยด้วยตนเอง]
        C_old --> D_old[สร้างรายงานด้วยตนเอง (เช่น สเปรดชีต)]
        D_old --> E_old[ดำเนินการตามผลการวิเคราะห์]
    end

    subgraph "New Workflow (การวิเคราะห์ Access Log โดยใช้เว็บแอป)"
        A_new[รวบรวม Access Log] --> F_new{อัปโหลด Log ไปยังเว็บแอป}
        F_new --> G_new[เว็บแอป: ประมวลผลและวิเคราะห์ข้อมูลอัตโนมัติ]
        G_new --> H_new[เว็บแอป: แดชบอร์ดแบบโต้ตอบและข้อมูลเชิงลึก]
        H_new --> I_new[เว็บแอป: ตรวจจับความผิดปกติและการแจ้งเตือนด้านความปลอดภัย]
        I_new --> J_new[เว็บแอป: สร้างรายงานและส่งออกอัตโนมัติ]
        J_new --> E_new[ดำเนินการตามข้อมูลเชิงลึกจากเว็บแอป]
    end

    style F_new fill:#f9f,stroke:#333,stroke-width:2px
    style G_new fill:#bbf,stroke:#333,stroke-width:2px
    style H_new fill:#bbf,stroke:#333,stroke-width:2px
    style I_new fill:#bbf,stroke:#333,stroke-width:2px
    style J_new fill:#bbf,stroke:#333,stroke-width:2px

    classDef webApp fill:#d4edda,stroke:#28a745,stroke-width:2px;
    class F_new,G_new,H_new,I_new,J_new webApp;
