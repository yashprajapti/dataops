import Link from "next/link";
import { PageShell } from "@/components/landing/PageShell";
import { Markdown } from "@/components/Markdown";
import { DOCS } from "@/lib/content";

export const metadata = { title: "Docs — DataOps" };

export default function Docs() {
  return (
    <PageShell eyebrow="Documentation" title={<>Everything you need to <span className="text-grad">get answers faster</span></>} sub="Guides for uploading data, working with the five agents, SQL Studio and Anomaly Watch.">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav className="top-28 h-fit space-y-1 lg:sticky">
          {DOCS.map((d) => (
            <a key={d.id} href={`#${d.id}`} className="block rounded-lg px-3 py-2 text-sm text-mute transition hover:bg-white/5 hover:text-white">{d.title}</a>
          ))}
          <Link href="/demo" className="btn-primary mt-4 w-full">Open live demo</Link>
        </nav>
        <div className="space-y-6">
          {DOCS.map((d) => (
            <section key={d.id} id={d.id} className="card scroll-mt-28 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white">{d.title}</h2>
              <div className="mt-3"><Markdown text={d.body} /></div>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
