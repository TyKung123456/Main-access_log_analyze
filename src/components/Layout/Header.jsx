// components/Layout/Header.jsx
import React from 'react';
import { DoorOpen } from 'lucide-react';

const Header = ({ pageTitle = '', pageSubtitle = '' }) => {
  const logoUrl = import.meta.env.VITE_BRAND_LOGO_URL || '/ktb-logo.svg';
  const brandName = import.meta.env.VITE_BRAND_NAME || 'Krungthai Bank';
  const brandLink = import.meta.env.VITE_BRAND_LINK || '';
  const logoHeight = Number(import.meta.env.VITE_BRAND_LOGO_HEIGHT) || 56; // px
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-200 to-blue-100 border-b border-blue-300/70 shadow-sm">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 grid grid-cols-3 items-center">
        {/* Left: app title */}
        <div className="justify-self-start">
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 tracking-tight flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-300/80 text-blue-900 ring-1 ring-blue-400/50 shadow-sm">
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

        {/* Right: Brand only */}
        <div className="justify-self-end flex items-center gap-4">
          {/* Brand */}
          <span className="hidden sm:inline text-blue-900/70 text-xs">สนับสนุนโดย</span>
          {brandLink ? (
            <a href={brandLink} target="_blank" rel="noopener noreferrer" title={brandName} className="inline-flex opacity-90 hover:opacity-100 transition-opacity">
              <img
                src={logoUrl}
                alt={brandName}
                style={{ height: logoHeight }}
                className="w-auto object-contain drop-shadow-sm rounded-md ring-1 ring-blue-300/40"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </a>
          ) : (
            <img
              src={logoUrl}
              alt={brandName}
              style={{ height: logoHeight }}
              className="w-auto object-contain drop-shadow-sm rounded-md ring-1 ring-blue-300/40"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
