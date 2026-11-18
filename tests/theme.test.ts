// @vitest-environment jsdom
import css from "../src/index.css?raw";
import html from "../index.html?raw";
import { applyTheme, getTheme, setTheme, THEME_COLORS } from "../src/utils/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.head.innerHTML = '<meta name="theme-color" content="#000000">';
  });

  it("defaults to dark and remembers an explicit choice", () => {
    expect(getTheme()).toBe("dark");
    setTheme("light");
    expect(getTheme()).toBe("light");
  });

  it("toggles the html class and keeps the browser chrome colour in step", () => {
    const meta = document.querySelector('meta[name="theme-color"]')!;

    applyTheme("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.light);

    applyTheme("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.dark);
  });

  it("does not throw when the page has no theme-color meta", () => {
    document.head.innerHTML = "";
    expect(() => applyTheme("light")).not.toThrow();
  });

  // Three places hold the page background: the CSS token, THEME_COLORS, and
  // the pre-paint script in index.html. They only work if they agree.
  it("matches the page background tokens in index.css and index.html", () => {
    const [darkBlock, lightBlock] = css.split("html.light {");

    expect(darkBlock).toContain(`--color-pb-bg: ${THEME_COLORS.dark};`);
    expect(lightBlock).toContain(`--color-pb-bg: ${THEME_COLORS.light};`);
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLORS.dark}" />`);
    expect(html).toContain(`setAttribute('content', '${THEME_COLORS.light}')`);
  });
});
