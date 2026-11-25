function swapThumbIcon(button: HTMLElement): void {
  const icon = button.querySelector("i.fa-thumbs-o-up");
  if (icon) {
    icon.classList.remove("fa-thumbs-o-up");
    icon.classList.add("fa-thumbs-up");
  }
}

/** Bind shuoshuo upvote interactions with Argon pop animation and solid thumb icon swap. */
export function bindUpvote(mode: "local" | "private", signal?: AbortSignal): void {
  document.querySelectorAll<HTMLElement>(".shuoshuo-upvote").forEach((button) => {
    const id = button.dataset.id;
    const count = button.querySelector(".shuoshuo-upvote-num");

    // Hydrate local upvote state from sessionStorage on boot.
    if (mode === "local" && id) {
      const stored = sessionStorage.getItem("argon-upvote-" + id);
      if (stored !== null) {
        if (count) count.textContent = stored;
        button.classList.add("upvoted");
        swapThumbIcon(button);
      }
    }

    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    const markUpvoted = (total?: number) => {
      if (count && typeof total === "number") count.textContent = String(total);
      swapThumbIcon(button);
      button.classList.add("upvoted", "shuoshuo-upvoted-animation");
    };

    button.addEventListener(
      "click",
      async () => {
        if (!id || button.classList.contains("upvoted") || button.classList.contains("shuoshuo-upvoting")) {
          return;
        }
        const current = Number(count?.textContent || 0);

        if (mode === "local") {
          const total = current + 1;
          sessionStorage.setItem("argon-upvote-" + id, String(total));
          markUpvoted(total);
          return;
        }

        button.classList.add("shuoshuo-upvoting");
        try {
          const response = await fetch("/api/shuoshuo-upvote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: Number(id) || id }),
          });
          if (!response.ok) return;
          const result = (await response.json()) as { total?: number };
          markUpvoted(result.total);
        } catch {
          // Ignore network errors while ensuring the loading state resets below.
        } finally {
          button.classList.remove("shuoshuo-upvoting");
        }
      },
      { signal },
    );
  });
}
