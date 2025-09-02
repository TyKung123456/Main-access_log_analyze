// components/Layout/Header.jsx
import React from 'react';
import { DoorOpen } from 'lucide-react';

const Header = ({ pageTitle = '', pageSubtitle = '' }) => {
  const logoUrl = import.meta.env.VITE_BRAND_LOGO_URL || '/ktb-logo.svg';
  const brandName = import.meta.env.VITE_BRAND_NAME || 'Krungthai Bank';
  const brandLink = import.meta.env.VITE_BRAND_LINK || '';
  const logoHeight = Number(import.meta.env.VITE_BRAND_LOGO_HEIGHT) || 56; // px
  return (
    <header className="sticky top-0 z-50 bg-blue-200 border-b border-blue-300 shadow-sm">
      <div className="w-full px-2 sm:px-4 py-5 grid grid-cols-3 items-center">
        {/* Left: app title */}
        <div className="justify-self-start">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-300 text-blue-900">
              <DoorOpen className="w-6 h-6" />
            </span>
            <span>Access Log Analyzer</span>
          </h1>
        </div>

        {/* Center: current page title */}
        <div className="justify-self-center text-center hidden sm:block">
          {pageTitle && (
            <div className="text-blue-900 font-semibold text-base leading-tight">{pageTitle}</div>
          )}
          {pageSubtitle && (
            <div className="text-blue-900/70 text-xs leading-tight">{pageSubtitle}</div>
          )}
        </div>

        {/* Right: Brand */}
        <div className="justify-self-end flex items-center gap-2">
          <span className="hidden sm:inline text-blue-900/70 text-xs">สนับสนุนโดย</span>
          {brandLink ? (
            <a href={brandLink} target="_blank" rel="noopener noreferrer" title={brandName} className="inline-flex">
              <img
                src={logoUrl}
                alt={brandName}
                style={{ height: logoHeight }}
                className="w-auto object-contain drop-shadow-sm"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </a>
          ) : (
            <img
              src={logoUrl}
              alt={brandName}
              style={{ height: logoHeight }}
              className="w-auto object-contain drop-shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
