'use client';

import React from 'react';
import Editor from '@monaco-editor/react';

interface EditorComponentProps {
  code: string;
  language?: string;
  onChange?: (val: string | undefined) => void;
  readOnly?: boolean;
  height?: string;
}

export default function EditorComponent({
  code,
  language = 'cpp',
  onChange,
  readOnly = true,
  height = '100%',
}: EditorComponentProps) {
  return (
    <Editor
      height={height}
      language={language}
      value={code}
      onChange={onChange}
      theme="vs-dark"
      options={{
        readOnly: readOnly,
        minimap: { enabled: false },
        fontSize: 12,
        fontFamily: 'Consolas, Courier New, monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        padding: { top: 12 },
      }}
    />
  );
}
