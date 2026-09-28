import { PageShell } from "@/components/landing/PageShell";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Privacy Policy — DataOps" };

const BODY = `### What we collect
- **Account details** you provide: name, email, role.
- **Usage data**: number of questions asked and features used, to improve the product.

### Your data files
- CSV files are parsed and analysed **in your browser**.
- If you have an account, your datasets, chats and settings are saved to your private workspace in our database, protected by row-level security so only you can read them. Demo workspaces stay in your browser only.
- Raw rows are **never** sent to the AI model.
- When you chat with an agent, a compact statistical profile (column names, types, counts, averages, top categories) is sent to the AI provider to generate an answer.

### Storage
- You can delete all saved datasets, chats and settings anytime from **Settings → Reset workspace**.

### Contact
Questions? Email hello@dataops.app.`;

export default function Page() {
  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" sub="Last updated: September 2026">
      <div className="card mx-auto max-w-3xl p-8"><Markdown text={BODY} /></div>
    </PageShell>
  );
}
