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
  ArrowDownTrayIcon, // Ajout de l'icône pour Sorties
  ExclamationTriangleIcon, // Ajout de l'icône pour Quantités Manquantes
} from '@heroicons/react/24/outline';
import NotificationCenter from './NotificationCenter';

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
    // { title: 'Quantités Manquantes', icon: ExclamationTriangleIcon, link: '/quantites-manquantes' }, // Disabled - replaced with automatic notifications
    { title: 'Plan avant chargement', icon: TruckIcon, link: '/plan-chargement' },
    { title: 'Plan après chargement', icon: TruckIcon, link: '/apres-livraison' },
    { title: 'Dépôts', icon: BuildingStorefrontIcon, link: '/depots' },
    { title: 'Entrées', icon: InboxIcon, link: '/entrees' },
    { title: 'Sorties', icon: ArrowDownTrayIcon, link: '/sorties' },  // Nouvel élément ajouté
    { title: 'Paiements', icon: CreditCardIcon, link: '/paiements' },
    { title: "Liste d'articles", icon: BookOpenIcon, link: '/articles' },
    { title: 'Transferts', icon: ArrowPathIcon, link: '/transferts' },
    { title: 'Paramètres', icon: CogIcon, link: '/parametres' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-indigo-600 to-purple-600 text-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between h-16 bg-indigo-700 px-4">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C7.58 2 4 5.58 4 10c0 2.03.76 3.87 2 5.28V18c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2h2c.55 0 1-.45 1-1v-2.72c1.24-1.41 2-3.25 2-5.28 0-4.42-3.58-8-8-8zm-2 15H8v-1h2v1zm0-3H8v-1h2v1zm4 3h-2v-1h2v1zm0-3h-2v-1h2v1zm2 0h-2v-1h2v1z"/>
              <path d="M22 7c-1.5 0-3 .5-4.21 1.5C17.26 5.55 14.87 3.5 12 3.5c-1.5 0-2.87.5-4 1.32V3H6v2.18C4.16 6.75 3 9.22 3 12c0 1.74.5 3.37 1.36 4.75L3 18l1.5 1.5 1.25-1.25C7.13 19.37 9.44 20 12 20c5.24 0 9.5-3.8 9.5-8.5 0-.82-.12-1.61-.34-2.36.62-.09 1.22-.14 1.84-.14v-2zM12 18c-3.87 0-7-2.69-7-6s3.13-6 7-6c3.36 0 6.17 2.11 6.82 5h-1.32c-.65-2.33-2.87-4-5.5-4-3.04 0-5.5 2.24-5.5 5s2.46 5 5.5 5c1.63 0 3.09-.69 4.12-1.78l1.42 1.42C14.69 17.38 13.41 18 12 18z"/>
            </svg>
            {sidebarOpen && <h1 className="ml-2 text-xl font-bold">FISH TRACK</h1>}
          </div>
          <button
            onClick={toggleSidebar}
            className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-800/50 hover:bg-indigo-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 group"
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
        <nav className="mt-6">
          {sidebarItems.map((item, index) => {
            const isActive = location.pathname === item.link;
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.link}
                className={`flex items-center px-6 py-3 text-white hover:bg-indigo-700 transition-colors duration-200 ${isActive ? 'bg-indigo-700' : ''}`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-yellow-300' : 'text-white'}`} />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`absolute bottom-0 ${sidebarOpen ? 'w-64' : 'w-20'} p-4`}>
          {sidebarOpen && (
            <div className="flex justify-center space-x-2 mb-4">
              {/* Boutons de changement de langue */}
              {/* <button onClick={() => changeLanguage('fr')} className="px-3 py-1 bg-indigo-800 rounded-md text-sm font-medium hover:bg-indigo-700">FR</button> */}
              {/* <button onClick={() => changeLanguage('ar')} className="px-3 py-1 bg-indigo-800 rounded-md text-sm font-medium hover:bg-indigo-700">AR</button> */}
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="danger"
            size="sm"
            className={`w-full ${!sidebarOpen && 'px-2'}`}
          >
            {sidebarOpen ? 'Déconnexion' : <CogIcon className="h-5 w-5 mx-auto" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center py-4 px-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              3M SEAFOOD
            </h1>
            <div className="flex items-center space-x-2">
              <NotificationCenter />
              {/* Boutons de changement de langue */}
              {/* <button onClick={() => changeLanguage('fr')} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-200">FR</button> */}
              {/* <button onClick={() => changeLanguage('ar')} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-200">AR</button> */}
              <Button 
                onClick={handleLogout} 
                variant="primary"
                size="sm"
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
