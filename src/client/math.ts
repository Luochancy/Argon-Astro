interface MathJaxGlobal {
  typesetPromise?: (elements?: Element[]) => Promise<void>;
  Hub?: {
    Queue: (task: unknown[]) => void;
  };
}

/** Re-typeset MathJax v3 or v2 formulas after initial load or PJAX page swaps. */
export function bindMath(engine: string): void {
  if (engine !== "mathjax2" && engine !== "mathjax3") return;
  const mj = (window as unknown as { MathJax?: MathJaxGlobal }).MathJax;
  if (!mj) return;

  if (engine === "mathjax3" && typeof mj.typesetPromise === "function") {
    void mj.typesetPromise().catch(() => undefined);
    return;
  }

  if (engine === "mathjax2" && mj.Hub && typeof mj.Hub.Queue === "function") {
    mj.Hub.Queue(["Typeset", mj.Hub]);
  }
}
