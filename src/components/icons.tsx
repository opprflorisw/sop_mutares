import type { SVGProps } from "react";

// Minimal inline icon set (stroke-based, 1.6px) — avoids an icon dependency.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const IconDashboard = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
export const IconFlow = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
);
export const IconChart = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>
);
export const IconFactory = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 21V9l6 4V9l6 4V5l6 4v12H3z" /><path d="M7 21v-4M12 21v-4M17 21v-4" /></svg>
);
export const IconBox = (p: IconProps) => (
  <svg {...base(p)}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
);
export const IconChecks = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 12l4 4 7-9" /><path d="M11 16l2 2 7-9" /></svg>
);
export const IconRadar = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l6-3" /></svg>
);
export const IconSparkles = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3z" /><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" /></svg>
);
export const IconFolder = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
);
export const IconUpload = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 16V4" /><path d="M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4v12" /><path d="M8 12l4 4 4-4" /><path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const IconSettings = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" /></svg>
);
export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8" /><path d="M17 14.5a6 6 0 0 1 4 5.5" /></svg>
);
export const IconLogout = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconArrowLeft = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
);
export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconSend = (p: IconProps) => (
  <svg {...base(p)}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
);
export const IconFile = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /></svg>
);
export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3l9 16H3l9-16z" /><path d="M12 10v4M12 17v.5" /></svg>
);
