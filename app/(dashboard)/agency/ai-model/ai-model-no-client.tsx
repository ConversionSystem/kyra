import Link from 'next/link';
import { Cpu, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AiModelNoClient() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Cpu className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Model</h1>
          <p className="text-sm text-gray-500">Choose the AI brain powering your worker.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Your AI worker is still being set up. Once it&apos;s online you&apos;ll be able to choose your model here.
          </p>
          <Link href="/agency">
            <Button variant="outline" size="sm" className="gap-1">
              Back to Mission Control <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
