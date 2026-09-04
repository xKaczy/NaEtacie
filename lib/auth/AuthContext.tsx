'use client';

/**
 * Auth Context Provider with guest mode support.
 *
 * Provides authentication state and methods to the component tree.
 * When no user is signed in, the context reports guest mode (isGuest: true).
 *
 * Validates: Requirements 1.1, 2.5, 2.6, 2.7, 3.2
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import { getClientAuth, getClientFirestore, isFirebaseConfigValid } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types/user';
import type { AuthResult, LoginResult, RegistrationResult } from './types';
import { signInWithGoogle as signInWithGoogleHelper } from './googleAuth';

// --- Interfaces ---

export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isGuest: boolean;
  isEmailVerified: boolean;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<AuthResult<LoginResult>>;
  signInWithGoogle: () => Promise<AuthResult<LoginResult>>;
  register: (email: string, password: string, displayName: string) => Promise<AuthResult<RegistrationResult>>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isGuest: true,
    isEmailVerified: false,
    loading: true,
  });

  // Listen to Firebase auth state changes
  useEffect(() => {
    if (typeof isFirebaseConfigValid === 'function' && !isFirebaseConfigValid()) {
      setState({
        user: null,
        profile: null,
        isGuest: true,
        isEmailVerified: false,
        loading: false,
      });
      return;
    }

    try {
      const auth = typeof getClientAuth === 'function' ? getClientAuth() : null;
      if (!auth || !auth.onAuthStateChanged) {
        setState({
          user: null,
          profile: null,
          isGuest: true,
          isEmailVerified: false,
          loading: false,
        });
        return;
      }

      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in — fetch profile
            let profile: UserProfile | null = null;
            try {
              const firestore = getClientFirestore();
              if (firestore) {
                const profileDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
                if (profileDoc.exists()) {
                  profile = profileDoc.data() as UserProfile;
                }
              }
            } catch (error) {
              console.error('Failed to fetch user profile:', error);
            }

            setState({
              user: firebaseUser,
              profile,
              isGuest: false,
              isEmailVerified: firebaseUser.emailVerified,
              loading: false,
            });
          } else {
            // No user — guest mode
            setState({
              user: null,
              profile: null,
              isGuest: true,
              isEmailVerified: false,
              loading: false,
            });
          }
        },
        (error) => {
          console.warn('[AuthContext] Auth state listener notice:', error);
          setState({
            user: null,
            profile: null,
            isGuest: true,
            isEmailVerified: false,
            loading: false,
          });
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[AuthContext] Auth setup notice:', err);
      setState({
        user: null,
        profile: null,
        isGuest: true,
        isEmailVerified: false,
        loading: false,
      });
    }
  }, []);

  // --- Auth Methods ---

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult<LoginResult>> => {
      if (!isFirebaseConfigValid()) {
        return {
          success: false,
          error: {
            code: 'service_unavailable',
            message: 'Serwer logowania nie jest skonfigurowany. Aplikacja działa w trybie odczytu (Gość).',
          },
        };
      }
      try {
        const auth = getClientAuth();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        const idToken = await user.getIdToken();
        return {
          success: true,
          data: { uid: user.uid, email: user.email!, idToken },
        };
      } catch (error: unknown) {
        return mapFirebaseError(error, 'authentication_failed');
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult<LoginResult>> => {
    const res = await signInWithGoogleHelper();
    if (res.success) {
      const mockProfile: UserProfile = {
        uid: res.data.uid,
        email: res.data.email,
        display_name: 'Użytkownik Google',
        role: 'candidate',
        tier: 'free',
        auth_provider: 'google',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: null,
      };
      setState((prev) => ({
        ...prev,
        profile: prev.profile || mockProfile,
        isGuest: false,
        isEmailVerified: true,
      }));
    }
    return res;
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string
    ): Promise<AuthResult<RegistrationResult>> => {
      if (!isFirebaseConfigValid()) {
        return {
          success: false,
          error: {
            code: 'service_unavailable',
            message: 'Serwer rejestracji nie jest skonfigurowany. Aplikacja działa w trybie odczytu (Gość).',
          },
        };
      }
      try {
        const auth = getClientAuth();
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const user = credential.user;

        // Send verification email (Requirement 2.5)
        try {
          await sendEmailVerification(user);
        } catch (verificationError) {
          console.error('Failed to send verification email:', verificationError);
        }

        // Create Firestore profile
        try {
          const firestore = getClientFirestore();
          if (firestore) {
            const now = Timestamp.now();
            const newProfile = {
              uid: user.uid,
              email: user.email!,
              display_name: displayName.slice(0, 100),
              tier: 'free' as const,
              auth_provider: 'email' as const,
              email_verified: false,
              created_at: now,
              updated_at: now,
              notification_prefs: null,
            };
            await setDoc(doc(firestore, 'users', user.uid), newProfile);
          }
        } catch (profileError) {
          console.error('Failed to create user profile:', profileError);
        }

        const idToken = await user.getIdToken();
        return {
          success: true,
          data: { uid: user.uid, email: user.email!, idToken },
        };
      } catch (error: unknown) {
        return mapFirebaseError(error, 'registration_failed');
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigValid()) return;
    try {
      const auth = getClientAuth();
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('[AuthContext] SignOut notice:', err);
    }
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!isFirebaseConfigValid()) return;
    try {
      const auth = getClientAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
      }
    } catch (err) {
      console.warn('[AuthContext] Resend verification notice:', err);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!isFirebaseConfigValid()) return null;
    try {
      const auth = getClientAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        return currentUser.getIdToken(true);
      }
    } catch (err) {
      console.warn('[AuthContext] Refresh token notice:', err);
    }
    return null;
  }, []);

  // --- Context Value ---

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      signInWithEmail,
      signInWithGoogle,
      register,
      signOut,
      resendVerificationEmail,
      refreshToken,
    }),
    [state, signInWithEmail, signInWithGoogle, register, signOut, resendVerificationEmail, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- Hook ---

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// --- Error Mapping ---

const SERVICE_UNAVAILABLE_CODES = [
  'auth/network-request-failed',
  'auth/internal-error',
  'auth/too-many-requests',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
];

const EMAIL_EXISTS_CODES = [
  'auth/email-already-in-use',
  'auth/email-already-exists',
];

const INVALID_CREDENTIAL_CODES = [
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-credential',
  'auth/invalid-email',
  'auth/user-disabled',
];

function mapFirebaseError(
  error: unknown,
  defaultCode: 'registration_failed' | 'authentication_failed'
): { success: false; error: { code: typeof defaultCode | 'service_unavailable'; message: string } } {
  const firebaseError = error as { code?: string };
  const errorCode = firebaseError.code || '';

  if (SERVICE_UNAVAILABLE_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }

  if (EMAIL_EXISTS_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'registration_failed',
        message: 'Registration failed. Please check your information and try again.',
      },
    };
  }

  if (INVALID_CREDENTIAL_CODES.includes(errorCode)) {
    return {
      success: false,
      error: {
        code: 'authentication_failed',
        message: 'Authentication failed. Please check your credentials and try again.',
      },
    };
  }

  return {
    success: false,
    error: {
      code: defaultCode,
      message:
        defaultCode === 'registration_failed'
          ? 'Registration failed. Please check your information and try again.'
          : 'Authentication failed. Please check your credentials and try again.',
    },
  };
}
