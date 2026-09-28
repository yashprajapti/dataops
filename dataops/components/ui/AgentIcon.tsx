import { Sparkles, Database, BarChart3, Megaphone, Compass } from "lucide-react";
import type { Agent } from "@/lib/agents";

const MAP = { sparkles: Sparkles, database: Database, chart: BarChart3, megaphone: Megaphone, compass: Compass };

export function AgentIcon({ agent, size = 18, className }: { agent: Agent; size?: number; className?: string }) {
  const I = MAP[agent.icon];
  return <I size={size} className={className} style={{ color: agent.color }} />;
}

export function AgentBadge({ agent, size = 36 }: { agent: Agent; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-xl border"
      style={{ width: size, height: size, borderColor: agent.color + "40", background: `radial-gradient(circle at 30% 20%, ${agent.color}33, ${agent.color}0d 70%)` }}
    >
      <AgentIcon agent={agent} size={Math.round(size * 0.48)} />
    </span>
  );
}
