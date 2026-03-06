import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Receipt, Sparkles, Plus, Trash2, FileText, X, ChevronRight, Edit3 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface ClaimItem {
  id: string;
  category: string;
  description: string;
  vendorId: string;
  amount: string;
  currency: string;
  attachmentUrl: string;
  attachmentName: string;
}

const categories = [
  { value: 'Travel', label: 'Travel', icon: '✈️' },
  { value: 'Dinner', label: 'Dinner', icon: '🍽️' },
  { value: 'Entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'Office Supplies', label: 'Office Supplies', icon: '📎' },
  { value: 'Transportation', label: 'Transportation', icon: '🚗' },
  { value: 'Accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'Other', label: 'Other', icon: '📝' },
];

const initialItem: ClaimItem = {
  id: '',
  category: 'Other',
  description: '',
  vendorId: '',
  amount: '',
  currency: 'USD',
  attachmentUrl: '',
  attachmentName: '',
};

export default function NewClaim() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<ClaimItem[]>([]);
  const [formDescription, setFormDescription] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<ClaimItem>({ ...initialItem, id: 'temp' });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEditMode && id) {
      fetch(`/api/claims/${id}`)
        .then(res => res.json())
        .then(data => {
          setFormDescription(data.description || '');
          setItems((data.items || []).map((item: any) => ({
            id: item.id,
            category: item.type,
            description: item.description,
            vendorId: item.vendor_name || '',
            amount: item.amount.toString(),
            currency: item.currency,
            attachmentUrl: item.attachment_url || '',
            attachmentName: ''
          })));
        });
    }
  }, [id, isEditMode]);

  useEffect(() => {
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        setVendors(data);
        if (data.length > 0) {
          setCurrentItem(prev => ({ ...prev, vendorId: data[0].id }));
        }
      })
      .catch(console.error);
  }, []);

  const addItemToList = () => {
    if (!currentItem.description || !currentItem.amount) return;
    
    const newItem = { 
      ...currentItem, 
      id: Date.now().toString() 
    };
    
    setItems([...items, newItem]);
    setCurrentItem({ 
      ...initialItem, 
      id: 'temp', 
      vendorId: vendors[0]?.id || '',
      category: 'Other'
    });
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const editItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingItemId(id);
      setCurrentItem(item);
    }
  };

  const updateItemInList = () => {
    if (!editingItemId) return;
    
    setItems(items.map(item => 
      item.id === editingItemId ? { ...currentItem, id: editingItemId } : item
    ));
    setEditingItemId(null);
    setCurrentItem({ 
      ...initialItem, 
      id: 'temp', 
      vendorId: vendors[0]?.id || '',
      category: 'Other'
    });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setCurrentItem({ 
      ...initialItem, 
      id: 'temp', 
      vendorId: vendors[0]?.id || '',
      category: 'Other'
    });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setCurrentItem(prev => ({ ...prev, attachmentUrl: data.url, attachmentName: file.name }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = () => {
    setCurrentItem(prev => ({ ...prev, attachmentUrl: '', attachmentName: '' }));
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || items.length === 0) return;
    
    setSubmitting(true);
    
    try {
      if (isEditMode && id) {
        await fetch(`/api/claims/${id}`, { method: 'DELETE' });
      }
      
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formDescription,
          claimant_id: 'u2',
          items: items.map(item => ({
            type: item.category,
            vendor_id: item.vendorId || null,
            amount: parseFloat(item.amount),
            currency: item.currency,
            description: item.description,
            attachment_url: item.attachmentUrl
          }))
        })
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/reimbursements');
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '📝';
  };

  if (success) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Claim Submitted</h2>
        <p className="text-slate-500 text-lg">Your claim "{formDescription}" with {items.length} items has been submitted.</p>
        <p className="text-slate-900 text-2xl font-bold mt-4">Total: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p className="text-slate-400 text-sm mt-4">Redirecting to My Reimbursements...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">{isEditMode ? 'Edit Claim' : 'Create New Claim'}</h2>
        <p className="text-slate-500 mt-2 text-lg">Add multiple expense items to a single claim form.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Side - Items List */}
          <div className="xl:col-span-1 space-y-6">
            {/* Form Description */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Claim Title / Description</label>
              <input 
                type="text" 
                required
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="e.g., Business Trip to NYC - January 2024"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
              />
            </div>

            {/* Items Summary */}
            <div className="bg-white border border-s-2xl shadowlate-200 rounded-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Expense Items ({items.length})</h3>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No items added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add items on the right panel</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.description}</p>
                            <p className="text-xs text-slate-500">{item.category} • {vendors.find(v => v.id === item.vendorId)?.name || 'No vendor'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">${parseFloat(item.amount).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => editItem(item.id)}
                            className="p-1 text-slate-400 hover:text-blue-500"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-700">Total Claim Amount</p>
                  <p className="text-xs text-blue-600 mt-1">{items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-blue-700">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Add Item Form */}
          <div className="xl:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sticky top-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  {editingItemId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{editingItemId ? 'Edit Expense Item' : 'Add New Expense Item'}</h3>
                  <p className="text-sm text-slate-500">Fill in the details for a single expense</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Expense Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCurrentItem(prev => ({ ...prev, category: cat.value }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          currentItem.category === cat.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{cat.icon}</div>
                        <div className="text-xs font-medium text-slate-700">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <input 
                    type="text" 
                    value={currentItem.description}
                    onChange={e => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Dinner with client at restaurant"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                  />
                </div>

                {/* Vendor & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Vendor</label>
                    <input 
                      type="text"
                      value={currentItem.vendorId}
                      onChange={e => setCurrentItem(prev => ({ ...prev, vendorId: e.target.value }))}
                      placeholder="Enter vendor name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all font-medium text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                        <input 
                          type="number" 
                          min="0.01"
                          step="0.01"
                          value={currentItem.amount}
                          onChange={e => setCurrentItem(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                      <select 
                        value={currentItem.currency}
                        onChange={e => setCurrentItem(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CNY">CNY</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Receipt Attachment</label>
                  {currentItem.attachmentUrl ? (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-600" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">{currentItem.attachmentName}</p>
                          <p className="text-xs text-emerald-700">Receipt attached</p>
                        </div>
                      </div>
                      <button type="button" onClick={removeAttachment} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 transition-colors bg-slate-50">
                      <div className="text-center">
                        {uploading ? (
                          <>
                            <div className="animate-spin mx-auto w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <p className="text-sm text-slate-500 mt-2">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <Receipt className="mx-auto h-10 w-10 text-slate-400" />
                            <div className="flex text-sm text-slate-600 mt-3 justify-center">
                              <label className="cursor-pointer">
                                <span className="font-bold text-blue-600">Upload</span>
                                <input type="file" className="sr-only" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                              </label>
                              <span className="text-slate-500"> or drag</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {editingItemId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={editingItemId ? updateItemInList : addItemToList}
                    disabled={!currentItem.description || !currentItem.amount}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    {editingItemId ? 'Update Item' : 'Add to Claim'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Link to="/" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button 
            type="submit"
            disabled={submitting || !formDescription || items.length === 0}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Submitting...' : (
              <>
                <Sparkles className="w-5 h-5" />
                Submit {isEditMode ? 'Changes' : 'Claim'} ({items.length} items)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
