const urlToOpen = "chrome://extensions/";

window.addEventListener("message", (event) => {
  // Ensure the message is coming from the web page
  if (event.source === window) {
    const { msg, currentKey } = event.data;
    if (
      msg === "pageReloaded" ||
      msg === "openNewTab" ||
      msg === "windowFocus"
    ) {
      const action =
        msg === "pageReloaded"
          ? "pageReloaded"
          : msg === "openNewTab"
          ? "openNewTab"
          : "windowFocus";

      const message = { action, key: currentKey };
      if (action === "openNewTab") message.url = urlToOpen;

      chrome.runtime.sendMessage(message);
      console.log(message);
    }
  }
});

window.addEventListener("beforeunload", () => {
  removeInjectedElement();
});

function sendMessageToWebsite(message) {
  removeInjectedElement();

  const newElement = document.createElement("span");
  newElement.id = `x-template-base-${message.currentKey}`;
  document.body.appendChild(newElement);
}

function removeInjectedElement() {
  const elementToRemove = document.querySelector('[id^="x-template-base-"]');
  if (elementToRemove) {
    elementToRemove.remove();
  }
}

function setExtensionActiveTime() {
  localStorage.setItem("extensionActiveTime", Date.now());
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "getUrlAndExtensionData") {
    if (message.url) {
      sendMessageToWebsite(message);
    }
  } else if (message.action === "removeInjectedElement") {
    removeInjectedElement();
  }
});

// To keep sending the message periodically within the content script itself
setInterval(() => {
  setExtensionActiveTime();
}, 1000);