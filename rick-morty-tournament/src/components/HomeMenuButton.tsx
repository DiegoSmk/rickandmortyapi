import type { ButtonHTMLAttributes, ReactNode } from "react";

type HomeMenuButtonVariant = "portal" | "sunset";

interface HomeMenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: HomeMenuButtonVariant;
}

export function HomeMenuButton({
  children,
  className = "",
  type = "button",
  variant = "sunset",
  ...props
}: HomeMenuButtonProps) {
  const classes = ["menu-btn", `menu-btn-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
