// frontend/src/components/TransfertDetails.js
import React from 'react';
import Button from './Button';

function TransfertDetails({ transfert, onClose }) {
  // Petite fonction interne pour formater l'article
  const formatArticle = (a) => {
    if (!a) return '—';
    const ref = a.reference || '';
    const spec = a.specification || '';
    const taille = a.taille || '';
    const tCarton = a.typeCarton || '';
    return [ref, spec, taille, tCarton].filter(Boolean).join(' - ');
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Détails du Transfert</h2>
      <div className="space-y-2">
        <p>
          <strong>Date :</strong>{' '}
          {transfert.dateTransfert
            ? new Date(transfert.dateTransfert).toLocaleDateString()
            : '—'}
        </p>
        <p>
          <strong>Article :</strong> {formatArticle(transfert.article)}
        </p>
        <p>
          <strong>Dépôt Départ :</strong>{' '}
          {transfert.depotDepart?.intitule || '—'}
        </p>
        <p>
          <strong>Dépôt Arrivée :</strong>{' '}
          {transfert.depotArrivee?.intitule || '—'}
        </p>
        <p>
          <strong>Quantité (Kg) :</strong> {transfert.quantiteKg}
        </p>
        <p>
          <strong>Pointeur :</strong> {transfert.pointeur || '—'}
        </p>
        <p>
          <strong>Moyen de Transfert :</strong>{' '}
          {transfert.moyenDeTransfert || '—'}
        </p>
        <p>
          <strong>Immatricule :</strong> {transfert.immatricule || '—'}
        </p>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={onClose}
          variant="secondary"
          size="md"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}

export default TransfertDetails;
