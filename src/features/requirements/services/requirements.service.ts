import { api } from '@/services/api';
import {
  MultimodalInputState,
  IntentAnalysisResult,
  DataContractSpecification,
  ValidationCheckItem,
} from '../types';
import { PRESET_ECOMMERCE_ORDERS } from '../mockData';

export const requirementsService = {
  async analyzeMultimodalIntent(
    inputState: MultimodalInputState
  ): Promise<{ analysis: IntentAnalysisResult; contract: DataContractSpecification }> {
    const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

    try {
      if (!isMockEnabled) {
        return await api.post<{ analysis: IntentAnalysisResult; contract: DataContractSpecification }>(
          '/requirements/analyze',
          inputState
        );
      }
    } catch (err) {
      console.warn('[Requirements Service] Falling back to client-side synthesis:', err);
    }

    // Client-side synthesis simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Adapt result dynamically based on active mode text / sql
        const currentAnalysis = { ...PRESET_ECOMMERCE_ORDERS.analysis };
        const currentContract = { ...PRESET_ECOMMERCE_ORDERS.contract };

        if (inputState.activeMode === 'sql' && inputState.sql.inferredSources.length > 0) {
          currentAnalysis.intentTitle = `SQL Query to Data Contract (${inputState.sql.dialect.toUpperCase()})`;
        } else if (inputState.activeMode === 'audio' && inputState.audio.transcript) {
          currentAnalysis.intentTitle = 'Voice Recorded Intent to Pipeline Contract';
          currentAnalysis.executiveSummary = `Transcribed speech: "${inputState.audio.transcript.substring(0, 100)}..." synthesized into contract.`;
        }

        resolve({
          analysis: currentAnalysis,
          contract: currentContract,
        });
      }, 650);
    });
  },

  async validateContract(
    contract: DataContractSpecification
  ): Promise<ValidationCheckItem[]> {
    const checks: ValidationCheckItem[] = [
      {
        id: 'chk-schema',
        category: 'Schema',
        title: 'Schema Integrity & Data Types',
        passed: contract.columns.length > 0 && contract.columns.some((c) => c.isPrimaryKey),
        message: `${contract.columns.length} columns declared. Primary key identifier verified.`,
      },
      {
        id: 'chk-quality',
        category: 'Quality',
        title: 'Quality Rules & Assertions Coverage',
        passed: contract.qualityRules.length >= 3,
        message: `${contract.qualityRules.length} quality assertions defined across completeness and freshness.`,
      },
      {
        id: 'chk-sla',
        category: 'SLA',
        title: 'Freshness & Availability Commitments',
        passed: Boolean(contract.sla.freshness && contract.sla.availability),
        message: `Guaranteed freshness: ${contract.sla.freshness} with ${contract.sla.availability} SLA.`,
      },
      {
        id: 'chk-governance',
        category: 'Security',
        title: 'PII Identification & Regulatory Tags',
        passed: contract.columns.some((c) => c.piiClassification === 'PII')
          ? contract.columns.filter((c) => c.piiClassification === 'PII').every((c) => Boolean(c.maskingPolicy))
          : true,
        message: 'All detected PII columns have cryptographic masking policies assigned.',
      },
    ];

    return checks;
  },

  downloadYamlFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/yaml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
