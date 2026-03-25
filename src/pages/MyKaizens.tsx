import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const MyKaizens: React.FC = () => {
  const { user } = useAuth();
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap
                        ${kaizen.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
                          kaizen.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 
                          kaizen.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          kaizen.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {kaizen.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{kaizen.problem}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      <span className="bg-gray-100 px-2 py-1 rounded-md">{kaizen.unit || 'FOSPAR'} - {kaizen.area}</span>
                      <span>{kaizen.classification}</span>
                      <span>{format(new Date(kaizen.createdAt), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-blue-600 text-sm font-medium flex items-center gap-1 group">
                    Ver detalhes
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
