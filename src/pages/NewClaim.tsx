import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Receipt, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

export default function NewClaim() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const analyzeReceipt = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data.split(',')[1],
                  mimeType: mimeType
                }
              },
              {
                text: "Extract the following details from this receipt in JSON format: vendor_name, total_amount, currency, and a brief description of the items. If you can't find a detail, leave it null."
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.total_amount) setAmount(result.total_amount.toString());
      if (result.description) setDescription(result.description);
      
      // Try to match vendor
      if (result.vendor_name) {
        const matchedVendor = vendors.find(v => 
          v.name.toLowerCase().includes(result.vendor_name.toLowerCase()) ||
          result.vendor_name.toLowerCase().includes(v.name.toLowerCase())
        );
        if (matchedVendor) setVendorId(matchedVendor.id);
      }
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // For AI Analysis
    const reader = new FileReader();
    reader.onloadend = () => {
      if (file.type.startsWith('image/')) {
        analyzeReceipt(reader.result as string, file.type);
      }
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setAttachmentUrl(data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Reimbursement',
          claimant_id: 'u2', // Mocking as Sarah Williams
          vendor_id: vendorId || null,
          amount: parseFloat(amount),
          currency: 'USD',
          description,
          attachment_url: attachmentUrl
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
        <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Claim Submitted</h2>
        <p className="text-slate-500 text-lg">Your reimbursement claim has been routed to your manager.</p>
        <p className="text-slate-400 text-sm mt-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Create New Claim</h2>
        <p className="text-slate-500 mt-2 text-lg max-w-2xl">Submit a new reimbursement claim for out-of-pocket expenses.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-2xl mb-12">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Claim Details</h3>
            <p className="text-sm text-slate-500 mt-1">Please provide the details and receipt for your expense.</p>
          </div>
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

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Receipt Attachment</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-slate-50">
              <div className="space-y-1 text-center">
                {attachmentUrl ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    <div className="flex text-sm text-slate-600 mt-2">
                      <span className="font-bold text-emerald-600">Receipt Uploaded</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">File: {attachmentUrl.split('/').pop()}</p>
                    <button 
                      type="button"
                      onClick={() => setAttachmentUrl('')}
                      className="mt-2 text-xs font-bold text-red-500 hover:text-red-700"
                    >
                      Remove and replace
                    </button>
                  </div>
                ) : (
                  <>
                    <Receipt className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-bold text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>{uploading ? 'Uploading...' : 'Upload a file'}</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          disabled={uploading || isAnalyzing}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                  </>
                )}
              </div>
            </div>
            {isAnalyzing && (
              <div className="mt-4 flex items-center gap-2 text-blue-600 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold">AI is analyzing your receipt and pre-filling details...</span>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Link 
              to="/"
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={submitting || uploading || isAnalyzing}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Submit Claim
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="flex justify-start">
        <Link to="/" className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
