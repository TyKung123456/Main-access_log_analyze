// Lightweight Tooltip components (shadcn-like API, CSS-only)
import React from 'react';

export const TooltipProvider = ({ children }) => children;

export const Tooltip = ({ children }) => <div className="relative group/tip inline-block">{children}</div>;

export const TooltipTrigger = React.forwardRef(({ asChild = false, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, ...props });
  }
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = ({ side = 'right', className = '', children }) => {
  const sideClasses = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    top: 'left-1/2 -translate-x-1/2 bottom-full mb-2',
    bottom: 'left-1/2 -translate-x-1/2 top-full mt-2'
  };
  const pos = sideClasses[side] || sideClasses.right;
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute ${pos} px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap ${className}`}
    >
      {children}
    </div>
  );
};

