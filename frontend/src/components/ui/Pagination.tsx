import { Button } from './Button';

interface PaginationProps { page: number; total: number; pageSize: number; loading: boolean; onPage: (page: number) => void }

export function Pagination({ page, total, pageSize, loading, onPage }: PaginationProps) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  return <nav aria-label="Paginação" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-graphite">
    <p role="status">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total} · Página {page + 1} de {pages}</p>
    <div className="flex gap-2"><Button className="min-h-11" variant="outline" disabled={loading || page === 0} onClick={() => onPage(page - 1)}>Anterior</Button><Button className="min-h-11" variant="outline" disabled={loading || page + 1 >= pages} onClick={() => onPage(page + 1)}>Próxima</Button></div>
  </nav>;
}
