import { useState, useEffect } from 'react';
import { Plus, Search, Download, MoreVertical, CheckCircle2, Clock, XCircle, AlertCircle, Trash2, RotateCcw, Edit3, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  'Approved': { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2, label: 'Approved' },
  'Rejected': { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle, label: 'Rejected' },
  'Pending': { color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock, label: 'Pending' },
  'Pending Finance': { color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertCircle, label: 'Pending Finance' },
  'Processing Payment': { color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock, label: 'Processing' },
  'Draft': { color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock, label: 'Draft' },
};

const categoryConfig: Record<string, string> = {
  'Travel': '✈️ Travel',
  'Dinner': '🍽️ Dinner',
  'Entertainment': '🎭 Entertainment',
  'Office Supplies': '📎 Office Supplies',
  'Transportation': '🚗 Transportation',
  'Accommodation': '🏨 Accommodation',
  'Other': '📝 Other',
};

export default function MyReimbursements() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'withdraw' | 'delete' | null; claimId: string | null }>({ isOpen: false, type: null, claimId: null });
  const navigate = useNavigate();

  const fetchClaims = () => {
    fetch('/api/claims')
      .then(res => res.json())
      .then(data => {
        setClaims(data.filter((c: any) => c.claimant_id === user?.id));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClaims();
  }, [user]);

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          claim.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'Pending' || c.status === 'Pending Finance').length,
    approved: claims.filter(c => c.status === 'Approved').length,
    totalAmount: claims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + c.total_amount, 0),
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleWithdraw = async (claimId: string) => {
    setConfirmModal({ isOpen: true, type: 'withdraw', claimId });
  };

  const handleDelete = async (claimId: string) => {
    setConfirmModal({ isOpen: true, type: 'delete', claimId });
  };

  const confirmAction = async () => {
    const { type, claimId } = confirmModal;
    if (!claimId) return;

    try {
      if (type === 'withdraw') {
        await fetch(`/api/claims/${claimId}/withdraw`, { method: 'POST' });
      } else if (type === 'delete') {
        await fetch(`/api/claims/${claimId}`, { method: 'DELETE' });
      }
      fetchClaims();
    } catch (error) {
      console.error(`Failed to ${type}:`, error);
    } finally {
      setConfirmModal({ isOpen: false, type: null, claimId: null });
    }
  };

  const toggleExpand = (claimId: string) => {
    setExpandedClaim(expandedClaim === claimId ? null : claimId);
  };

  return (
    <div className="p-8">
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ isOpen: false, type: null, claimId: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                confirmModal.type === 'delete' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {confirmModal.type === 'delete' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {confirmModal.type === 'delete' ? 'Delete Claim' : 'Withdraw Claim'}
              </h3>
            </div>
            <p className="text-slate-600 mb-6">
              {confirmModal.type === 'delete' 
                ? 'Are you sure you want to delete this claim? This action cannot be undone.'
                : 'Are you sure you want to withdraw this claim? You can edit and resubmit it after withdrawal.'
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, type: null, claimId: null })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAction}
                className={`px-4 py-2 text-white rounded-lg font-semibold transition-colors ${
                  confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmModal.type === 'delete' ? 'Delete' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">My Reimbursements</h2>
          <p className="text-slate-500 mt-1">Track and manage your expense claims.</p>
        </div>
        <Link 
          to="/claims/new" 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Claims" value={stats.total} color="text-slate-900" />
        <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved} color="text-emerald-600" />
        <StatCard label="Total Reimbursed" value={`$${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="text-blue-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Pending Finance">Pending Finance</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Draft">Draft</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Receipt className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No claims found</h3>
            <p className="text-slate-500 mb-4">You don't have any claims yet or they don't match your filters.</p>
            <Link to="/claims/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Create New Claim
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClaims.map((claim) => {
              const status = statusConfig[claim.status] || statusConfig['Pending'];
              const StatusIcon = status.icon;
              const isExpanded = expandedClaim === claim.id;
              const canWithdraw = claim.status === 'Pending' || claim.status === 'Pending Finance';
              const canDelete = claim.status === 'Draft';
              
              return (
                <div key={claim.id} className="hover:bg-slate-50 transition-colors">
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(claim.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                          {claim.id.split('-')[1]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{claim.description}</p>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {claim.id} • {claim.items?.length || 0} items • {formatDate(claim.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            ${claim.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-500">{claim.currency}</p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {canWithdraw && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWithdraw(claim.id); }}
                              className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-amber-600"
                              title="Withdraw"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(claim.id); }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/claims/${claim.id}`); }}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                            title="View Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && claim.items && (
                    <div className="px-4 pb-4 bg-slate-50">
                      <div className="pl-14">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-slate-500 text-left">
                              <th className="pb-2 font-medium">Category</th>
                              <th className="pb-2 font-medium">Description</th>
                              <th className="pb-2 font-medium">Vendor</th>
                              <th className="pb-2 font-medium text-right">Amount</th>
                              <th className="pb-2 font-medium text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {claim.items.map((item: any) => (
                              <tr key={item.id}>
                                <td className="py-2 text-sm">{categoryConfig[item.type] || item.type}</td>
                                <td className="py-2 text-sm text-slate-600">{item.description}</td>
                                <td className="py-2 text-sm text-slate-600">{item.vendor_name || '-'}</td>
                                <td className="py-2 text-sm text-right font-medium">${item.amount.toFixed(2)}</td>
                                <td className="py-2 text-right">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                    item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                    item.status === 'Draft' ? 'bg-slate-100 text-slate-500' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Receipt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17V7" />
    </svg>
  );
}
