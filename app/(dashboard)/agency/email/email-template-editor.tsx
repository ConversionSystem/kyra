'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Save, Sparkles, Send, Loader2, Eye, Code, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface StepData {
  id: string;
  subject: string;
  preview_text: string;
  html_body: string;
  step_type: string;
}

interface EmailTemplateEditorProps {
  step: StepData;
  onSave: (updates: { subject?: string; preview_text?: string; html_body?: string }) => void;
  onAiWrite: () => void;
  aiWriting: boolean;
  onTestSend: () => void;
  testSending: boolean;
}

const MERGE_TAGS = [
  { tag: '{{contact_name}}', label: 'Contact Name' },
  { tag: '{{business_name}}', label: 'Business Name' },
  { tag: '{{agent_name}}', label: 'Agent Name' },
];

// ─── Component ──────────────────────────────────────────────────────────

export function EmailTemplateEditor({
  step,
  onSave,
  onAiWrite,
  aiWriting,
  onTestSend,
  testSending,
}: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState(step.subject || '');
  const [previewText, setPreviewText] = useState(step.preview_text || '');
  const [htmlBody, setHtmlBody] = useState(step.html_body || '');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((field: string, value: string) => {
    setDirty(true);
    switch (field) {
      case 'subject': setSubject(value); break;
      case 'preview_text': setPreviewText(value); break;
      case 'html_body': setHtmlBody(value); break;
    }
  }, []);

  const handleSave = () => {
    onSave({ subject, preview_text: previewText, html_body: htmlBody });
    setDirty(false);
  };

  const insertMergeTag = (tag: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = htmlBody.slice(0, start) + tag + htmlBody.slice(end);
    setHtmlBody(newValue);
    setDirty(true);

    // Restore cursor position after tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 0);
  };

  // Render preview with merge tags replaced
  const renderPreview = () => {
    return htmlBody
      .replace(/\{\{contact_name\}\}/g, '<strong>John Smith</strong>')
      .replace(/\{\{business_name\}\}/g, '<strong>Acme Corp</strong>')
      .replace(/\{\{agent_name\}\}/g, '<strong>Sarah AI</strong>');
  };

  // Update local state when AI generates new content
  const prevStepRef = useRef(step);
  if (prevStepRef.current !== step) {
    prevStepRef.current = step;
    if (step.subject !== subject) setSubject(step.subject || '');
    if (step.preview_text !== previewText) setPreviewText(step.preview_text || '');
    if (step.html_body !== htmlBody) setHtmlBody(step.html_body || '');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Email Editor</h3>
          {dirty && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAiWrite}
            disabled={aiWriting}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            {aiWriting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Write with AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTestSend}
            disabled={testSending || !subject || !htmlBody}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            {testSending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <Send className="h-3.5 w-3.5 mr-1" />}
            Test Send
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Subject + Preview Text */}
      <div className="px-4 py-3 space-y-3 border-b border-gray-100">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder="Enter email subject..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Preview Text</label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => handleChange('preview_text', e.target.value)}
            placeholder="Text shown in inbox preview..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Merge Tags + View Toggle */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 mr-1">Merge tags:</span>
          {MERGE_TAGS.map(({ tag, label }) => (
            <button
              key={tag}
              onClick={() => insertMergeTag(tag)}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[11px] font-mono hover:bg-indigo-100 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('edit')}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
              viewMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Code className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
              viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Body Editor / Preview */}
      <div className="min-h-[400px]">
        {viewMode === 'edit' ? (
          <textarea
            ref={bodyRef}
            value={htmlBody}
            onChange={(e) => handleChange('html_body', e.target.value)}
            placeholder="Write your email HTML here... Or click 'Write with AI' to generate content automatically."
            className="w-full h-[400px] px-4 py-3 text-sm font-mono text-gray-700 resize-none focus:outline-none border-0"
            spellCheck={false}
          />
        ) : (
          <div className="p-6 bg-gray-50 min-h-[400px]">
            <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Email preview header */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-500 mb-0.5">Subject</div>
                <div className="text-sm font-semibold text-gray-900">
                  {subject || '(No subject)'}
                </div>
                {previewText && (
                  <div className="text-xs text-gray-400 mt-0.5">{previewText}</div>
                )}
              </div>
              {/* Email body */}
              <div
                className="px-5 py-4 text-sm text-gray-700 [&_a]:text-indigo-600 [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal"
                dangerouslySetInnerHTML={{
                  __html: renderPreview() || '<p style="color:#9ca3af;">No content yet. Click "Write with AI" or start editing.</p>',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
