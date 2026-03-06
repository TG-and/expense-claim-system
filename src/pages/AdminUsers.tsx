import { useState } from 'react';
import { Plus, Search, Edit3, Trash2, MoreVertical, Mail, Shield, Building } from 'lucide-react';

const users = [
  { id: 'u1', name: 'Alex Johnson', email: 'alex@example.com', role: 'Finance Lead', department: 'Finance', company: 'Global Corp', status: 'Active', avatar: 'AJ' },
  { id: 'u2', name: 'Sarah Williams', email: 'sarah@example.com', role: 'Employee', department: 'Marketing', company: 'Global Corp', status: 'Active', avatar: 'SW' },
  { id: 'u3', name: 'Marcus Chen', email: 'marcus@example.com', role: 'Employee', department: 'Engineering', company: 'Global Corp', status: 'Active', avatar: 'MC' },
  { id: 'u4', name: 'Elena Rossi', email: 'elena@example.com', role: 'Employee', department: 'Sales Ops', company: 'Global Corp', status: 'Active', avatar: 'ER' },
  { id: 'u5', name: 'James Wilson', email: 'james@example.com', role: 'Employee', department: 'Engineering', company: 'Global Corp', status: 'Active', avatar: 'JW' },
  { id: 'u6', name: 'Linda Martinez', email: 'linda@example.com', role: 'Department Head', department: 'Sales', company: 'Global Corp', status: 'Active', avatar: 'LM' },
  { id: 'u7', name: 'David Kim', email: 'david@example.com', role: 'Line Manager', department: 'Engineering', company: 'Global Corp', status: 'Inactive', avatar: 'DK' },
];

const roles = [
  { name: 'Employee', permissions: ['create_own', 'view_own'], count: 4 },
  { name: 'Line Manager', permissions: ['approve_team', 'view_team'], count: 1 },
  { name: 'Department Head', permissions: ['approve_dept', 'view_dept', 'budget_control'], count: 1 },
  { name: 'Finance Lead', permissions: ['approve_finance', 'view_all', 'payment_process'], count: 1 },
  { name: 'Admin', permissions: ['full_access'], count: 0 },
];

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Roles</h2>
          <p className="text-slate-500 mt-1">Manage user accounts and role permissions.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="flex gap-8 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
        >
          Users
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
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Employee">Employee</option>
              <option value="Line Manager">Line Manager</option>
              <option value="Department Head">Department Head</option>
              <option value="Finance Lead">Finance Lead</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'Finance Lead' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'Department Head' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'Line Manager' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.department}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.company}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.name} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{role.name}</h3>
                    <p className="text-xs text-slate-500">{role.count} users</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {role.permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    {perm.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
