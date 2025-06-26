// Fonction utilitaire pour récupérer le poids par carton d'un article
export const getKgPerCarton = (article) => {
  if (typeof article === 'object' && article.kgParCarton) {
    return parseFloat(article.kgParCarton);
  }
  return 20; // valeur par défaut
};

// Fonction pour calculer les cartons à partir du poids et de l'article
export const calculateCartonsFromKg = (kg, article) => {
  const kgPerCarton = getKgPerCarton(article);
  return kg / kgPerCarton;
};

// Fonction pour calculer le poids à partir des cartons et de l'article
export const calculateKgFromCartons = (cartons, article) => {
  const kgPerCarton = getKgPerCarton(article);
  return cartons * kgPerCarton;
};

// Alias pour la compatibilité avec le code existant
export const getCartonQuantityFromKg = calculateCartonsFromKg;
export const convertKgToCarton = calculateCartonsFromKg;
