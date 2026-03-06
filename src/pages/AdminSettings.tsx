import { useState } from 'react';
import { Settings, Building, Mail, Bell, Shield, CreditCard, Globe, Save, RefreshCw } from 'lucide-react';

const settings = {
  company: {
    name: 'Global Corp',
    code: 'US-01',
    timezone: 'America/New_York',
    currency: 'USD',
  },
  notifications: {
    emailEnabled: true,
    slackEnabled: false,
    approvalReminder: true,
    reminderHours: 48,
  },
  security: {
    twoFactorRequired: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
  },
};

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState('company');
  const [formData, setFormData] = useState(settings);

  const sections = [
    { id: 'company', label: 'Company', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'localization', label: 'Localization', icon: Globe },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Settings</h2>
        <p className="text-slate-500 mt-1">Configure system-wide settings and preferences.</p>
      </div>

      <div className="flex gap-8">
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeSection === 'company' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Company Information</h3>
                <p className="text-sm text-slate-500">Basic company details for your organization.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      defaultValue={formData.company.name}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company Code</label>
                    <input
                      type="text"
                      defaultValue={formData.company.code}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Timezone</label>
                    <select
                      defaultValue={formData.company.timezone}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Default Currency</label>
                    <select
                      defaultValue={formData.company.currency}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Notification Settings</h3>
                <p className="text-sm text-slate-500">Configure how users receive notifications.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Email Notifications</p>
                    <p className="text-sm text-slate-500">Send notifications via email</p>
                  </div>
                  <Toggle defaultChecked={formData.notifications.emailEnabled} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Slack Integration</p>
                    <p className="text-sm text-slate-500">Send notifications to Slack channels</p>
                  </div>
                  <Toggle defaultChecked={formData.notifications.slackEnabled} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Approval Reminders</p>
                    <p className="text-sm text-slate-500">Remind approvers of pending requests</p>
                  </div>
                  <Toggle defaultChecked={formData.notifications.approvalReminder} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Reminder After (hours)</label>
                  <input
                    type="number"
                    defaultValue={formData.notifications.reminderHours}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Security Settings</h3>
                <p className="text-sm text-slate-500">Configure security and authentication options.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Two-Factor Authentication</p>
                    <p className="text-sm text-slate-500">Require 2FA for all users</p>
                  </div>
                  <Toggle defaultChecked={formData.security.twoFactorRequired} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    defaultValue={formData.security.sessionTimeout}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password Expiry (days)</label>
                  <input
                    type="number"
                    defaultValue={formData.security.passwordExpiry}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'billing' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Billing & Subscription</h3>
                <p className="text-sm text-slate-500">Manage your subscription and payment methods.</p>
              </div>
              <div className="p-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-blue-900">Enterprise Plan</p>
                      <p className="text-sm text-blue-700">Unlimited users • Priority support • Advanced analytics</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Active</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900">Payment Method</p>
                      <p className="text-sm text-slate-500">Visa ending in 4242</p>
                    </div>
                    <button className="text-blue-600 text-sm font-semibold hover:underline">Update</button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900">Next Billing Date</p>
                      <p className="text-sm text-slate-500">February 15, 2024</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">$499/month</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'localization' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Localization</h3>
                <p className="text-sm text-slate-500">Configure regional and language settings.</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Default Language</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="en">English (US)</option>
                    <option value="en-gb">English (UK)</option>
                    <option value="zh">中文 (简体)</option>
                    <option value="zh-tw">中文 (繁體)</option>
                    <option value="ja">日本語</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date Format</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number Format</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="en">1,234.56</option>
                    <option value="eu">1.234,56</option>
                    <option value="in">1,23,456.78</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ defaultChecked }: { defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`}
      />
    </button>
  );
}
