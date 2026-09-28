import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageShell({ eyebrow, title, sub, children }: { eyebrow: string; title: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <main className="relative overflow-x-clip">
      <Navbar />
      <section className="relative pb-12 pt-36">
        <div className="bg-grid mask-radial pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-cyan/10 blur-[120px]" />
        <div className="container-x text-center">
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-lime" />{eyebrow}</span>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">{title}</h1>
          {sub && <p className="mx-auto mt-5 max-w-2xl text-mute sm:text-lg">{sub}</p>}
        </div>
      </section>
      <div className="container-x pb-24">{children}</div>
      <Footer />
    </main>
  );
}
