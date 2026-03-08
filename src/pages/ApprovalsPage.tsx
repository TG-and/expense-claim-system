import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, AlertCircle, Receipt, FileText, User, Building2, MessageSquare, ChevronRight, Search, Filter } from 'lucide-react';
import { useApiFetch } from '../App';

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  'Approved': { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2, label: 'Approved' },
  'Rejected': { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, label: 'Rejected' },
  'Pending': { color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock, label: 'Pending' },
  'Pending Finance': { color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle, label: 'Pending Finance' },
  'Processing Payment': { color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock, label: 'Processing Payment' },
  'Paid': { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2, label: 'Paid' },
  'Draft': { color: 'text-slate-500', bg: 'bg-slate-100', icon: FileText, label: 'Draft' },
};

export default function ApprovalsPage() {
  const apiFetch = useApiFetch();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowTasks, setWorkflowTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('expense_token');
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch('/api/approvals').then(res => res.json()).catch(() => []),
      apiFetch('/api/workflow/tasks').then(res => res.json()).catch(() => [])
    ]).then(([approvalsData, tasksData]) => {
      setClaims(Array.isArray(approvalsData) ? approvalsData : []);
      setWorkflowTasks(Array.isArray(tasksData) ? tasksData : []);
      setLoading(false);
    }).catch(() => {
      setClaims([]);
      setWorkflowTasks([]);
      setLoading(false);
    });
  }, [filter, apiFetch]);

  const allApprovalItems = [
    ...claims.map(c => ({ ...c, isWorkflowTask: false })),
    ...workflowTasks.map(t => ({
      id: t.entity_id,
      description: t.node_label || 'Pending Approval',
      claimant_name: t.claimant_name,
      claimant_department: t.claimant_department,
      claimant_avatar: t.claimant_avatar,
      status: 'Pending',
      isWorkflowTask: true,
      task_id: t.id,
      created_at: t.created_at,
    }))
  ];

  const filteredClaims = allApprovalItems.filter((claim: any) => 
    claim.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.claimant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: claims.filter(c => c.status === 'Pending').length + workflowTasks.length,
    pendingFinance: claims.filter(c => c.status === 'Pending Finance').length,
    total: allApprovalItems.length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Approvals</h1>
        <p className="text-slate-500 mt-1">Review and approve expense claims from your team.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500">Pending Approval</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Pending Finance</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.pendingFinance}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-sm text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'pending' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending ({stats.pending + stats.pendingFinance})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by claim ID, description or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
            <p className="text-lg font-semibold text-slate-900">All caught up!</p>
            <p className="text-slate-500">No claims pending your approval.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClaims.map((claim: any) => {
              const status = statusConfig[claim.status] || statusConfig['Pending'];
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={claim.isWorkflowTask ? `wf-${claim.task_id}` : claim.id}
                  className="p-4 sm:p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(claim.isWorkflowTask ? `/approvals/${claim.id}?taskId=${claim.task_id}` : `/approvals/${claim.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${claim.isWorkflowTask ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {claim.isWorkflowTask ? (
                          <CheckCircle2 className="w-6 h-6 text-amber-600" />
                        ) : (
                          <Receipt className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-semibold text-slate-900">{claim.description}</p>
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${status.bg} ${status.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {claim.claimant_name}
                          </span>
                          <span>{claim.department || 'No department'}</span>
                          <span>•</span>
                          <span>{formatDate(claim.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">
                          ${claim.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">{claim.items?.length || 0} items</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
