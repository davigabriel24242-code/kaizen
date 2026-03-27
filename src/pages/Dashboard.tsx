import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Medal, Award, Filter } from 'lucide-react';

import { User } from '../types';

export const Dashboard: React.FC = () => {
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  
  // Estados para os filtros
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kaizensSnapshot, usersSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'kaizens'), orderBy('createdAt', 'asc'))),
          getDocs(collection(db, 'users'))
        ]);
        
        const kaizensData = kaizensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kaizen));
        setKaizens(kaizensData);
        
        const usersData: Record<string, User> = {};
        usersSnapshot.docs.forEach(doc => {
          usersData[doc.id] = doc.data() as User;
        });
        setUsers(usersData);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'dashboard_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extrair anos disponíveis dos dados reais
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    kaizens.forEach(k => {
      if (k.createdAt) {
        years.add(format(new Date(k.createdAt), 'yyyy'));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [kaizens]);

  const availableMonths = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  // Filtrar os kaizens com base no ano e mês selecionados
  const filteredKaizens = useMemo(() => {
    return kaizens.filter(k => {
      if (!k.createdAt) return false;
      const date = new Date(k.createdAt);
      const year = format(date, 'yyyy');
      const month = format(date, 'MM');

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      
      return true;
    });
  }, [kaizens, selectedYear, selectedMonth]);

  // 1. Kaizens por Área
  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKaizens.forEach(k => {
      const area = k.area || 'Não informada';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredKaizens]);

  // 2. Kaizens por Tempo (Evolução)
  const timelineData = useMemo(() => {
    const counts = new Map<string, number>();
    
    const sorted = [...filteredKaizens].sort((a, b) => a.createdAt - b.createdAt);
    
    sorted.forEach(k => {
      const date = new Date(k.createdAt);
      let key = '';
      
      // Se um mês específico estiver selecionado, agrupa por DIA
      if (selectedYear !== 'all' && selectedMonth !== 'all') {
        key = format(date, 'dd/MMM', { locale: ptBR });
      } else {
        // Caso contrário, agrupa por MÊS/ANO
        key = format(date, 'MMM/yyyy', { locale: ptBR });
      }
      
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredKaizens, selectedYear, selectedMonth]);

  // 3. Ranking de Funcionários
  const employeeRanking = useMemo(() => {
    const counts: Record<string, { name: string; count: number; photoURL?: string }> = {};
    
    filteredKaizens.forEach(k => {
      if (k.collaborators && k.collaborators.length > 0) {
        k.collaborators.forEach(c => {
          if (!c.name) return;
          const key = c.name.trim();
          if (!counts[key]) {
            counts[key] = { name: key, count: 0, photoURL: c.photoURL };
          }
          counts[key].count += 1;
          if (c.photoURL && !counts[key].photoURL) {
            counts[key].photoURL = c.photoURL;
          }
        });
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredKaizens]);

  // 4. Kaizens por Turno
  const shiftData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKaizens.forEach(k => {
      const user = users[k.createdBy];
      const shift = user?.shift || 'Não informado';
      counts[shift] = (counts[shift] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredKaizens, users]);

  // 5. Kaizens por Classificação
  const classificationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKaizens.forEach(k => {
      const classification = k.classification || 'Não informada';
      counts[classification] = (counts[classification] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredKaizens]);

  // 6. Kaizens por Método
  const methodData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKaizens.forEach(k => {
      const method = k.method || 'Não informado';
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredKaizens]);

  // 7. Kaizens por Mês
  const monthData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    availableMonths.forEach(m => {
      counts[m.label] = 0;
    });

    filteredKaizens.forEach(k => {
      if (!k.createdAt) return;
      const date = new Date(k.createdAt);
      const monthLabel = format(date, 'MMMM', { locale: ptBR });
      const formattedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      
      if (counts[formattedLabel] !== undefined) {
        counts[formattedLabel] += 1;
      }
    });

    const monthOrder = availableMonths.map(m => m.label);
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const indexA = monthOrder.indexOf(a.name);
        const indexB = monthOrder.indexOf(b.name);
        return indexA - indexB;
      });
  }, [filteredKaizens, availableMonths]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Acompanhe os indicadores de melhoria contínua.</p>
        </header>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-200 w-full md:w-auto">
          <div className="flex items-center gap-2 px-2 w-full sm:w-auto justify-center sm:justify-start">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="flex-1 sm:flex-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Kaizens</span>
          <span className="text-4xl font-bold text-blue-600 mt-2">{filteredKaizens.length}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Áreas Envolvidas</span>
          <span className="text-4xl font-bold text-emerald-600 mt-2">{areaData.length}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Colaboradores</span>
          <span className="text-4xl font-bold text-purple-600 mt-2">{employeeRanking.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Áreas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Kaizens por Área</h2>
          <div className="h-80">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>

        {/* Gráfico de Linha do Tempo */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Evolução no Tempo</h2>
          <div className="h-80">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Quantidade" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>

        {/* Gráfico de Turnos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Kaizens por Turno</h2>
          <div className="h-80">
            {shiftData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>

        {/* Gráfico de Quantidade por Mês */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Quantidade por Mês</h2>
          <div className="h-80">
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>

        {/* Gráfico de Classificação */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Classificação</h2>
          <div className="h-80">
            {classificationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classificationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#EC4899" radius={[4, 4, 0, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>

        {/* Gráfico de Método */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Método</h2>
          <div className="h-80">
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado no período</div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking de Funcionários */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Top Colaboradores (Ranking de Melhorias)</h2>
        <div className="overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {employeeRanking.map((emp, index) => (
              <li key={emp.name} className="py-4 flex items-center justify-between hover:bg-gray-50 px-4 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 text-center font-bold text-gray-400">
                    {index === 0 ? <Trophy className="w-6 h-6 text-yellow-500 mx-auto" /> :
                     index === 1 ? <Medal className="w-6 h-6 text-gray-400 mx-auto" /> :
                     index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> :
                     `#${index + 1}`}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                    {emp.photoURL ? (
                      <img src={emp.photoURL} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      emp.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">Colaborador</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
                    {emp.count} {emp.count === 1 ? 'Kaizen' : 'Kaizens'}
                  </span>
                </div>
              </li>
            ))}
            {employeeRanking.length === 0 && (
              <li className="py-8 text-center text-gray-500">Nenhum dado disponível no período selecionado.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
