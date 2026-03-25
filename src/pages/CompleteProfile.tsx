import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { CheckCircle } from 'lucide-react';

const AREAS = [
  'ADM',
  'Almoxarifado',
  'EHS',
  'Fabrica',
  'Laboratorio',
  'Manutenção',
  'Terminal'
];

export const CompleteProfile: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  // Redirect if profile is already completed
  if (user && user.area) {
    return <Navigate to="/" />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }
  
  const [formData, setFormData] = useState({
    role: 'operator' as UserRole,
    area: '',
    shift: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: formData.role,
        area: formData.area,
        shift: formData.shift,
        profileCompleted: true
      });
      
      // Force reload to get updated user context
      window.location.href = '/';
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete seu Perfil</h1>
          <p className="text-gray-500 mt-2">Precisamos de mais algumas informações para configurar sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Perfil de Acesso *</label>
            <select 
              required
              name="role" 
              value={formData.role} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="operator">Operador (Criar Kaizens)</option>
              <option value="leader">Líder (Aprovar Kaizens)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Selecione o seu nível de permissão no sistema.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área / Local *</label>
            <select 
              required
              name="area" 
              value={formData.area} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="" disabled>Selecione sua área...</option>
              {AREAS.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turno (Opcional)</label>
            <input 
              type="text" 
              name="shift" 
              value={formData.shift} 
              onChange={handleChange} 
              placeholder="Ex: Turno A, Administrativo..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.area}
            className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Salvando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
};
