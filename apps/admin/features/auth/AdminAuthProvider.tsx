'use client';

import { AdminApiClient, type AdminIdentity } from '@/lib/api-client';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { firebaseAuth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    signOut,
    type User as FirebaseUser,
} from 'firebase/auth';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

export interface AdminAuthContextType {
  admin: AdminIdentity | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authenticated: boolean;
  unauthorized: boolean;
  backendUnavailable: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    setBackendUnavailable(false);

    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      try {
        if (!user) {
          setFirebaseUser(null);
          setAdmin(null);
          setLoading(false);
          return;
        }

        setFirebaseUser(user);

        // Verify admin access through backend
        try {
          const identity = await AdminApiClient.getAdminIdentity();
          setAdmin(identity);
          setUnauthorized(false);
          setBackendUnavailable(false);
        } catch (err) {
          const status = err instanceof ApiError ? err.status : undefined;
          if (status === 401 || status === 403) {
            setUnauthorized(true);
            setAdmin(null);
            setError(getErrorMessage(err, 'Access denied. Admin privileges required.'));
          } else if (status !== undefined && (status >= 500 || status === 0)) {
            setBackendUnavailable(true);
            setAdmin(null);
            setError('Backend service unavailable. Please try again later.');
          } else {
            setError(getErrorMessage(err, 'Authentication failed.'));
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'An error occurred during authentication.'));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
      setAdmin(null);
      setFirebaseUser(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to logout.'));
      throw err;
    }
  };

  const value: AdminAuthContextType = {
    admin,
    firebaseUser,
    loading,
    authenticated: !!admin && !!firebaseUser,
    unauthorized,
    backendUnavailable,
    error,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
