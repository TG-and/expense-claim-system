import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit3, Trash2, MoreVertical, Mail, Shield, Building, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useApiFetch, useAuth } from '../App';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  company: string;
  avatar: string;
  status: string;
  job_title?: string;
  employee_number?: string;
  hire_date?: string;
  location?: string;
  is_active: number;
}

export default function AdminUsers() {
  const apiFetch = useApiFetch();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const token = localStorage.getItem('expense_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin role required.');
        }
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (u.job_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (u.employee_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = [
    { name: 'Employee', permissions: ['create_own', 'view_own'], count: users.filter(u => u.role === 'Employee').length },
    { name: 'Line Manager', permissions: ['approve_team', 'view_team'], count: users.filter(u => u.role === 'Manager').length },
    { name: 'Department Head', permissions: ['approve_dept', 'view_dept', 'budget_control'], count: users.filter(u => u.role === 'Department Head').length },
    { name: 'Finance Lead', permissions: ['approve_finance', 'view_all', 'payment_process'], count: users.filter(u => u.role === 'Finance Lead').length },
    { name: 'Admin', permissions: ['full_access'], count: users.filter(u => u.role === 'Admin').length },
  ];

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-slate-500">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-50 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Users</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchUsers()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Roles</h2>
          <p className="text-slate-500 mt-1">Manage user accounts and role permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
        >
          Users ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'roles' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
        >
          Roles & Permissions
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, job title or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Employee">Employee</option>
              <option value="Manager">Line Manager</option>
              <option value="Department Head">Department Head</option>
              <option value="Finance Lead">Finance Lead</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee #</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      {searchQuery || roleFilter !== 'all' 
                        ? 'No users match your search criteria' 
                        : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'Finance Lead' ? 'bg-emerald-100 text-emerald-700' :
                          user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.department || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-slate-400" />
                          {user.company}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{user.employee_number || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-slate-500 text-right">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">{role.name}</h3>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {role.count} users
                </span>
              </div>
              <ul className="space-y-2">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
