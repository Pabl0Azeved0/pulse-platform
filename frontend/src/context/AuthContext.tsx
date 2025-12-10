import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our User
interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 1. Check for existing session on startup
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 2. Login Action
  const login = (token: string, username: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ username }));
    setUser({ username });
  };

  // 3. Logout Action
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Force redirect or refresh if needed
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper hook to use auth easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
