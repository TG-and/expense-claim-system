import React, { useState, useEffect, ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle, FileText, User, Building2 } from 'lucide-react';

export default function RequestDetails() {
  const { id } = useParams();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequest = () => {
    fetch(`/api/requests/${id}`)
      .then(res => res.json())
      .then(data => {
        setRequest(data);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approver_id: 'u1', // Mocking as Finance Lead
          comments
        }),
      });
      
      if (res.ok) {
        setComments('');
        fetchRequest();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading request details...</div>;
  }

  if (!request || request.error) {
    return (
      <div className="p-8">
        <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium">
          Request not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/" className="flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{request.id}</h2>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-slate-500 text-lg">{request.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-3xl font-black text-slate-900">
            ${request.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-lg text-slate-500 font-bold">{request.currency}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Details Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Request Details
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
              <DetailItem label="Category" value={request.type} />
              <DetailItem label="Submitted On" value={new Date(request.created_at).toLocaleDateString()} />
              <DetailItem label="Claimant" value={request.claimant_name} icon={<User className="w-4 h-4 text-slate-400" />} />
              <DetailItem label="Department" value={request.department} />
              <DetailItem label="Vendor" value={request.vendor_name || 'Internal/None'} icon={<Building2 className="w-4 h-4 text-slate-400" />} />
            </div>
            
            {request.attachment_url && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Attached Receipt</h4>
                <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center">
                  {request.attachment_url.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">PDF Document</p>
                      <a 
                        href={request.attachment_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-slate-50 transition-colors"
                      >
                        View Full PDF
                      </a>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={request.attachment_url} 
                        alt="Receipt" 
                        className="max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a 
                          href={request.attachment_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 bg-white rounded-lg text-sm font-bold text-slate-900 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all"
                        >
                          View Full Image
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Approval History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Approval History
            </h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
              {request.approvals && request.approvals.length > 0 ? (
                request.approvals.map((approval: any, idx: number) => (
                  <div key={approval.id} className="relative flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-4 border-white z-10 ${
                      approval.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 
                      approval.status === 'Rejected' ? 'bg-red-100 text-red-600' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {approval.status === 'Approved' ? <CheckCircle2 className="w-4 h-4" /> : 
                       approval.status === 'Rejected' ? <XCircle className="w-4 h-4" /> : 
                       <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{approval.approver_name}</p>
                          <p className="text-xs text-slate-500">Step {approval.step} • {approval.status}</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(approval.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {approval.comments && (
                        <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 mt-2">
                          "{approval.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border-4 border-white z-10">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 py-2">
                    <p className="text-sm text-slate-500 italic">No approvals recorded yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {request.status !== 'Approved' && request.status !== 'Rejected' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Review Action</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comments (Optional)</label>
                  <textarea 
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    rows={3}
                    placeholder="Add your review comments..."
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAction('reject')}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleAction('approve')}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">
                Download PDF
              </button>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">
                View Attached Receipts
              </button>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors">
                Contact Claimant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = 'bg-slate-100 text-slate-700';
  if (status === 'Approved') color = 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected') color = 'bg-red-100 text-red-700';
  if (status === 'Pending Finance') color = 'bg-amber-100 text-amber-700';
  if (status === 'Processing Payment') color = 'bg-blue-100 text-blue-700';

  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${color}`}>
      {status}
    </span>
  );
}
