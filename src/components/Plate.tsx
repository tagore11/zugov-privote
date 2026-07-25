import Image from "next/image";

/**
 * Archaeological plate — figure with hairline border and italic Latin caption.
 * Inspired by 19th-century field journal illustrations and museum catalog plates.
 */
export function Plate({
  src,
  alt,
  num,
  caption,
  ratio = "portrait",
  className = "",
}: {
  src: string;
  alt: string;
  num: string; // e.g. "PLATE I"
  caption: string;
  ratio?: "portrait" | "wide" | "square";
  className?: string;
}) {
  const aspect =
    ratio === "wide"
      ? "aspect-[16/10]"
      : ratio === "square"
      ? "aspect-square"
      : "aspect-[5/7]";

  return (
    <figure className={`plate ${className}`}>
      <div className={`relative ${aspect} bg-canvas`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 480px, 90vw"
          className="object-cover"
          style={{ filter: "saturate(0.85) contrast(1.05)" }}
        />
        <span className="absolute top-3 left-3 plate-num bg-surface/85 px-2 py-1">
          {num}
        </span>
      </div>
      <figcaption className="plate-caption">{caption}</figcaption>
    </figure>
  );
}
