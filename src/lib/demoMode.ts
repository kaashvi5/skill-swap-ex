import { useEffect, useState } from "react";

const KEY = "ss-demo-data";
const EVENT = "ss-demo-data-changed";

export const isDemoEnabled = () => localStorage.getItem(KEY) !== "0";

export const setDemoEnabled = (on: boolean) => {
  localStorage.setItem(KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
};

/** Reactive read of the "show sample profiles" preference. */
export const useDemoMode = () => {
  const [on, setOn] = useState(isDemoEnabled);
  useEffect(() => {
    const sync = () => setOn(isDemoEnabled());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
};

/** Drops sample accounts from a list of profile rows when demo data is off. */
export const filterDemo = <T extends { is_demo?: boolean | null }>(rows: T[], demoOn: boolean) =>
  demoOn ? rows : rows.filter((r) => !r.is_demo);
