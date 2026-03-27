import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, User, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Trophy, Medal, Star, ArrowLeft, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CollaboratorScore {
  uid: string;
  name: string;
  photoURL?: string;
  area?: string;
  score: number;
}

export const Mural: React.FC = () => {
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch active users
    const qUsers = query(collection(db, 'users'), where('status', '!=', 'inactive'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data: User[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as User));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Fetch valid kaizens (not draft, not rejected)
    const qKaizens = query(collection(db, 'kaizens'), where('status', 'not-in', ['draft', 'rejected']));
    const unsubKaizens = onSnapshot(qKaizens, (snapshot) => {
      const data: Kaizen[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as Kaizen));
      setKaizens(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kaizens');
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubKaizens();
    };
  }, []);

  // Calculate scores
  const getTopCollaborators = (): CollaboratorScore[] => {
    const scores: Record<string, CollaboratorScore> = {};

    // Initialize scores for all active users
    users.forEach(user => {
      scores[user.uid] = {
        uid: user.uid,
        name: user.name,
        photoURL: user.photoURL,
        area: user.area,
        score: 0
      };
    });

    // Add points for kaizens
    kaizens.forEach(kaizen => {
      // Creator gets a point
      if (scores[kaizen.createdBy]) {
        scores[kaizen.createdBy].score += 1;
      }

      // Collaborators get a point
      if (kaizen.collaborators) {
        kaizen.collaborators.forEach(collab => {
          if (collab.uid && scores[collab.uid]) {
            // Avoid double counting if creator is also listed as collaborator
            if (collab.uid !== kaizen.createdBy) {
              scores[collab.uid].score += 1;
            }
          }
        });
      }
    });

    // Convert to array, filter out zero scores, and sort descending
    return Object.values(scores)
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
  };

  const topCollaborators = getTopCollaborators();
  const totalImplemented = kaizens.filter(k => k.status === 'implemented' || k.status === 'verified').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Fospar" 
            className="h-12 object-contain bg-white p-2 rounded-lg" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/120x40/ffffff/999999?text=FOSPAR';
            }} 
          />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Mural de Excelência</h1>
            <p className="text-gray-400 text-sm">Reconhecimento de Melhoria Contínua</p>
          </div>
        </div>
        <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Sistema
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Highlights */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Total de Kaizens</p>
                <p className="text-4xl font-bold text-white">{kaizens.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Ideias Implementadas</p>
                <p className="text-4xl font-bold text-white">{totalImplemented}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Colaboradores Engajados</p>
                <p className="text-4xl font-bold text-white">{topCollaborators.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ranking */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-700 bg-gray-800/80 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-white">Top Colaboradores</h2>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {topCollaborators.length > 0 ? (
                <div className="space-y-4">
                  {topCollaborators.map((collab, index) => (
                    <div 
                      key={collab.uid} 
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300/20 to-transparent border border-gray-300/30' :
                        index === 2 ? 'bg-gradient-to-r from-amber-700/20 to-transparent border border-amber-700/30' :
                        'bg-gray-800/50 border border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center w-12 h-12 font-bold text-xl">
                        {index === 0 ? <Medal className="w-10 h-10 text-yellow-500" /> :
                         index === 1 ? <Medal className="w-8 h-8 text-gray-300" /> :
                         index === 2 ? <Medal className="w-8 h-8 text-amber-600" /> :
                         <span className="text-gray-500">#{index + 1}</span>}
                      </div>
                      
                      {collab.photoURL ? (
                        <img src={collab.photoURL} alt={collab.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-300 border-2 border-gray-600">
                          {collab.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{collab.name}</h3>
                        <p className="text-sm text-gray-400 truncate">{collab.area || 'Fospar'}</p>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-5 h-5 fill-current" />
                          <span className="text-2xl font-bold">{collab.score}</span>
                        </div>
                        <span className="text-xs text-gray-400">Kaizens</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Trophy className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">Nenhum dado de ranking disponível ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
