/**
 * Lycia rock-tomb silhouette — a small SVG line-art mark used as a
 * decorative anchor on hero and section dividers. Polis-Labs vibe.
 */
export function LyciaTomb({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 260"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* pediment */}
      <path d="M30 70 L100 20 L170 70 L165 75 L100 28 L35 75 Z" />
      <line x1="35" y1="75" x2="165" y2="75" />
      {/* upper frieze (dentils) */}
      <line x1="38" y1="82" x2="162" y2="82" />
      {[44, 56, 68, 80, 92, 104, 116, 128, 140, 152].map((x) => (
        <line key={x} x1={x} y1="82" x2={x} y2="90" />
      ))}
      <line x1="38" y1="90" x2="162" y2="90" />
      {/* main wood-beam facade lines */}
      <line x1="42" y1="96" x2="158" y2="96" />
      <line x1="42" y1="104" x2="158" y2="104" />
      {/* columns */}
      <line x1="60" y1="104" x2="60" y2="220" />
      <line x1="100" y1="104" x2="100" y2="220" />
      <line x1="140" y1="104" x2="140" y2="220" />
      {/* doorway */}
      <rect x="78" y="160" width="44" height="60" />
      <line x1="78" y1="175" x2="122" y2="175" />
      {/* base */}
      <line x1="42" y1="220" x2="158" y2="220" />
      <line x1="38" y1="228" x2="162" y2="228" />
      <line x1="34" y1="236" x2="166" y2="236" />
    </svg>
  );
}

/**
 * Lycia column — simpler decorative element.
 */
export function LyciaColumn({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 220"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      {/* capital */}
      <rect x="6" y="10" width="48" height="6" />
      <rect x="10" y="16" width="40" height="10" />
      {/* shaft with flutes */}
      <line x1="14" y1="26" x2="14" y2="194" />
      <line x1="22" y1="26" x2="22" y2="194" />
      <line x1="30" y1="26" x2="30" y2="194" />
      <line x1="38" y1="26" x2="38" y2="194" />
      <line x1="46" y1="26" x2="46" y2="194" />
      <line x1="12" y1="26" x2="48" y2="26" />
      <line x1="12" y1="194" x2="48" y2="194" />
      {/* base */}
      <rect x="8" y="194" width="44" height="6" />
      <rect x="4" y="200" width="52" height="10" />
    </svg>
  );
}
