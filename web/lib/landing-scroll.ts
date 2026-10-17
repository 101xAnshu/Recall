// Anchor navigation for the landing page. Scrolls inside the frame's own
// scroll container and then strips the fragment from the address bar, so a
// jump never leaves a "#" behind in the URL.
export function scrollToAnchor(event: React.MouseEvent, selector: string) {
  event.preventDefault();
  const target = document.querySelector(selector);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export function scrollToTop(event: React.MouseEvent) {
  event.preventDefault();
  const frame = document.querySelector<HTMLElement>("[data-landing-scroll]");
  if (frame) {
    frame.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}