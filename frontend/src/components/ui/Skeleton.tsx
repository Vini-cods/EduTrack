import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Bloco de skeleton genérico — combine para montar o formato do conteúdo real. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-md ${className}`} />
);

/** Skeleton pronto para um card de estatística (usado no Dashboard). */
export const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-16" />
  </div>
);

/** Skeleton pronto para uma linha de lista (tarefa, disciplina, nota...). */
export const RowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4">
    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);
