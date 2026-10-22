export type Mentor = {
  id: string;
  name: string;
  /** Functional areas the mentor works in (sheet "Domain"). */
  domains: string[];
  masterSector: string | null;
  sectors: string[];
  roles: string[];
  seniority: "Senior" | "Mid-career" | null;
  aiNative: boolean | null;
  builtAiProduct: boolean | null;
  aiSubDomain: string | null;
  aiTools: string[];
  tools: string[];
  mentorshipQuality: "Excellent" | "Good" | null;
  activities: number | null;
  city: string | null;
  /** Minutes east of UTC, used only to seed availability in the mentor's own evenings. */
  utcOffsetMin: number;
  profile: "rich" | "partial" | "thin";
  /** Fields the sheet leaves empty. The assistant is told these are UNKNOWN, not "none". */
  missing: string[];
};
