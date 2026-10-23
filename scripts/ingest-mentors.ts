/**
 * npm run ingest -- "data/Mentor_Sample_50_Anonymised - Mentors.csv"   (also accepts .xlsx)
 * Cleans the raw sheet into data/mentors.json. Rules:
 *  - never add facts: unknown stays null / missing, it is not guessed
 *  - contact fields (Contact, Email, LinkedIn) are placeholders and are dropped; Company is an
 *    anonymised label ("Company 38") with no meaning to a student, so it is dropped too
 *  - duplicate Mentor IDs are merged (the fuller row wins) and reported
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
import type { Mentor } from "../src/lib/mentor-types";

const input = process.argv[2] ?? "data/Mentor_Sample_50_Anonymised - Mentors.csv";

// ---------- read ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function readRows(path: string): Record<string, string>[] {
  const grid: string[][] = /\.xlsx?$/i.test(path)
    ? (XLSX.utils.sheet_to_json(XLSX.readFile(path).Sheets[XLSX.readFile(path).SheetNames[0]], {
        header: 1,
        raw: false,
        defval: "",
      }) as string[][])
    : parseCsv(readFileSync(path, "utf8"));
  const header = grid[0].map((h) => h.trim());
  return grid.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ---------- normalisers ----------
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const EMPTY = new Set(["", "na", "null", "none", "notavailable", "nil", "undefined"]);
const clean = (v: string | undefined): string | null => {
  // keep newlines: several cells use them as list separators
  const t = (v ?? "").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
  return EMPTY.has(key(t)) || t === "-" ? null : t;
};
const bool = (v: string | undefined): boolean | null => {
  const t = key(clean(v) ?? "");
  if (["yes", "y", "true", "1"].includes(t)) return true;
  if (["no", "n", "false", "0"].includes(t)) return false;
  return null;
};
const dedupe = <T,>(a: T[]) => [...new Set(a)];
const SEP = /[,;\n|/]+/;
const PROTECT = "\u0001";
function splitList(v: string | undefined, protect: [RegExp, string][] = []): string[] {
  let t = clean(v);
  if (!t) return [];
  for (const [re, to] of protect) t = t.replace(re, to.replace(/\//g, PROTECT));
  return t
    .split(SEP)
    .map((x) => x.replace(new RegExp(PROTECT, "g"), "/").trim())
    .filter(Boolean);
}

const SECTOR_ALIASES: Record<string, string> = {
  quickcommerce: "Quick commerce", quickcomm: "Quick commerce",
  ecommerce: "E-commerce", ecom: "E-commerce", ecomm: "E-commerce",
  edtech: "Edtech", education: "Edtech",
  hrtech: "HR tech", sportstechg: "Sports tech", sportstech: "Sports tech",
  healthtech: "Healthtech", healthcare: "Healthtech", healthtechmedtech: "Healthtech", medtech: "Healthtech",
  saas: "SaaS", b2b: "B2B", d2c: "D2C", ai: "AI", deeptechai: "Deeptech/AI", fintech: "Fintech",
  logistics: "Logistics", deliverylogisitics: "Logistics",
  climatech: "Climate tech", climatetech: "Climate tech", climatetechgreentech: "Climate tech", greentech: "Climate tech",
  agritech: "Agritech", manufacturing: "Manufacturing", consulting: "Consulting", media: "Media",
  gaming: "Gaming", it: "IT", traveltech: "Travel tech", foodandbeverages: "Food & beverages",
  retail: "Retail", mobility: "Mobility", vc: "Venture capital", venturecapital: "Venture capital",
  taxation: "Taxation", insurance: "Insurance", employeebenefits: "Employee benefits",
  techinfoandinternet: "Tech, info & internet", freelance: "Freelance", accounting: "Accounting",
};
const SECTOR_PROTECT: [RegExp, string][] = [
  [/Edtech\/Education/gi, "Edtech"],
  [/Deeptech\/AI/gi, "Deeptech/AI"],
  [/Climatetech\/Greentech/gi, "Climate tech"],
  [/Delivery\/Logisitics/gi, "Logistics"],
  [/Healthtech\s*\/\s*Medtech/gi, "Healthtech"],
  [/Healthcare\/\s*health\s*tech/gi, "Healthtech"],
];
function sectors(v: string | undefined): string[] {
  return dedupe(
    splitList(v, SECTOR_PROTECT)
      .map((s) => SECTOR_ALIASES[key(s)] ?? (key(s) === "other" || EMPTY.has(key(s)) ? "" : s))
      .filter(Boolean),
  );
}
const masterSector = (v: string | undefined) => {
  const t = clean(v);
  return t ? (SECTOR_ALIASES[key(t)] ?? t) : null;
};

const BG = "Business Generalist (Founder's Office / Strategy & Ops)";
const ROLE_ALIASES: [RegExp, string][] = [
  [/product management/i, "Product Management"],
  [/venture capital/i, "Venture Capital"],
  [/^sales\/csm\/partnerships$|^sales\W+cs\W+partnership/i, "Sales / CSM / Partnerships"],
  [/ai and analytics/i, "AI & Analytics"],
  [/^growth$/i, "Growth"],
  [/category management/i, "Category Management"],
  [/^marketing$/i, "Marketing"],
  [/business generalist|founder'?s office/i, BG],
  [/perfomance marketing/i, "Performance Marketing"],
  [/digital markeitng/i, "Digital Marketing"],
  [/^product marketing manager$/i, "Product Marketing"],
];
const ROLE_PROTECT: [RegExp, string][] = [
  [/Business Generalist \(Founder's Office\/Strategy and Ops\/Chief of Staff\/EIR,etc\.\)/gi, "Business Generalist"],
  [/Sales\/CSM\/Partnerships/gi, "Sales/CSM/Partnerships"],
  [/Sales, CS, Partnership/gi, "Sales/CSM/Partnerships"],
];
function roles(v: string | undefined): string[] {
  return dedupe(
    splitList(v, ROLE_PROTECT).map((r) => {
      const hit = ROLE_ALIASES.find(([re]) => re.test(r));
      return hit ? hit[1] : r;
    }),
  );
}

const DOMAIN_ALIASES: Record<string, string> = {
  businessgeneralist: "Business Generalist", marketing: "Marketing", productmanagement: "Product Management",
  b2bsalesandpartnershipscsm: "B2B Sales & Partnerships", growth: "Growth", venturecapital: "Venture Capital",
  categorymanagement: "Category Management", ai: "AI", data: "Data", behavioural: "Behavioural",
};
const domains = (v: string | undefined) =>
  dedupe(
    splitList(v, [[/B2B sales and Partnerships\/CSM/gi, "B2B sales and Partnerships/CSM"]]).map(
      (d) => DOMAIN_ALIASES[key(d)] ?? d,
    ),
  );

const TOOL_ALIASES: Record<string, string> = {
  n8n: "n8n", make: "Make", zapier: "Zapier", notionai: "Notion AI", vercel: "Vercel", canva: "Canva",
  gamma: "Gamma", langflow: "Langflow", hubspot: "HubSpot", factorsai: "Factors.ai", googleads: "Google Ads",
  linkedinads: "LinkedIn ads",
};
const aiTools = (v: string | undefined) =>
  dedupe(
    splitList(v)
      .filter((t) => !["other", "yes", "no", "true", "false"].includes(key(t))) // stray flags in the tools column
      .map((t) => TOOL_ALIASES[key(t)] ?? t),
  );

const seniority = (v: string | undefined): Mentor["seniority"] => {
  const t = key(clean(v) ?? "");
  if (t === "senior") return "Senior";
  if (["midcareer", "midlevel"].includes(t)) return "Mid-career";
  return null;
};

const CITY: Record<string, { city: string; off: number }> = {
  bengaluru: { city: "Bengaluru", off: 330 }, bangalore: { city: "Bengaluru", off: 330 },
  bangaloreka: { city: "Bengaluru", off: 330 },
  blr: { city: "Bengaluru", off: 330 }, mumbai: { city: "Mumbai", off: 330 }, bombay: { city: "Mumbai", off: 330 },
  delhi: { city: "Delhi", off: 330 }, newdelhi: { city: "Delhi", off: 330 }, gurugram: { city: "Gurugram", off: 330 },
  noida: { city: "Noida", off: 330 }, pune: { city: "Pune", off: 330 },
  // assumption: a single zone per foreign location (no DST handling) - only used to seed slot times
  canada: { city: "Canada", off: -300 }, sanfrancisco: { city: "San Francisco", off: -480 },
};

function parseActivities(v: string | undefined): number | null {
  const m = (v ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

function toMentor(r: Record<string, string>): Mentor {
  const id = r["Mentor ID"].trim().toUpperCase();
  const num = id.replace(/\D/g, "");
  const city = CITY[key(r["City"] ?? "")];
  const quality = key(clean(r["Quality of Mentorship"]) ?? "");
  const tools = (
    [["Tableau", "Tableau"], ["Hubspot", "HubSpot"], ["Google Analytics", "Google Analytics"], ["Jira", "Jira"], ["Excel", "Excel"], ["Mixpanel", "Mixpanel"]] as const
  ).filter(([col]) => bool(r[col]) === true).map(([, label]) => label);

  const m: Mentor = {
    id,
    name: `Mentor ${num}`,
    domains: domains(r["Domain"]),
    masterSector: masterSector(r["Master Sector"]),
    sectors: sectors(r["Sectors of Expertise"]),
    roles: roles(r["Roles of Expertise"]),
    seniority: seniority(r["Seniority"]),
    aiNative: bool(r["AI Native"]),
    builtAiProduct: bool(r["Built AI Product/Automation/Workflow"]),
    aiSubDomain: clean(r["AI Sub Domain"]),
    aiTools: aiTools(r["AI Tools of Expertise"]),
    tools,
    mentorshipQuality: quality === "excellent" ? "Excellent" : quality === "good" ? "Good" : null,
    activities: parseActivities(r["Activities Participated"]),
    city: city?.city ?? null,
    utcOffsetMin: city?.off ?? 330,
    profile: "partial",
    missing: [],
  };
  const checks: [string, boolean][] = [
    ["sectors", m.sectors.length > 0],
    ["roles", m.roles.length > 0],
    ["seniority", m.seniority !== null],
    ["AI experience", m.aiNative !== null || m.builtAiProduct !== null || m.aiTools.length > 0 || !!m.aiSubDomain],
    ["mentorship quality", m.mentorshipQuality !== null],
  ];
  m.missing = checks.filter(([, ok]) => !ok).map(([n]) => n);
  const filled = checks.length - m.missing.length;
  m.profile = m.sectors.length === 0 && m.roles.length === 0 ? "thin" : filled >= 4 ? "rich" : "partial";
  return m;
}

const filledCount = (m: Mentor) => 5 - m.missing.length + m.sectors.length + m.roles.length;

// ---------- run ----------
const raw = readRows(input);
const byId = new Map<string, Mentor>();
const merged: { id: string; identical: boolean }[] = [];
const rawById = new Map<string, Record<string, string>[]>();
for (const r of raw) {
  const m = toMentor(r);
  (rawById.get(m.id) ?? rawById.set(m.id, []).get(m.id)!).push(r);
  const prev = byId.get(m.id);
  if (!prev) byId.set(m.id, m);
  else {
    merged.push({ id: m.id, identical: JSON.stringify(prev) === JSON.stringify(m) });
    if (filledCount(m) > filledCount(prev)) byId.set(m.id, m);
  }
}
const mentors = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

const report = {
  rowsRead: raw.length,
  uniqueMentors: mentors.length,
  duplicateRowsMerged: merged,
  droppedColumns: ["Contact", "Email", "LinkedIn (placeholders)", "Company (anonymised label)"],
  profileStrength: {
    rich: mentors.filter((m) => m.profile === "rich").length,
    partial: mentors.filter((m) => m.profile === "partial").length,
    thin: mentors.filter((m) => m.profile === "thin").map((m) => m.id),
  },
  fieldCoverage: {
    seniority: mentors.filter((m) => m.seniority).length,
    sectors: mentors.filter((m) => m.sectors.length).length,
    roles: mentors.filter((m) => m.roles.length).length,
    aiKnown: mentors.filter((m) => !m.missing.includes("AI experience")).length,
    mentorshipQuality: mentors.filter((m) => m.mentorshipQuality).length,
  },
};

writeFileSync(
  "data/mentors.json",
  JSON.stringify({ source: input.split("/").pop(), ingestedAt: new Date().toISOString().slice(0, 10), report, mentors }, null, 2),
);
console.log(JSON.stringify(report, null, 2));
