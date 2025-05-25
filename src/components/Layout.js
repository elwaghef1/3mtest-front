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
  Bars3Icon,
  CogIcon,
  ArrowDownTrayIcon, // Ajout de l'icône pour Sorties
} from '@heroicons/react/24/outline';

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
            <ChartBarIcon className="h-8 w-8 text-white" />
            {sidebarOpen && <h1 className="ml-2 text-xl font-bold">OCEAN DELICE</h1>}
          </div>
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="sm"
            className="text-white focus:outline-none"
          >
            <Bars3Icon className="h-6 w-6" />
          </Button>
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
              OCEAN DELICE
            </h1>
            <div className="flex items-center space-x-2">
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
