/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CreateKaizen } from './pages/CreateKaizen';
import { MyKaizens } from './pages/MyKaizens';
import { Approvals } from './pages/Approvals';
import { Management } from './pages/Management';
import { Dashboard } from './pages/Dashboard';
import { KaizenDetail } from './pages/KaizenDetail';

import { Profile } from './pages/Profile';
import { CompleteProfile } from './pages/CompleteProfile';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  if (!user.area) return <Navigate to="/complete-profile" />;
  
  return <>{children}</>;
};

const Login: React.FC = () => {
  const { user, login, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (user) {
    if (!user.area) return <Navigate to="/complete-profile" />;
    return <Navigate to="/" />;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <img 
          src="/logo.png" 
          alt="Fospar" 
          className="h-20 object-contain mx-auto mb-6"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/200x80/eeeeee/999999?text=FOSPAR';
          }}
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal Kaizen</h1>
        <p className="text-gray-500 mb-8">Faça login com sua conta corporativa para acessar o portal de Melhoria Contínua.</p>
        
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 bg-[#2F2F2F] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#1A1A1A] transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Entrar com conta corporativa
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Home />} />
              <Route path="new" element={<CreateKaizen />} />
              <Route path="edit/:id" element={<CreateKaizen />} />
              <Route path="my-kaizens" element={<MyKaizens />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="management" element={<Management />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="kaizen/:id" element={<KaizenDetail />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
