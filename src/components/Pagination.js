// components/Pagination.js
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import Button from './Button';

const Pagination = ({ 
  currentPage, 
  itemsPerPage, 
  totalItems, 
  onPageChange, 
  onItemsPerPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = (e) => {
    const newSize = Number(e.target.value);
    onItemsPerPageChange(newSize);
    onPageChange(1); // Reset à la première page quand on change la taille
  };

  if (totalPages < 1) return null;

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">Lignes par page :</span>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="border rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Précédent
        </Button>
        
        <span className="text-sm text-gray-700">
          Page {currentPage} sur {totalPages}
        </span>

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          variant="outline"
          size="sm"
          rightIcon={<ArrowRightIcon className="h-4 w-4" />}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onItemsPerPageChange: PropTypes.func.isRequired,
};

export default Pagination;