import React, { useState, useRef } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { multimodalApi } from '../../api/multimodal';
import { Upload, Image as ImageIcon, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const PipelineAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotificationStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be smaller than 10MB.');
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      addNotification({ type: 'error', message: 'Please upload an image first.' });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const response = await multimodalApi.uploadAndAnalyze(
        imageFile,
        prompt || 'Describe this data pipeline diagram in detail.'
      );

      if (response.success) {
        setResult(response.analysis || 'No analysis returned.');
        addNotification({ type: 'success', message: 'Analysis complete!' });
      } else {
        setError(response.error || 'Analysis failed.');
        addNotification({ type: 'error', message: response.error || 'Analysis failed.' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to service.');
      addNotification({ type: 'error', message: 'Failed to analyze image.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setPrompt('');
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-card p-6 rounded-xl bg-[#111827] border border-[#1E293B]">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-400" />
          Pipeline Diagram Analyzer
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Upload a pipeline architecture diagram and ask questions about it.
        </p>

        {!image ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1E293B] rounded-xl p-12 text-center cursor-pointer hover:border-purple-500/50 transition-all hover:bg-[#0D1A2A] group"
          >
            <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4 group-hover:text-purple-400 transition-colors" />
            <p className="text-gray-400 font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-500 mt-1">PNG, JPG, WebP (max 10MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative group">
            <img
              src={image}
              alt="Uploaded pipeline diagram"
              className="max-h-96 mx-auto rounded-lg border border-[#1E293B] object-contain"
            />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors text-white opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {image && (
        <div className="glass-card p-6 rounded-xl bg-[#111827] border border-[#1E293B]">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Your Question <span className="text-gray-500">(optional)</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., What data sources are used in this pipeline?"
              className="flex-1 px-4 py-2.5 bg-[#0D1A2A] border border-[#1E293B] rounded-lg text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
              disabled={isAnalyzing}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isAnalyzing) handleAnalyze(); }}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="glass-card p-6 rounded-xl bg-[#111827] border border-[#1E293B] animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Analysis Result</h4>
          </div>
          <div className="bg-[#0D1A2A] rounded-lg p-4 text-gray-200 whitespace-pre-wrap leading-relaxed text-sm max-h-80 overflow-y-auto">
            {result}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Model: aiden-multimodal</span>
            <span>{result.split(' ').length} tokens</span>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(result);
                addNotification({ type: 'success', message: 'Copied to clipboard!' });
              }}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Analyze Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
