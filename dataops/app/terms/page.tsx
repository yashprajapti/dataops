import { PageShell } from "@/components/landing/PageShell";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Terms of Service — DataOps" };

const BODY = `### Using DataOps
- You must provide accurate account information and keep your credentials secure.
- You are responsible for the data you upload and must have the right to analyse it.

### AI-generated output
- Agent answers are generated automatically and may contain mistakes. Verify important figures before acting on them.

### Plans & billing
- Starter is free. Paid plans renew automatically until cancelled; you can downgrade at any time.

### Liability
- DataOps is provided "as is" without warranties of any kind.

### Contact
hello@dataops.app`;

export default function Page() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" sub="Last updated: September 2026">
      <div className="card mx-auto max-w-3xl p-8"><Markdown text={BODY} /></div>
    </PageShell>
  );
}
