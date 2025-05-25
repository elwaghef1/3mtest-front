import React, { useEffect } from 'react';

export const Dialog = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg w-full max-w-md mx-auto ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader = ({ children }) => {
  return <div className="px-6 py-4 border-b border-gray-200">{children}</div>;
};

export const DialogTitle = ({ children, className = "" }) => {
  return <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>;
};

export const DialogFooter = ({ children }) => {
  return <div className="px-6 py-4 border-t border-gray-200">{children}</div>;
};

export const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    ghost: "hover:bg-gray-100 text-gray-700 focus:ring-gray-500",
  };

  const sizes = {
    default: "px-4 py-2 text-sm rounded-md",
    sm: "px-3 py-1 text-sm rounded-md",
    icon: "p-2 rounded-md",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};