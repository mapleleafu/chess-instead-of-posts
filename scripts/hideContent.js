const style = document.createElement("style");
style.textContent = `
  ${LINKEDIN_FEED_SELECTOR} {
    display: none !important;
  }
`;

if (document.head) {
  document.head.appendChild(style);
} else {
  const observer = new MutationObserver((mutations, obs) => {
    if (document.head) {
      document.head.appendChild(style);
      obs.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
