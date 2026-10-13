import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function AnalyticsLoading() {
  return <div className="space-y-6 mt-6" role="status" aria-label="Carregando análise">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 py-6 border-y border-border">{[0, 1, 2, 3].map((value) => <div key={value}><Skeleton className="h-9 w-20 mb-2" /><Skeleton className="h-3 w-28 max-w-full" /></div>)}</div>
    <Skeleton className="h-72 w-full" />
    <span className="sr-only">Carregando análise acadêmica.</span>
  </div>;
}

export function AnalyticsError({ reload }: { reload: () => void }) {
  return <Card className="mt-6">
    <div role="alert">
      <h2 className="font-serif text-xl text-ink font-semibold">Não foi possível carregar a análise</h2>
      <p className="text-sm text-graphite mt-2 mb-4">Confira sua conexão e tente novamente. Seus registros continuam salvos.</p>
    </div>
    <Button variant="outline" onClick={reload} icon={<RefreshCw size={15} />}>Tentar novamente</Button>
  </Card>;
}
