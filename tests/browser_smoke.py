"""Open the built static site in Edge and check visitor-facing behavior."""
import functools
import http.server
import socket
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

DIST = Path(__file__).resolve().parents[1] / "dist"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def main():
    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()
            page.goto(base + "/", wait_until="domcontentloaded")
            html = page.content()
            assert "wp-json" not in html
            assert "admin-ajax.php" not in html
            assert "wp-admin" not in html
            page.goto(base + "/shuoshuo/", wait_until="domcontentloaded")
            assert page.locator(".shuoshuo-upvote").count() >= 1
            page.goto(base + "/posts/gutenberg/", wait_until="load")
            page.wait_for_function("() => document.querySelector('.collapse-block-title')?.dataset.bound === 'true'", timeout=5000)
            title = page.locator(".collapse-block-title")
            assert title.count() == 1
            assert title.get_attribute("aria-expanded") == "false"
            title.click()
            assert title.get_attribute("aria-expanded") == "true"
            assert page.locator(".collapse-block").get_attribute("class").find("collapsed") == -1
            page.evaluate("window.scrollTo(0, 400)")
            page.wait_for_timeout(50)
            body_class = page.locator("body").get_attribute("class") or ""
            assert "headroom---unpinned" in body_class or "with-headroom" in body_class
            browser.close()
    finally:
        server.shutdown()
    print("browser smoke ok")


if __name__ == "__main__":
    main()
