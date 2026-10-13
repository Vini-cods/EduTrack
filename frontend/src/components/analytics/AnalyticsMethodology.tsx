export function AnalyticsMethodology({ methodology, timezone }: { methodology: string[]; timezone: string }) {
  return <details className="mt-6 rounded-lg border border-border bg-surface px-5 py-4">
    <summary className="cursor-pointer font-medium text-sm text-graphite">Como os números são calculados</summary>
    <ul className="mt-3 space-y-2 text-sm text-graphite list-disc pl-4">
      {methodology.map((item) => <li key={item}>{item}</li>)}
      <li>Datas agrupadas no fuso {timezone.replaceAll('_', ' ')}.</li>
    </ul>
  </details>;
}
