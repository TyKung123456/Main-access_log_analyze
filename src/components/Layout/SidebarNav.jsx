import React from 'react';
import { Upload, BarChart3, MessageSquare, Table, FileText, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip.jsx';

const SidebarNav = ({ activeTab, setActiveTab, collapsed = false, onToggle }) => {
  const tabs = [
    { id: 'logs', label: 'ประวัติการใช้งาน', icon: Table, description: 'Transaction Log แบบตาราง' },
    { id: 'dashboard', label: 'แดชบอร์ด & วิเคราะห์', icon: BarChart3, description: 'ภาพรวม, สถิติ และการวิเคราะห์เชิงลึก' },
    { id: 'pivot', label: 'Pivot (Beta)', icon: Grid, description: 'ตาราง Pivot แบบ Power BI' },
    { id: 'cases', label: 'รายงานเคส', icon: FileText, description: 'รายงานแยกตามเคส พร้อมส่งออก' },
    { id: 'chat', label: 'รายงาน', icon: MessageSquare, description: 'สร้างและส่งออกรายงาน Markdown' },
  ];

  const handleClick = (id) => {
    setActiveTab(id);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tab_click', { event_category: 'navigation_sidebar', event_label: id });
    }
  };

  if (collapsed) {
    return (
      <aside className="w-16 shrink-0">
        <nav className="h-full flex flex-col bg-white border-r border-gray-200">
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={onToggle}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-600"
              aria-label="ขยายเมนู"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <TooltipProvider>
            <ul className="flex-1 p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleClick(tab.id)}
                          aria-label={tab.label}
                          className={`w-full h-11 flex items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon size={18} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{tab.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0">
      <nav className="h-full flex flex-col rounded-2xl bg-white border border-gray-200 shadow-lg ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/70 bg-gradient-to-b from-gray-50 to-white">
          <div className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">เมนูหลัก</div>
          <button
            onClick={onToggle}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-blue-300 hover:bg-blue-100 text-blue-900"
            aria-label="ย่อเมนู"
            title="ย่อเมนู"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id} className="px-2">
                <button
                  onClick={() => handleClick(tab.id)}
                  title={`${tab.label} — ${tab.description}`}
                  className={`group w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border-l-4 transition-colors ${isActive ? 'bg-sky-50 text-slate-900 border-l-sky-400' : 'bg-white text-gray-800 border-l-transparent hover:bg-gray-50 hover:border-l-sky-200'}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md ${isActive ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-600'} ring-1 ring-black/5`}>
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block ${isActive ? 'font-semibold' : 'font-medium'} truncate whitespace-nowrap`}>{tab.label}
                      {tab.id === 'pivot' && (
                        <span className={`ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>Beta</span>
                      )}
                    </span>
                    <span className={`block text-xs ${isActive ? 'text-sky-700/80' : 'text-gray-500'} truncate whitespace-nowrap`}>{tab.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-3 py-2 border-t border-gray-200 bg-white/90 text-[11px] text-gray-500">v1.0 • Access Log Analyzer</div>
      </nav>
    </aside>
  );
};

export default SidebarNav;
