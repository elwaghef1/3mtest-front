// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './i18n';
import './index.css';
import Login from './components/Login';
import Register from './components/Register';
import PoissonList from './components/PoissonList.js';
import DepotList from './components/DepotList.js';
import ClientList from './components/ClientList.js';
import CommandeList from './components/CommandeList.js';
import CommandeForm from './components/CommandeForm.js';
import EntreeList from './components/EntreeList.js';
import StockList from './components/StockList.js';
import ArticleList from './components/ArticleList.js';
import TransfertList from './components/TransfertList.js';
import PaymentList from './components/PaymentList.js';
import PlanDeChargementList from './components/PlanDeChargementList.js';
import SortieList from './components/SortieList.js';
import ApresLivraisonList from './components/ApresLivraisonList.js';
import LotList from './components/LotList.js';
import BankAccountList from './components/BankAccountList.js';
import QuantiteManquanteList from './components/QuantiteManquanteList.js';
import QuantiteManquanteDashboard from './components/QuantiteManquanteDashboard.js';
import ArticleMovements from './components/ArticleMovements.js';
import ClientOrderHistory from './components/ClientOrderHistory.js';
import PaymentHistory from './components/PaymentHistory.js';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register_ad_fish" element={<Register />} />

          {/* Ici on peut avoir un Layout global */}
          <Route element={<Layout />}>
            {/* Route protégée */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

          <Route
              path="/poissons"
              element={
                <PrivateRoute>
                  <PoissonList />
                </PrivateRoute>
              }
            />            <Route
              path="/clients"
              element={
                <PrivateRoute>
                  <ClientList />
                </PrivateRoute>
              }
            />
            <Route
              path="/clients/:clientId/historique"
              element={
                <PrivateRoute>
                  <ClientOrderHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/commandes/:commandeId/paiements"
              element={
                <PrivateRoute>
                  <PaymentHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/commandes"
              element={
                <PrivateRoute>
                  <CommandeList />
                </PrivateRoute>
              }
            />
            <Route
              path="/commandes/nouvelle"
              element={
                <PrivateRoute>
                  <CommandeForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/commandes/modifier/:id"
              element={
                <PrivateRoute>
                  <CommandeForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/parametres"
              element={
                <PrivateRoute>
                  <BankAccountList />
                </PrivateRoute>
              }
            />
            <Route
              path="/depots"
              element={
                <PrivateRoute>
                  <DepotList />
                </PrivateRoute>
              }
            />
            <Route
              path="/entrees"
              element={
                <PrivateRoute>
                  <EntreeList />
                </PrivateRoute>
              }
            />

          <Route
              path="/sorties"
              element={
                <PrivateRoute>
                  <SortieList />
                </PrivateRoute>
              }
            />
            <Route
              path="/articles"
              element={
                <PrivateRoute>
                  <ArticleList />
                </PrivateRoute>
              }
            />
            <Route
              path="/articles/:articleId/mouvements"
              element={
                <PrivateRoute>
                  <ArticleMovements />
                </PrivateRoute>
              }
            />
            <Route path="/paiements" element={<PaymentList />} />
            <Route path="/plan-chargement" element={<PlanDeChargementList />} />
            <Route path="/apres-livraison" element={<ApresLivraisonList />} />
             <Route path="/transferts" element={<TransfertList />} />
             <Route path="/lots/:depotId/:articleId" element={<LotList />} />
            <Route
              path="/stock"
              element={
                <PrivateRoute>
                  <StockList />
                </PrivateRoute>
              }
            />

            {/* Quantités manquantes routes disabled - replaced with automatic notifications */}
            {/* 
            <Route
              path="/quantites-manquantes"
              element={
                <PrivateRoute>
                  <QuantiteManquanteList />
                </PrivateRoute>
              }
            />

            <Route
              path="/quantites-manquantes/dashboard"
              element={
                <PrivateRoute>
                  <QuantiteManquanteDashboard />
                </PrivateRoute>
              }
            />
            */}

            {/* Redirection vers /dashboard par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
    </AuthProvider>
  );
}

export default App;
