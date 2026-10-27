export const SIDEBAR_STORAGE_KEY = "sidebar";

// The state lives as data-sidebar on <html>, same idea as the theme. CSS reads
// it directly, so the sidebar is the right width from the very first paint.
export function isSidebarCollapsed() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

export function setSidebarCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    // Can't save it? It still works for this visit.
  }
}

export function restoreSidebar() {
  try {
    if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed") document.documentElement.dataset.sidebar = "collapsed";
  } catch {}
}

// Lets React components re-render whenever the attribute flips.
export function subscribeToSidebar(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => observer.disconnect();
}
