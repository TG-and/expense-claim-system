import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertCircle, Receipt, FileText, User, Building2, MessageSquare, Send, Check, Ban } from 'lucide-react';
import { useApiFetch } from '../App';

const categoryConfig: Record<string, { icon: string; color: string }> = {
  'Travel': { icon: '✈️', color: 'bg-blue-100' },
  'Dinner': { icon: '🍽️', color: 'bg-orange-100' },
  'Entertainment': { icon: '🎭', color: 'bg-pink-100' },
  'Office Supplies': { icon: '📎', color: 'bg-purple-100' },
  'Transportation': { icon: '🚗', color: 'bg-green-100' },
  'Accommodation': { icon: '🏨', color: 'bg-indigo-100' },
  'Other': { icon: '📝', color: 'bg-slate-100' },
};

export default function ApprovalDetails() {
  const apiFetch = useApiFetch();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/claims/${id}`)
      .then(res => res.json())
      .then(data => {
        setClaim(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [id, apiFetch]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/claims/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      });
      
      if (res.ok) {
        navigate('/approvals');
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Claim not found</p>
        <button onClick={() => navigate('/approvals')} className="text-blue-600 hover:underline mt-2">
          Back to Approvals
        </button>
      </div>
    );
  }

  const canApprove = claim.status === 'Pending' || claim.status === 'Pending Finance';
  const isPendingFinance = claim.status === 'Pending Finance';

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/approvals')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{claim.description}</h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                claim.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                claim.status === 'Pending Finance' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {claim.status}
              </span>
            </div>
            <p className="text-slate-500">
              Claim ID: {claim.id} • Submitted on {formatDate(claim.created_at)}
            </p>
          </div>
          
          {canApprove && (
            <div className="flex gap-3">
              <button 
                onClick={() => handleAction('reject')}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl font-semibold hover:bg-red-50 transition-colors"
              >
                <Ban className="w-4 h-4" />
                Reject
              </button>
              <button 
                onClick={() => handleAction('approve')}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                {isPendingFinance ? 'Approve & Process Payment' : 'Approve'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Expense Items ({claim.items?.length || 0})</h3>
            </div>
            
            {claim.items && claim.items.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {claim.items.map((item: any, index: number) => {
                  const catConfig = categoryConfig[item.type] || categoryConfig['Other'];
                  return (
                    <div key={item.id} className="p-4 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${catConfig.color}`}>
                          {catConfig.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{item.description}</p>
                              <p className="text-sm text-slate-500">{item.type} • {item.vendor_name || 'No vendor'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-slate-900">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-slate-500">{item.currency}</p>
                            </div>
                          </div>
                          
                          {item.attachment_url && (
                            <div className="mt-3">
                              <a 
                                href={item.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">No items found</div>
            )}
          </div>

          {/* Comment Input */}
          {canApprove && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Add Comments</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments or notes for this approval..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">Optional. Your comments will be visible to the claimant.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-bold text-xl text-slate-900">${claim.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-slate-900">{claim.items?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Currency</span>
                <span className="font-semibold text-slate-900">{claim.currency}</span>
              </div>
            </div>
          </div>

          {/* Submitter Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Submitted By</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                {claim.claimant_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{claim.claimant_name}</p>
                <p className="text-sm text-slate-500">{claim.department || 'No department'}</p>
              </div>
            </div>
          </div>

          {/* Approval Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Approval Flow</h3>
            <div className="space-y-0">
              <ApprovalStep 
                step={1} 
                title="Submitted" 
                description="Claim submitted" 
                isCompleted={true}
                isCurrent={false}
              />
              <ApprovalStep 
                step={2} 
                title="Manager Review" 
                description="Department manager approval"
                isCompleted={claim.step > 2}
                isCurrent={claim.step === 2}
              />
              <ApprovalStep 
                step={3} 
                title="Finance Review" 
                description="Finance team review"
                isCompleted={claim.step > 3}
                isCurrent={claim.step === 3}
              />
              <ApprovalStep 
                step={4} 
                title="Payment" 
                description="Payment processing"
                isCompleted={claim.status === 'Approved' || claim.status === 'Processing Payment'}
                isCurrent={claim.status === 'Processing Payment'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApprovalStep({ step, title, description, isCompleted, isCurrent }: {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  return (
    <div className="relative flex items-start gap-4 pb-6 last:pb-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
        isCompleted ? 'bg-emerald-500 text-white' :
        isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
        'bg-slate-100 text-slate-400'
      }`}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <div className="flex-1 pt-0.5">
        <p className={`font-semibold text-sm ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
          {title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
