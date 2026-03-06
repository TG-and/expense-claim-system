import { Download, Plus, Settings, Users, FileText, CheckCircle2, Edit3, Trash2 } from 'lucide-react';

export default function AdminPortal() {
  return (
    <div className="p-8 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Configuration</h2>
          <p className="text-slate-500 mt-1">Define and manage the logic for expense and travel approvals.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Export Config
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all">
            <Plus className="w-4 h-4" />
            Create New Workflow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-200 mb-8">
        <button className="pb-4 text-sm font-bold text-blue-600 border-b-2 border-blue-600">Workflow Designer</button>
        <button className="pb-4 text-sm font-bold text-slate-500 hover:text-slate-700">Email Notification Templates</button>
        <button className="pb-4 text-sm font-bold text-slate-500 hover:text-slate-700">Delegations</button>
      </div>

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Travel Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
          <div className="absolute top-6 right-6 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Active</div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">flight_takeoff</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Travel Requests</h3>
              <p className="text-sm text-slate-500">3-Layer Approval Path</p>
            </div>
          </div>

          <div className="space-y-0 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-[calc(100%-2rem)] before:w-0.5 before:bg-slate-200">
            <WorkflowStep step={1} title="Line Manager" desc="Immediate supervisor approval required" />
            <WorkflowStep step={2} title="Department Head" desc="Mandatory for International travel (> $2,000)" />
            <WorkflowStep step={3} title="Finance Team" desc="Final budget verification and release" />
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-orange-200 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">+5</div>
            </div>
            <div className="flex gap-2 text-slate-400">
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Entertainment & Meals */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
          <div className="absolute top-6 right-6 px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Draft</div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Entertainment & Meals</h3>
              <p className="text-sm text-slate-500">2-Layer Approval Path</p>
            </div>
          </div>

          <div className="space-y-0 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-[calc(100%-2rem)] before:w-0.5 before:bg-slate-200">
            <WorkflowStep step={1} title="Line Manager" desc="Review project billing code" />
            <WorkflowStep step={2} title="Project Owner" desc="Cost allocation confirmation" />
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
            <span className="text-sm text-slate-400 italic">No reviewers assigned yet</span>
            <div className="flex gap-2 text-slate-400">
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Editor */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">alternate_email</span>
            <h3 className="text-lg font-bold text-slate-900">Template Editor: <span className="text-blue-600">Approval Confirmation</span></h3>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">Preview</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">Save Template</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Dynamic Variables</h4>
            <div className="flex flex-wrap gap-2">
              <VariableTag text="{{CLAIMANT_NAME}}" />
              <VariableTag text="{{REQUEST_ID}}" />
              <VariableTag text="{{AMOUNT}}" />
              <VariableTag text="{{APPROVER_NAME}}" />
              <VariableTag text="{{SUBMISSION_DATE}}" />
              <VariableTag text="{{LINK}}" />
            </div>
            <p className="text-xs text-slate-400 mt-6 leading-relaxed">Click a variable to insert it into the editor at your cursor position.</p>
          </div>
          <div className="p-6 md:col-span-2 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Email Subject</label>
              <input type="text" defaultValue="Action Required: Approval for Request #{{REQUEST_ID}}" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Message Body (Markdown Supported)</label>
              <textarea rows={8} defaultValue={`Hi {{APPROVER_NAME}},\n\nA new expense request has been submitted by **{{CLAIMANT_NAME}}** for the amount of **{{AMOUNT}}**.\n\nPlease review the details and approve or reject the request using the link below:\n\n[Review Request]({{LINK}})`} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono leading-relaxed resize-none"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ step, title, desc }: any) {
  return (
    <div className="relative flex items-start gap-6 pb-8 last:pb-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 bg-white text-blue-600 text-xs font-bold shrink-0 relative z-10">
        {step}
      </div>
      <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
        <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function VariableTag({ text }: { text: string }) {
  return (
    <button className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-xs font-mono hover:bg-blue-100 transition-colors">
      {text}
    </button>
  );
}
