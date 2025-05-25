// frontend/src/components/ApresLivraisonForm.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import Button from './Button';

// Options pour les champs de type drop list
const statusOptions = [
  'ETABLIE',
  'ENVOYEE',
  'APPROUVEE',
  'DEPOSEE',
  'PRET',
  'ENVOYEE DHL',
];

function ApresLivraisonForm({ onClose, onPlanCreated, initialCommande }) {
  // Le formulaire est basé sur le modèle Commande
  const [formData, setFormData] = useState({
    commandeId: '',
    reference: '',
    client: '',
    booking: '',
    cargo: '',
    destination: '',
    // Utilisation du champ "numeroOP" au lieu de "OP"
    numeroOP: '',
    datePrevueDeChargement: '',
    quantiteKg: 0,
    quantiteCarton: 0,
    prixTotal: 0,
    statutBonDeCommande: 'EN_COURS',
    // On met à jour automatiquement ce champ en fonction du montant payé
    statutDePaiement: 'NON_PAYE',
    montantPaye: 0,
    reliquat: 0,
    // Champs Draft / Complémentaires sous forme de drop list
    draftHC: 'ETABLIE',
    facture: 'ETABLIE',
    packingList: 'ETABLIE',
    draftCO: 'ETABLIE',
    vgm: 'ETABLIE',
    dhl: 'ETABLIE',
    currency: 'EUR',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [commandesList, setCommandesList] = useState([]);

  useEffect(() => {
    fetchCommandes();
  }, []);

  // Pré-remplissage lors de l'édition d'un plan existant
  useEffect(() => {
    if (initialCommande) {
      setFormData({
        commandeId: initialCommande._id || '',
        reference: initialCommande.reference || '',
        client: initialCommande.client?._id || '',
        booking: initialCommande.booking || '',
        cargo: initialCommande.cargo || '',
        destination: initialCommande.destination || '',
        numeroOP: initialCommande.numeroOP || '',
        datePrevueDeChargement: initialCommande.datePrevueDeChargement
          ? initialCommande.datePrevueDeChargement.split('T')[0]
          : '',
        quantiteKg: initialCommande.quantiteKg || 0,
        quantiteCarton: initialCommande.quantiteCarton || 0,
        prixTotal: initialCommande.prixTotal || 0,
        statutBonDeCommande: initialCommande.statutBonDeCommande || 'EN_COURS',
        statutDePaiement: initialCommande.statutDePaiement || 'NON_PAYE',
        montantPaye: initialCommande.montantPaye || 0,
        reliquat: initialCommande.reliquat || 0,
        draftHC: initialCommande.draftHC || 'ETABLIE',
        facture: initialCommande.facture || 'ETABLIE',
        packingList: initialCommande.packingList || 'ETABLIE',
        draftCO: initialCommande.draftCO || 'ETABLIE',
        vgm: initialCommande.vgm || 'ETABLIE',
        dhl: initialCommande.dhl || 'ETABLIE',
        currency: initialCommande.currency || 'EUR',
      });
    }
  }, [initialCommande]);

  const fetchCommandes = async () => {
    try {
      const res = await axios.get('/commandes');
      setCommandesList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Lors de la sélection d'une commande, on récupère ses informations et on pré-remplit le formulaire
  const handleCommandeSelect = async (e) => {
    const commandeId = e.target.value;
    setFormData((prev) => ({ ...prev, commandeId }));
    if (commandeId) {
      try {
        const res = await axios.get(`/commandes/${commandeId}`);
        const cmd = res.data;
        setFormData((prev) => ({
          ...prev,
          reference: cmd.reference,
          client: cmd.client?._id || '',
          booking: cmd.booking || '',
          cargo: cmd.cargo || '',
          destination: cmd.destination || '',
          numeroOP: cmd.numeroOP || '',
          datePrevueDeChargement: cmd.datePrevueDeChargement
            ? new Date(cmd.datePrevueDeChargement).toISOString().split('T')[0]
            : '',
          quantiteKg: cmd.quantiteKg || 0,
          quantiteCarton: cmd.quantiteCarton || 0,
          prixTotal: cmd.prixTotal || 0,
          statutBonDeCommande: cmd.statutBonDeCommande || 'EN_COURS',
          statutDePaiement: cmd.statutDePaiement || 'NON_PAYE',
          montantPaye: cmd.montantPaye || 0,
          reliquat: cmd.reliquat || 0,
          draftHC: cmd.draftHC || 'ETABLIE',
          facture: cmd.facture || 'ETABLIE',
          packingList: cmd.packingList || 'ETABLIE',
          draftCO: cmd.draftCO || 'ETABLIE',
          vgm: cmd.vgm || 'ETABLIE',
          dhl: cmd.dhl || 'ETABLIE',
          currency: cmd.currency || 'EUR',
        }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Met à jour automatiquement le statut de paiement selon le montant payé et le prix total
  useEffect(() => {
    let newStatus = 'NON_PAYE';
    if (Number(formData.montantPaye) > 0 && Number(formData.montantPaye) < Number(formData.prixTotal)) {
      newStatus = 'PARTIELLEMENT_PAYE';
    } else if (Number(formData.montantPaye) >= Number(formData.prixTotal) && Number(formData.prixTotal) > 0) {
      newStatus = 'PAYE';
    }
    if (newStatus !== formData.statutDePaiement) {
      setFormData((prev) => ({ ...prev, statutDePaiement: newStatus }));
    }
  }, [formData.montantPaye, formData.prixTotal, formData.statutDePaiement]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const payload = { ...formData };
      // Remarque : ici on envoie vers /commandes pour créer ou modifier le plan de chargement
      if (initialCommande) {
        await axios.put(`/commandes/${initialCommande._id}`, payload);
      } else {
        await axios.post('/commandes', payload);
      }
      onPlanCreated();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erreur lors de la création/modification du plan de chargement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialCommande ? 'Modifier' : 'Nouveau Plan de Chargement'}
      </h2>

      {/* Bannière d'avertissement si Référence ou Numero OP ne sont pas renseignés */}
      {(!formData.reference || !formData.numeroOP) && (
        <div className="bg-red-700 text-white p-4 rounded-lg mb-6">
          Attention : Les champs <strong>Référence</strong> et <strong>Numero OP</strong> sont obligatoires.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* 1 : Sélection de la commande */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Sélectionnez la Commande
          </label>
          <select
            name="commandeId"
            required
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
            value={formData.commandeId}
            onChange={handleCommandeSelect}
          >
            <option value="">-- Choisir une commande --</option>
            {commandesList.map((cmd) => (
              <option key={cmd._id} value={cmd._id}>
                {cmd.reference} - {cmd.client?.raisonSociale}
              </option>
            ))}
          </select>
        </div>

        {/* 2 : Affichage et modification des informations récupérées de la commande */}
        {formData.commandeId && (
          <div className="space-y-4 border p-4 rounded-md bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Référence</label>
                <input
                  name="reference"
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  value={formData.reference}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Numero OP</label>
                <input
                  name="numeroOP"
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  value={formData.numeroOP}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-medium">Quantité (Kg) :</label>
                <input
                  name="quantiteKg"
                  type="number"
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                  value={formData.quantiteKg}
                />
              </div>
              <div>
                <label className="block font-medium">Quantité (Cartons) :</label>
                <input
                  name="quantiteCarton"
                  type="number"
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                  value={formData.quantiteCarton}
                />
              </div>
              <div>
                <label className="block font-medium">Prix Total :</label>
                <input
                  name="prixTotal"
                  type="number"
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                  value={formData.prixTotal}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="font-medium">Statut BC :</span> {formData.statutBonDeCommande}
              </div>
              <div>
                <span className="font-medium">Statut Paiement :</span>
                <input
                  name="statutDePaiement"
                  type="text"
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                  value={formData.statutDePaiement}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="font-medium">Montant Payé :</span> {formData.montantPaye}
              </div>
              <div>
                <span className="font-medium">Reliquat :</span> {formData.reliquat}
              </div>
            </div>
          </div>
        )}

        {/* 3 : Champs complémentaires du plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Booking</label>
            <input
              name="booking"
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.booking}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Cargo</label>
            <input
              name="cargo"
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.cargo}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <input
              name="destination"
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.destination}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Numero OP</label>
            <input
              name="numeroOP"
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.numeroOP}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 4 : Date Prévue de Chargement */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Date Prévue de Chargement
          </label>
          <input
            name="datePrevueDeChargement"
            type="date"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            value={formData.datePrevueDeChargement}
            onChange={handleChange}
          />
        </div>

        {/* 5 : Champs relatifs aux statuts et paiements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Statut BC</label>
            <input
              name="statutBonDeCommande"
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.statutBonDeCommande}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Statut Paiement</label>
            <input
              name="statutDePaiement"
              type="text"
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
              value={formData.statutDePaiement}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Montant Payé</label>
            <input
              name="montantPaye"
              type="number"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.montantPaye}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Reliquat</label>
            <input
              name="reliquat"
              type="number"
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
              value={formData.reliquat}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 6 : Champs complémentaires Draft / Statuts supplémentaires en drop list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Draft HC</label>
            <select
              name="draftHC"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.draftHC}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Draft CO</label>
            <select
              name="draftCO"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.draftCO}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">VGM</label>
            <select
              name="vgm"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.vgm}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Packing List</label>
            <select
              name="packingList"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.packingList}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 7 : Autres champs en drop list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Facture</label>
            <select
              name="facture"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.facture}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">DHL</label>
            <select
              name="dhl"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.dhl}
              onChange={handleChange}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8 : Currency (optionnel) */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <input
            name="currency"
            type="text"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            value={formData.currency}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end mt-6 space-x-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !formData.commandeId}
            loading={loading}
          >
            {initialCommande ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ApresLivraisonForm;
