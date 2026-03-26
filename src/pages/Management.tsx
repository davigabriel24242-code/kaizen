import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError, translateStatus } from '../lib/utils';
import { Link } from 'react-router-dom';
import { LayoutGrid, List as ListIcon, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export const Management: React.FC = () => {
  const { user } = useAuth();
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  useEffect(() => {
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) return;

    const q = query(
      collection(db, 'kaizens'),
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
                          k.problem.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'all' || k.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const columns = [
    { id: 'draft', title: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    { id: 'submitted', title: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'approved', title: 'Aprovado', color: 'bg-blue-100 text-blue-800' },
    { id: 'implemented', title: 'Implementado', color: 'bg-purple-100 text-purple-800' },
    { id: 'verified', title: 'Fechado', color: 'bg-green-100 text-green-800' },
  ];

  const uniqueAreas = Array.from(new Set(kaizens.map(k => k.area)));

  if (user?.role !== 'leader' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">Acesso Negado</div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão à Vista</h1>
          <p className="text-gray-500 mt-1">Acompanhe todos os Kaizens da unidade.</p>
        </div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start md:self-auto">
          <button 
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ListIcon className="w-4 h-4" />
            Lista
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 shrink-0">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar Kaizens..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
          >
            <option value="all">Todas as Áreas</option>
            {uniqueAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {viewMode === 'kanban' ? (
          <div className="flex gap-6 h-full overflow-x-auto pb-4 snap-x">
            {columns.map(col => {
              const colKaizens = filteredKaizens.filter(k => k.status === col.id);
              return (
                <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200 snap-start">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-2xl">
                    <h3 className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full ${col.color}`}>
                      {col.title}
                    </h3>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {colKaizens.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {colKaizens.map(kaizen => (
                      <Link key={kaizen.id} to={`/kaizen/${kaizen.id}`} className="block bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{kaizen.unit || 'FOSPAR'} - {kaizen.area}</span>
                          <span className="text-xs text-gray-400">{format(new Date(kaizen.createdAt), 'dd/MM')}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{kaizen.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{kaizen.problem}</p>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                          <span className="text-xs font-medium text-gray-600 truncate">{kaizen.classification}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Título</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Área</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Classificação</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredKaizens.map(kaizen => (
                    <tr key={kaizen.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/kaizen/${kaizen.id}`} className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {kaizen.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{kaizen.unit || 'FOSPAR'} - {kaizen.area}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{kaizen.classification}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap
                          ${kaizen.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
                            kaizen.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' : 
                            kaizen.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                            kaizen.status === 'implemented' ? 'bg-purple-100 text-purple-800' :
                            kaizen.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'}`}>
                          {translateStatus(kaizen.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(kaizen.createdAt), 'dd/MM/yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
