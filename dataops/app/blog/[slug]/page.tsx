import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Markdown } from "@/components/Markdown";
import { POSTS } from "@/lib/content";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = POSTS.find((x) => x.slug === params.slug);
  return { title: p ? `${p.title} — DataOps` : "Blog — DataOps", description: p?.excerpt };
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const p = POSTS.find((x) => x.slug === params.slug);
  if (!p) notFound();
  return (
    <main className="relative overflow-x-clip">
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-36 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-white"><ArrowLeft size={14} /> All posts</Link>
        <span className="chip mt-8">{p.tag}</span>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">{p.title}</h1>
        <p className="mt-4 text-sm text-mute">{p.author} · {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {p.read} read</p>
        <div className="mt-10 text-[16px] [&_.prose-ai]:text-[16px] [&_h3]:!mt-8 [&_h3]:!text-xl [&_p]:!leading-8">
          <Markdown text={p.body} />
        </div>
        <div className="card mt-14 flex flex-col items-center gap-4 p-8 text-center">
          <h3 className="text-xl font-semibold text-white">Try it on real data</h3>
          <Link href="/demo" className="btn-primary">Open the live demo</Link>
        </div>
      </article>
      <Footer />
    </main>
  );
}
