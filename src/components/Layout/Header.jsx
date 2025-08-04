// components/Layout/Header.jsx
import React from 'react';
import { DoorOpen } from 'lucide-react';

const Header = () => (
  <div className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <DoorOpen className="text-blue-600" />
        ระบบวิเคราะห์ Access Log
      </h1>
    </div>
  </div>
);

export default Header;