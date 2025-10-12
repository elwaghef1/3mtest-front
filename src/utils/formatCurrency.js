// Fonction utilitaire pour formater une devise avec 3 décimales si présentes, sinon 2
export const formatCurrency = (value, currency = 'EUR', options = {}) => {
  const numValue = parseFloat(value) || 0;
  
  // Détermine le nombre de décimales à afficher (3 si présentes, sinon 2)
  const hasThreeDecimals = (numValue * 1000) % 10 !== 0;
  const minimumFractionDigits = options.forceDecimals || (hasThreeDecimals ? 3 : 2);
  const maximumFractionDigits = options.forceDecimals || (hasThreeDecimals ? 3 : 2);
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numValue);
};

// Version simplifiée pour affichage avec symbole custom
export const formatCurrencySimple = (value, currency = 'EUR', options = {}) => {
  const numValue = parseFloat(value) || 0;
  
  // Détermine le nombre de décimales à afficher (3 si présentes, sinon 2)
  const hasThreeDecimals = (numValue * 1000) % 10 !== 0;
  const decimals = options.forceDecimals || (hasThreeDecimals ? 3 : 2);
  
  const formattedNumber = numValue.toFixed(decimals);
  
  if (currency === 'MRU') {
    return `${formattedNumber} MRU`;
  } else if (currency === 'USD') {
    return `$${formattedNumber}`;
  } else {
    return `€${formattedNumber}`;
  }
};

export default formatCurrency;