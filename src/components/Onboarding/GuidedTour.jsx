import React, { useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Upload, Table, BarChart3, MessageSquare, Download } from 'lucide-react';

const StepDot = ({ active }) => (
  <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-600' : 'bg-blue-200'}`} />
);

const GuidedTour = ({ isOpen, onClose, goToTab }) => {
  const steps = useMemo(() => ([
    {
      id: 'upload',
      title: 'ขั้นตอนที่ 1: อัปโหลดไฟล์ข้อมูล',
      description: 'เริ่มจากการอัปโหลดไฟล์ Access Log (.csv, .xlsx, .xls) เพื่อให้ระบบวิเคราะห์ข้อมูล',
      actionLabel: 'ไปหน้าอัปโหลด',
      action: () => goToTab?.('upload'),
      Icon: Upload,
    },
    {
      id: 'logs',
      title: 'ขั้นตอนที่ 2: ตรวจสอบ Transaction Log',
      description: 'ดูข้อมูลแบบตาราง ค้นหา และกรองข้อมูลเพื่อเจาะลึกเหตุการณ์ที่สนใจ',
      actionLabel: 'ไปหน้า Transaction Log',
      action: () => goToTab?.('logs'),
      Icon: Table,
    },
    {
      id: 'dashboard',
      title: 'ขั้นตอนที่ 3: วิเคราะห์บนแดชบอร์ด',
      description: 'ดูสถิติโดยรวม กราฟแนวโน้ม สถานที่ยอดฮิต และเหตุผลที่ถูกปฏิเสธ พร้อมฟีเจอร์ส่งออกรายงาน snapshot',
      actionLabel: 'ไปหน้าแดชบอร์ด',
      action: () => goToTab?.('dashboard'),
      Icon: BarChart3,
    },
    {
      id: 'chat',
      title: 'ขั้นตอนที่ 4: สร้างรายงานด้วย AI',
      description: 'ให้ AI สรุปและจัดทำรายงาน โดยกำหนดรูปแบบสำนวนและความละเอียดได้ตามต้องการ',
      actionLabel: 'ไปหน้า AI Report',
      action: () => goToTab?.('chat'),
      Icon: MessageSquare,
    },
    {
      id: 'export',
      title: 'ขั้นตอนที่ 5: ส่งออกและแชร์ผลลัพธ์',
      description: 'บันทึกผลสรุปเป็น Markdown/ไฟล์รายงานจากหน้าแดชบอร์ด หรือดาวน์โหลดเทมเพลต CSV เพื่อนำเข้าข้อมูล',
      actionLabel: 'ดูตัวเลือกการส่งออก',
      action: () => goToTab?.('dashboard'),
      Icon: Download,
    },
  ]), [goToTab]);

  const [index, setIndex] = React.useState(0);
  const total = steps.length;
  const current = steps[index];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, total, onClose]);

  if (!isOpen) return null;

  const Icon = current?.Icon || HelpCircle;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[720px]">
        <div className="mx-3 md:mx-0 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <HelpCircle className="w-5 h-5" />
              <span className="font-semibold">คู่มือการใช้งานแบบย่อ</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" aria-label="ปิด">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 rounded-xl bg-blue-50 ring-1 ring-blue-100">
                <Icon className="w-6 h-6 text-blue-700" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{current.title}</h3>
                <p className="text-gray-700 leading-relaxed">{current.description}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {current.action && (
                <button
                  onClick={current.action}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  ไปยังขั้นตอนนี้
                </button>
              )}
              <button
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
                disabled={index === 0}
              >
                <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
                disabled={index === total - 1}
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
              {index === total - 1 && (
                <button
                  onClick={onClose}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  เริ่มใช้งานเลย
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <StepDot key={i} active={i === index} />
                ))}
              </div>
              <div>
                {index + 1} / {total}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;

