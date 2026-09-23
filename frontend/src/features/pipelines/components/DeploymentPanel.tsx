import React from 'react';
import { DeploymentRun } from '../types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Rocket, CheckCircle2, Loader2, Circle, XCircle, RotateCcw } from 'lucide-react';

export interface DeploymentPanelProps {
  deployment: DeploymentRun;
  isDeploying: boolean;
  validationPassed: boolean;
  hasGeneratedCode: boolean;
  onDeploy: () => void;
  onReset: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  idle: 'Not deployed',
  compiling: 'Compiling',
  running_tests: 'Running tests',
  provisioning: 'Provisioning',
  deploying: 'Deploying',
  verifying: 'Verifying',
  deployed: 'Deployed',
  failed: 'Failed',
};

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  deployment,
  isDeploying,
  validationPassed,
  hasGeneratedCode,
  onDeploy,
  onReset,
}) => {
  const canDeploy = validationPassed && hasGeneratedCode && !isDeploying;

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-purple-600" />
          Deployment Pipeline
        </h4>
        <Badge
          variant={
            deployment.stage === 'deployed' ? 'success' : deployment.stage === 'failed' ? 'error' : deployment.stage === 'idle' ? 'neutral' : 'ai'
          }
          size="sm"
          dot
          pulse={isDeploying}
        >
          {STAGE_LABEL[deployment.stage] ?? deployment.stage}
        </Badge>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {deployment.steps.map((step, idx) => {
          const isDone = deployment.currentStepIndex > idx || deployment.stage === 'deployed';
          const isCurrent = isDeploying && deployment.currentStepIndex === idx && deployment.stage !== 'deployed';
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all',
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/25'
                  : isCurrent
                  ? 'bg-indigo-500/10 border-indigo-500/40'
                  : 'bg-card/60 border-border-subtle'
              )}
            >
              <span className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-text-muted" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-text-primary">{step.label}</div>
                <div className="text-[10px] text-text-secondary truncate">{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deployed version info */}
      {deployment.deployedVersion && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-[11px] font-mono text-emerald-600">Version {deployment.deployedVersion} live in Development</span>
          <Badge variant="success" size="sm" dot pulse>Active</Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          onClick={onDeploy}
          disabled={!canDeploy}
          isLoading={isDeploying}
          leftIcon={<Rocket className="w-3.5 h-3.5" />}
          className="text-xs flex-1"
        >
          {isDeploying ? 'Deploying…' : deployment.stage === 'deployed' ? 'Redeploy' : 'Deploy to Development'}
        </Button>
        {deployment.stage !== 'idle' && !isDeploying && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />} className="text-xs">
            Reset
          </Button>
        )}
      </div>

      {!validationPassed && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" />
          Resolve validation issues before deploying.
        </p>
      )}
    </div>
  );
};
