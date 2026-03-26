import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError, translateStatus } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const MyKaizens: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [kaizenToDelete, setKaizenToDelete] = useState<string | null>(null);
  const [requestModal, setRequestModal] = useState<{
    isOpen: boolean;
    kaizenId: string;
    action: 'edit' | 'delete';
  } | null>(null);
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'kaizens'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Kaizen[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as Kaizen));
      setKaizens(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kaizens');
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteClick = (id: string, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'draft' || status === 'rejected') {
      setKaizenToDelete(id);
    } else {
      setRequestModal({ isOpen: true, kaizenId: id, action: 'delete' });
      setRequestReason('');
    }
  };

  const confirmDelete = async () => {
    if (!kaizenToDelete) return;
    try {
      await deleteDoc(doc(db, 'kaizens', kaizenToDelete));
      setKaizenToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `kaizens/${kaizenToDelete}`);
    }
  };

  const cancelDelete = () => {
    setKaizenToDelete(null);
  };

  const handleEdit = (id: string, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'draft' || status === 'rejected') {
      navigate(`/edit/${id}`);
    } else {
      setRequestModal({ isOpen: true, kaizenId: id, action: 'edit' });
      setRequestReason('');
    }
  };

  const submitRequest = async () => {
    if (!requestModal) return;
    try {
      const kaizenRef = doc(db, 'kaizens', requestModal.kaizenId);
      await updateDoc(kaizenRef, {
        modificationRequest: {
          type: requestModal.action,
          reason: requestReason,
          status: 'pending',
          requestedAt: Date.now()
        }
      });
      setRequestModal(null);
      setRequestReason('');
      alert('Solicitação enviada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kaizens/${requestModal.kaizenId}`);
    }
  };

  const filteredKaizens = kaizens.filter(k => {
    const matchesSearch = k.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          k.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Kaizens</h1>
          <p className="text-gray-500 mt-1">Gerencie seus projetos de melhoria contínua.</p>
        </div>
        <Link to="/new" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto">
          Novo Kaizen
        </Link>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por título ou área..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
          >
            <option value="all">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="submitted">Enviado / Em Análise</option>
            <option value="approved">Aprovado</option>
            <option value="implemented">Implementado</option>
            <option value="verified">Verificado / Fechado</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredKaizens.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum Kaizen encontrado</h3>
              <p className="text-gray-500 mt-1">Tente ajustar seus filtros ou crie um novo projeto.</p>
            </div>
          ) : (
            filteredKaizens.map(kaizen => (
              <Link key={kaizen.id} to={`/kaizen/${kaizen.id}`} className="block hover:bg-gray-50 transition-colors p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{kaizen.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap
                        ${kaizen.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
                          kaizen.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 
                          kaizen.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          kaizen.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {translateStatus(kaizen.status)}
                      </span>
                      {kaizen.modificationRequest?.status === 'pending' && (
                        <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          Solicitação de {kaizen.modificationRequest.type === 'edit' ? 'Edição' : 'Exclusão'} Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{kaizen.problem}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      <span className="bg-gray-100 px-2 py-1 rounded-md">{kaizen.unit || 'FOSPAR'} - {kaizen.area}</span>
                      <span>{kaizen.classification}</span>
                      <span>{format(new Date(kaizen.createdAt), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-blue-600 text-sm font-medium flex items-center gap-1 group">
                      Ver detalhes
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleEdit(kaizen.id, kaizen.status, e)}
                        disabled={kaizen.modificationRequest?.status === 'pending'}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(kaizen.id, kaizen.status, e)}
                        disabled={kaizen.modificationRequest?.status === 'pending'}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {kaizenToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Kaizen</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este Kaizen? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {requestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Solicitar {requestModal.action === 'edit' ? 'Edição' : 'Exclusão'}
            </h3>
            <p className="text-gray-600 mb-4">
              Este Kaizen já foi enviado. Para {requestModal.action === 'edit' ? 'editá-lo' : 'excluí-lo'}, você precisa enviar uma solicitação ao administrador.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo (Opcional)
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24"
                placeholder="Explique brevemente por que precisa alterar este Kaizen..."
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRequestModal(null)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitRequest}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors"
              >
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
