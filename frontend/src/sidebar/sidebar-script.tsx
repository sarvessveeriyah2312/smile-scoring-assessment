import { SIDEBAR_STORAGE_KEY } from "./sidebar";

// Runs before the page paints, so someone who collapsed the sidebar doesn't
// see it open wide and then snap shut on every load.
const script = `(function(){try{if(localStorage.getItem("${SIDEBAR_STORAGE_KEY}")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}})()`;

export function SidebarScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
