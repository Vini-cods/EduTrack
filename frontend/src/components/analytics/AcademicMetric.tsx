interface AcademicMetricProps {
  value: string;
  label: string;
  detail: string;
  alert?: boolean;
}

export function AcademicMetric({ value, label, detail, alert = false }: AcademicMetricProps) {
  return <div className="min-w-0">
    <p className={`font-serif text-3xl sm:text-4xl font-semibold tabular-nums ${alert ? 'text-danger' : 'text-ink'}`}>{value}</p>
    <p className="text-sm font-medium text-ink mt-1">{label}</p>
    <p className="text-xs text-muted mt-1 leading-relaxed">{detail}</p>
  </div>;
}
