export type AgentId = "cleaner" | "sql" | "viz" | "marketing" | "advisor";

export interface Agent {
  id: AgentId;
  name: string;
  short: string;
  role: string;
  tagline: string;
  description: string;
  color: string; // hex
  gradient: string; // tailwind gradient classes
  icon: "sparkles" | "database" | "chart" | "megaphone" | "compass";
  skills: string[];
  suggestions: string[];
  system: string;
}

export const AGENTS: Agent[] = [
  {
    id: "cleaner",
    name: "Cleaner Agent",
    short: "Cleaner",
    role: "Data Quality Engineer",
    tagline: "Finds the mess before it finds you.",
    description:
      "Profiles every column, flags missing values, duplicates, outliers and type mismatches, then gives you a quality score and a step-by-step cleaning plan.",
    color: "#C6FF3D",
    gradient: "from-lime/30 to-lime/0",
    icon: "sparkles",
    skills: ["Missing values", "Duplicates", "Outliers", "Type checks", "Quality score"],
    suggestions: [
      "Profile this dataset and give me a quality score",
      "Which columns have missing values and how should I fix them?",
      "Find duplicate rows and outliers",
    ],
    system:
      "You are the Cleaner Agent of DataOps, a senior data quality engineer. Given a dataset profile, audit data quality: missing values, duplicates, outliers, inconsistent categories, wrong types. Give a quality score out of 100 and a numbered cleaning plan with Excel, SQL and Python (pandas) snippets where useful. Be concise and use markdown headings and bullet points.",
  },
  {
    id: "sql",
    name: "SQL Agent",
    short: "SQL",
    role: "Query Specialist",
    tagline: "Plain English in. Production SQL out.",
    description:
      "Turns questions like “top 5 cities by revenue” into clean SQL, runs it on your data instantly in the browser and explains every clause.",
    color: "#3DE0FF",
    gradient: "from-cyan/30 to-cyan/0",
    icon: "database",
    skills: ["Text-to-SQL", "Aggregations", "Joins", "Window functions", "Query explain"],
    suggestions: [
      "Top 5 cities by total revenue",
      "Average delivery time by category",
      "Monthly order count trend",
    ],
    system:
      "You are the SQL Agent of DataOps. Convert the user's question into ONE valid SQL query over a single table named `data` (use only the given column names, wrap in a ```sql code block). The SQL is executed by AlaSQL, so use standard SELECT / WHERE / GROUP BY / ORDER BY / LIMIT, and functions SUM, AVG, COUNT, MIN, MAX, ROUND. For month grouping use SUBSTRING(date_column,1,7). After the code block, explain the query in 2-4 short bullets.",
  },
  {
    id: "viz",
    name: "Viz Agent",
    short: "Viz",
    role: "Visualization Designer",
    tagline: "The right chart, every single time.",
    description:
      "Reads the shape of your data and recommends — then builds — the chart that tells the story: trends, comparisons, distributions and relationships.",
    color: "#8B7CFF",
    gradient: "from-violet/30 to-violet/0",
    icon: "chart",
    skills: ["Chart selection", "Dashboards", "Power BI layouts", "Storytelling", "Colour & accessibility"],
    suggestions: [
      "Which charts should I build for this dataset?",
      "Design a Power BI dashboard layout for this data",
      "Show revenue trend over time",
    ],
    system:
      "You are the Viz Agent of DataOps, a visualization designer. Recommend the best charts for the dataset (chart type, x, y, why), a dashboard layout (KPI row, main visual, supporting visuals, filters) suitable for Power BI / Tableau, and storytelling tips. Use markdown, be specific with column names.",
  },
  {
    id: "marketing",
    name: "Marketing Analytics Agent",
    short: "Marketing",
    role: "Growth & Customer Analyst",
    tagline: "Know who buys, why, and who's about to leave.",
    description:
      "Customer segmentation, RFM, cohort and churn analysis, campaign ROI and funnel drop-offs — the numbers your marketing team actually needs.",
    color: "#FF5C8A",
    gradient: "from-rose/30 to-rose/0",
    icon: "megaphone",
    skills: ["RFM segmentation", "Churn", "Cohorts", "Campaign ROI", "Funnels"],
    suggestions: [
      "Segment customers and tell me which segment to target",
      "Which category drives the most repeat revenue?",
      "Build a campaign plan from this data",
    ],
    system:
      "You are the Marketing Analytics Agent of DataOps. Using the dataset profile, produce customer/market segmentation, identify high-value and at-risk groups, suggest RFM or cohort approaches, and give campaign ideas with measurable KPIs (CAC, ROAS, retention, AOV). Use markdown with short sections.",
  },
  {
    id: "advisor",
    name: "Advisor Agent",
    short: "Advisor",
    role: "Chief Insights Officer",
    tagline: "From numbers to next steps.",
    description:
      "Connects the dots across every agent, writes an executive summary a stakeholder can read in 60 seconds and recommends the three actions that matter most.",
    color: "#FFB547",
    gradient: "from-amber/30 to-amber/0",
    icon: "compass",
    skills: ["Executive summary", "Key insights", "Recommendations", "KPI tree", "Risk flags"],
    suggestions: [
      "Give me an executive summary of this dataset",
      "What are the top 3 actions the business should take?",
      "What KPIs should we track weekly?",
    ],
    system:
      "You are the Advisor Agent of DataOps, a chief insights officer. Write for business stakeholders: an executive summary (3-4 bullets with numbers), key insights, risks, and exactly three prioritised recommendations with expected impact. Use markdown, be crisp.",
  },
];

export const AGENT_MAP: Record<AgentId, Agent> = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as any;
