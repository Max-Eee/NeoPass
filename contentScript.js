// Check if the chrome object is available (for compatibility)
if (typeof chrome === "undefined") {
  // Handle the case where chrome is not defined (like in Firefox)
}

// Always inject mock_code.js interceptor to handle extension detection (even when not logged in)
(function injectMockCode() {
  const mockScript = document.createElement('script');
  mockScript.src = chrome.runtime.getURL('data/inject/mock_code.js');
  mockScript.onload = function () {
      console.log('✅ Mock code interceptor loaded');
      this.remove(); // Clean up after execution
  };
  mockScript.onerror = function() {
      console.error('❌ Failed to load mock code interceptor');
  };
  // Inject as early as possible
  (document.head || document.documentElement).prepend(mockScript);
})();

// Inject exam.js (no login required)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('data/inject/exam.js');
(document.head || document.documentElement).appendChild(script);

// Login prompt and status sync removed - extension features now available to all users

// Function removed - login check no longer required for extension features

// Neo Browser Download Link - Updated
const neoBrowserDownloadLink = "https://freeneopass.vercel.app";

// Function to replace the new Neo Browser button structure
function replaceNeoBrowserButton() {
  const neoButton = document.querySelector('button#neobrowser');
  
  if (neoButton && !neoButton.dataset.replaced) {
    // Prevent default behavior
    neoButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.open(neoBrowserDownloadLink, '_blank');
    }, true);
    
    // Create custom styled button/link
    const replacementBtn = document.createElement('a');
    replacementBtn.innerHTML = `
      <div class="container jcc btn-align">
        <div class="t-whitespace-nowrap ng-star-inserted">
          <span>Download NeoPass's NeoBrowser</span>
        </div>
      </div>
    `;
    replacementBtn.href = neoBrowserDownloadLink;
    replacementBtn.target = "_blank";
    replacementBtn.className = neoButton.className;
    replacementBtn.id = "neobrowser";
    replacementBtn.tabIndex = 0;
    
    // Apply gradient styling
    replacementBtn.style.cssText = `
      position: relative !important;
      display: inline-flex !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      color: white !important;
      background-color: black !important;
      border-radius: 8px !important;
      text-align: center !important;
      text-decoration: none !important;
      cursor: pointer !important;
      z-index: 1 !important;
      border: 2px solid transparent !important;
      transition: all 0.3s ease !important;
    `;
    
    // Create gradient border effect
    const beforeStyle = document.createElement('style');
    beforeStyle.textContent = `
      a#neobrowser {
        position: relative !important;
        background: linear-gradient(black, black) padding-box,
                    linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899) border-box !important;
        border: 2px solid transparent !important;
      }
      a#neobrowser:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.6) !important;
      }
    `;
    if (!document.querySelector('style[data-neobrowser-style]')) {
      beforeStyle.setAttribute('data-neobrowser-style', 'true');
      document.head.appendChild(beforeStyle);
    }
    
    // Replace the button
    neoButton.replaceWith(replacementBtn);
    replacementBtn.dataset.replaced = "true";
    
    console.log('✅ Neo Browser button replaced with NeoPass redirect');
  }
}

// Observer to detect and replace Neo Browser button
const buttonObserver = new MutationObserver((mutations) => {
  replaceNeoBrowserButton();
});

// Start observing for button changes
buttonObserver.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Initial check for Neo Browser button (in case already loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', replaceNeoBrowserButton);
} else {
  replaceNeoBrowserButton();
}

// Listen for window messages
window.addEventListener("message", function(event) {
  // Only process messages that:
  // 1. Come from the same window
  // 2. Are targeted for the extension
  if (event.data.target === "extension") {
      // Forward the message to the extension's background script
      chrome.runtime.sendMessage(event.data.message, response => {
          // Send the response back to the window
          window.postMessage({
              source: "extension",
              response: response
          }, "*");
      });
  }
});

window.addEventListener("message", function (event) {

  if (event.source === window && event.data.target === "extension") {

    browser.runtime.sendMessage(event.data.message, (response) => {

      window.postMessage({ source: "extension", response: response }, "*");
    });
  }
});

// Listen for the 'beforeunload' event to remove any injected elements
window.addEventListener("beforeunload", removeInjectedElement);

// Function to send a message to the website
function sendMessageToWebsite(messageData) {
  removeInjectedElement(); // Clean up any previous injected elements

  // Create a new span element with a unique ID
  const injectedElement = document.createElement("span");
  injectedElement.id = "x-template-base-" + messageData.currentKey; // Set a unique ID based on currentKey

  // Append the new element to the document body
  document.body.appendChild(injectedElement);
  console.log("message", messageData); // Log the message data

  // Send the message to the website
  window.postMessage(0, messageData.url); // 0 is the targetOrigin, meaning the same origin
}

// Function to remove injected elements from the DOM
function removeInjectedElement() {
  const injectedElement = document.querySelector("[id^='x-template-base-']"); // Select elements with ID starting with "x-template-base-"
  if (injectedElement) {
      injectedElement.remove(); // Remove the element if it exists
  }
}

