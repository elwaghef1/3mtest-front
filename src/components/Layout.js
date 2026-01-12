// frontend/src/components/Layout.js
import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../contexts/AuthContext';
import Button from './Button';
import {
  ChartBarIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  InboxIcon,
  CreditCardIcon,
  BookOpenIcon,
  ArrowPathIcon,
  UserIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import NotificationCenter from './NotificationCenter';

// Logo Chinchard
const FishLogo = ({ className = "h-8 w-8" }) => (
  <svg className={className} viewBox="0 0 100 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M95 25 C90 18, 75 10, 55 10 C40 10, 25 14, 15 20 L5 15 L8 25 L5 35 L15 30 C25 36, 40 40, 55 40 C75 40, 90 32, 95 25 Z" />
    <path d="M45 10 Q50 4, 58 8 L55 12 Q50 10, 45 12 Z" opacity="0.9"/>
    <path d="M50 40 Q52 46, 58 44 L56 40 Z" opacity="0.9"/>
    <path d="M5 15 L-2 8 L2 18 L0 25 L2 32 L-2 42 L5 35 L8 25 Z" />
    <circle cx="80" cy="24" r="4" fill="currentColor" opacity="0.3"/>
    <circle cx="80" cy="24" r="2.5" fill="white"/>
    <path d="M20 25 Q35 23, 50 24 Q65 25, 78 24" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4"/>
    <path d="M72 20 Q74 25, 72 30" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
  </svg>
);

// Bulles animées pour le sidebar
const SidebarBubbles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/10 animate-float"
        style={{
          width: `${Math.random() * 20 + 5}px`,
          height: `${Math.random() * 20 + 5}px`,
          left: `${Math.random() * 100}%`,
          bottom: `-10%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${Math.random() * 15 + 10}s`,
        }}
      />
    ))}
  </div>
);

const Layout = () => {
  const { logout, hasFilledSchoolInfo, isAuthenticated } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const sidebarItems = [
    { title: 'Etats de stock', icon: ChartBarIcon, link: '/dashboard' },
    { title: 'Clients', icon: UserGroupIcon, link: '/clients' },
    { title: 'Commandes', icon: ClipboardDocumentCheckIcon, link: '/commandes' },
    { title: 'Plan avant chargement', icon: TruckIcon, link: '/plan-chargement' },
    { title: 'Plan après chargement', icon: TruckIcon, link: '/apres-livraison' },
    { title: 'Dépôts', icon: BuildingStorefrontIcon, link: '/depots' },
    { title: 'Entrées', icon: InboxIcon, link: '/entrees' },
    { title: 'Sorties', icon: ArrowDownTrayIcon, link: '/sorties' },
    { title: 'Paiements', icon: CreditCardIcon, link: '/paiements' },
    { title: "Liste d'articles", icon: BookOpenIcon, link: '/articles' },
    { title: 'Transferts', icon: ArrowPathIcon, link: '/transferts' },
    { title: 'Paramètres', icon: CogIcon, link: '/parametres' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {/* Sidebar */}
      <div className={`relative bg-gradient-to-b from-indigo-600 via-purple-600 to-blue-700 text-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-20'} overflow-hidden`}>
        {/* Bulles animées */}
        <SidebarBubbles />

        {/* Vague décorative en bas */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 400 80" className="w-full opacity-10">
            <path fill="white" d="M0,40 Q50,20 100,40 T200,40 T300,40 T400,40 L400,80 L0,80 Z"/>
          </svg>
        </div>

        {/* Header avec logo */}
        <div className="relative z-10 flex items-center justify-between h-16 bg-indigo-700/50 backdrop-blur-sm px-4 border-b border-white/10">
          <div className="flex items-center group">
            <div className="transform group-hover:scale-110 transition-transform duration-300">
              <FishLogo className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            {sidebarOpen && (
              <h1 className="ml-3 text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Fish Track
              </h1>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 group"
            aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <div className="flex flex-col justify-center items-center w-6 h-6">
              <span
                className={`block h-0.5 w-5 bg-white rounded-full transition-all duration-300 ease-in-out ${
                  sidebarOpen
                    ? 'rotate-45 translate-y-[3px]'
                    : 'group-hover:w-6'
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-white rounded-full my-1 transition-all duration-300 ease-in-out ${
                  sidebarOpen
                    ? 'opacity-0 scale-0'
                    : 'group-hover:w-4'
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-white rounded-full transition-all duration-300 ease-in-out ${
                  sidebarOpen
                    ? '-rotate-45 -translate-y-[9px]'
                    : 'group-hover:w-6'
                }`}
              />
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 mt-4 px-2">
          {sidebarItems.map((item, index) => {
            const isActive = location.pathname === item.link;
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.link}
                className={`flex items-center px-4 py-3 mb-1 rounded-xl text-white transition-all duration-200 group
                  ${isActive
                    ? 'bg-white/20 backdrop-blur-sm shadow-lg'
                    : 'hover:bg-white/10 hover:translate-x-1'
                  }`}
              >
                <Icon className={`h-5 w-5 transition-all duration-200 ${
                  isActive
                    ? 'text-yellow-300 drop-shadow-glow'
                    : 'text-white/80 group-hover:text-white group-hover:scale-110'
                }`} />
                {sidebarOpen && (
                  <span className={`ml-3 font-medium transition-all duration-200 ${
                    isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                  }`}>
                    {item.title}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bouton déconnexion */}
        <div className={`absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-indigo-900/50 to-transparent`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-xl
              bg-red-500/80 hover:bg-red-500 backdrop-blur-sm
              text-white font-medium
              transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
              ${!sidebarOpen && 'px-2'}`}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            {sidebarOpen && <span className="ml-2">Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50">
          <div className="flex justify-between items-center py-4 px-6">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              3M SEAFOOD
            </h1>
            <div className="flex items-center space-x-3">
              <NotificationCenter />
              <Button
                onClick={handleLogout}
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;