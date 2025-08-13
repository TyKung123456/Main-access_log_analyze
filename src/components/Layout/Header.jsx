// components/Layout/Header.jsx
import React from 'react';
import { DoorOpen } from 'lucide-react';

const Header = () => (
  <header className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg border-b border-blue-800">
    <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
      <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
        <DoorOpen className="text-blue-200 w-8 h-8" />
        Access Log Analyzer
      </h1>
      {/* You can add more elements here, e.g., user profile, settings, etc. */}
    </div>
  </header>
);

export default Header;
