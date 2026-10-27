import { THEME_STORAGE_KEY } from "./theme";

// Runs while the HTML is still being parsed, before anything is painted, so
// people who chose dark mode never see a flash of the light theme on load.
// It has to be plain inline JS, which is why it repeats getPreferredTheme().
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
