import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, OAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          
          // First check if user exists, if not create them
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newUser: User = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Usuário',
              email: fbUser.email || `${fbUser.uid}@sem-email.com`,
              role: 'operator',
              profileCompleted: false,
              photoURL: fbUser.photoURL || undefined,
            };
            await setDoc(userDocRef, newUser);
          }

          // Then listen to changes
          unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as User);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user:", error);
            setLoading(false);
          });

        } catch (error) {
          console.error("Error fetching/creating user:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async () => {
    const provider = new OAuthProvider('microsoft.com');
    
    // Configuração para conta corporativa Microsoft (Azure AD)
    // Use 'organizations' para qualquer conta corporativa Microsoft
    // Ou substitua pelo Tenant ID da Mosaic (Azure Active Directory > Overview)
    provider.setCustomParameters({
      tenant: 'organizations',
      prompt: 'select_account',
    });

    // Scopes necessários para obter email e perfil
    provider.addScope('email');
    provider.addScope('profile');

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log('Login cancelado pelo usuário.');
      } else if (error.code === 'auth/popup-blocked') {
        alert('O popup de login foi bloqueado pelo navegador.
Por favor, permita popups para este site e tente novamente.');
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error('Domínio não autorizado. Adicione em: Firebase Console > Authentication > Settings > Authorized domains');
        alert('Erro de configuração: domínio não autorizado no Firebase. Contate o administrador.');
      } else {
        console.error('Falha no login:', error.code, error.message);
        alert('Erro ao fazer login: ' + (error.message || error.code));
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
