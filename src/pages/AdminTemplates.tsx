import { useState } from 'react';
import { Plus, Edit3, Trash2, Copy, CheckCircle2, X, Power, Ban } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  subject: string;
  trigger: string;
  status: 'Active' | 'Draft' | 'Rejected';
  lastUpdated: string;
  body?: string;
}

const initialTemplates: Template[] = [
  {
    id: 1,
    name: 'Approval Request',
    subject: 'Action Required: Approval for Request #{{REQUEST_ID}}',
    trigger: 'New request submitted',
    status: 'Active',
    lastUpdated: '2024-01-15',
    body: "Hi {{CLAIMANT_NAME}},\n\nYour request #{{REQUEST_ID}} for ${{AMOUNT}} has been {{STATUS}}.\n\n{{#if COMMENTS}}\nComments: {{COMMENTS}}\n{{/if}}\n\nThank you,\n{{APPROVER_NAME}}"
  },
  {
    id: 2,
    name: 'Approval Confirmation',
    subject: 'Your Request #{{REQUEST_ID}} has been Approved',
    trigger: 'Request approved',
    status: 'Active',
    lastUpdated: '2024-01-15',
    body: "Hi {{CLAIMANT_NAME}},\n\nYour request #{{REQUEST_ID}} for ${{AMOUNT}} has been {{STATUS}}.\n\n{{#if COMMENTS}}\nComments: {{COMMENTS}}\n{{/if}}\n\nThank you,\n{{APPROVER_NAME}}"
  },
  {
    id: 3,
    name: 'Rejection Notice',
    subject: 'Your Request #{{REQUEST_ID}} has been Rejected',
    trigger: 'Request rejected',
    status: 'Active',
    lastUpdated: '2024-01-15',
    body: "Hi {{CLAIMANT_NAME}},\n\nYour request #{{REQUEST_ID}} for ${{AMOUNT}} has been {{STATUS}}.\n\n{{#if COMMENTS}}\nComments: {{COMMENTS}}\n{{/if}}\n\nThank you,\n{{APPROVER_NAME}}"
  },
  {
    id: 4,
    name: 'Payment Processed',
    subject: 'Payment Processed for Request #{{REQUEST_ID}}',
    trigger: 'Payment completed',
    status: 'Active',
    lastUpdated: '2024-01-20',
    body: "Hi {{CLAIMANT_NAME}},\n\nYour request #{{REQUEST_ID}} for ${{AMOUNT}} has been {{STATUS}}.\n\n{{#if COMMENTS}}\nComments: {{COMMENTS}}\n{{/if}}\n\nThank you,\n{{APPROVER_NAME}}"
  },
  {
    id: 5,
    name: 'Reminder Notice',
    subject: 'Reminder: Pending Approval for Request #{{REQUEST_ID}}',
    trigger: 'Request pending > 48 hours',
    status: 'Draft',
    lastUpdated: '2024-02-01',
    body: "Hi {{CLAIMANT_NAME}},\n\nYour request #{{REQUEST_ID}} for ${{AMOUNT}} has been {{STATUS}}.\n\n{{#if COMMENTS}}\nComments: {{COMMENTS}}\n{{/if}}\n\nThank you,\n{{APPROVER_NAME}}"
  }
];

const variables = [
  '{{CLAIMANT_NAME}}', '{{REQUEST_ID}}', '{{AMOUNT}}', 
  '{{APPROVER_NAME}}', '{{SUBMISSION_DATE}}', '{{LINK}}',
  '{{STATUS}}', '{{COMMENTS}}', '{{VENDOR_NAME}}'
];

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(initialTemplates[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState({
    subject: initialTemplates[0].subject,
    body: initialTemplates[0].body || ''
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    trigger: '',
    status: 'Draft' as 'Active' | 'Draft' | 'Rejected',
    body: ''
  });

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    const newId = Math.max(...templates.map(t => t.id)) + 1;
    const today = new Date().toISOString().split('T')[0];
    const createdTemplate: Template = {
      id: newId,
      name: newTemplate.name || 'New Template',
      subject: newTemplate.subject || 'New Subject',
      trigger: newTemplate.trigger || 'Custom trigger',
      status: 'Draft',
      lastUpdated: today,
      body: newTemplate.body || ''
    };
    setTemplates([...templates, createdTemplate]);
    setSelectedTemplate(createdTemplate);
    setEditingTemplate({
      subject: createdTemplate.subject,
      body: createdTemplate.body || ''
    });
    setShowCreateModal(false);
    setNewTemplate({ name: '', subject: '', trigger: '', status: 'Draft', body: '' });
  };

  const handleSaveChanges = () => {
    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { 
            ...t, 
            subject: editingTemplate.subject, 
            body: editingTemplate.body,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : t
    );
    setTemplates(updatedTemplates);
    setSelectedTemplate(updatedTemplates.find(t => t.id === selectedTemplate.id)!);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditingTemplate({
      subject: template.subject,
      body: template.body || ''
    });
  };

  const handleReject = () => {
    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { 
            ...t, 
            status: 'Rejected' as const,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : t
    );
    setTemplates(updatedTemplates);
    setSelectedTemplate(updatedTemplates.find(t => t.id === selectedTemplate.id)!);
  };

  const handleActivate = () => {
    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { 
            ...t, 
            status: 'Active' as const,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : t
    );
    setTemplates(updatedTemplates);
    setSelectedTemplate(updatedTemplates.find(t => t.id === selectedTemplate.id)!);
  };

  const handleDeactivate = () => {
    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { 
            ...t, 
            status: 'Draft' as const,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        : t
    );
    setTemplates(updatedTemplates);
    setSelectedTemplate(updatedTemplates.find(t => t.id === selectedTemplate.id)!);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== selectedTemplate.id);
      setTemplates(updatedTemplates);
      if (updatedTemplates.length > 0) {
        setSelectedTemplate(updatedTemplates[0]);
        setEditingTemplate({
          subject: updatedTemplates[0].subject,
          body: updatedTemplates[0].body || ''
        });
      }
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Email Templates</h2>
          <p className="text-slate-500 mt-1">Manage notification templates sent to users.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                    selectedTemplate.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{template.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      template.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                      template.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {template.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{template.subject}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-slate-500">Trigger: {selectedTemplate.trigger}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  <Copy className="w-4 h-4" />
                </button>
                {selectedTemplate.status === 'Draft' && (
                  <button 
                    onClick={handleReject}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                    title="Reject"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
                {selectedTemplate.status === 'Active' && (
                  <>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleDeactivate}
                      className="p-2 hover:bg-orange-50 rounded-lg transition-colors text-orange-500"
                      title="Deactivate"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </>
                )}
                {selectedTemplate.status === 'Rejected' && (
                  <button 
                    onClick={handleActivate}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                    title="Activate"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 mb-2">Subject Line</label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 mb-2">Dynamic Variables</label>
                <div className="flex flex-wrap gap-2">
                  {variables.map(v => (
                    <button
                      key={v}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-xs font-mono hover:bg-blue-100 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 mb-2">Email Body</label>
                <textarea
                  rows={12}
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-500">Last updated: {selectedTemplate.lastUpdated}</span>
                <div className="flex gap-2">
                  {selectedTemplate.status === 'Active' && (
                    <>
                      <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
                        Preview
                      </button>
                      <button 
                        onClick={handleSaveChanges}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Save Changes
                      </button>
                    </>
                  )}
                  {selectedTemplate.status === 'Draft' && (
                    <button 
                      onClick={handleActivate}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Activate
                    </button>
                  )}
                  {selectedTemplate.status === 'Rejected' && (
                    <button 
                      onClick={handleActivate}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create New Template</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Approval Request"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Trigger Event</label>
                <input
                  type="text"
                  value={newTemplate.trigger}
                  onChange={(e) => setNewTemplate({ ...newTemplate, trigger: e.target.value })}
                  placeholder="e.g., New request submitted"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Subject Line</label>
                <input
                  type="text"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="e.g., Action Required: Approval for Request #{{REQUEST_ID}}"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Email Body</label>
                <textarea
                  rows={8}
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  placeholder="Enter email body content..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
