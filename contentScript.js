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

// // Neo Browser Download Link
// const neoBrowserDownloadLink = "//removed";

// // Function to replace "Download Neo Browser" text links
// function replaceDownloadTextLink() {
//   const existing = Array.from(document.querySelectorAll("div"))
//     .find(el => el.textContent.trim() === "Download Neo Browser");

//   if (existing && !existing.dataset.replaced) {
//     const newTextBtn = document.createElement("a");
//     newTextBtn.textContent = "Download NeoPass's NeoBrowser";
//     newTextBtn.href = neoBrowserDownloadLink;
//     newTextBtn.target = "_blank";
//     newTextBtn.style.cssText = `
//       color: #0070f3;
//       font-weight: 500;
//       font-size: 15px;
//       text-decoration: underline;
//       cursor: pointer;
//       white-space: nowrap;
//       background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899);
//       -webkit-background-clip: text;
//       background-clip: text;
//       -webkit-text-fill-color: transparent;
//     `;
//     existing.replaceWith(newTextBtn);
//     existing.dataset.replaced = "true";
//   }
// }

// // Function to replace "Take test only in Neo Browser" buttons
// function replaceTakeTestButton() {
//   const buttons = document.querySelectorAll("#testButtonsID button");
//   buttons.forEach(btn => {
//     const isTarget =
//       btn.textContent.trim() === "Take test only in Neo Browser" &&
//       btn.classList.contains("disabled");

//     if (isTarget && !btn.closest("#testButtonsID")?.dataset.replaced) {
//       const replacementBtn = document.createElement("a");
//       replacementBtn.textContent = "Take test only in NeoPass's NeoBrowser";
//       replacementBtn.href = neoBrowserDownloadLink;
//       replacementBtn.target = "_blank";
      
//       // Apply gradient styling similar to popup.html glow-button
//       replacementBtn.style.cssText = `
//         position: relative;
//         display: inline-block;
//         padding: 10px 20px;
//         font-size: 15px;
//         font-weight: 500;
//         color: white;
//         background-color: black;
//         border-radius: 8px;
//         text-align: center;
//         text-decoration: none;
//         cursor: pointer;
//         z-index: 1;
//         border: 1px solid transparent;
//         transition: all 0.3s ease;
//       `;
      
//       // Create pseudo-elements with CSS
//       const beforeStyle = document.createElement('style');
//       beforeStyle.textContent = `
//         .neo-download-btn {
//           position: relative;
//           z-index: 1;
//         }
//         .neo-download-btn:before {
//           content: '';
//           position: absolute;
//           top: -2px;
//           right: -2px;
//           bottom: -2px;
//           left: -2px;
//           background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899);
//           border-radius: 9px;
//           z-index: -1;
//           transition: opacity 0.3s ease;
//           opacity: 0.5;
//         }
//         .neo-download-btn:after {
//           content: '';
//           position: absolute;
//           inset: 1px;
//           background: black;
//           border-radius: 7px;
//           z-index: -1;
//         }
//         .neo-download-btn:hover:before {
//           opacity: 1;
//           filter: blur(2px);
//         }
//         .neo-download-btn:hover {
//           transform: scale(1.02);
//         }
//       `;
//       document.head.appendChild(beforeStyle);
//       replacementBtn.classList.add('neo-download-btn');

//       const parent = btn.parentElement?.parentElement;
//       if (parent) {
//         parent.innerHTML = "";
//         parent.appendChild(replacementBtn);
//         parent.dataset.replaced = "true";
//       }
//     }
//   });
// }

// // Function to observe and attach event listeners to test buttons
// function observeTestButtons() {
//   // Only observe buttons when URL includes "mycourses"
//   if (!window.location.href.includes("mycourses")) {
//     return;
//   }

//   const observer = new MutationObserver((mutations) => {
//       mutations.forEach((mutation) => {
//           mutation.addedNodes.forEach((node) => {
//               if (node.nodeType === 1) { // Ensure it's an element
//                   const buttons = node.querySelectorAll("button");
//                   buttons.forEach((button) => {
//                       if (
//                           button.innerText.includes("Resume Test") ||
//                           button.innerText.includes("Start Test")
//                       ) {
//                           button.addEventListener("click", checkLoginStatusAndProceed, true);
//                       }
//                   });
//               }
//           });
//       });
      
//       // Also check for download buttons to replace
//       replaceDownloadTextLink();
//       replaceTakeTestButton();
//   });

//   observer.observe(document.body, { childList: true, subtree: true });
// }

// // Start observing when the script loads
// observeTestButtons();

// // Initial check for Neo Browser buttons (in case already loaded)
// replaceDownloadTextLink();
// replaceTakeTestButton();

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

