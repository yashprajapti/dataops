import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";

const T = [
  { n: "Ananya Iyer", r: "Senior Data Analyst, Kiranakart", s: "Ananya", q: "The Cleaner agent caught 400 duplicate orders our pipeline had been double-counting for months. That one find paid for the year." },
  { n: "Rahul Mehta", r: "BI Lead, Vertex Mart", s: "RahulM", q: "I ask in Hinglish, it gives me SQL I’d actually commit. My team’s ad-hoc request queue dropped by half in two weeks." },
  { n: "Priya Nair", r: "Growth Manager, Monsoon Labs", s: "PriyaN", q: "Marketing agent’s ROAS table made our budget meeting a 10-minute conversation. We moved 20% of spend and CAC fell 18%." },
  { n: "Daniel Brooks", r: "Head of Analytics, Northwind", s: "Daniel", q: "Anomaly Watch pinged us about a checkout outage before support did. It’s the first alerting tool my team didn’t mute." },
  { n: "Sneha Kulkarni", r: "Product Analyst, Nimbus Pay", s: "SnehaK", q: "Upload, ask, done. I built a stakeholder dashboard layout from the Viz agent and rebuilt it in Power BI in an hour." },
  { n: "Arjun Desai", r: "Operations Manager, Orbit Logistics", s: "ArjunD", q: "I’m not a SQL person. Now I don’t have to be — I get the query, the chart and a plain-English explanation." },
  { n: "Fatima Sheikh", r: "Data Science Intern, Quantix", s: "FatimaS", q: "The explained SQL taught me more GROUP BY and window functions than my whole semester. Genuinely a learning tool too." },
  { n: "Karan Malhotra", r: "Founder, Saffron Retail", s: "KaranM", q: "The Advisor’s executive summary is what I forward to investors every month. Clear numbers, three actions, no fluff." },
  { n: "Emily Carter", r: "Analytics Engineer, Brightlane", s: "EmilyC", q: "Profiling used to be a notebook I rewrote every project. Now it’s a drag-and-drop and a quality score I can defend." },
  { n: "Vikram Joshi", r: "Category Manager, Helio Foods", s: "VikramJ", q: "Found that Dairy in Pune had the fastest AOV growth — we doubled assortment there and it became our best-performing hub." },
];

function Card({ t }: { t: (typeof T)[number] }) {
  return (
    <figure className="group w-[340px] shrink-0 rounded-2xl border border-white/[0.07] bg-ink-850/80 p-5 transition-colors duration-300 hover:border-lime/30 hover:bg-ink-800 sm:w-[380px]">
      <div className="flex gap-0.5 text-amber">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} fill="currentColor" />)}
      </div>
      <blockquote className="mt-3 text-[14px] leading-relaxed text-white/80">“{t.q}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar seed={t.s} name={t.n} className="h-10 w-10 border border-white/10" />
        <div>
          <div className="text-sm font-medium text-white">{t.n}</div>
          <div className="text-xs text-mute">{t.r}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  const row1 = T.slice(0, 5);
  const row2 = T.slice(5);
  return (
    <section className="overflow-hidden py-28">
      <div className="container-x">
        <SectionHeading eyebrow="Wall of love" title={<>Analysts <span className="text-grad">can’t stop</span> talking about it</>} />
      </div>
      <div className="mask-x mt-14 space-y-4">
        <div className="group flex w-max animate-marquee gap-4 pr-4 hover:[animation-play-state:paused]">
          {[...row1, ...row1].map((t, i) => <Card key={i} t={t} />)}
        </div>
        <div className="group flex w-max animate-marquee-rev gap-4 pr-4 hover:[animation-play-state:paused]">
          {[...row2, ...row2].map((t, i) => <Card key={i} t={t} />)}
        </div>
      </div>
    </section>
  );
}
