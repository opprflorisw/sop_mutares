// ============================================================
// Company branding — the per-project company logo shown in the tool's
// top-left. Stored client-side (localStorage) keyed by project so each
// portfolio company carries its own mark. Editable from Settings.
// ============================================================
import { useEffect, useState } from "react";

const KEY = (pid: string) => `sop_company_logo_${pid}`;
const EVENT = "sop-branding";

export function getCompanyLogo(pid: string): string | null {
  try {
    return localStorage.getItem(KEY(pid));
  } catch {
    return null;
  }
}

export function setCompanyLogo(pid: string, dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(KEY(pid), dataUrl);
    else localStorage.removeItem(KEY(pid));
  } catch {
    /* ignore quota / private-mode errors */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pid }));
}

/** Reactive read of a project's company logo — updates when changed from Settings. */
export function useCompanyLogo(pid: string | undefined): string | null {
  const [logo, setLogo] = useState<string | null>(() => (pid ? getCompanyLogo(pid) : null));
  useEffect(() => {
    if (!pid) return;
    const sync = () => setLogo(getCompanyLogo(pid));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [pid]);
  return logo;
}
