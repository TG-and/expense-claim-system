import { useState, useEffect } from 'react';
import { Download, Plus, DollarSign, Clock, Activity, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = () => {
    fetch('/api/requests')
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const activeRequests = requests.filter(r => r.status !== 'Approved' && r.status !== 'Rejected');
  const recentRequests = requests.slice(0, 5);
  const totalReimbursed = requests
    .filter(r => r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Review and manage your organization's expenditure flow.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <Link to="/claims/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all">
            <Plus className="w-4 h-4" />
            New Claim
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* My Claims List */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">My Claims</h3>
            <Link to="/reimbursements" className="text-blue-600 text-xs font-bold hover:underline">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {requests.filter(r => r.claimant_id === 'u2').slice(0, 3).map(claim => (
              <Link to={`/requests/${claim.id}`} key={claim.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{claim.description}</p>
                  <p className="text-xs text-slate-500">{claim.status}</p>
                </div>
                <span className="text-sm font-bold">${claim.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </Link>
            ))}
            {requests.filter(r => r.claimant_id === 'u2').length === 0 && (
              <p className="text-sm text-slate-500">No claims found.</p>
            )}
          </div>
        </div>

        <StatCard 
          icon={Clock} 
          title="Pending Approvals" 
          value={activeRequests.length.toString()} 
          trend="Static" 
          trendColor="text-slate-600 bg-slate-100" 
          iconBg="bg-amber-100 text-amber-600"
        />

        {/* My Approvals List */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">My Approvals</h3>
            <Link to="/approvals" className="text-blue-600 text-xs font-bold hover:underline">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {activeRequests.slice(0, 3).map(req => (
              <Link to={`/requests/${req.id}`} key={req.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{req.description}</p>
                  <p className="text-xs text-slate-500">{req.claimant_name}</p>
                </div>
                <span className="text-sm font-bold">${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </Link>
            ))}
            {activeRequests.length === 0 && (
              <p className="text-sm text-slate-500">No pending approvals.</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Claim Tracking */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-bold text-slate-900">Active Claim Tracking</h5>
          <button className="text-blue-600 text-sm font-bold hover:underline">View All Active</button>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {loading ? (
            <div className="text-sm text-slate-500">Loading active claims...</div>
          ) : activeRequests.length === 0 ? (
            <div className="text-sm text-slate-500">No active claims.</div>
          ) : (
            activeRequests.map(req => (
              <TrackingCard 
                key={req.id}
                title={req.description} 
                id={`#${req.id}`} 
                amount={`$${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
                status={req.status} 
                statusColor={getStatusColor(req.status)}
                step={req.step}
              />
            ))
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h5 className="font-bold text-slate-900">Recent Requests</h5>
            <button className="text-blue-600 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor / Item</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-sm text-slate-500 text-center">Loading...</td></tr>
                ) : recentRequests.map(req => (
                  <TableRow 
                    key={req.id}
                    id={req.id}
                    vendor={req.vendor_name || 'Internal'} 
                    item={req.description} 
                    category={req.type} 
                    amount={`$${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
                    status={req.status} 
                    statusColor={getStatusColor(req.status)} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Approvals */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h5 className="font-bold text-slate-900">Team Approvals Required</h5>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : activeRequests.slice(0, 3).map(req => (
              <ApprovalItem 
                key={req.id}
                id={req.id}
                name={req.claimant_name} 
                item={req.description} 
                amount={`$${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
                initials={req.avatar} 
                color="bg-blue-100 text-blue-700" 
                onAction={fetchRequests}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch(status) {
    case 'Approved': return 'bg-emerald-100 text-emerald-700';
    case 'Rejected': return 'bg-red-100 text-red-700';
    case 'Pending': return 'bg-slate-100 text-slate-700';
    case 'Pending Finance': return 'bg-amber-100 text-amber-700';
    case 'Processing Payment': return 'bg-blue-100 text-blue-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function StatCard({ icon: Icon, title, value, trend, trendColor, iconBg }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendColor}`}>{trend}</span>
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-slate-900">{value}</h3>
    </div>
  );
}

function TrackingCard({ title, id, amount, status, statusColor, step, opacity = "" }: any) {
  const navigate = useNavigate();
  // Remove the # from id for the URL
  const reqId = id.startsWith('#') ? id.substring(1) : id;
  return (
    <div onClick={() => navigate(`/requests/${reqId}`)} className={`min-w-[320px] bg-white border border-slate-200 p-5 rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-blue-300 ${opacity}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{title}</p>
          <p className="text-xs text-slate-500 mt-1">ID: {id} • {amount}</p>
        </div>
        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${statusColor}`}>{status}</span>
      </div>
      
      <div className="flex justify-between items-center relative">
        <div className="absolute top-3 left-0 w-full h-[2px] bg-slate-100 -z-10"></div>
        <div className="absolute top-3 left-0 h-[2px] bg-emerald-500 -z-10 transition-all" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
        
        <StepItem label="Submitted" active={step >= 1} completed={step > 1} />
        <StepItem label="Finance" active={step >= 2} completed={step > 2} />
        <StepItem label="Payment" active={step >= 3} completed={step > 3} />
      </div>
    </div>
  );
}

function StepItem({ label, active, completed }: { label: string, active: boolean, completed: boolean }) {
  return (
    <div className="flex flex-col items-center bg-white px-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
        completed ? 'bg-emerald-500 text-white' : 
        active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
        'bg-slate-100 text-slate-400'
      }`}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : active ? '2' : '3'}
      </div>
      <span className={`text-[10px] mt-2 font-medium ${active ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function TableRow({ id, vendor, item, category, amount, status, statusColor }: any) {
  const navigate = useNavigate();
  return (
    <tr onClick={() => navigate(`/requests/${id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
      <td className="px-6 py-4">
        <p className="font-semibold text-slate-900">{vendor}</p>
        <p className="text-xs text-slate-500">{item}</p>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{category}</td>
      <td className="px-6 py-4 font-bold text-slate-900">{amount}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColor}`}>{status}</span>
      </td>
    </tr>
  );
}

function ApprovalItem({ id, name, item, amount, initials, color, onAction }: any) {
  const handleApprove = async () => {
    await fetch(`/api/requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver_id: 'u1', comments: 'Approved from dashboard' })
    });
    onAction();
  };

  const handleReject = async () => {
    await fetch(`/api/requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver_id: 'u1', comments: 'Rejected from dashboard' })
    });
    onAction();
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${color}`}>
        {initials}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{item} • {amount}</p>
        <div className="flex gap-2 mt-3">
          <button onClick={handleApprove} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm">Approve</button>
          <button onClick={handleReject} className="flex-1 py-1.5 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm">Deny</button>
        </div>
      </div>
    </div>
  );
}
