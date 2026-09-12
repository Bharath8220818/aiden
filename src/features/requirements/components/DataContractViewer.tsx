import React, { useState } from 'react';
import { DataContractSpecification } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ContractSchemaTable } from './ContractSchemaTable';
import { QualityRulesList } from './QualityRulesList';
import { requirementsService } from '../services/requirements.service';
import {
  FileCode,
  ShieldCheck,
  Zap,
  Clock,
  Download,
  Copy,
  Check,
  Layers,
  Database,
  Users,
} from 'lucide-react';

export interface DataContractViewerProps {
  contract: DataContractSpecification;
}

export const DataContractViewer: React.FC<DataContractViewerProps> = ({ contract }) => {
  const [activeTab, setActiveTab] = useState('schema');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'schema', label: 'Schema & Types', icon: <Layers className="w-3.5 h-3.5" />, badge: contract.columns.length },
    { id: 'quality', label: 'Quality Rules', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: contract.qualityRules.length },
    { id: 'sla', label: 'SLAs & Governance', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'yaml', label: 'Raw Contract (YAML)', icon: <FileCode className="w-3.5 h-3.5" /> },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.rawYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    requirementsService.downloadYamlFile(
      `${contract.datasetName.replace(/[^a-zA-Z0-9_-]/g, '_')}_contract.yaml`,
      contract.rawYaml
    );
  };

  return (
    <Card className="bg-[#14171C] border-[#242831] overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-[#1F242C] bg-gradient-to-r from-[#14171C] via-[#14171C] to-indigo-950/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ODCS v{contract.contractVersion}
              </span>
              <Badge variant="success" dot size="sm">
                Verified Contract
              </Badge>
              <span className="text-xs text-[#6B7280]">
                {contract.targetFormat}
              </span>
            </div>
            <CardTitle className="text-base font-bold text-[#F5F7FA]">
              {contract.title}
            </CardTitle>
            <p className="text-xs text-[#9CA3AF] mt-0.5 font-mono">
              Target: {contract.physicalTarget}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopy}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {copied ? 'Copied' : 'Copy YAML'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Tabs */}
      <div className="px-5 pt-2.5 bg-[#0F1115] border-b border-[#242831]">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <CardContent className="p-5">
        {/* Tab 1: Schema */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <ContractSchemaTable columns={contract.columns} />
          </div>
        )}

        {/* Tab 2: Quality Rules */}
        {activeTab === 'quality' && (
          <div className="space-y-4">
            <QualityRulesList rules={contract.qualityRules} />
          </div>
        )}

        {/* Tab 3: SLAs & Governance */}
        {activeTab === 'sla' && (
          <div className="space-y-6">
            {/* SLA Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Service Level Agreements (SLA)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831]">
                  <span className="text-[10px] text-[#6B7280] uppercase block">Data Freshness Guarantee</span>
                  <span className="text-sm font-bold text-white font-mono mt-1 block">
                    {contract.sla.freshness}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831]">
                  <span className="text-[10px] text-[#6B7280] uppercase block">Platform Availability</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                    {contract.sla.availability}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831]">
                  <span className="text-[10px] text-[#6B7280] uppercase block">Max Micro-batch Latency</span>
                  <span className="text-sm font-bold text-cyan-300 font-mono mt-1 block">
                    {contract.sla.maxLatency}
                  </span>
                </div>
              </div>
            </div>

            {/* Governance Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Data Governance, Ownership & Consumers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Domain:</span>
                    <span className="text-white font-medium">{contract.governance.dataDomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Business Owner:</span>
                    <span className="text-white font-medium">{contract.governance.dataOwner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Technical Owner:</span>
                    <span className="text-white font-medium">{contract.governance.technicalOwner}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831] space-y-2">
                  <span className="text-[#6B7280] block text-[11px]">Compliance Frameworks</span>
                  <div className="flex flex-wrap gap-1.5">
                    {contract.governance.complianceTags.map((tag, i) => (
                      <Badge key={i} variant="ai" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <span className="text-[#6B7280] block text-[11px] pt-1">Registered Downstream Consumers</span>
                  <div className="flex flex-wrap gap-1">
                    {contract.governance.downstreamConsumers.map((consumer, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#14171C] border border-[#242831] text-[#9CA3AF]"
                      >
                        {consumer}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Raw YAML */}
        {activeTab === 'yaml' && (
          <div className="relative">
            <pre className="p-4 bg-[#0B0D10] border border-[#242831] rounded-lg text-xs font-mono text-[#F5F7FA] overflow-x-auto leading-relaxed max-h-96 selection:bg-indigo-500/40">
              {contract.rawYaml}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
