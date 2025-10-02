import React from 'react';

const CollapsibleCard = ({ title, children, actions = null, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-3">
          <span className="inline-block w-1.5 h-5 bg-blue-400 rounded-full" />
          <h3 className="font-semibold text-blue-900 text-base tracking-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 text-xs px-2 py-1 rounded-md hover:bg-blue-100/40 transition-colors"
            title={open ? 'พับเก็บ' : 'แสดง'}
            aria-expanded={open}
          >
            <span className="hidden sm:inline">{open ? 'ย่อ' : 'แสดง'}</span>
            <svg className={`h-4 w-4 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="p-4 sm:p-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;

