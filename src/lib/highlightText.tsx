import React from "react";

const MODAL_PATTERNS: Array<{
  regex: RegExp;
  category: "Exception" | "Prohibition" | "Obligation" | "Permission";
  colorClass: string;
  label: string;
}> = [
  {
    regex: /\b(?:undtagen|undtagelse|fritaget|fritages|uanset|afvige|dispensation|notwithstanding|except(?:ed)?|by\s+way\s+of\s+derogation|derogation|waiver)\b/gi,
    category: "Exception",
    colorClass: "bg-[#ef4444]/25 text-[#fca5a5] border border-[#ef4444]/40 font-bold px-1 rounded",
    label: "Undtagelse / Exception",
  },
  {
    regex: /\b(?:forbudt|må\s+ikke|ikke\s+tilladt|prohibited|shall\s+not|must\s+not|not\s+permitted)\b/gi,
    category: "Prohibition",
    colorClass: "bg-[#f43f5e]/25 text-[#fda4af] border border-[#f43f5e]/40 font-bold px-1 rounded",
    label: "Forbud / Prohibition",
  },
  {
    regex: /\b(?:skal|pligtig|forpligtet|krav|påkrævet|shall|must|required|obligation|duty|mandatory|compulsory)\b/gi,
    category: "Obligation",
    colorClass: "bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/35 font-bold px-1 rounded",
    label: "Forpligtelse / Obligation",
  },
  {
    regex: /\b(?:kan|tilladt|bemyndiget|hjemmel|tilladelse|may|permitted|allowed|authorised|authorized|entitled)\b/gi,
    category: "Permission",
    colorClass: "bg-[#10b981]/20 text-[#6ee7b7] border border-[#10b981]/35 font-bold px-1 rounded",
    label: "Tilladelse / Permission",
  },
];

// Unified regex combining all keywords
const COMBINED_REGEX = new RegExp(
  MODAL_PATTERNS.map((p) => `(${p.regex.source})`).join("|"),
  "gi"
);

/**
 * Highlights legal modal keywords (Obligation, Exception, Prohibition, Permission) in statutory text.
 */
export function highlightModalKeywords(text: string): React.ReactNode {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(COMBINED_REGEX.source, COMBINED_REGEX.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const matchedText = match[0];

    // Push plain text before match
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    // Determine category
    let matchedPattern = MODAL_PATTERNS.find((p) => {
      const singleTest = new RegExp(`^${p.regex.source}$`, "i");
      return singleTest.test(matchedText);
    });

    if (!matchedPattern) {
      // Fallback matching
      for (const p of MODAL_PATTERNS) {
        const re = new RegExp(p.regex.source, "i");
        if (re.test(matchedText)) {
          matchedPattern = p;
          break;
        }
      }
    }

    const colorClass = matchedPattern ? matchedPattern.colorClass : "bg-[#fbbf24]/20 text-[#fcd34d] font-bold px-1 rounded";
    const label = matchedPattern ? matchedPattern.label : "Modalitet";

    parts.push(
      <mark
        key={`match-${matchStart}`}
        className={`${colorClass} inline-block not-italic transition-all hover:scale-105`}
        title={label}
      >
        {matchedText}
      </mark>
    );

    lastIndex = matchEnd;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}
