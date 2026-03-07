import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminPortal from './pages/AdminPortal';
import NewRequest from './pages/NewRequest';
import NewClaim from './pages/NewClaim';
import RequestDetails from './pages/RequestDetails';
import MyReimbursements from './pages/MyReimbursements';
import AdminTemplates from './pages/AdminTemplates';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import ClaimDetails from './pages/ClaimDetails';
import ApprovalsPage from './pages/ApprovalsPage';
import ApprovalDetails from './pages/ApprovalDetails';
import WorkflowConfiguration from './pages/WorkflowConfiguration';
import Login from './pages/Login';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  apiFetch: (url, options) => fetch(url, options)
});

export const useAuth = () => useContext(AuthContext);

// Custom fetch that includes user ID in headers
export function useApiFetch() {
  const { user, apiFetch } = useAuth();
  return apiFetch;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('expense_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('expense_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('expense_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('expense_user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (user) {
      headers.set('x-user-id', user.id);
    }
    return fetch(url, { ...options, headers });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, apiFetch }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={login} />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="admin" element={<AdminPortal />} />
            <Route path="admin/templates" element={<AdminTemplates />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="admin/workflows" element={<WorkflowConfiguration />} />
            <Route path="requests/new" element={<NewRequest />} />
            <Route path="claims/new" element={<NewClaim />} />
            <Route path="claims/:id/edit" element={<NewClaim />} />
            <Route path="requests/:id" element={<RequestDetails />} />
            <Route path="reimbursements" element={<MyReimbursements />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="approvals/:id" element={<ApprovalDetails />} />
            <Route path="claims/:id" element={<ClaimDetails />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
