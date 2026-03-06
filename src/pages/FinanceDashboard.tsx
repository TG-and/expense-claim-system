import { useState, useEffect } from 'react';
import { Download, Plus, TrendingUp, TrendingDown, Eye, Edit, Link as LinkIcon, AlertCircle, CheckCircle2, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FinanceDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/requests')
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        setLoading(false);
      });
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'Pending Finance' || r.status === 'Processing Payment');
  const totalDisbursed = requests
    .filter(r => r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Finance Dashboard</h2>
          <p className="text-slate-500 mt-1">Manage payment flows, ERP synchronizations, and OCR validation status.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Export Reports
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all">
            <Plus className="w-4 h-4" />
            New Payment Run
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Pending Approvals" 
          value={pendingRequests.length.toString()} 
          trend="+5.2%" 
          trendUp={true} 
          subtitle="vs last week" 
          icon="pending_actions" 
          iconColor="text-blue-500" 
        />
        <MetricCard 
          title="AI OCR Success Rate" 
          value="98.2%" 
          trend="-0.4%" 
          trendUp={false} 
          subtitle="avg. confidence" 
          icon="biotech" 
          iconColor="text-indigo-500" 
        />
        <MetricCard 
          title="AP Entries Today" 
          value="142" 
          trend="+12%" 
          trendUp={true} 
          subtitle="auto-generated" 
          icon="assignment_turned_in" 
          iconColor="text-orange-500" 
        />
        <MetricCard 
          title="ERP Disbursed" 
          value={`$${(totalDisbursed / 1000).toFixed(1)}k`} 
          trend="+8.1%" 
          trendUp={true} 
          subtitle="MTD payout" 
          icon="account_balance" 
          iconColor="text-emerald-500" 
        />
      </div>

      {/* Main Data Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pending Payment Requests</h3>
            <p className="text-sm text-slate-500">Verification queue for reimbursement and procurement claims.</p>
          </div>
          <div className="relative">
            <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50">
              <option>All Statuses</option>
              <option>Pending OCR</option>
              <option>Failed Sync</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Request & Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Pre-Approval</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI OCR Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AP Entry Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ERP Tracking</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-sm text-slate-500 text-center">Loading...</td></tr>
              ) : pendingRequests.map(req => (
                <PaymentRow 
                  key={req.id}
                  reqId={req.id} 
                  emp={`${req.claimant_name} • ${req.department}`} 
                  preApp={`PA-${req.id.split('-')[1]}`} 
                  amount={`$${req.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
                  ocrConf={req.status === 'Processing Payment' ? 95 : 40} 
                  ocrText={req.status === 'Processing Payment' ? "95% Conf." : "Pending"} 
                  ocrColor={req.status === 'Processing Payment' ? "bg-emerald-500" : "bg-amber-500"} 
                  ocrTextColor={req.status === 'Processing Payment' ? "text-emerald-600" : "text-amber-600"}
                  apStatus={req.status === 'Processing Payment' ? "GENERATED" : "PENDING"} 
                  apColor={req.status === 'Processing Payment' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"} 
                  apDot={req.status === 'Processing Payment' ? "bg-blue-500" : "bg-slate-400"}
                  erpStatus="PENDING SYNC" 
                  erpIcon={Hourglass} 
                  erpColor="text-orange-500"
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Showing 1-{pendingRequests.length} of {pendingRequests.length} results</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ERP Sync Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">ERP Connection</h3>
            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SAP S/4HANA
            </span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">Last Sync</span>
              <span className="text-xs font-bold text-slate-900">2 mins ago</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">Queue Depth</span>
              <span className="text-xs font-bold text-slate-900">12 entries</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">Success Rate (24h)</span>
              <span className="text-xs font-bold text-emerald-600">99.8%</span>
            </div>
            <button className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors mt-2">
              Force Global Re-sync
            </button>
          </div>
        </div>

        {/* Real-time Processing Log */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Real-time Processing Log</h3>
          <div className="space-y-4">
            <LogItem 
              icon="document_scanner" iconColor="text-blue-600 bg-blue-100"
              title="OCR: INV-100223 Processed" time="Just now"
              desc="Confidence: 99.1%. Auto-mapped to Vendor 'Staples Business'."
            />
            <LogItem 
              icon="sync_alt" iconColor="text-emerald-600 bg-emerald-100"
              title="ERP: Payment Batch #782 Disbursed" time="12 mins ago"
              desc="14 payments totaling $4,200 synced successfully to NetSuite."
            />
            <LogItem 
              icon="warning" iconColor="text-orange-600 bg-orange-100"
              title="Flag: Manual Review Required" time="45 mins ago"
              desc="REQ-8823: Duplicate receipt detected in PA-4398 scope."
              titleColor="text-orange-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendUp, subtitle, icon, iconColor }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <p className="mt-2 flex items-center gap-1 text-sm">
        {trendUp ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span className={`font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>{trend}</span>
        <span className="text-slate-400 ml-1">{subtitle}</span>
      </p>
    </div>
  );
}

function PaymentRow({ reqId, emp, preApp, amount, ocrConf, ocrText, ocrColor, ocrTextColor, apStatus, apColor, apDot, erpStatus, erpIcon: ErpIcon, erpColor, isError }: any) {
  const navigate = useNavigate();
  return (
    <tr onClick={() => navigate(`/requests/${reqId}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-slate-900'}`}>{reqId}</span>
          <span className="text-xs text-slate-500 mt-0.5">{emp}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 border border-slate-200">
          <LinkIcon className="w-3 h-3 text-slate-400" /> {preApp}
        </div>
      </td>
      <td className="px-6 py-4 text-right font-bold text-slate-900">{amount}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${ocrColor}`} style={{ width: `${ocrConf}%` }}></div>
          </div>
          <span className={`text-xs font-bold ${ocrTextColor}`}>{ocrText}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${apColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${apDot}`}></span> {apStatus}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`flex items-center gap-1.5 text-xs font-bold ${erpColor}`}>
          {ErpIcon && <ErpIcon className="w-4 h-4" />} {erpStatus}
        </span>
      </td>
      <td className="px-6 py-4">
        {isError ? (
          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
            <Edit className="w-4 h-4" />
          </button>
        ) : (
          <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

function LogItem({ icon, iconColor, title, time, desc, titleColor = "text-slate-900" }: any) {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <p className={`text-sm font-bold ${titleColor}`}>{title}</p>
          <span className="text-xs text-slate-400 font-medium">{time}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
