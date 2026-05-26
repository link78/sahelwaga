export default function DashboardHome() {
  const kpis = [
    { label: 'Active suppliers', value: '—', phase: 'Phase 1' },
    { label: 'Active products', value: '—', phase: 'Phase 1' },
    { label: 'Open POs to India', value: '—', phase: 'Phase 2' },
    { label: 'Shipments in transit', value: '—', phase: 'Phase 2' },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Overview</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Phase 0 scaffold — KPI feeds will be wired in Phase 1 (suppliers/products) and Phase 2
        (orders/imports).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-brand-neutral-100 bg-white p-5 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-brand-neutral-500">{k.label}</div>
            <div className="mt-2 font-serif text-3xl text-brand-neutral-900">{k.value}</div>
            <div className="mt-1 text-xs text-brand-blue-600">{k.phase}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
