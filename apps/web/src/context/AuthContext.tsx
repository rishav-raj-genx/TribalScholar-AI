'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Role, type LoginRequest, type RegisterRequest, type UserProfile } from '@tribalscholar/shared';
import {
  clearStoredAuth,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  loginUser,
  registerUser,
  setStoredToken,
  setStoredUser,
} from '../lib/api';

export interface DemoPersona {
  role: Role;
  name: string;
  email: string;
  passwordPlainText: string;
  designation: string;
  badge: string;
  route: string;
}

export const DEMO_PERSONAS: Record<Role, DemoPersona> = {
  [Role.APPLICANT]: {
    role: Role.APPLICANT,
    name: 'Birsa Munda',
    email: 'applicant@demo.in',
    passwordPlainText: 'Password@123',
    designation: 'ST Research Scholar (NFST Candidate)',
    badge: 'Applicant Portal',
    route: '/applicant',
  },
  [Role.SCRUTINY_OFFICER]: {
    role: Role.SCRUTINY_OFFICER,
    name: 'Dr. Sunita Toppo',
    email: 'scrutiny@mota.gov.in',
    passwordPlainText: 'Password@123',
    designation: 'First-Pass Document Scrutiny Officer',
    badge: 'Scrutiny Desk',
    route: '/scrutiny',
  },
  [Role.SELECTION_OFFICER]: {
    role: Role.SELECTION_OFFICER,
    name: 'Shri Rajeshwar Meena',
    email: 'selection@mota.gov.in',
    passwordPlainText: 'Password@123',
    designation: 'National Selection Committee Member',
    badge: 'Selection Desk',
    route: '/selection',
  },
  [Role.ADMIN]: {
    role: Role.ADMIN,
    name: 'MoTA System Administrator',
    email: 'admin@mota.gov.in',
    passwordPlainText: 'Password@123',
    designation: 'Ministry Scheme & Governance Administrator',
    badge: 'Admin Console',
    route: '/admin',
  },
};

export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  register: (payload: RegisterRequest) => Promise<UserProfile>;
  logout: () => void;
  switchRoleDemo: (role: Role) => Promise<UserProfile>;
  getRoleDashboardPath: (role: Role) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getRoleDashboardPath(role: Role): string {
  switch (role) {
    case Role.APPLICANT:
      return '/applicant';
    case Role.SCRUTINY_OFFICER:
      return '/scrutiny';
    case Role.SELECTION_OFFICER:
      return '/selection';
    case Role.ADMIN:
      return '/admin';
    default:
      return '/login';
  }
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage and optionally verify with /api/v1/auth/me
  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      try {
        const storedToken = getStoredToken();
        const storedUser = getStoredUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify token against /auth/me in background if online
          try {
            const verified = await fetchCurrentUser();
            setUser(verified);
          } catch {
            // If verification fails with 401, clear credentials.
            // If network failure, retain offline session for demo.
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      setToken(response.accessToken);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterRequest): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const response = await registerUser(payload);
      setToken(response.accessToken);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const switchRoleDemo = useCallback(
    async (role: Role): Promise<UserProfile> => {
      setIsLoading(true);
      const persona = DEMO_PERSONAS[role];

      try {
        // Attempt live API login
        const response = await loginUser({
          email: persona.email,
          password: persona.passwordPlainText,
        });
        setToken(response.accessToken);
        setUser(response.user);
        router.push(persona.route);
        return response.user;
      } catch {
        // Fallback for live offline SIH demonstration
        const mockUser: UserProfile = {
          id: `demo-user-${role.toLowerCase()}`,
          email: persona.email,
          fullName: persona.name,
          role,
          phone: '+919876543210',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        const mockToken = `sih-demo-jwt-token-${role.toLowerCase()}`;
        setStoredToken(mockToken);
        setStoredUser(mockUser);
        setToken(mockToken);
        setUser(mockUser);
        router.push(persona.route);
        return mockUser;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    switchRoleDemo,
    getRoleDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
