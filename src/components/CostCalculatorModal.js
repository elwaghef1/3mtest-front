// frontend/src/components/CostCalculatorModal.js
import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function CostCalculatorModal({
  isOpen,
  onClose,
  displayCurrency,
  currentCump,      // CUMP/T (en MRU) de la ligne sélectionnée
  initialSmcp,      // Valeur SMCP de l'article (en MRU)
  formattedArticle, // Libellé formaté de l'article, à afficher dans le titre
  conversionRates   // Objet des taux de conversion (ex: { USD: 1, EUR: ..., MRU: ... })
}) {
  // Calcul du facteur de conversion depuis MRU vers la devise d'affichage
  const conversionFactor =
    conversionRates && conversionRates['MRU']
      ? conversionRates[displayCurrency] / conversionRates['MRU']
      : displayCurrency === 'EUR'
      ? 0.0240963855
      : displayCurrency === 'USD'
      ? 0.025
      : 1;

  const getCurrencySymbol = () => {
    if (displayCurrency === 'EUR') return '€';
    if (displayCurrency === 'USD') return '$';
    return 'MRU';
  };

  // Champs maintenus en MRU
  const [smcp, setSmcp] = useState(initialSmcp || 4462);
  const [label, setLabel] = useState(1400);
  const [dhl, setDhl] = useState(4000);
  const [transit, setTransit] = useState(13000);
  const [manutention, setManutention] = useState(8475);
  const [factureMsc, setFactureMsc] = useState(2300);
  const [branchement, setBranchement] = useState(8750);
  const [fraisChargement, setFraisChargement] = useState(4000);
  const [fret, setFret] = useState(4165);

  // On suppose 28 tonnes par conteneur
  const tonnePerContainer = 28;

  useEffect(() => {
    // Réinitialiser SMCP à l'ouverture du modal
    if (isOpen) {
      setSmcp(initialSmcp || 4462);
    }
  }, [initialSmcp, isOpen]);

  // Calcul du total des autres frais (en MRU)
  const totalBForContainer =
    label + dhl + transit + manutention + factureMsc + branchement + fraisChargement;

  // Prix de revient en MRU
  const prixRevientMRU = totalBForContainer / tonnePerContainer + fret + (12 * smcp) / 100;

  // Conversion vers la devise d'affichage + ajout du CUMP existant
  const prixRevientDisplay = prixRevientMRU * conversionFactor + currentCump;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-3xl relative">
        {/* Titre principal */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Calcul du Coût de Revient
          {formattedArticle && (
            <span className="ml-2 text-lg font-semibold text-red-600">
              ({formattedArticle})
            </span>
          )}
        </h2>

        {/* Séparateur */}
        <div className="border-b border-gray-200 mb-6" />

        {/* Bloc paramétrage */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Paramètres de calcul</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CUMP/T */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                CUMP/T ({getCurrencySymbol()})
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2 bg-gray-100 text-gray-600"
                value={currentCump.toFixed(0)}
                readOnly
              />
            </div>

            {/* SMCP */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Retenue SMCP ({getCurrencySymbol()}/T)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(smcp * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setSmcp((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Label */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Label ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(label * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setLabel((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* DHL */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                DHL ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(dhl * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setDhl((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Transit */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Transit ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(transit * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setTransit((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Manutention */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Manutention ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(manutention * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setManutention((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Facture MSC */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Facture MSC ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(factureMsc * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setFactureMsc((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Branchement */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Branchement 7 jours ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(branchement * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setBranchement((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Frais de chargement */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Frais de chargement ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(fraisChargement * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setFraisChargement((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>

            {/* Fret */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-1">
                Fret ({getCurrencySymbol()}/TC)
              </label>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={(fret * conversionFactor).toFixed(0)}
                onChange={(e) =>
                  setFret((parseFloat(e.target.value) || 0) / conversionFactor)
                }
              />
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-b border-gray-200 mb-6" />

        {/* Calculs */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Calculs</h3>

          {/* Carte de récapitulatif */}
          <div className="bg-gray-50 border rounded-md p-4 mb-4">
            <p className="text-sm mb-2 font-semibold text-gray-700">Détails :</p>
            {/* Variables calculées */}
            <ul className="text-sm space-y-1 text-gray-600">
              <li>
                Mise en FOB (par tonne) :{' '}
                <strong>
                  {(totalBForContainer / tonnePerContainer + smcp).toFixed(2)}{' '}
                  {getCurrencySymbol()}/T
                </strong>
              </li>
              <li>
                Fret (fixe par tonne) :{' '}
                <strong>
                  {fret.toFixed(2)} {getCurrencySymbol()}/T
                </strong>
              </li>
            </ul>
          </div>

          {/* Résultat final */}
          <div className="bg-green-100 border-l-4 border-green-600 text-center p-4 rounded-md shadow-sm">
            <p className="mb-1 text-base font-bold text-red-800">
              Prix de revient (CFR)
            </p>
            <p className="text-xl font-extrabold text-green-700">
              {prixRevientDisplay.toFixed(2)} {getCurrencySymbol()}/T
            </p>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
