# 06 · Business Requirements Document (BRD)

| | |
|---|---|
| **Product** | DataOps — AI Data Analyst Platform |
| **Author** | Yash Prajapati |
| **Version** | 1.0 |
| **Status** | Released (MVP) |

## 1. Executive summary
Business teams depend on a small number of analysts for routine questions. DataOps provides a self-serve, AI-assisted analytics workspace that reduces time-to-insight from days to minutes while keeping data private and outputs explainable.

## 2. Business objectives
| ID | Objective | Success metric |
|---|---|---|
| BO-1 | Reduce time from raw file to first insight | < 60 seconds median |
| BO-2 | Reduce ad-hoc requests to the analytics team | −40% in 3 months (pilot teams) |
| BO-3 | Improve trust in data | ≥ 90 average quality score on reported datasets |
| BO-4 | Detect business incidents early | Anomalies surfaced same day |
| BO-5 | Convert free users to paid | 4% Starter → Pro conversion |

## 3. Scope
**In scope (MVP):** CSV upload, profiling, auto-clean, 5 AI agents, NL→SQL, dashboards, anomaly detection, executive reports, auth, plans UI.
**Out of scope:** live database connectors, team workspaces, scheduled email alerts, real payments, Excel (.xlsx) upload.

## 4. Stakeholders
| Stakeholder | Interest |
|---|---|
| Business users (ops, marketing, category managers) | Fast, understandable answers |
| Data analysts | Offload repetitive work, reusable SQL |
| Leadership | Reliable summaries, early warnings |
| IT / Security | Data privacy, no raw data to third parties |

## 5. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Users can sign up, log in and log out | Must |
| FR-02 | Users can try the product without signing up (demo) | Must |
| FR-03 | Users can upload a CSV up to 25 MB | Must |
| FR-04 | System detects column types automatically | Must |
| FR-05 | System computes a 0–100 quality score and lists issues with fixes | Must |
| FR-06 | Users can auto-clean a dataset into a new copy with a change log | Should |
| FR-07 | Users can ask questions in natural language (English/Hindi/Hinglish) | Must |
| FR-08 | System generates SQL, runs it and explains it | Must |
| FR-09 | System recommends and renders appropriate charts | Should |
| FR-10 | System flags anomalies with severity and likely cause | Should |
| FR-11 | Users can export results (CSV) and reports (PDF/Markdown) | Must |
| FR-12 | Users can edit their profile and view usage | Could |
| FR-13 | Product works without an AI API key | Must |

## 6. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR-1 | **Privacy:** raw rows never sent to the LLM or server |
| NFR-2 | **Performance:** typical query < 100 ms on 10k rows; page load < 3 s on 4G |
| NFR-3 | **Availability:** 99.9% (Vercel) |
| NFR-4 | **Accessibility:** keyboard navigable, colour-blind-safe chart palette, reduced-motion support |
| NFR-5 | **Responsive:** usable from 360 px mobile to 4K desktop |
| NFR-6 | **Cost:** runs on free tiers |

## 7. User stories & acceptance criteria
**US-1 — Upload data**
*As a business analyst, I want to upload a CSV so that I can analyse it without writing code.*
- Given a valid CSV with headers, when I drop it on Datasets, then it becomes the active dataset and a profile appears.
- Given a non-CSV file, I see a clear error message.

**US-2 — Trust the data**
*As an analyst, I want a quality score and a list of issues so that I know whether the data is fit for reporting.*
- Score, duplicates, missing values, outliers and messy labels are shown with recommended fixes.
- Auto-clean creates a new dataset and never modifies the original.

**US-3 — Ask a question**
*As an ops manager who doesn't know SQL, I want to ask "top 5 cities by revenue" and see the answer.*
- The SQL is shown, runs automatically, and results appear as table and chart.
- I can copy the SQL or open it in SQL Studio.

**US-4 — Get alerted**
*As a category manager, I want to be told when revenue behaves unusually so I can react the same day.*
- Days beyond the sensitivity threshold appear in the alert feed with % change and top driver.
- I can adjust sensitivity and baseline window.

**US-5 — Share with leadership**
*As an analyst, I want an executive report so that I can share findings quickly.*
- Report includes summary, insights, 3 recommendations, charts and data-quality section.
- I can save it as PDF.

## 8. Process flow (as-is vs to-be)
| Step | As-is | To-be with DataOps |
|---|---|---|
| Request | Email/Slack to analyst, waits in queue | User asks the agent directly |
| Data prep | Manual Excel cleaning (hours) | Profiling + auto-clean (seconds) |
| Analysis | Analyst writes SQL | NL → SQL, explained |
| Reporting | Manual slides | One-click executive report |
| Monitoring | Noticed days later | Anomaly Watch same day |

## 9. KPIs to track post-launch
Activation rate (uploaded a dataset in first session) · questions per active user per week · % answers followed by "Run" · average quality-score uplift after auto-clean · anomaly alerts acknowledged · Starter → Pro conversion · D30 retention.

## 10. Assumptions, risks & mitigations
| Risk | Mitigation |
|---|---|
| LLM gives a wrong answer | Always show SQL + explanation; local engine computes from real data; "verify" notice |
| Very large files crash the browser | 25 MB limit; roadmap: DuckDB-WASM |
| Browser storage cleared | Download/export options; roadmap: cloud storage |
| API quota exhausted | Automatic fallback to local engine |
