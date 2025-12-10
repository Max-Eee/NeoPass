// Check if URL contains "/courses" or "/test"
function isExamPage() {
    return window.location.href.includes('/mycourses') || 
           window.location.href.includes('/test');
}

// Only load and use devtools.js and anti-anti-debug.js on exam pages
if (isExamPage()) {
    function injectAntiDebug() {
        var sc = document.createElement('script');
        sc.src = chrome.runtime.getURL("data/inject/anti-anti-debug.js");
        sc.onload = function() {
            this.remove(); // Remove after execution
        };
        (document.head || document.documentElement).appendChild(sc);
    }

    // Inject immediately if DOM is ready, otherwise wait
    if (document.documentElement) {
        injectAntiDebug();
    } else {
        // Wait for the very first element to exist
        const observer = new MutationObserver(function() {
            if (document.documentElement) {
                observer.disconnect();
                injectAntiDebug();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }
}