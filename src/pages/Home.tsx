import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError, translateStatus } from '../lib/utils';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [recentKaizens, setRecentKaizens] = useState<Kaizen[]>([]);
  const [stats, setStats] = useState({ draft: 0, submitted: 0, approved: 0, implemented: 0 });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'kaizens'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allKaizens: Kaizen[] = [];
      let draft = 0, submitted = 0, approved = 0, implemented = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Kaizen;
        allKaizens.push(data);
        if (data.status === 'draft') draft++;
        if (data.status === 'submitted') submitted++;
        if (data.status === 'approved') approved++;
        if (data.status === 'implemented') implemented++;
      });
      
      setRecentKaizens(allKaizens.slice(0, 5));
      setStats({ draft, submitted, approved, implemented });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kaizens');
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-1">Bem-vindo ao portal de Melhoria Contínua.</p>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/new" className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm hover:bg-blue-700 transition-all flex flex-col items-center justify-center gap-3 group">
          <PlusCircle className="w-10 h-10 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-lg">Novo Kaizen</span>
        </Link>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 font-medium">Rascunhos</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{stats.draft}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 font-medium">Em Análise</h3>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{stats.submitted}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 font-medium">Aprovados</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{stats.approved}</p>
        </div>
      </div>

      {/* Recent Kaizens */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Meus Kaizens Recentes</h2>
          <Link to="/my-kaizens" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todos</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentKaizens.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum Kaizen encontrado. Comece criando um novo!
            </div>
          ) : (
            recentKaizens.map(kaizen => (
              <div key={kaizen.id} className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{kaizen.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {kaizen.unit || 'FOSPAR'} - {kaizen.area} • {format(new Date(kaizen.createdAt), 'dd/MM/yyyy')}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                  ${kaizen.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
                    kaizen.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 
                    kaizen.status === 'approved' ? 'bg-green-100 text-green-800' : 
                    'bg-blue-100 text-blue-800'}`}>
                  {translateStatus(kaizen.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
