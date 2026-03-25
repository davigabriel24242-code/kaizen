import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const Approvals: React.FC = () => {
  const { user } = useAuth();
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) return;

    // For MVP, leaders see all submitted kaizens. In a real app, filter by area/shift.
    const q = query(
      collection(db, 'kaizens'),
      where('status', '==', 'submitted'),
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

  const handleAction = async (id: string, newStatus: Kaizen['status']) => {
    setLoadingId(id);
    try {
      const kaizenRef = doc(db, 'kaizens', id);
      await updateDoc(kaizenRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kaizens/${id}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (user?.role !== 'leader' && user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p className="mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Painel de Aprovação</h1>
        <p className="text-gray-500 mt-1">Analise e aprove os Kaizens enviados pela equipe.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {kaizens.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Tudo em dia!</h3>
              <p className="text-gray-500 mt-1">Não há Kaizens aguardando aprovação no momento.</p>
            </div>
          ) : (
            kaizens.map(kaizen => (
              <div key={kaizen.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{kaizen.title}</h3>
                      <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Aguardando
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Problema</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{kaizen.problem}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Solução Proposta</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{kaizen.solution || 'Nenhuma solução descrita.'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">Área: {kaizen.unit || 'FOSPAR'} - {kaizen.area}</span>
                      <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">Classificação: {kaizen.classification}</span>
                      <span>Enviado em: {format(new Date(kaizen.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-3 min-w-[140px]">
                    <button
                      onClick={() => handleAction(kaizen.id, 'approved')}
                      disabled={loadingId === kaizen.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleAction(kaizen.id, 'rejected')}
                      disabled={loadingId === kaizen.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reprovar
                    </button>
                    <Link
                      to={`/kaizen/${kaizen.id}`}
                      className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Ver Detalhes
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
