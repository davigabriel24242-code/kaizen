import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  OAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
          unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) setUser(docSnap.data() as User);
            setLoading(false);
          }, (error) => {
            console.error('Error listening to user:', error);
            setLoading(false);
          });
        } catch (error) {
          console.error('Error fetching/creating user:', error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const login = async () => {
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({ tenant: 'organizations', prompt: 'select_account' });
    provider.addScope('email');
    provider.addScope('profile');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
      if (error.code === 'auth/popup-blocked') throw new Error('Popup bloqueado. Permita popups para este site.');
      if (error.code === 'auth/unauthorized-domain') throw new Error('Domínio não autorizado. Contate o administrador.');
      throw new Error(error.message || 'Erro ao fazer login com Microsoft.');
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (error.code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      if (error.code === 'auth/user-disabled') throw new Error('Conta desativada. Contate o administrador.');
      throw new Error(error.message || 'Erro ao fazer login.');
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      const userDocRef = doc(db, 'users', result.user.uid);
      const newUser: User = {
        uid: result.user.uid,
        name,
        email: result.user.email || email,
        role: 'operator',
        profileCompleted: false,
      };
      await setDoc(userDocRef, newUser);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') throw new Error('Este e-mail já está cadastrado.');
      if (error.code === 'auth/weak-password') throw new Error('A senha deve ter no mínimo 6 caracteres.');
      if (error.code === 'auth/invalid-email') throw new Error('E-mail inválido.');
      throw new Error(error.message || 'Erro ao criar conta.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') throw new Error('Nenhuma conta encontrada com este e-mail.');
      if (error.code === 'auth/invalid-email') throw new Error('E-mail inválido.');
      throw new Error(error.message || 'Erro ao enviar e-mail de redefinição.');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, loginWithEmail, registerWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
