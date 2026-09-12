import { useState, useCallback } from 'react';
import {
  MultimodalInputState,
  InputMode,
  IntentAnalysisResult,
  DataContractSpecification,
  ValidationCheckItem,
} from '../types';
import {
  PRESET_ECOMMERCE_ORDERS,
  PRESET_FRAUD_STREAM,
  INITIAL_VALIDATION_CHECKS,
  RequirementPreset,
} from '../mockData';
import { requirementsService } from '../services/requirements.service';

export function useRequirements() {
  const [inputState, setInputState] = useState<MultimodalInputState>(
    PRESET_ECOMMERCE_ORDERS.inputState
  );
  const [analysis, setAnalysis] = useState<IntentAnalysisResult>(
    PRESET_ECOMMERCE_ORDERS.analysis
  );
  const [contract, setContract] = useState<DataContractSpecification>(
    PRESET_ECOMMERCE_ORDERS.contract
  );
  const [validationChecks, setValidationChecks] = useState<ValidationCheckItem[]>(
    INITIAL_VALIDATION_CHECKS
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('preset-orders-cdc');

  const setActiveMode = useCallback((mode: InputMode) => {
    setInputState((prev) => ({ ...prev, activeMode: mode }));
  }, []);

  const updateText = useCallback((text: string) => {
    setInputState((prev) => ({
      ...prev,
      text: { ...prev.text, rawText: text },
    }));
  }, []);

  const updateAudio = useCallback((audioUpdates: Partial<MultimodalInputState['audio']>) => {
    setInputState((prev) => ({
      ...prev,
      audio: { ...prev.audio, ...audioUpdates },
    }));
  }, []);

  const updateSql = useCallback((sqlUpdates: Partial<MultimodalInputState['sql']>) => {
    setInputState((prev) => ({
      ...prev,
      sql: { ...prev.sql, ...sqlUpdates },
    }));
  }, []);

  const updateDiagram = useCallback((diagramUpdates: Partial<MultimodalInputState['diagram']>) => {
    setInputState((prev) => ({
      ...prev,
      diagram: { ...prev.diagram, ...diagramUpdates },
    }));
  }, []);

  const updateDocument = useCallback((documentUpdates: Partial<MultimodalInputState['document']>) => {
    setInputState((prev) => ({
      ...prev,
      document: { ...prev.document, ...documentUpdates },
    }));
  }, []);

  const loadPreset = useCallback((preset: RequirementPreset) => {
    setActivePresetId(preset.id);
    setInputState(preset.inputState);
    setAnalysis(preset.analysis);
    setContract(preset.contract);
    requirementsService.validateContract(preset.contract).then(setValidationChecks);
  }, []);

  const synthesizeIntent = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await requirementsService.analyzeMultimodalIntent(inputState);
      setAnalysis(res.analysis);
      setContract(res.contract);
      const checks = await requirementsService.validateContract(res.contract);
      setValidationChecks(checks);
    } catch (err) {
      console.error('Intent synthesis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputState]);

  return {
    inputState,
    analysis,
    contract,
    validationChecks,
    isAnalyzing,
    activePresetId,
    setActiveMode,
    updateText,
    updateAudio,
    updateSql,
    updateDiagram,
    updateDocument,
    loadPreset,
    synthesizeIntent,
    setContract,
    presets: [PRESET_ECOMMERCE_ORDERS, PRESET_FRAUD_STREAM],
  };
}
