// components/Layout/NavigationTabs.jsx
import React from 'react';
import { Upload, BarChart3, MessageSquare } from 'lucide-react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { 
      id: 'upload', 
      label: 'อัปโหลดไฟล์', 
      icon: Upload,
      description: 'อัปโหลดไฟล์ Access Log'
    },
    { 
      id: 'dashboard', 
      label: 'แดชบอร์ด & วิเคราะห์', 
      icon: BarChart3,
      description: 'ภาพรวม, สถิติ และการวิเคราะห์เชิงลึก'
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
                flex items-center gap-2 px-4 py-2 rounded-md font-medium 
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${isActive
                  ? 'bg-white text-blue-600 shadow-sm transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              title={tab.description}
            >
              <Icon 
                className={`w-4 h-4 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`} 
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationTabs;
