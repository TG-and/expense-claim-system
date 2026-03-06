import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plane, Utensils, ShoppingCart, Receipt, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NewRequest() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        setVendors(data);
        if (data.length > 0) {
          setVendorId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedCategory,
          claimant_id: 'u2', // Mocking as Sarah Williams
          vendor_id: vendorId || null,
          amount: parseFloat(amount),
          currency: 'USD',
          description
        })
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error(error);
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Request Submitted</h2>
        <p className="text-slate-500 text-lg">Your pre-approval request has been routed to your manager.</p>
        <p className="text-slate-400 text-sm mt-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Create Pre-approval Request</h2>
        <p className="text-slate-500 mt-2 text-lg max-w-2xl">Select the appropriate category for your new expense or operational request to start the automated approval workflow.</p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <CategoryCard 
            icon={Plane} 
            title="Travel" 
            desc="Submit for business trips including flights, hotel accommodations, and ground transport."
            color="bg-blue-50 text-blue-600"
            onClick={() => setSelectedCategory('Travel')}
          />
          <CategoryCard 
            icon={Utensils} 
            title="Entertainment" 
            desc="Request approval for client dinners, team bonding events, and corporate hospitality."
            color="bg-purple-50 text-purple-600"
            onClick={() => setSelectedCategory('Entertainment')}
          />
          <CategoryCard 
            icon={ShoppingCart} 
            title="Procurement" 
            desc="Purchase requests for IT hardware, software licenses, or general office supplies."
            color="bg-emerald-50 text-emerald-600"
            onClick={() => setSelectedCategory('Procurement')}
          />
          <CategoryCard 
            icon={Receipt} 
            title="Debit/Credit Note" 
            desc="Financial adjustments, vendor refunds, or internal credit memo generation."
            color="bg-amber-50 text-amber-600"
            onClick={() => setSelectedCategory('Debit/Credit Note')}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-2xl mb-12">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-900">New {selectedCategory} Request</h3>
              <p className="text-sm text-slate-500 mt-1">Please provide the details for your request.</p>
            </div>
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Change Category
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <input 
                type="text" 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g., Client Dinner at Tech Summit"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Vendor</label>
              <select 
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all appearance-none font-medium text-slate-700"
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all appearance-none font-medium text-slate-700">
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-start">
        <Link to="/" className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function CategoryCard({ icon: Icon, title, desc, color, onClick }: any) {
  return (
    <button onClick={onClick} className="group text-left bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col h-full">
      <div className={`h-40 flex items-center justify-center ${color} group-hover:bg-opacity-80 transition-colors`}>
        <Icon className="w-16 h-16" strokeWidth={1.5} />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed flex-1">{desc}</p>
      </div>
    </button>
  );
}
