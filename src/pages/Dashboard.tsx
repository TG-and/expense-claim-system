import { useState, useEffect } from 'react';
import { Download, Plus, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, Calendar, Receipt, ArrowUpRight, ArrowDownRight, Wallet, FileText, CreditCard, Utensils, Plane, Building, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApiFetch } from '../App';

interface Claim {
  id: string;
  description: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  claimant_id: string;
  items?: any[];
}

const categoryIcons: Record<string, any> = {
  'Travel': Plane,
  'Dinner': Utensils,
  'Entertainment': CreditCard,
  'Office Supplies': FileText,
  'Transportation': DollarSign,
  'Accommodation': Building,
  'Other': Receipt,
};

const categoryColors: Record<string, string> = {
  'Travel': 'bg-blue-500',
  'Dinner': 'bg-orange-500',
  'Entertainment': 'bg-pink-500',
  'Office Supplies': 'bg-purple-500',
  'Transportation': 'bg-green-500',
  'Accommodation': 'bg-indigo-500',
  'Other': 'bg-slate-500',
};

export default function Dashboard() {
  const apiFetch = useApiFetch();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<Claim[]>([]);
  const [workflowTasks, setWorkflowTasks] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('expense_token');
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch('/api/claims').then(res => res.json()).catch(() => []),
      apiFetch('/api/approvals').then(res => res.json()).catch(() => []),
      apiFetch('/api/workflow/tasks').then(res => res.json()).catch(() => [])
    ]).then(([claimsData, approvalsData, tasksData]) => {
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      setPendingApprovals(Array.isArray(approvalsData) ? approvalsData : []);
      setWorkflowTasks(Array.isArray(tasksData) ? tasksData : []);
      setLoading(false);
    });
  }, [apiFetch]);

  const allPendingApprovals = [
    ...pendingApprovals,
    ...workflowTasks.map((task: any) => ({
      id: task.entity_id,
      description: task.node_label || 'Pending Approval',
      claimant_name: task.claimant_name,
      claimant_department: task.claimant_department,
      claimant_avatar: task.claimant_avatar,
      total_amount: 0,
      status: 'Pending',
      isWorkflowTask: true,
      task_id: task.id,
    }))
  ];

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'Pending' || c.status === 'Pending Finance').length,
    approved: claims.filter(c => c.status === 'Approved' || c.status === 'Paid').length,
    totalAmount: claims.reduce((sum, c) => sum + c.total_amount, 0),
    approvedAmount: claims.filter(c => c.status === 'Approved' || c.status === 'Paid').reduce((sum, c) => sum + c.total_amount, 0),
    pendingApprovalCount: allPendingApprovals.length,
  };

  const categoryBreakdown: Record<string, { amount: number; count: number }> = {};
  
  claims.forEach((claim) => {
    claim.items?.forEach((item: any) => {
      const type = item.type || 'Other';
      if (!categoryBreakdown[type]) {
        categoryBreakdown[type] = { amount: 0, count: 0 };
      }
      categoryBreakdown[type].amount += item.amount;
      categoryBreakdown[type].count += 1;
    });
  });

  const categories: [string, { amount: number; count: number }][] = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1].amount - a[1].amount);

  const maxCategoryAmount = Math.max(...categories.map(([, data]) => data.amount), 1);

  const recentClaims = [...claims]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Approved': return { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2, label: 'Approved' };
      case 'Rejected': return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, label: 'Rejected' };
      case 'Pending': return { color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock, label: 'Pending' };
      case 'Pending Finance': return { color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle, label: 'Pending Finance' };
      case 'Processing Payment': return { color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock, label: 'Processing Payment' };
      case 'Paid': return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2, label: 'Paid' };
      case 'Draft': return { color: 'text-slate-600', bg: 'bg-slate-100', icon: FileText, label: 'Draft' };
      default: return { color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock, label: status };
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Welcome back! 👋</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your expense claims.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Claims"
          value={stats.total.toString()}
          icon={Receipt}
          trend="+12%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={stats.pending.toString()}
          icon={Clock}
          trend="3 new"
          trendUp={false}
          color="amber"
        />
        <StatCard
          title="Approved"
          value={stats.approved.toString()}
          icon={CheckCircle2}
          trend="+8%"
          trendUp={true}
          color="emerald"
        />
        <StatCard
          title="Total Reimbursed"
          value={`$${stats.approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend="+15%"
          trendUp={true}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spending by Category */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Spending by Category</h3>
              <button className="text-sm text-slate-500 hover:text-slate-700">View Report</button>
            </div>
            
            {categories.length > 0 ? (
              <div className="space-y-4">
                {categories.map(([category, data]) => {
                  const Icon = categoryIcons[category] || Receipt;
                  const bgColor = categoryColors[category] || categoryColors['Other'];
                  const percentage = (data.amount / maxCategoryAmount) * 100;
                  
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{category}</p>
                            <p className="text-xs text-slate-500">{data.count} claims</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-slate-500">{Math.round((data.amount / stats.totalAmount) * 100)}%</p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${bgColor} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No expense data yet</p>
              </div>
            )}
          </div>

          {/* Recent Claims */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Recent Claims</h3>
              <Link to="/reimbursements" className="text-sm text-blue-600 font-semibold hover:underline">View All</Link>
            </div>
            
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : recentClaims.length > 0 ? (
                recentClaims.map(claim => {
                  const statusConfig = getStatusConfig(claim.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Link 
                      key={claim.id} 
                      to={`/claims/${claim.id}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{claim.description}</p>
                          <p className="text-xs text-slate-500">{claim.id} • {formatDate(claim.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">${claim.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-slate-500">{claim.items?.length || 0} items</p>
                        </div>
                        <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No claims yet</p>
                  <Link to="/claims/new" className="text-blue-600 font-semibold hover:underline text-sm mt-2 inline-block">
                    Create your first claim
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          {allPendingApprovals.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Pending Approvals ({allPendingApprovals.length})</h3>
                <Link to="/approvals" className="text-sm text-amber-600 font-semibold hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {allPendingApprovals.slice(0, 5).map((claim: any, index: number) => (
                  <Link 
                    key={claim.isWorkflowTask ? `wf-${claim.task_id}` : claim.id}
                    to={claim.isWorkflowTask ? `/approvals/${claim.id}?taskId=${claim.task_id}` : `/approvals/${claim.id}`}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        {claim.isWorkflowTask ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Receipt className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{claim.description}</p>
                        <p className="text-xs text-slate-500">{claim.claimant_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {claim.total_amount > 0 && (
                        <p className="font-bold text-slate-900">${claim.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      )}
                      <p className="text-xs text-amber-600 font-medium">{claim.isWorkflowTask ? 'Awaiting' : claim.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Status Overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-600">Pending Approval</span>
                </div>
                <span className="font-bold text-slate-900">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-600">Approved</span>
                </div>
                <span className="font-bold text-slate-900">{stats.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-sm text-slate-600">Draft</span>
                </div>
                <span className="font-bold text-slate-900">{claims.filter(c => c.status === 'Draft').length}</span>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-slate-100"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-emerald-500"
                      strokeDasharray={`${(stats.approved / Math.max(stats.total, 1)) * 352} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">
                      {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                    </span>
                    <span className="text-xs text-slate-500">Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Tip of the day</h4>
                <p className="text-sm text-slate-600">Upload receipts when making expenses for faster processing and approval.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}
