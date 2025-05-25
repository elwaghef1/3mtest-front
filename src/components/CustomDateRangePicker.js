// frontend/src/components/CustomDateRangePicker.js
import React from 'react';

const CustomDateRangePicker = ({
  startDate,
  endDate,
  onDatesChange,
  displayFormat = 'dd/MM/yyyy',
  startDatePlaceholderText = 'Date de début',
  endDatePlaceholderText = 'Date de fin',
  showClearDates = true,
  small = false,
  numberOfMonths = 2,
  isOutsideRange = () => false,
  className = ''
}) => {
  // Conversion des dates moment vers format HTML5 (YYYY-MM-DD)
  const convertToInputValue = (date) => {
    if (!date) return '';
    
    // Si c'est un objet moment
    if (date._isAMomentObject) {
      return date.format('YYYY-MM-DD');
    }
    
    // Si c'est un objet Date
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    // Si c'est une string
    if (typeof date === 'string') {
      try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    }
    
    return '';
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    const date = value ? new Date(value) : null;
    onDatesChange({ startDate: date, endDate });
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    const date = value ? new Date(value) : null;
    onDatesChange({ startDate, endDate: date });
  };

  const handleClear = () => {
    onDatesChange({ startDate: null, endDate: null });
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {/* Input pour la date de début */}
      <div className="flex-1">
        <input
          type="date"
          value={convertToInputValue(startDate)}
          onChange={handleStartDateChange}
          placeholder={startDatePlaceholderText}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <span className="text-gray-500">—</span>

      {/* Input pour la date de fin */}
      <div className="flex-1">
        <input
          type="date"
          value={convertToInputValue(endDate)}
          onChange={handleEndDateChange}
          placeholder={endDatePlaceholderText}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Bouton clear */}
      {showClearDates && (startDate || endDate) && (
        <button
          onClick={handleClear}
          className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-md hover:border-red-300 transition-colors"
          title="Effacer les dates"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default CustomDateRangePicker;
