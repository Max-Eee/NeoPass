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

const NP_API_BASE = 'https://api.neopass.space';

function getNeoPassToken() {
    const port = document.getElementById('np-ss-auth-port');
    return port?.dataset?.npToken || '';
}

async function validateProAccess() {
    const token = getNeoPassToken();
    if (!token) return false;
    try {
        const res = await fetch(`${NP_API_BASE}/api/account`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.success && data.account?.isPro === true;
    } catch {
        return false;
    }
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
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });

    const styles = document.createElement('style');
    styles.textContent = `
        *, *::before, *::after {
            margin: 0; padding: 0; box-sizing: border-box;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            line-height: 1.5;
            -webkit-text-fill-color: currentColor;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -45%); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translate(-50%, -50%); }
            to   { opacity: 0; transform: translate(-50%, -45%); }
        }
        .np-root {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            padding: 1px;
            background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
            border-radius: 8px;
            z-index: 2147483647;
            animation: fadeIn 0.3s ease-in;
        }
        .np-toast {
            position: relative;
            background-color: rgba(0, 0, 0, 0.88);
            backdrop-filter: blur(12px);
            color: #ffffff;
            padding: 20px;
            border-radius: 7px;
            min-width: min(560px, calc(100vw - 32px));
            max-width: calc(100vw - 24px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .np-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .np-title {
            font-size: 16px;
            font-weight: bold;
            background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .np-close {
            cursor: pointer;
            font-size: 20px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1;
            padding: 4px 8px;
            background: none;
            border: none;
            transition: color 0.2s;
        }
        .np-close:hover { color: #ffffff; }
        .np-status {
            text-align: justify;
            color: #10B981;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .np-info {
            margin-bottom: 20px;
            color: #E5E7EB;
            padding: 15px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            font-size: 14px;
            line-height: 1.4;
        }
        .np-info .hl { color: #34D399; font-weight: bold; }
        .np-btn-row {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: stretch;
            gap: 10px;
            width: 100%;
        }
        .np-btn-wrap {
            position: relative;
            flex: 1 1 0;
            min-width: 0;
        }
        .np-glow {
            position: absolute;
            inset: -2px;
            border-radius: 8px;
            filter: blur(8px);
            opacity: 0.75;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 0;
        }
        .np-btn-wrap:hover .np-glow { opacity: 1; }
        .np-glow-orange { background: linear-gradient(to right, #f97316, #ef4444); }
        .np-glow-green  { background: linear-gradient(to right, #22c55e, #10b981); }
        .np-glow-purple { background: linear-gradient(to right, #3b82f6, #a855f7, #ec4899); }
        .np-btn {
            position: relative;
            z-index: 10;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 40px;
            padding: 0 8px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            background: #000000;
            color: #ffffff;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-decoration: none;
            letter-spacing: normal;
            text-transform: none;
            transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        .np-btn:hover {
            background: #ffffff;
            color: #000000;
            border-color: rgba(0, 0, 0, 0.12);
        }
        .np-auth-toast {
            display: none;
            margin-top: 14px;
            padding: 10px 14px;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            color: #fca5a5;
            font-size: 13px;
            text-align: center;
            animation: fadeIn 0.2s ease-in;
        }
        .np-auth-toast.visible { display: block; }
        .np-proceed-wrap {
            display: none;
            margin-top: 12px;
        }
        .np-proceed-wrap.visible { display: block; }
        .np-proceed-btn {
            width: 100%;
            padding: 10px 0;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: transparent;
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .np-proceed-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.9);
            border-color: rgba(255, 255, 255, 0.3);
        }
    `;
    shadow.appendChild(styles);

    const root = document.createElement('div');
    root.className = 'np-root';
    root.innerHTML = `
        <div class="np-toast">
            <div class="np-header">
                <div class="np-title">NeoPass Extension</div>
                <button type="button" class="np-close">×</button>
            </div>
            <div class="np-status">FullScreen ScreenShare Bypassed!</div>
            <div class="np-info">
                Now you can share <span class="hl">only the tab</span>, <span class="hl">only the Chrome window</span>,<br>
                or a <span class="hl">blank screen</span> instead of the entire screen.<br>
                You can also <span class="hl">freeze</span> your screen at a single frame.
            </div>
            <div class="np-btn-row">
                <div class="np-btn-wrap">
                    <div class="np-glow np-glow-orange" aria-hidden="true"></div>
                    <button type="button" class="np-btn ok-btn">Share Tab/Window</button>
                </div>
                <div class="np-btn-wrap">
                    <div class="np-glow np-glow-green" aria-hidden="true"></div>
                    <button type="button" class="np-btn blank-btn">Share Blank Screen</button>
                </div>
                <div class="np-btn-wrap">
                    <div class="np-glow np-glow-purple" aria-hidden="true"></div>
                    <button type="button" class="np-btn freeze-btn">Share Frozen Screen</button>
                </div>
            </div>
            <div class="np-auth-toast">This feature requires <strong>NeoPass Pro</strong>. Please login via the extension popup.</div>
            <div class="np-proceed-wrap">
                <button type="button" class="np-proceed-btn">Proceed without bypass →</button>
            </div>
        </div>
    `;
    shadow.appendChild(root);

    const authToast = root.querySelector('.np-auth-toast');
    const proceedWrap = root.querySelector('.np-proceed-wrap');

    function showAuthWall() {
        authToast.classList.add('visible');
        proceedWrap.classList.add('visible');
        const port = document.getElementById('np-ss-auth-port');
        if (port) port.dataset.npOpenLogin = 'true';
    }

    async function requirePro(action) {
        const valid = await validateProAccess();
        if (valid) {
            action();
        } else {
            showAuthWall();
        }
    }

    const closeBtn = root.querySelector('.np-close');
    const okBtn = root.querySelector('.ok-btn');
    const blankBtn = root.querySelector('.blank-btn');
    const freezeBtn = root.querySelector('.freeze-btn');
    const proceedBtn = root.querySelector('.np-proceed-btn');

    const cleanup = () => {
        root.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => host.remove(), 280);
    };

    closeBtn.onclick = () => {
        cleanup();
        reject(new Error('Screen share cancelled by user'));
    };

    proceedBtn.onclick = async () => {
        cleanup();
        try {
            const stream = await originalGetDisplayMedia.call(navigator.mediaDevices, constraints);
            resolve(stream);
        } catch (error) {
            reject(error);
        }
    };

    okBtn.onclick = () => requirePro(async () => {
        cleanup();
        try {
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
    });

    blankBtn.onclick = () => requirePro(() => {
        cleanup();
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const stream = canvas.captureStream(30);
            const videoTrack = stream.getVideoTracks()[0];

            const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
            videoTrack.getSettings = function() {
                const settings = originalGetSettings();
                settings.displaySurface = 'monitor';
                settings.width = 1920;
                settings.height = 1080;
                settings.frameRate = 30;
                return settings;
            };

            Object.defineProperty(videoTrack, 'label', {
                get: () => 'screen:0:0',
                configurable: true
            });

            resolve(stream);
        } catch (error) {
            reject(error);
        }
    });

    freezeBtn.onclick = () => requirePro(async () => {
        cleanup();
        const chatElements = [
            document.getElementById('chat-overlay-shadow-host'),
            document.getElementById('chat-button-shadow-host')
        ].filter(Boolean);
        try {
            chatElements.forEach(el => el.style.display = 'none');

            const realConstraints = {
                video: { displaySurface: "monitor" },
                audio: false,
                monitorTypeSurfaces: "include",
                surfaceSwitching: "exclude",
                selfBrowserSurface: "exclude",
                systemAudio: "exclude"
            };

            const realStream = await originalGetDisplayMedia.call(navigator.mediaDevices, realConstraints);
            const realTrack = realStream.getVideoTracks()[0];
            const { width, height } = realTrack.getSettings();

            const canvas = document.createElement('canvas');
            canvas.width = width || 1920;
            canvas.height = height || 1080;
            const ctx = canvas.getContext('2d');

            const video = document.createElement('video');
            video.srcObject = realStream;
            video.muted = true;
            await video.play();

            await new Promise(r => setTimeout(r, 300));

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            realStream.getTracks().forEach(t => t.stop());
            video.srcObject = null;

            chatElements.forEach(el => el.style.display = '');

            const frozenStream = canvas.captureStream(30);
            const frozenTrack = frozenStream.getVideoTracks()[0];

            const originalGetSettings = frozenTrack.getSettings.bind(frozenTrack);
            frozenTrack.getSettings = function() {
                const settings = originalGetSettings();
                settings.displaySurface = 'monitor';
                settings.width = canvas.width;
                settings.height = canvas.height;
                settings.frameRate = 30;
                return settings;
            };

            Object.defineProperty(frozenTrack, 'label', {
                get: () => 'screen:0:0',
                configurable: true
            });

            resolve(frozenStream);
        } catch (error) {
            chatElements.forEach(el => el.style.display = '');
            reject(error);
        }
    });
}

// Initialize bypasses and observer
bypassRestrictions();
spoofScreenRecording();
