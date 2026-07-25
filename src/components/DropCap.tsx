/**
 * Drop-cap — the signature element of PATARA EDITORIAL.
 * Massive Greek letter that anchors every hero, set in iron-red EB Garamond.
 */
export function DropCap({
  letter,
  label,
}: {
  letter: string;
  label?: string;
}) {
  return (
    <div className="relative inline-block">
      <span className="dropcap-letter" aria-hidden="true">
        {letter}
      </span>
      {label && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 marginalia">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Dingbat row — section break ornament.
 * Three Greek letters spaced wide, like a manuscript pilcrow row.
 */
export function Dingbat({ glyphs = "ΛΥΚ" }: { glyphs?: string }) {
  return (
    <div className="dingbat py-8" aria-hidden="true">
      {glyphs.split("").join(" · ")}
    </div>
  );
}
