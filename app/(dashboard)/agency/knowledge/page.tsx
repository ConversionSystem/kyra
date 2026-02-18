import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { BookOpen, Upload, Globe, FileText } from 'lucide-react';

export default async function KnowledgeBasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Train your clients&apos; AI employees with business-specific knowledge
          </p>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-emerald-50 rounded-2xl mb-6">
          <BookOpen className="h-12 w-12 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Knowledge Base Coming Soon</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Upload documents, FAQs, and business information. Your clients&apos; AI employees will use
          this knowledge to answer customer questions accurately.
        </p>

        {/* Preview of capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <Upload className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Upload Documents</p>
            <p className="text-xs text-gray-500 mt-1">PDFs, text files, training manuals</p>
          </div>
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <Globe className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Website Import</p>
            <p className="text-xs text-gray-500 mt-1">Crawl client websites for FAQs &amp; info</p>
          </div>
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <FileText className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Per-Client Knowledge</p>
            <p className="text-xs text-gray-500 mt-1">Each client gets their own knowledge base</p>
          </div>
        </div>
      </div>
    </div>
  );
}
