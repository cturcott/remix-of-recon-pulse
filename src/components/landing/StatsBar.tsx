const stats = [
  { value: "40%", label: "Faster time-to-line" },
  { value: "$320", label: "Avg holding cost saved per vehicle" },
  { value: "2.4x", label: "More throughput capacity" },
  { value: "100%", label: "Real-time recon visibility" },
];

export default function StatsBar() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(173,80%,30%)] to-[hsl(190,80%,35%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl lg:text-4xl font-extrabold mb-1" style={{ color: "hsl(0, 0%, 100%)" }}>
                {s.value}
              </p>
              <p className="text-sm" style={{ color: "hsl(0, 0%, 100%, 0.8)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
