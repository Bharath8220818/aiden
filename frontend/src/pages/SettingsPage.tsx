import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { Toggle } from '../components/ui/Toggle';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { User, Shield, Palette, Bell, Link2, Settings2 } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
] as const;

type TabId = (typeof tabs)[number]['id'];

const ProfileSettings: React.FC = () => {
  const { user } = useAuthStore();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal information.</p>
      <div className="mt-6 space-y-4">
        <Input label="Full Name" defaultValue={user?.full_name || ''} />
        <Input label="Email" type="email" defaultValue={user?.email || ''} />
        <Input label="Username" defaultValue={user?.username || ''} />
        <Button className="mt-2">Save Changes</Button>
      </div>
    </div>
  );
};

const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your password and security settings.</p>

      <div className="mt-6 space-y-4">
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button className="mt-2">Update Password</Button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Add an extra layer of security to your account.
        </p>
        <Toggle checked={false} onChange={() => {}} label="Enable 2FA" description="Use authenticator app or SMS codes" />
      </div>
    </div>
  );
};

const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize the look and feel of AIDEN.</p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg capitalize text-sm font-medium transition-all',
                  theme === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <span className="block text-lg mb-1">
                  {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                </span>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Color Accent</h3>
          <div className="flex gap-3">
            {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                aria-label={`Accent color ${color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    pipelineNotifications: true,
    weeklyDigest: false,
    marketingEmails: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure how you receive notifications.</p>
      <div className="mt-6 space-y-4">
        <Toggle checked={settings.emailAlerts} onChange={() => toggle('emailAlerts')} label="Email Alerts" description="Receive email notifications for important updates" />
        <Toggle checked={settings.pushNotifications} onChange={() => toggle('pushNotifications')} label="Push Notifications" description="Receive push notifications in browser" />
        <Toggle checked={settings.pipelineNotifications} onChange={() => toggle('pipelineNotifications')} label="Pipeline Notifications" description="Get notified when pipelines complete or fail" />
        <Toggle checked={settings.weeklyDigest} onChange={() => toggle('weeklyDigest')} label="Weekly Digest" description="Receive a weekly summary of pipeline activity" />
        <Toggle checked={settings.marketingEmails} onChange={() => toggle('marketingEmails')} label="Marketing Emails" description="Receive product updates and tips" />
      </div>
    </div>
  );
};

const IntegrationSettings: React.FC = () => {
  const integrations = [
    { name: 'Slack', connected: true, color: 'bg-green-500' },
    { name: 'GitHub', connected: true, color: 'bg-green-500' },
    { name: 'Jira', connected: false, color: 'bg-gray-300' },
    { name: 'Datadog', connected: false, color: 'bg-gray-300' },
    { name: 'PagerDuty', connected: false, color: 'bg-gray-300' },
    { name: 'Teams', connected: false, color: 'bg-gray-300' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect AIDEN with your favorite tools.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${integration.color}`} />
              <span className="font-medium text-sm text-gray-900 dark:text-white">{integration.name}</span>
            </div>
            <button
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                integration.connected
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {integration.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdvancedSettings: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Advanced configuration and developer options.</p>
      <div className="mt-6 space-y-6">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">API Keys</h3>
          <p className="text-xs text-gray-500 mt-1">Manage your API keys for programmatic access.</p>
          <button className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Manage API Keys →</button>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">Webhook Configuration</h3>
          <p className="text-xs text-gray-500 mt-1">Configure webhooks for pipeline events.</p>
          <button className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Configure Webhooks →</button>
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
          <h3 className="font-medium text-red-700 dark:text-red-400 text-sm">Danger Zone</h3>
          <p className="text-xs text-red-500 mt-1">Irreversible actions. Proceed with caution.</p>
          <button className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 bg-white dark:bg-transparent px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account, preferences, and integrations.</p>

      <div className="mt-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="md:w-48 space-y-1 shrink-0" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-left rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
          {activeTab === 'advanced' && <AdvancedSettings />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
