import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { OperationType } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
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
          unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              if (userData.status === 'inactive') {
                await signOut(auth);
                setUser(null);
                alert("Sua conta foi desativada pelo administrador.");
              } else {
                setUser(userData);
              }
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

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().status === 'inactive') {
        await signOut(auth);
        throw new Error('Sua conta foi desativada pelo administrador.');
      }
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      const newUser: User = {
        uid: fbUser.uid,
        name: name,
        email: email,
        role: 'operator',
        profileCompleted: false,
        status: 'active',
      };
      await setDoc(userDocRef, newUser);
    } catch (error: any) {
      console.error("Registration failed", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, loginWithEmail, registerWithEmail, logout }}>
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
