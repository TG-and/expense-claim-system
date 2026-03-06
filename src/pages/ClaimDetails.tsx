import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertCircle, RotateCcw, FileText, Download, Eye, Edit3, Trash2, AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  'Approved': { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2, label: 'Approved' },
  'Rejected': { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle, label: 'Rejected' },
  'Pending': { color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock, label: 'Pending' },
  'Pending Finance': { color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertClock, label: 'Pending Finance' },
  'Processing Payment': { color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock, label: 'Processing' },
  'Draft': { color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock, label: 'Draft' },
};

const categoryConfig: Record<string, { icon: string; color: string }> = {
  'Travel': { icon: '✈️', color: 'bg-blue-100' },
  'Dinner': { icon: '🍽️', color: 'bg-orange-100' },
  'Entertainment': { icon: '🎭', color: 'bg-pink-100' },
  'Office Supplies': { icon: '📎', color: 'bg-purple-100' },
  'Transportation': { icon: '🚗', color: 'bg-green-100' },
  'Accommodation': { icon: '🏨', color: 'bg-indigo-100' },
  'Other': { icon: '📝', color: 'bg-slate-100' },
};

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  variant = 'danger'
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void; 
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel}></div>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {variant === 'danger' ? (
              <Trash2 className="w-6 h-6 text-red-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg font-semibold transition-colors ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetch(`/api/claims/${id}`)
      .then(res => res.json())
      .then(data => {
        setClaim(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const refreshClaim = () => {
    fetch(`/api/claims/${id}`)
      .then(res => res.json())
      .then(data => setClaim(data));
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

  const handleWithdraw = async () => {
    try {
      await fetch(`/api/claims/${id}/withdraw`, { method: 'POST' });
      refreshClaim();
      setShowWithdrawModal(false);
    } catch (error) {
      console.error('Failed to withdraw:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/claims/${id}`, { method: 'DELETE' });
      navigate('/reimbursements');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
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
      <div className="p-8 text-center min-h-screen">
        <p className="text-slate-500">Claim not found</p>
        <Link to="/reimbursements" className="text-blue-600 hover:underline mt-2 inline-block">Back to My Reimbursements</Link>
      </div>
    );
  }

  const status = statusConfig[claim.status] || statusConfig['Pending'];
  const canWithdraw = claim.status === 'Pending' || claim.status === 'Pending Finance';
  const isDraft = claim.status === 'Draft';

  const approvalSteps = [
    { step: 1, title: 'Submitted', description: 'Claim submitted for approval' },
    { step: 2, title: 'Manager Review', description: 'Waiting for manager approval' },
    { step: 3, title: 'Finance Review', description: 'Finance team review' },
    { step: 4, title: 'Payment', description: 'Payment processing' },
  ];

  const currentStep = claim.step || 1;

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <ConfirmModal
        isOpen={showWithdrawModal}
        title="Withdraw Claim"
        message="Are you sure you want to withdraw this claim? You can edit and resubmit it after withdrawal."
        confirmText="Withdraw"
        onConfirm={handleWithdraw}
        onCancel={() => setShowWithdrawModal(false)}
        variant="warning"
      />
      
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Claim"
        message="Are you sure you want to delete this claim? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        variant="danger"
      />

      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/reimbursements')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Reimbursements
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{claim.description}</h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              Claim ID: {claim.id} • Submitted on {formatDate(claim.created_at)}
            </p>
          </div>
          
          <div className="flex gap-2">
            {isDraft && (
              <button 
                onClick={() => navigate(`/claims/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Claim
              </button>
            )}
            {canWithdraw && (
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Withdraw
              </button>
            )}
            {isDraft && (
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                            <div className="mt-3 flex items-center gap-2">
                              <a 
                                href={item.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors"
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

          {/* Attachments Summary */}
          {claim.items?.some((item: any) => item.attachment_url) && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Attachments</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {claim.items?.filter((item: any) => item.attachment_url).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-700">{item.description}</span>
                      </div>
                      <a 
                        href={item.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
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
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Submitted By</span>
                <span className="font-semibold text-slate-900">{claim.claimant_name}</span>
              </div>
            </div>
          </div>

          {/* Approval Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Approval Progress</h3>
            <div className="space-y-0">
              {approvalSteps.map((step, index) => {
                const isCompleted = currentStep > step.step;
                const isCurrent = currentStep === step.step;
                const isPending = currentStep < step.step;
                
                return (
                  <div key={step.step} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {index < approvalSteps.length - 1 && (
                      <div className={`absolute left-4 top-10 bottom-0 w-0.5 -translate-x-1/2 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}></div>
                    )}
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                      isCompleted ? 'bg-emerald-500 text-white' :
                      isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.step}
                    </div>
                    
                    <div className="flex-1 pt-0.5">
                      <p className={`font-semibold text-sm ${
                        isPending ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approvals History */}
          {claim.approvals && claim.approvals.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Approval History</h3>
              <div className="space-y-4">
                {claim.approvals.map((approval: any) => (
                  <div key={approval.id} className="border-l-2 border-slate-200 pl-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        approval.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {approval.status}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(approval.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{approval.comments || 'No comments'}</p>
                    <p className="text-xs text-slate-500 mt-1">By: {approval.approver_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}
