import React from 'react';

const Alert = ({ children, variant = 'default', ...props }) => {
  const baseStyle = "p-4 rounded-lg border";
  const variantStyles = {
    default: "bg-blue-100 border-blue-200 text-blue-800",
    destructive: "bg-red-100 border-red-200 text-red-800",
    warning: "bg-yellow-100 border-yellow-200 text-yellow-800",
    success: "bg-green-100 border-green-200 text-green-800"
  };

  return (
    <div className={`${baseStyle} ${variantStyles[variant]}`} role="alert" {...props}>
      {children}
    </div>
  );
};

const AlertTitle = ({ children, ...props }) => (
  <h5 className="font-bold mb-1" {...props}>{children}</h5>
);

const AlertDescription = ({ children, ...props }) => (
  <div className="text-sm" {...props}>{children}</div>
);

Alert.Title = AlertTitle;
Alert.Description = AlertDescription;

export { Alert, AlertTitle, AlertDescription };