import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

const FlashNotification = ({ message, type, onClose }) => {
  const getTypeStyles = () => {
    switch(type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className={`fixed top-4 right-4 ${getTypeStyles()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 focus:outline-none">
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default FlashNotification;