import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/landing/PageShell";
import { POSTS } from "@/lib/content";

export const metadata = { title: "Blog — DataOps" };

export default function Blog() {
  const [first, ...rest] = POSTS;
  return (
    <PageShell eyebrow="Blog" title={<>Notes on data, AI and <span className="text-grad">better decisions</span></>} sub="Product updates, engineering deep-dives and practical analytics guides.">
      <Link href={`/blog/${first.slug}`} className="border-glow group block rounded-3xl bg-ink-850 p-8 sm:p-10">
        <span className="chip">{first.tag}</span>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white group-hover:text-lime">{first.title}</h2>
        <p className="mt-3 max-w-2xl text-mute">{first.excerpt}</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-mute">{new Date(first.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {first.read} read <ArrowRight size={14} className="ml-2 text-lime transition group-hover:translate-x-1" /></div>
      </Link>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {rest.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="card group flex flex-col p-6 transition hover:border-white/15">
            <span className="chip w-fit">{p.tag}</span>
            <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-lime">{p.title}</h3>
            <p className="mt-2 flex-1 text-sm text-mute">{p.excerpt}</p>
            <div className="mt-5 text-xs text-mute">{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.read} read</div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
