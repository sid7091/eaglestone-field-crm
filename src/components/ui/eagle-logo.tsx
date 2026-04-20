interface EagleLogoProps {
  variant?: "dark" | "cream";
  className?: string;
  height?: number;
}

export default function EagleLogo({ variant = "cream", className = "", height = 40 }: EagleLogoProps) {
  const src = variant === "cream"
    ? "/eagle-stone-logo-cream.png"
    : "/eagle-stone-logo-brown.png";

  return (
    <img
      src={src}
      alt="Eagle Stone"
      height={height}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
