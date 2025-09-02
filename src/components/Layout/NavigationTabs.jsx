// components/Layout/NavigationTabs.jsx
import React from 'react';
import { Upload, BarChart3, MessageSquare, Table, FileText, Grid } from 'lucide-react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { 
      id: 'logs', 
      label: 'ประวัติการใช้งาน', 
      icon: Table,
      description: 'Transaction Log แบบตาราง'
    },
    { 
      id: 'dashboard', 
      label: 'แดชบอร์ด & วิเคราะห์', 
      icon: BarChart3,
      description: 'ภาพรวม, สถิติ และการวิเคราะห์เชิงลึก'
    },
    {
      id: 'pivot',
      label: 'Pivot (Beta)',
      icon: Grid,
      description: 'ตาราง Pivot แบบ Power BI'
    },
    { 
      id: 'cases', 
      label: 'รายงานเคส', 
      icon: FileText,
      description: 'รายงานแยกตามเคส พร้อมส่งออก'
    },
    { 
      id: 'chat', 
      label: 'Chat กับ AI', 
      icon: MessageSquare,
      description: 'สอบถามข้อมูลกับ AI'
    },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    
    // Optional: Add analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tab_click', {
        event_category: 'navigation',
        event_label: tabId
      });
    }
  };

  return (
    <nav className="mb-6" role="tablist" aria-label="การนำทางหลัก">
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 ${isActive ? 'py-3' : 'py-2.5'} rounded-full font-semibold
                ${isActive ? 'text-base' : 'text-sm'} border transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0
                ${isActive
                  ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                }
                hover:shadow-sm hover:-translate-y-0.5
              `}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              aria-controls={`panel-${tab.id}`}
              title={tab.description}
            >
              <Icon className={`${isActive ? 'w-5 h-5' : 'w-5 h-5'} ${isActive ? 'text-blue-700' : 'text-gray-500'}`} aria-hidden="true" />
              <span className="whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (<span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-200 rounded-full" />)}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationTabs;
