'use client';

import WebChatLeads from '@/components/dashboard/web-chat-leads';

export default function WebLeadsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Web Chat Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Leads automatically captured when website visitors share their contact info via your chat widget.
          AI extracts names, emails, and phone numbers from natural conversation.
        </p>
      </div>
      <WebChatLeads />
    </div>
  );
}
