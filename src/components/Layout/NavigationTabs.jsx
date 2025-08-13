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
                relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm
                transition-all duration-300 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100
                ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              title={tab.description}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'scale-110 text-blue-100' : 'text-gray-500 group-hover:text-blue-600'
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-200 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationTabs;
