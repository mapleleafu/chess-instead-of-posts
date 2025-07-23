const postClassName = ".scaffold-finite-scroll";
const dropdownId = "#ember36";
const sidebarClass = ".scaffold-layout__aside";
const maxRetries = 5;
let tryCount = 0;

function checkSite() {
  return window.location.host.includes("linkedin.com");
}

function main() {
  if (!checkSite()) {
    console.log("Not on LinkedIn, exiting...");
    return;
  }

  removeElements();
}

function removeElements() {
  console.log("Running main function...");
  const posts = document.querySelector(postClassName);
  const dropdown = document.querySelector(dropdownId);
  const sidebar = document.querySelector(sidebarClass);
  console.log(`tryCount: ${tryCount}, maxRetries: ${maxRetries}`);
  try {
    if (posts) {
      console.log("Posts found and removing...");
      posts.remove();
      dropdown?.remove();
      sidebar?.remove();
    } else {
      console.log("Posts not found, retrying in 1 second...");
      setTimeout(() => {
        if (tryCount < maxRetries) {
          removeElements();
          tryCount++;
        }
      }, 1000);
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (
        node instanceof Element &&
        (node?.matches(postClassName) || node?.matches(dropdownId) || node?.matches(sidebarClass))
      ) {
        console.log(`Detected mutation for ${node.tagName} with class ${node.className}`);
        main();
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

main();
