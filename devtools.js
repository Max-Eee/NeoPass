var sc = document.createElement('script');


// Check if URL contains "/courses" or "/test"
function isExamPage() {
    return window.location.href.includes('/mycourses') || 
           window.location.href.includes('/test');
  }
  
  // Only load and use devtools.js and anti-anti-debug.js on exam pages
  if (isExamPage()) {
    sc.src = chrome.runtime.getURL("data/inject/f41e2811.js");
    var it = document.head || document.documentElement;
    
    it.appendChild(sc)
    sc.remove();
  } else {
    // Don't load these resources on non-exam pages
  }