// Components/Button.js - Composant de bouton réutilisable avec design unifié
import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon,
  leftIcon,
  rightIcon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}) => {
  // Variantes de couleur améliorées pour plus de visibilité
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white border border-blue-600 shadow-md hover:shadow-lg',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white border border-gray-600 shadow-md hover:shadow-lg',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white border border-green-600 shadow-md hover:shadow-lg',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white border border-red-600 shadow-md hover:shadow-lg',
    warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 text-white border border-yellow-500 shadow-md hover:shadow-lg',
    info: 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 text-white border border-cyan-600 shadow-md hover:shadow-lg',
    outline: 'border-2 border-gray-400 hover:border-gray-600 bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md',
    ghost: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md'
  };

  // Tailles améliorées pour plus de visibilité
  const sizes = {
    xs: 'px-2 py-1 text-xs min-w-[60px]',
    sm: 'px-4 py-2 text-sm min-w-[80px] min-h-[36px]',
    md: 'px-6 py-2.5 text-sm min-w-[100px] min-h-[40px]',
    lg: 'px-8 py-3 text-base min-w-[120px] min-h-[44px]',
    xl: 'px-10 py-4 text-lg min-w-[140px] min-h-[48px]'
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    transform hover:scale-105 active:scale-95
  `;

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;

  const renderIcon = (position) => {
    // Support pour icon legacy avec iconPosition
    if (icon && iconPosition === position) {
      return (
        <span className={`
          ${position === 'left' ? 'mr-2' : 'ml-2'}
          ${loading && position === 'left' ? 'animate-spin' : ''}
        `}>
          {loading && position === 'left' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            icon
          )}
        </span>
      );
    }
    
    // Support pour leftIcon et rightIcon
    const currentIcon = position === 'left' ? leftIcon : rightIcon;
    if (!currentIcon) return null;
    
    return (
      <span className={`
        ${position === 'left' ? 'mr-2' : 'ml-2'}
        ${loading && position === 'left' ? 'animate-spin' : ''}
      `}>
        {loading && position === 'left' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          currentIcon
        )}
      </span>
    );
  };

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {renderIcon('left')}
      {loading && iconPosition !== 'left' && (
        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      {children}
      {renderIcon('right')}
    </button>
  );
};

export default Button;
