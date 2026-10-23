/** Logo mark + deterministic avatar. Avatars are initials on a brand-harmonious gradient, never stock photos or invented faces. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lm-g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8374ff" /><stop offset=".55" stopColor="#5446e6" /><stop offset="1" stopColor="#a56cf5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lm-g)" />
      <rect x=".5" y=".5" width="31" height="31" rx="8.5" stroke="#fff" strokeOpacity=".28" />
      <circle cx="12.2" cy="16" r="5.2" stroke="#fff" strokeWidth="2.2" />
      <circle cx="19.8" cy="16" r="5.2" stroke="#fff" strokeOpacity=".7" strokeWidth="2.2" />
    </svg>
  );
}

export function Wordmark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`text-[0.95rem] font-semibold tracking-[-0.02em] whitespace-nowrap ${compact ? "hidden sm:inline" : ""}`}>Mentor Connect</span>
    </span>
  );
}

const TONES = [
  ["#7062f7", "#4c3fdc"], ["#3b82f6", "#4f46e5"], ["#a56cf5", "#7c3aed"],
  ["#ec6aa8", "#a855f7"], ["#14b8a6", "#3b82f6"], ["#f59e5b", "#ec6a8d"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, seed, size = 40, round = false }: { name: string; seed?: string; size?: number; round?: boolean }) {
  const [a, b] = TONES[hash(seed ?? name) % TONES.length];
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return (
    <span aria-hidden className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, borderRadius: round ? 999 : size * 0.3, background: `linear-gradient(145deg, ${a}, ${b})` }}>
      {initials}
    </span>
  );
}
