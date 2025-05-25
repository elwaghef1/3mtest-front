import React, { useState, useRef, useEffect } from 'react';

export const TooltipProvider = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger = ({ children, asChild, ...props }) => {
  return asChild ? (
    React.cloneElement(React.Children.only(children), props)
  ) : (
    <button type="button" {...props}>
      {children}
    </button>
  );
};

export const TooltipContent = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      className="absolute z-50 px-3 py-1.5 text-sm bg-gray-900 text-white rounded shadow-lg -translate-y-full -mt-1"
    >
      {children}
    </div>
  );
};