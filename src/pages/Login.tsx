import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { id: string; name: string; email: string; role: string; department: string; avatar: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      backgroundColor: '#0f172a',
      backgroundImage: `
        radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
        linear-gradient(225deg, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
      `
    }}>
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Expense Claim System</h1>
            <p className="text-blue-100 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="px-8 pb-8">
            <div className="border-t border-slate-200 pt-6">
              <p className="text-xs font-medium text-slate-500 mb-3 text-center">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-700">sarah@example.com</p>
                  <p className="text-slate-500">password123</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-700">alex@example.com</p>
                  <p className="text-slate-500">password123</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-700">marcus@example.com</p>
                  <p className="text-slate-500">password123</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-700">elena@example.com</p>
                  <p className="text-slate-500">password123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
