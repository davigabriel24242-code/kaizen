import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, List, CheckSquare, BarChart2, LogOut, User, PieChart, Users, MonitorPlay } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Painel', path: '/', icon: Home, roles: ['operator', 'leader', 'admin'] },
    { name: 'Mural', path: '/mural', icon: MonitorPlay, roles: ['operator', 'leader', 'admin'] },
    { name: 'Novo Kaizen', path: '/new', icon: PlusCircle, roles: ['operator', 'leader', 'admin'] },
    { name: 'Meus Kaizens', path: '/my-kaizens', icon: List, roles: ['operator', 'leader', 'admin'] },
    { name: 'Painel de Aprovação', path: '/approvals', icon: CheckSquare, roles: ['leader', 'admin'] },
    { name: 'Gestão', path: '/management', icon: BarChart2, roles: ['admin', 'leader'] },
    { name: 'Dashboard', path: '/dashboard', icon: PieChart, roles: ['admin', 'leader'] },
    { name: 'Usuários', path: '/users', icon: Users, roles: ['admin'] },
    { name: 'Meu Perfil', path: '/profile', icon: User, roles: ['operator', 'leader', 'admin'] },
  ];

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Fospar" 
            className="h-8 object-contain" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/120x40/eeeeee/999999?text=FOSPAR';
            }} 
          />
          <div className="h-5 w-px bg-gray-300 mx-1"></div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">Kaizen</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.name} 
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
