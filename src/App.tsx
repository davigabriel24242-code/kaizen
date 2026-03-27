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
import { UsersManagement } from './pages/UsersManagement';
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
  const { user, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (user) {
    if (!user.area) return <Navigate to="/complete-profile" />;
    return <Navigate to="/" />;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isRegistering) {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
        <p className="text-gray-500 mb-8">
          {isRegistering ? 'Crie sua conta para acessar o portal.' : 'Faça login para acessar o portal de Melhoria Contínua.'}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-left">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Seu nome"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSubmitting ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>
        
        <div className="mt-6 text-sm text-gray-600">
          {isRegistering ? (
            <>
              Já tem uma conta?{' '}
              <button onClick={() => { setIsRegistering(false); setError(''); }} className="text-blue-600 hover:underline font-medium">
                Faça login
              </button>
            </>
          ) : (
            <>
              Não tem uma conta?{' '}
              <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-blue-600 hover:underline font-medium">
                Crie uma agora
              </button>
            </>
          )}
        </div>
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
              <Route path="users" element={<UsersManagement />} />
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
