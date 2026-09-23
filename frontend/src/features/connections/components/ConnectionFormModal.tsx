import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataConnection, ConnectionProvider, TestConnectionResult, AuthType } from '../types';
import { testConnection } from '../services/connections.service';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldOff, Save, PlugZap, CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';

export interface ConnectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ConnectionProvider | null;
  editing: DataConnection | null;
  isSaving: boolean;
  onSave: (connection: DataConnection) => void;
}

const AUTH_LABEL: Record<AuthType, string> = {
  user_password: 'Username & Password',
  key_pair: 'Key-Pair (RSA)',
  oauth: 'OAuth 2.0',
  service_account: 'Service Account',
  iam_role: 'IAM Role Assumption',
  sasl: 'SASL (SCRAM)',
};

function blankConnection(provider: ConnectionProvider): DataConnection {
  return {
    id: `conn-${provider.id}-${Date.now().toString(36)}`,
    name: `New ${provider.name} connection`,
    providerId: provider.id,
    providerName: provider.name,
    category: provider.category,
    environment: 'development',
    status: 'disconnected',
    host: '',
    port: provider.defaultPort,
    authType: provider.authTypes[0],
    credentials: {},
    sslEnabled: true,
    createdAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    latencyMs: null,
    stats: { pipelinesUsing: 0, tablesIntrospected: 0, monthlyQueryCount: 0 },
  };
}

export const ConnectionFormModal: React.FC<ConnectionFormModalProps> = ({
  isOpen,
  onClose,
  provider,
  editing,
  isSaving,
  onSave,
}) => {
  const [draft, setDraft] = useState<DataConnection | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Track which modal session the current draft belongs to; reset when it changes.
  // Render-time state adjustment (React docs: "You Might Not Need an Effect").
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const nextSessionKey = isOpen ? `${provider?.id ?? 'none'}:${editing?.id ?? 'new'}` : null;
  if (nextSessionKey !== sessionKey) {
    setSessionKey(nextSessionKey);
    setDraft(nextSessionKey ? (editing ?? (provider ? blankConnection(provider) : null)) : null);
    setTestResult(null);
  }

  const missingRequired = useMemo(() => {
    if (!draft || !provider) return [] as string[];
    return provider.fields
      .filter((f) => f.required && !String(draft.credentials[f.key] ?? '').trim() && !(editing && /password|secret|token|json|key/i.test(f.key)))
      .map((f) => f.label);
  }, [draft, provider, editing]);

  if (!draft || !provider) return null;

  const setCredential = (key: string, value: string) =>
    setDraft((d) => (d ? { ...d, credentials: { ...d.credentials, [key]: value } } : d));

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      setTestResult(await testConnection(draft));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => onSave({ ...draft, status: testResult?.success ? 'connected' : draft.status });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? `Edit — ${editing.name}` : `Connect to ${provider.name}`}
      description={provider.description}
      maxWidth="lg"
    >
      <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
        {/* Connection name + environment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Connection Name</label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Environment</label>
            <Select
              value={draft.environment}
              onChange={(e) => setDraft({ ...draft, environment: e.target.value as DataConnection['environment'] })}
              className="text-xs"
              options={[
                { value: 'development', label: 'Development' },
                { value: 'staging', label: 'Staging' },
                { value: 'production', label: 'Production' },
              ]}
            />
          </div>
        </div>

        {/* Dynamic provider fields */}
        <div className="space-y-3 p-3 rounded-lg bg-card border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
            {provider.name} parameters
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {provider.fields.map((field) => (
              <div key={field.key} className={field.type === 'password' || field.options ? 'sm:col-span-2' : ''}>
                {field.type === 'select' ? (
                  <Select
                    value={draft.credentials[field.key] ?? ''}
                    onChange={(e) => setCredential(field.key, e.target.value)}
                    options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                    className="text-xs"
                  />
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                    value={draft.credentials[field.key] ?? ''}
                    onChange={(e) => setCredential(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="text-xs"
                  />
                )}
                <label className="text-[9px] text-text-muted mt-1 block">
                  {field.label}
                  {field.required && <span className="text-red-600 ml-0.5">*</span>}
                  {field.helper ? ` — ${field.helper}` : ''}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Auth type + SSL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Authentication</label>
            <Select
              value={draft.authType}
              onChange={(e) => setDraft({ ...draft, authType: e.target.value as AuthType })}
              options={provider.authTypes.map((a) => ({ value: a, label: AUTH_LABEL[a] }))}
              className="text-xs"
            />
          </div>
          <button
            onClick={() => setDraft({ ...draft, sslEnabled: !draft.sslEnabled })}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-lg border transition-all self-end',
              draft.sslEnabled ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-card border-border'
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-text-primary">
              {draft.sslEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldOff className="w-4 h-4 text-amber-600" />}
              SSL / TLS Encryption
            </span>
            <span className={cn('w-8 h-4 rounded-full relative transition-colors', draft.sslEnabled ? 'bg-emerald-500/60' : 'bg-border')}>
              <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', draft.sslEnabled ? 'left-4' : 'left-0.5')} />
            </span>
          </button>
        </div>

        {/* Health test */}
        <div className="p-3 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Health check</span>
            <Button variant="secondary" size="sm" onClick={handleTest} isLoading={isTesting} leftIcon={<PlugZap className="w-3.5 h-3.5" />} className="text-xs">
              Test connection
            </Button>
          </div>
          {testResult && (
            <div className="space-y-1">
              {testResult.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-[11px]">
                  {step.status === 'passed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : step.status === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  ) : step.status === 'running' ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                  <span className={cn('font-medium', step.status === 'failed' ? 'text-red-600' : 'text-text-primary')}>{step.label}</span>
                  {step.detail && <span className="text-text-muted truncate">— {step.detail}</span>}
                </div>
              ))}
              <Badge variant={testResult.success ? 'success' : 'error'} size="sm" dot className="mt-1">
                {testResult.success ? `Healthy — ${testResult.latencyMs} ms` : 'Check failed'}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
        {missingRequired.length > 0 && (
          <span className="text-[10px] text-amber-600 mr-auto">Missing required: {missingRequired.join(', ')}</span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          {editing ? 'Save changes' : 'Create connection'}
        </Button>
      </div>
    </Modal>
  );
};
