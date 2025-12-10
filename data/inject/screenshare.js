// Mac detection - only declare if not already declared
let isMac;
if (typeof isMac === 'undefined') {
    isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
            navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

// Lists of events to intercept
const windowEvents = [
    "blur", 
    "focus", 
    "beforeunload", 
    "pagehide", 
    "unload", 
    "popstate", 
    "resize", 
    "pagehide", 
    'lostpointercapture', 
    "fullscreenchange", 
    "visibilitychange"
];

const documentEvents = [
    "paste", 
    "onpaste", 
    "visibilitychange", 
    "webkitvisibilitychange"
];

// Store original property descriptors for restoration
const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
const originalWebkitVisibilityState = Object.getOwnPropertyDescriptor(document, "webkitVisibilityState");
const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");

// Event handler to prevent default behavior
const eventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
};

// Main function to bypass browser restrictions
function bypassRestrictions() {
    // Aggressively block beforeunload popup
    const blockBeforeUnload = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        delete e['returnValue'];
    };
    
    // Add our handler with highest priority (capture phase)
    window.addEventListener('beforeunload', blockBeforeUnload, true);
    
    // Override addEventListener to block beforeunload handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'beforeunload') {
            return; // Completely ignore beforeunload listeners
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Override onbeforeunload property setter
    Object.defineProperty(window, 'onbeforeunload', {
        set: function(val) {
            // Silently ignore attempts to set onbeforeunload
        },
        get: function() {
            return null;
        },
        configurable: false
    });
    
    // Prevent window events from firing
    windowEvents.forEach(eventName => {
        // Skip unload and beforeunload events
        if (eventName !== 'unload' && eventName !== 'beforeunload') {
            window.addEventListener(eventName, eventHandler, true);
        }
    });

    // Prevent document events from firing
    documentEvents.forEach(eventName => {
        document.addEventListener(eventName, eventHandler, true);
    });

    // Override visibility state properties
    Object.defineProperty(document, "visibilityState", {
        get: () => "visible",
        configurable: true
    });

    Object.defineProperty(document, 'webkitVisibilityState', {
        get: () => "visible",
        configurable: true
    });

    Object.defineProperty(document, "hidden", {
        get: () => false,
        configurable: true
    });
}

// Function to spoof screen recording behavior
function spoofScreenRecording() {
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    
    // Store original method reference
    if (!navigator.mediaDevices.__originalGetDisplayMedia) {
        navigator.mediaDevices.__originalGetDisplayMedia = originalGetDisplayMedia;
    }
    
    navigator.mediaDevices.getDisplayMedia = async function(constraints) {
        // Will be handled by combined popup
        return new Promise((resolve, reject) => {
            showPopup(resolve, reject, constraints, originalGetDisplayMedia);
        });
    };
}

function showPopup(resolve, reject, constraints, originalGetDisplayMedia) {
    // Create gradient background container
    const gradientContainer = document.createElement('div');
    gradientContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 1px;
        background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
        border-radius: 8px;
        z-index: 999999;
        animation: fadeIn 0.3s ease-in;
    `;
    
    // Main toast content
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: relative;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        color: white;
        padding: 20px;
        border-radius: 7px;
        font-family: monospace;
        min-width: 400px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: background-color 0.2s;
    `;

    // Animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -45%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translate(-50%, -50%); }
            to { opacity: 0; transform: translate(-50%, -45%); }
        }
    `;
    document.head.appendChild(style);

    // Add content
    toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="font-size: 16px; font-weight: bold; background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent;">
                NeoPass Extension
            </div>
            <span class="close-btn" style="cursor: pointer; font-size: 20px; color: rgba(255, 255, 255, 0.8); transition: color 0.2s; line-height: 1; padding: 4px 8px;">×</span>
        </div>
        <div style="text-align: justify; color: #10B981; font-weight: bold; margin-bottom: 15px;">
            FullScreen ScreenShare Bypassed!
        </div>
        <div style="margin-bottom: 20px; color: #E5E7EB; padding: 15px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
            <div style="font-size: 14px; line-height: 1.4;">
                Now you can share <span style="color: #34D399; font-weight: bold;">only the tab</span> or <span style="color: #34D399; font-weight: bold;">only the Chrome window</span><br>
                instead of the entire screen.
            </div>
        </div>
        <div style="display: flex; justify-content: center; gap: 10px;">
            <button class="ok-btn" style="padding: 8px 20px; border: none; border-radius: 5px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">
                Proceed
            </button>
        </div>
    `;

    // Add event listeners
    const closeBtn = toast.querySelector('.close-btn');
    const okBtn = toast.querySelector('.ok-btn');

    const cleanup = () => {
        gradientContainer.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => gradientContainer.remove(), 280);
    };

    closeBtn.onclick = () => {
        cleanup();
        reject(new Error('Screen share cancelled by user'));
    };

    okBtn.onclick = async () => {
        cleanup();
        try {
            // Continue with original screen sharing logic
            // Mac-specific constraints handling
            if (isMac) {
                constraints = {
                    video: {
                        displaySurface: "browser",
                        logicalSurface: true,
                        cursor: "always"
                    },
                    audio: false,
                    selfBrowserSurface: "include",
                    surfaceSwitching: "include",
                    systemAudio: "exclude"
                };
            } else {
                constraints = {
                    selfBrowserSurface: "include",
                    monitorTypeSurfaces: "exclude",
                    video: { displaySurface: "window" }
                };
            }
    
            const stream = await originalGetDisplayMedia.call(navigator.mediaDevices, constraints);
            const videoTrack = stream.getVideoTracks()[0];
            const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
            videoTrack.getSettings = function() {
                const settings = originalGetSettings();
                settings.displaySurface = 'monitor';
                return settings;
            };
            resolve(stream);
        } catch (error) {
            reject(error);
        }
    };

    // Add hover effects
    okBtn.onmouseover = () => okBtn.style.opacity = '0.9';
    okBtn.onmouseout = () => okBtn.style.opacity = '1';
    closeBtn.onmouseover = () => closeBtn.style.color = 'white';
    closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';

    gradientContainer.appendChild(toast);
    document.body.appendChild(gradientContainer);
}

// Initialize bypasses and observer
bypassRestrictions();
spoofScreenRecording();