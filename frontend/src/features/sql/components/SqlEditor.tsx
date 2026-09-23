import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  height?: string;
}

// Keep Monaco bundled locally (no CDN) so the app works offline
loader.config({ monaco: undefined as never });

const AIDEN_THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5A6472', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818CF8' },
    { token: 'string', foreground: '6EE7B7' },
    { token: 'number', foreground: 'FBBF24' },
    { token: 'operator', foreground: '22D3EE' },
    { token: 'identifier', foreground: 'F5F7FA' },
  ],
  colors: {
    'editor.background': '#F3F4F6',
    'editor.foreground': '#111827',
    'editorLineNumber.foreground': '#9CA3AF',
    'editorLineNumber.activeForeground': '#6B7280',
    'editor.selectionBackground': '#6366F140',
    'editor.lineHighlightBackground': '#FFFFFF80',
    'editorCursor.foreground': '#818CF8',
    'editorIndentGuide.background1': '#EEF0F4',
  },
};

self.MonacoEnvironment = {
  getWorker() {
    // SQL hover/completion workers: fall back to editor worker
    return new Worker(
      URL.createObjectURL(
        new Blob(
          [
            'self.onmessage = () => {};',
          ],
          { type: 'text/javascript' }
        )
      )
    );
  },
};

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onRun,
  readOnly = false,
  height = '100%',
}) => {
  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.());
    editor.focus();
  };

  return (
    <Editor
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      language="sql"
      theme="aiden-dark"
      height={height}
      beforeMount={(monaco) => monaco.editor.defineTheme('aiden-dark', AIDEN_THEME)}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'line',
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
      loading={
        <div className="flex items-center justify-center h-full w-full bg-background">
          <span className="text-xs text-text-muted font-mono">Loading editor…</span>
        </div>
      }
    />
  );
};
