import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LockClosedIcon, PhoneIcon } from '@heroicons/react/24/solid';
import FlashNotification from './FlashNotification';
import Button from './Button';

// Composant Logo Chinchard (Horse Mackerel)
const FishLogo = ({ className = "h-16 w-16" }) => (
  <svg className={className} viewBox="0 0 100 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corps principal du chinchard - forme allongée et élégante */}
    <path d="M95 25 C90 18, 75 10, 55 10 C40 10, 25 14, 15 20 L5 15 L8 25 L5 35 L15 30 C25 36, 40 40, 55 40 C75 40, 90 32, 95 25 Z" />
    {/* Nageoire dorsale */}
    <path d="M45 10 Q50 4, 58 8 L55 12 Q50 10, 45 12 Z" opacity="0.9"/>
    {/* Nageoire ventrale */}
    <path d="M50 40 Q52 46, 58 44 L56 40 Z" opacity="0.9"/>
    {/* Queue fourchue caractéristique */}
    <path d="M5 15 L-2 8 L2 18 L0 25 L2 32 L-2 42 L5 35 L8 25 Z" />
    {/* Œil */}
    <circle cx="80" cy="24" r="4" fill="currentColor" opacity="0.3"/>
    <circle cx="80" cy="24" r="2.5" fill="white"/>
    {/* Ligne latérale avec écailles */}
    <path d="M20 25 Q35 23, 50 24 Q65 25, 78 24" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4"/>
    {/* Branchies */}
    <path d="M72 20 Q74 25, 72 30" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
  </svg>
);

// Composant bulles animées
const AnimatedBubbles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white opacity-10 animate-float"
        style={{
          width: `${Math.random() * 40 + 10}px`,
          height: `${Math.random() * 40 + 10}px`,
          left: `${Math.random() * 100}%`,
          bottom: `-${Math.random() * 20}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 8}s`,
        }}
      />
    ))}
  </div>
);

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const { login, checkAuth } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phoneNumber, password);
      await checkAuth();
      setNotification({ type: 'success', message: t('login.success') });
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
      setNotification({ type: 'error', message: t('login.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <AnimatedBubbles />

        {/* Vagues décoratives */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 320" className="w-full opacity-20">
            <path fill="white" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 320" className="w-full opacity-10" style={{ transform: 'translateY(20px)' }}>
            <path fill="white" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
          </svg>
        </div>

        {/* Contenu branding */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="mb-8 transform hover:scale-110 transition-transform duration-500">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 shadow-2xl">
              <FishLogo className="h-24 w-24 text-white drop-shadow-lg" />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Fish Track
            </span>
          </h1>

          <p className="text-xl text-blue-100 text-center max-w-md">
            Votre solution intelligente pour la gestion des produits de la mer
          </p>
        </div>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-md w-full">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full p-4 shadow-xl mb-4">
              <FishLogo className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Fish Track</h1>
          </div>

          {/* Carte de connexion */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Bienvenue
              </h2>
              <p className="text-gray-500">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Champ téléphone */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone-number"
                  name="phoneNumber"
                  type="text"
                  required
                  pattern="^[342]\d{7}$"
                  title="Numéro téléphone (8 chiffres commençant par 3, 4 ou 2)"
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl
                    text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Numéro de téléphone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              {/* Champ mot de passe */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl
                    text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Bouton de connexion */}
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                className="w-full py-4 text-lg font-semibold rounded-xl
                  bg-gradient-to-r from-indigo-600 to-purple-600
                  hover:from-indigo-700 hover:to-purple-700
                  transform hover:scale-[1.02] transition-all duration-200
                  shadow-lg hover:shadow-xl"
                variant="primary"
              >
                {!loading && "Se connecter"}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm">
                3M SEAFOOD - Gestion des produits de la mer
              </p>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-gray-400 text-sm mt-6">
            &copy; 2026 Fish Track. Tous droits réservés.
          </p>
        </div>
      </div>

      {notification && (
        <FlashNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default Login;