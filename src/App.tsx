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

type AuthView = 'login' | 'register' | 'reset';

const Login: React.FC = () => {
  const { user, login, loginWithEmail, registerWithEmail, resetPassword, loading } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (user) {
    if (!user.area) return <Navigate to="/complete-profile" />;
    return <Navigate to="/" />;
  }

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleMicrosoftLogin = async () => {
    clearMessages();
    setIsSubmitting(true);
    try {
      await login();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!name.trim()) { setError('Informe seu nome completo.'); return; }
    if (!email) { setError('Informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setIsSubmitting(true);
    try {
      await registerWithEmail(name.trim(), email, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError('Informe seu e-mail.'); return; }
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchView = (v: AuthView) => {
    clearMessages();
    setPassword('');
    setConfirmPassword('');
    setView(v);
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const btnPrimary = "w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Fospar"
            className="h-16 object-contain mx-auto mb-4"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x80/eeeeee/999999?text=FOSPAR'; }}
          />
          <h1 className="text-2xl font-bold text-gray-900">Portal Kaizen</h1>
          <p className="text-gray-500 text-sm mt-1">
            {view === 'login' && 'Faça login para acessar o portal'}
            {view === 'register' && 'Crie sua conta para começar'}
            {view === 'reset' && 'Recupere o acesso à sua conta'}
          </p>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN */}
        {view === 'login' && (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} placeholder="seu@email.com" autoComplete="email"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className={inputClass + ' pr-10'} placeholder="••••••••" autoComplete="current-password"/>
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                    {showPass ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <button type="button" onClick={() => switchView('reset')}
                  className="text-xs text-blue-600 hover:text-blue-700">
                  Esqueceu a senha?
                </button>
              </div>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                {isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/><span>Entrando...</span></> : 'Entrar'}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"/></div>
              <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">ou</div>
            </div>

            <button onClick={handleMicrosoftLogin} disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-[#2F2F2F] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#1A1A1A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Entrar com conta Microsoft
            </button>

            <p className="text-center text-sm text-gray-500 mt-5">
              Não tem conta?{' '}
              <button onClick={() => switchView('register')} className="text-blue-600 hover:text-blue-700 font-medium">
                Criar conta
              </button>
            </p>
          </>
        )}

        {/* REGISTER */}
        {view === 'register' && (
          <>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className={inputClass} placeholder="Seu nome" autoComplete="name"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} placeholder="seu@email.com" autoComplete="email"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className={inputClass + ' pr-10'} placeholder="Mín. 6 caracteres"/>
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                    {showPass ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass} placeholder="Repita a senha"/>
              </div>
              <button type="submit" disabled={isSubmitting} className={btnPrimary + ' mt-2'}>
                {isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/><span>Criando conta...</span></> : 'Criar conta'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Já tem conta?{' '}
              <button onClick={() => switchView('login')} className="text-blue-600 hover:text-blue-700 font-medium">
                Fazer login
              </button>
            </p>
          </>
        )}

        {/* RESET PASSWORD */}
        {view === 'reset' && (
          <>
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail da sua conta</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass} placeholder="seu@email.com" autoComplete="email"/>
              </div>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                {isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/><span>Enviando...</span></> : 'Enviar link de redefinição'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              <button onClick={() => switchView('login')} className="text-blue-600 hover:text-blue-700 font-medium">
                ← Voltar ao login
              </button>
            </p>
          </>
        )}

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
