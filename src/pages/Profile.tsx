import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType } from '../types';
import { handleFirestoreError, compressImage } from '../lib/utils';
import { Camera, Save, User as UserIcon } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL || null);
  const [name, setName] = useState(user?.name || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      // Profile pictures can be smaller and more compressed
      const compressedImage = await compressImage(file, 400, 400, 0.7);
      
      if (compressedImage.length > 500 * 1024) {
        alert('A imagem é muito complexa. Tente uma imagem mais simples ou menor.');
        return;
      }
      
      setPhotoPreview(compressedImage);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("Erro ao processar a imagem. Tente novamente.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('O nome não pode estar vazio.');
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = { name };
      if (photoPreview) {
        updates.photoURL = photoPreview;
      }
      await updateDoc(userRef, updates);
      alert('Perfil atualizado com sucesso!');
      window.location.reload(); // Reload to update context
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 mt-1">Gerencie suas informações e foto de perfil.</p>
      </header>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png"
              className="hidden"
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              {user.role === 'admin' ? 'Administrador' : user.role === 'leader' ? 'Líder' : 'Operador'}
            </div>
          </div>

          <div className="w-full max-w-md pt-6 border-t border-gray-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                <input type="text" disabled value={user.area || ''} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                <input type="text" disabled value={user.shift || ''} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600" />
              </div>
            </div>
          </div>

          <div className="w-full max-w-md pt-6">
            <button
              onClick={handleSave}
              disabled={loading || (photoPreview === user.photoURL && name === user.name)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
