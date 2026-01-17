// Track shortcut execution state to prevent multiple requests when held down
const shortcutStates = {
  'search': false,
  'search-mcq': false,
  'nptel': false,
  'customPaste': false
};

// Request blocking mechanism to prevent multiple simultaneous API requests
let isRequestInProgress = false;
let requestTimeout = null;

function canMakeRequest() {
    return !isRequestInProgress;
}

function blockRequests() {
    isRequestInProgress = true;
    
    // Clear any existing timeout
    if (requestTimeout) {
        clearTimeout(requestTimeout);
    }
    
    // Set timeout to unblock after 15 seconds
    requestTimeout = setTimeout(() => {
        isRequestInProgress = false;
        console.log('[Request Block] Unblocked after 15 seconds timeout');
    }, 15000);
}

function unblockRequests() {
    isRequestInProgress = false;
    
    // Clear the timeout since we got a response
    if (requestTimeout) {
        clearTimeout(requestTimeout);
        requestTimeout = null;
    }
    
    console.log('[Request Block] Unblocked after receiving response');
}

// Array to store allowed IP addresses
let allowedIPs = [];

// Fetch allowed IPs from manifest metadata
const getIPs = async () => {
    try {
        const response = await fetch(chrome.runtime.getURL("metadata.json"));
        const data = await response.json();
        return data.ip || [];
    } catch (error) {
        console.error("Failed to load metadata:", error);
        return [];
    }
};

// Fetch IP address for a given domain
const fetchDomainIp = async (url) => {
    try {
        await getIPs();
        let hostname = new URL(url).hostname;

        // Special case for specific domain
        if (hostname.includes("pscollege841.examly")) {
            return "34.171.215.232";
        }
        // Query Google DNS API
        let response = await fetch(`https://dns.google/resolve?name=${hostname}`);
        let data = await response.json();

        let ip = data.Answer?.find(record => record.type === 1)?.data || null;
        return ip || null;
    } catch (error) {
        throw error;
    }
};

async function handleMessage(request, sender, sendResponse) {

    if (!sender.id && !sender.url) {
        console.error('Unauthorized sender');
        sendResponse({
            code: "Error",
            info: "Unauthorized sender"
        }); // Fixed format
        return false;
    }

    try {
        const {
            id,
            type,
            instruction
        } = request;

        const {
            target,
            operation,
            args = []
        } = instruction;

        // Special handling for management operations
        if (target === 'management') {
            const mockExtensionInfo = {
                description: "Prevents malpractice by identifying and blocking third-party browser extensions during tests on the Iamneo portal.",
                enabled: true,
                homepageUrl: "https://chromewebstore.google.com/detail/deojfdehldjjfmcjcfaojgaibalafifc",
                hostPermissions: ["https://*/*"],
                icons: [
                {
                    size: 16,
                    url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/16/0"
                },
                {
                    size: 48,
                    url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/48/0"
                },
                {
                    size: 128,
                    url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/128/0"
                }],
                id: "deojfdehldjjfmcjcfaojgaibalafifc",
                installType: "normal",
                isApp: false,
                mayDisable: true,
                name: "NeoExamShield",
                offlineEnabled: false,
                optionsUrl: "",
                permissions: [
                    "declarativeNetRequest",
                    "declarativeNetRequestWithHostAccess",
                    "management",
                    "tabs"
                ],
                shortName: "NeoExamShield",
                type: "extension",
                updateUrl: "https://clients2.google.com/service/update2/crx",
                version: "3.3",
                versionName: "Release Version"
            };

            if (operation === 'getAll') {

                sendResponse({
                    code: "Success",
                    info: [mockExtensionInfo]
                });
                return true;
            }

            if (operation === 'get') {

                sendResponse({
                    code: "Success",
                    info: mockExtensionInfo
                });
                return true;
            }
        }

        return true;
    } catch (error) {

    }
}

// Handle external messages
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    fetchDomainIp(sender.url)
        .then(ip => {
            if (ip && allowedIPs.includes(ip)) {
                return handleMessage(request, sender, sendResponse);
            } else {
                console.log("error");
                return handleMessage(request, sender, sendResponse);
            }
        })
        .catch(error => {
            console.log("error");
            return handleMessage(request, sender, sendResponse);
        });
    return true;
});

// Check and reload tabs if needed
chrome.tabs.query({}, async tabs => {
    for (let tab of tabs) {
        if (!tab.url) continue;
        let url = tab.url;

        try {
            let ip = await fetchDomainIp(url);
            if (!ip || !allowedIPs.includes(ip)) {
                chrome.tabs.reload(tab.id, () => {
                    chrome.runtime.lastError; // Handle any errors silently
                });
            }
        } catch (error) {
            // Silently handle errors
        }
    }
});

// Monitor installed extensions
const getInstalledExtensions = () => {
    chrome.management.getAll(extensions => {});
};

// Check installed extensions every 3 seconds
setInterval(getInstalledExtensions, 3000);

// Listen for internal messages
chrome.runtime.onMessage.addListener(handleMessage);

// Version checking functions
async function checkForUpdate() {
    try {
        const response = await fetch('https://api.github.com/repos/Max-Eee/NeoPass/releases/latest');
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        const currentVersion = chrome.runtime.getManifest().version;

        if (compareVersions(latestVersion, currentVersion) > 0) {
            // Check when the update notification was last dismissed
            const {
                lastUpdateDismissed
            } = await chrome.storage.local.get(['lastUpdateDismissed']);
            const currentTime = Date.now();

            // Show notification if never dismissed or if 5 hours (18000000 ms) have passed
            const showNotificationTimeout = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

            if (!lastUpdateDismissed || (currentTime - lastUpdateDismissed) > showNotificationTimeout) {
                // Get the active tab but check if it's a valid tab for script injection
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function(tabs) {
                    if (tabs[0] && tabs[0].url &&
                        !tabs[0].url.startsWith('chrome://') &&
                        !tabs[0].url.startsWith('chrome-extension://') &&
                        !tabs[0].url.startsWith('about:') &&
                        !tabs[0].url.startsWith('edge://') &&
                        !tabs[0].url.startsWith('brave://')) {

                        showUpdateToast(tabs[0].id,
                            `Update Available: v${latestVersion}\nSome features may not work. Please update your extension.`,
                            latestVersion
                        );
                    } else {
                        // Store the update info to show later when on a valid page
                        chrome.storage.local.set({
                            'pendingUpdateNotification': true,
                            'pendingUpdateVersion': latestVersion
                        });
                        console.log('Update available but current tab is not injectable. Will show notification later.');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}

function compareVersions(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }
    return 0;
}

function showUpdateToast(tabId, message, latestVersion) {
    // First check if the tab is valid for script injection
    chrome.tabs.get(tabId, async (tab) => {
        // Handle potential error if tab no longer exists
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        // Verify tab is a valid target for script injection
        if (!tab.url ||
            tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('about:') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('brave://')) {

            console.log('Cannot inject script into this tab type');
            return;
        }

        // Proceed with script injection for valid tabs
        try {
            // Remove any existing toasts first
            await removeExistingToast(tabId);
            
            // Use a promise wrapper to handle errors silently
            const executeScriptPromise = async () => {
                try {
                    await chrome.scripting.executeScript({
                        target: {
                            tabId: tabId
                        },
                        func: function(msg, version) {
                            // Create gradient background container
                            const gradientContainer = document.createElement('div');
                            gradientContainer.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                padding: 1px;
                                background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
                                border-radius: 8px;
                                z-index: 10000;
                                cursor: pointer;
                                animation: fadeIn 0.3s ease-in;
                            `;

                            // Add a unique ID to identify the toast
                            gradientContainer.id = 'neopass-update-notification';

                            // Main toast content
                            const toast = document.createElement('div');
                            toast.style.cssText = `
                                position: relative;
                                background-color: rgba(0, 0, 0, 0.8);
                                backdrop-filter: blur(8px);
                                color: white;
                                padding: 16px;
                                border-radius: 7px;
                                font-family: monospace;
                                min-width: 300px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                transition: background-color 0.2s;
                            `;

                            // Header container with NeoPass title and close button
                            const header = document.createElement('div');
                            header.style.cssText = `
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 12px;
                                padding-bottom: 8px;
                                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                            `;

                            // NeoPass title
                            const title = document.createElement('div');
                            title.innerHTML = 'NeoPass Extension';
                            title.style.cssText = `
                                font-size: 16px;
                                font-weight: bold;
                                background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
                                -webkit-background-clip: text;
                                background-clip: text;
                                color: transparent;
                            `;

                            const closeBtn = document.createElement('span');
                            closeBtn.innerHTML = '&times;';
                            closeBtn.style.cssText = `
                                cursor: pointer;
                                font-size: 20px;
                                color: rgba(255, 255, 255, 0.8);
                                transition: color 0.2s;
                                line-height: 1;
                                padding: 4px 8px;
                            `;

                            // Message content
                            const messageDiv = document.createElement('div');
                            messageDiv.innerHTML = msg.replace('\n', '<br>');
                            messageDiv.style.marginBottom = '12px';

                            // Links container
                            const linksContainer = document.createElement('div');
                            linksContainer.style.cssText = `
                                display: flex;
                                gap: 8px;
                                margin-top: 12px;
                            `;

                            // Create links
                            const createLink = (text, url) => {
                                const link = document.createElement('a');
                                link.href = url;
                                link.innerHTML = text;
                                link.style.cssText = `
                                    background: rgba(255, 255, 255, 0.1);
                                    color: white;
                                    text-decoration: none;
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    transition: all 0.2s;
                                    flex: 1;
                                    text-align: center;
                                    border: 1px solid rgba(255, 255, 255, 0.1);
                                `;
                                link.onmouseover = (e) => {
                                    link.style.background = 'rgba(255, 255, 255, 0.2)';
                                };
                                link.onmouseout = (e) => {
                                    link.style.background = 'rgba(255, 255, 255, 0.1)';
                                };
                                return link;
                            };

                            const downloadLink = createLink('⭳ Download Latest', 'https://github.com/Max-Eee/NeoPass/archive/refs/heads/main.zip');
                            const websiteLink = createLink('Website', 'https://freeneopass.vercel.app');

                            // Add hover effects
                            gradientContainer.onmouseover = () => {
                                toast.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                            };
                            gradientContainer.onmouseout = () => {
                                toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                            };

                            closeBtn.onmouseover = (e) => {
                                closeBtn.style.color = 'white';
                            };
                            closeBtn.onmouseout = (e) => {
                                closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                            };

                            // Click handlers
                            gradientContainer.onclick = (e) => {
                                if (e.target === gradientContainer || e.target === toast || e.target === messageDiv) {
                                    window.open('https://github.com/Max-Eee/NeoPass/releases/latest');
                                }
                            };

                            // Modified close button handler to store dismissal time
                            closeBtn.onclick = (e) => {
                                e.stopPropagation(); // Prevent triggering the container's click
                                gradientContainer.style.animation = 'fadeOut 0.3s ease-out';
                                setTimeout(() => gradientContainer.remove(), 280);

                                // Store the dismissal time
                                chrome.runtime.sendMessage({
                                    action: "updateDismissed",
                                    version: version,
                                    timestamp: Date.now()
                                });
                            };

                            // Listen for dismissal message from other tabs
                            chrome.runtime.onMessage.addListener((message) => {
                                if (message.action === "removeUpdateNotification") {
                                    if (gradientContainer && gradientContainer.parentElement) {
                                        gradientContainer.style.animation = 'fadeOut 0.3s ease-out';
                                        setTimeout(() => gradientContainer.remove(), 280);
                                    }
                                }
                            });

                            // Add animation styles
                            const style = document.createElement('style');
                            style.textContent = `
                                @keyframes fadeIn {
                                    from { opacity: 0; transform: translateY(-20px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                @keyframes fadeOut {
                                    from { opacity: 1; transform: translateY(0); }
                                    to { opacity: 0; transform: translateY(-20px); }
                                }
                            `;
                            document.head.appendChild(style);

                            // Assemble and append
                            header.appendChild(title);
                            header.appendChild(closeBtn);
                            linksContainer.appendChild(downloadLink);
                            linksContainer.appendChild(websiteLink);

                            toast.appendChild(header);
                            toast.appendChild(messageDiv);
                            toast.appendChild(linksContainer);

                            gradientContainer.appendChild(toast);

                            // Remove existing update toast if any
                            const existingToast = document.getElementById('neopass-update-notification');
                            if (existingToast) {
                                existingToast.remove();
                            }

                            document.body.appendChild(gradientContainer);
                        },
                        args: [message, latestVersion]
                    });
                } catch (err) {
                    // Silently handle the error and store notification for showing later
                    // without logging to console
                    chrome.storage.local.set({
                        'pendingUpdateNotification': true,
                        'pendingUpdateVersion': latestVersion
                    });
                }
            };

            // Execute the script with silent error handling
            executeScriptPromise();

        } catch (error) {
            // Only log truly unexpected errors
            console.error('Error in showUpdateToast:', error);
        }
    });
}

// Add listener for tab updates to show pending notifications
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only check when page is fully loaded
    if (changeInfo.status === 'complete' && tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('about:') &&
        !tab.url.startsWith('edge://') &&
        !tab.url.startsWith('brave://')) {

        // Check for pending notifications
        chrome.storage.local.get(['pendingUpdateNotification', 'pendingUpdateVersion'], function(data) {
            if (data.pendingUpdateNotification) {
                // Clear the pending flag
                chrome.storage.local.set({
                    'pendingUpdateNotification': false
                });

                // Show the notification
                showUpdateToast(tab.id,
                    `Update Available: v${data.pendingUpdateVersion}\nSome features may not work. Please update your extension.`,
                    data.pendingUpdateVersion
                );
            }
        });

        // Standard update check logic (shows on every tab until dismissed)
        checkForUpdate();
    }
});

// Set up an alarm for update checking
function setupUpdateAlarm() {
    chrome.alarms.get('updateCheck', (alarm) => {
        // If alarm doesn't exist, create it
        if (!alarm) {
            chrome.alarms.create('updateCheck', {
                // Check twice per day
                periodInMinutes: 12 * 60
            });
        }
    });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateCheck') {
        checkForUpdate();
    }
});

// Set up alarm when extension starts
chrome.runtime.onStartup.addListener(setupUpdateAlarm);

// Also set up alarm on install
chrome.runtime.onInstalled.addListener((details) => {
    setupUpdateAlarm();
    // Also do an immediate check on install/update
    if (details.reason === 'update' || details.reason === 'install') {
        checkForUpdate();
    }
});

// Additional listener for update dismissal messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateDismissed") {
        chrome.storage.local.set({
            lastUpdateDismissed: message.timestamp,
            lastUpdateVersion: message.version
        });
        
        // Broadcast to all tabs to remove the notification
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: "removeUpdateNotification"
                }).catch(() => {
                    // Ignore errors for tabs that can't receive messages
                });
            });
        });
    }
});



let extensionStatus = 'on';

// Context menu creation
chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.create({
        id: 'separator1',
        type: 'separator',
        contexts: ['editable', 'selection']
    });

    if (extensionStatus === 'on') {
        chrome.contextMenus.create({
            id: 'search',
            title: 'Search',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'solveMCQ',
            title: 'MCQ',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'separator2',
            type: 'separator',
            contexts: ['editable', 'selection']
        });
        chrome.contextMenus.create({
            id: 'nptel',
            title: 'NPTEL',
            contexts: ['selection']
        });
        // Add new menu item for IamNeo/Examly questions
        chrome.contextMenus.create({
            id: 'solveExamly',
            title: 'Solve IamNeo/Examly Question',
            contexts: ['all']
        });

        // Add custom paste menu items
        chrome.contextMenus.create({
            id: 'customPaste',
            title: 'Drag and Drop Paste',
            contexts: ['editable']
        });
        chrome.contextMenus.create({
            id: 'pasteByTyping',
            title: 'Paste by Typing',
            contexts: ['editable']
        });
    }
});

// Handle context menu clicks
function isLoggedIn(callback) {
    chrome.storage.local.get(['loggedIn'], function(result) {
        callback(result.loggedIn);
    });
}

// Function to prompt user to log in
function showLoginPrompt(tabId) {
    showToast(tabId, 'Please log in to use this feature.', true);
    chrome.action.openPopup();
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'search' && info.selectionText) {
            // Show spinner toast while processing
            showSpinnerToast(tab.id, 'Analyzing question...');
            
            queryRequest(info.selectionText).then(response => {
                handleQueryResponse(response, tab.id);
            }).catch(error => {
                console.error('Context menu search error:', error);
                showToast(tab.id, 'Search failed. Please try again.', true, 'An error occurred while processing your search request.');
            });
        }

        if (info.menuItemId === 'solveMCQ' && info.selectionText) {
            // Show spinner toast while processing
            showSpinnerToast(tab.id, 'Analyzing MCQ question...');
            
            queryRequest(info.selectionText, true).then(response => {
                handleQueryResponse(response, tab.id, true);
            }).catch(error => {
                console.error('Context menu MCQ error:', error);
                showToast(tab.id, 'MCQ search failed. Please try again.', true, 'An error occurred while processing your MCQ request.');
            });
        }
        if (info.menuItemId === 'nptel') {
            if (info.selectionText) {
                handleNPTEL({
                    result: info.selectionText
                }, tab.id); 
            } else {
                showToast(tab.id, 'No text selected', true);
            }
        }
        // Add handler for the new menu item
        if (info.menuItemId === 'solveExamly') {
            chrome.tabs.sendMessage(tab.id, {
                action: 'solveIamneoExamly'
            });
        }

        // Handle custom paste menu item
        if (info.menuItemId === 'customPaste') {
            // For context menu or keyboard shortcut:
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['data/inject/customPaste.js']
            }, () => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: async () => {
                        if (typeof performDragDropPaste === 'function') {
                            await performDragDropPaste();
                            return true;
                        }
                        return false;
                    }
                }, (results) => {
                    if (results && results[0] && !results[0].result) {
                        showToast(tab.id, 'Paste operation failed. Please try again.', true);
                    }
                });
            });
        }

        // Handle paste by typing menu item
        if (info.menuItemId === 'pasteByTyping') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['data/inject/customPaste.js']
            }, () => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: async () => {
                        if (typeof performPasteByTyping === 'function') {
                            await performPasteByTyping();
                            return true;
                        }
                        return false;
                    }
                }, (results) => {
                    if (results && results[0] && !results[0].result) {
                        showToast(tab.id, 'Paste by typing operation failed. Please try again.', true);
                    }
                });
            });
        }
});

chrome.commands.onCommand.addListener((command, tab) => {
        if (shortcutStates[command]) {
            return; // Skip if the shortcut is already being processed
        }

        shortcutStates[command] = true; // Mark the shortcut as being processed

        if (command === 'search') {
            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                function: getSelectedText
            }, (selection) => {
                if (selection[0] && selection[0].result) {
                    // Show spinner toast while processing
                    showSpinnerToast(tab.id, 'Analyzing question...');
                    
                    queryRequest(selection[0].result).then(response => {
                        handleQueryResponse(response, tab.id);
                        shortcutStates[command] = false; // Reset the state after processing
                    }).catch(error => {
                        console.error('Search shortcut error:', error);
                        showToast(tab.id, 'Search failed. Please try again.', true, 'An error occurred while processing your search request.');
                        shortcutStates[command] = false; // Reset the state on error
                    });
                } else {
                    shortcutStates[command] = false; // Reset the state if no selection
                }
            });
        }

        if (command === 'search-mcq') {
            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                function: getSelectedText
            }, (selection) => {
                if (selection[0] && selection[0].result) {
                    // Show spinner toast while processing
                    showSpinnerToast(tab.id, 'Analyzing question...');
                    
                    queryRequest(selection[0].result, true).then(response => {
                        handleQueryResponse(response, tab.id, true);
                        shortcutStates[command] = false; // Reset the state after processing
                    }).catch(error => {
                        console.error('MCQ shortcut error:', error);
                        showToast(tab.id, 'MCQ search failed. Please try again.', true, 'An error occurred while processing your MCQ request.');
                        shortcutStates[command] = false; // Reset the state on error
                    });
                } else {
                    shortcutStates[command] = false; // Reset the state if no selection
                }
            });
        }

        if (command === 'customPaste') {
            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                func: async () => {
                    try {
                        const clipboardText = await navigator.clipboard.readText();
                        const activeElement = document.activeElement;
                        
                        if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                            const start = activeElement.selectionStart || 0;
                            const end = activeElement.selectionEnd || 0;
                            const text = activeElement.value || activeElement.textContent;
                            const newText = text.substring(0, start) + clipboardText + text.substring(end);
                            
                            if (activeElement.isContentEditable) {
                                activeElement.textContent = newText;
                            } else {
                                activeElement.value = newText;
                            }
                            
                            // Dispatch both input and change events
                            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    } catch (err) {
                        console.error('Clipboard API read failed:', err);
                        return false;
                    }
                }
            }, (results) => {
                shortcutStates[command] = false; // Reset the state after processing
                if (results && results[0] && !results[0].result) {
                    showToast(tab.id, 'Paste failed. Please try again.', true);
                }
            });
        }

        if (command === 'nptel') {
            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                function: getSelectedText
            }, (results) => {
                if (results[0] && results[0].result) {
                    handleNPTEL(results[0], tab.id); // Pass result[0] and tab.id
                }
                shortcutStates[command] = false; // Reset the state after processing
            });
        }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkLoginStatus") {
        chrome.storage.local.get(["loggedIn"], function(result) {
            sendResponse({
                loggedIn: result.loggedIn === true
            });
        });
        return true; // Keep the message channel open for async response
    }

    if (message.action === "showLoginPrompt") {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, (tabs) => {
            if (tabs.length > 0) {
                showLoginPrompt(tabs[0].id); // Call existing function to show login prompt
            }
        });
    }
});



function handleNPTEL(result, tabId) {
    const selectedText = result.result; // Access result.result here
    if (selectedText) {
        // Call your findAnswer function or do the NPTEL search
        const bestAnswers = findAnswer(selectedText); // Expecting an array of answers

        if (bestAnswers) {
            if (Array.isArray(bestAnswers) && bestAnswers.length > 0) {
                // Deduplicate answers - convert to Set and back to Array to remove duplicates
                const uniqueAnswers = [...new Set(bestAnswers)];
                
                // Prepare the display string with indexing
                let answersString;
                if (uniqueAnswers.length > 1) {
                    // Prepend "could be:" for multiple answers with indexing
                    answersString = 'Could be:\n' + uniqueAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n'); // Index each answer
                } else {
                    answersString = uniqueAnswers[0]; // Single answer
                }
                showNPTELToast(tabId, answersString); // Display the best answers
            } else {
                showNPTELToast(tabId, 'Answer not found.\nPlease select only the question.', true);
            }
        } else {
            showNPTELToast(tabId, 'Answer not found.\nPlease select only the question.', true);
        }
    } else {
        showNPTELToast(tabId, 'No text selected', true);
    }
}


// Helper functions
function getSelectedText() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
        chrome.runtime.sendMessage({
            action: 'showToast',
            message: 'No text selected',
            isError: true
        });
        return '';
    }
    return selectedText;
}

function handleQueryResponse(response, tabId, isMCQ = false) {
    if (response && typeof response === 'string') {
        // Success case - response is the actual text
        if (isMCQ) {
            showMCQToast(tabId, response);
        } else {
            copyToClipboard(response);
            showToast(tabId, 'Copied to Clipboard!');
        }
    } else if (response && response.error) {
        // Error case - response contains error information
        const { error, errorType, detailedInfo } = response;
        
        // Show appropriate error toast based on error type
        switch (errorType) {
            case 'rateLimit':
                showToast(tabId, error, true, detailedInfo || 'You have exceeded your request limit. Please wait before trying again.');
                break;
            case 'auth':
                showToast(tabId, error, true, detailedInfo || 'Please log in or refresh your session to continue using the service.');
                break;
            case 'forbidden':
                showToast(tabId, error, true, detailedInfo || 'Access to this feature is restricted. Please check your account status.');
                break;
            case 'server':
                showToast(tabId, error, true, detailedInfo || 'The service is experiencing issues. Please try again in a few moments.');
                break;
            case 'network':
                showToast(tabId, error, true, detailedInfo || 'Please check your internet connection and try again.');
                break;
            case 'client':
                showToast(tabId, error, true, detailedInfo || 'There was an issue with your request. Try rephrasing or shortening your text.');
                break;
            default:
                showToast(tabId, error, true, detailedInfo || 'An unexpected error occurred. Please try again after 30 seconds.');
        }
    } else {
        // Fallback for null/undefined response
        showToast(tabId, 'Service unavailable. Please try again after 30s.', true, 'The service did not respond. This may be due to high server load or maintenance.');
    }
}

function handleQueryResponseForIamNeoExamly(response, tabId, isMCQ = false, isHackerRank = false, isMultipleChoice = false) {
    if (response && typeof response === 'string') {
        // Success case - response is the actual text
        if (isMCQ) {
            chrome.tabs.sendMessage(tabId, {
                action: 'clickMCQOption',
                response: response,
                isHackerRank: isHackerRank,
                isMultipleChoice: isMultipleChoice
            });
        } else {
            copyToClipboard(response);
        }
    } else if (response && response.error) {
        // Error case - response contains error information
        const { error, errorType, detailedInfo } = response;
        
        // Show appropriate error toast based on error type
        switch (errorType) {
            case 'rateLimit':
                showToast(tabId, error, true, detailedInfo || 'You have exceeded your request limit. Please wait before trying again.');
                break;
            case 'auth':
                showToast(tabId, error, true, detailedInfo || 'Please log in or refresh your session to continue using the service.');
                break;
            case 'forbidden':
                showToast(tabId, error, true, detailedInfo || 'Access to this feature is restricted. Please check your account status.');
                break;
            case 'server':
                showToast(tabId, error, true, detailedInfo || 'The service is experiencing issues. Please try again in a few moments.');
                break;
            case 'network':
                showToast(tabId, error, true, detailedInfo || 'Please check your internet connection and try again.');
                break;
            case 'client':
                showToast(tabId, error, true, detailedInfo || 'There was an issue with your request. Try rephrasing or shortening your text.');
                break;
            default:
                showToast(tabId, error, true, detailedInfo || 'An unexpected error occurred. Please try again after 30 seconds.');
        }
    } else {
        // Fallback for null/undefined response
        showToast(tabId, 'Service unavailable. Please try again after 30s.', true, 'The service did not respond. This may be due to high server load or maintenance.');
    }
}

// Enhanced queryRequest function with comprehensive error handling
// Returns either:
// - String: successful response text
// - Object: { error: string, errorType: string, detailedInfo: string }
async function queryRequest(text, isMCQ = false, isMultipleChoice = false, tabId = null) {
    // Check if a request is already in progress
    if (!canMakeRequest()) {
        console.log('[Request Block] Request blocked - another request is in progress');
        return { 
            error: 'Please wait for your previous request to complete.', 
            errorType: 'rateLimit',
            detailedInfo: 'Multiple simultaneous requests are not allowed. Please wait a moment before trying again.'
        };
    }
    
    // Block new requests
    blockRequests();
    
    try {
        // Check if user has custom API configured
        const customAPIConfig = await getCustomAPIConfig();
        
        if (customAPIConfig.useCustomAPI && customAPIConfig.apiKey) {
            const result = await queryCustomAPI(text, isMCQ, isMultipleChoice, customAPIConfig);
            unblockRequests();
            return result;
        }
        
        // Check if user is logged in
        const {
            accessToken,
            refreshToken,
            isPro
        } = await getTokens();

        // If not logged in and no custom API configured, require custom API
        if (!accessToken || !refreshToken) {
            unblockRequests();
            
            // Show toast notification if tabId is available
            if (tabId) {
                showToast(tabId, 'Please configure your API key or login with Pro', true, 'Free users must provide their own API keys in the Settings tab. Click the extension icon to configure.');
            }
            
            // Open popup to Pro tab after a short delay
            setTimeout(() => {
                try {
                    chrome.action.openPopup();
                } catch (e) {
                    console.log('Could not open popup automatically:', e.message);
                }
            }, 1000);
            
            return { 
                error: 'Please configure your custom API key in Settings or login with Pro to use our proxy-server.', 
                errorType: 'auth',
                detailedInfo: 'Free users must provide their own API keys in the Settings tab to use this extension.'
            };
        }

        // Always use Pro endpoint
        const API_URL = `${API_BASE_URL}/api/pro-text`;
        const body = {
            prompt: text,
            refreshToken: refreshToken  // Required for server-side automatic token refresh
        };

        if (isMCQ) {
            if (isMultipleChoice) {
                // Multiple choice question - can select multiple options
                body.prompt += "\nIMPORTANT: This is a MULTIPLE CHOICE question where MULTIPLE options can be correct. Analyze the question carefully and provide ALL correct options.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C and A and C are correct: 'A. [text of option A], C. [text of option C]'\n- If options are 1, 2, 3 and 1 and 3 are correct: '1. [text of option 1], 3. [text of option 3]'\n- If only one option is correct, provide just that one: 'B. [text of option B]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the correct option(s) in the exact format shown above, separated by commas if multiple.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
            } else {
                // Single choice question - only one option can be selected
                body.prompt += "\nIMPORTANT: This is a SINGLE CHOICE question where ONLY ONE option is correct. Analyze the question carefully and provide the single correct option.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C: 'A. [text of option A]' or 'C. [text of option C]'\n- If options are 1, 2, 3: '1. [text of option 1]' or '3. [text of option 3]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the single correct answer in the exact format shown above.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
            }
        }
        console.log('[queryRequest] Sending request to API', API_URL, 'with body:', body);
        try {
            let response = await makeAuthenticatedRequest(API_URL, 'POST', accessToken, body);

            // Server automatically handles token refresh if access token expired
            // If auth fails, it means refresh token is also invalid/expired
            if (!response.ok && (response.status === 401 || response.status === 403)) {
                console.log('[queryRequest] Authentication failed - session expired');
                chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']);
                return { 
                    error: 'Session expired. Please log in again.', 
                    errorType: 'auth',
                    detailedInfo: 'Your session has expired. Please log in again to continue using NeoPass features.'
                };
            }

            if (!response.ok) {
                let errorMessage = 'An unexpected error occurred. Please try again.';
                let errorType = 'general';
                let detailedInfo = `Server responded with status ${response.status}`;
                
                try {
                    const errorData = await response.json();
                console.error("Error querying:", errorData);
                
                // Handle specific error types based on status code and response
                if (response.status === 429) {
                    errorType = 'rateLimit';
                    if (errorData.error && errorData.error.includes('Token limit exceeded')) {
                        errorMessage = 'Token limit exceeded. Please upgrade or wait for your limit to reset.';
                        if (errorData.details) {
                            detailedInfo = `You have used ${errorData.details.used} out of ${errorData.details.limit} tokens. ${errorData.details.remaining} tokens remaining.`;
                        } else {
                            detailedInfo = 'You have reached your token limit for this billing period.';
                        }
                    } else if (errorData.message && errorData.message.includes('Daily request limit exceeded')) {
                        errorMessage = 'Daily request limit exceeded. Please try again tomorrow.';
                        detailedInfo = `You have reached your daily request limit. ${errorData.nextReset ? `Limit resets at ${new Date(errorData.nextReset).toLocaleString()}` : 'Limit resets daily at midnight UTC.'}`;
                    } else if (errorData.message && errorData.message.includes('wait for your previous request')) {
                        errorMessage = 'Please wait for your previous request to complete.';
                        detailedInfo = 'Multiple simultaneous requests are not allowed. Please wait a moment before trying again.';
                    } else {
                        errorMessage = 'Too many requests. Please wait before trying again.';
                        detailedInfo = 'Rate limit exceeded. Please wait a few moments before making another request.';
                    }
                } else if (response.status === 403) {
                    errorType = 'forbidden';
                    
                    // Check if this is a Pro subscription expiration
                    if ((errorData.error && (errorData.error.includes('Pro subscription') || errorData.error.includes('active Pro subscription') || errorData.error.includes('subscription') || errorData.error.includes('expired'))) ||
                        (errorData.message && (errorData.message.includes('subscription') || errorData.message.includes('expired')))) {
                        errorMessage = 'Pro subscription required or expired.';
                        detailedInfo = 'This service requires an active Pro subscription. Please upgrade or renew your Pro subscription.';
                        
                        // Auto-logout user when subscription expires
                        chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username', 'isPro', 'loginTimestamp']);
                        console.log('🔒 Auto-logout: Pro subscription expired');
                    } else if (errorData.message && errorData.message.includes('star')) {
                        errorMessage = 'Please star the repository to use this service.';
                        detailedInfo = 'This service requires starring the GitHub repository. Please star it and try again.';
                    } else {
                        errorMessage = 'Access denied. Please check your account status.';
                        detailedInfo = 'Your request was denied. This may be due to account restrictions or service limitations.';
                    }
                } else if (response.status === 500) {
                    errorType = 'server';
                    errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
                    detailedInfo = 'The server encountered an internal error. This is usually temporary and should resolve shortly.';
                } else if (response.status === 400) {
                    errorType = 'client';
                    errorMessage = 'Invalid request. Please try rephrasing your question.';
                    detailedInfo = 'The request format was invalid. Try shortening your text or rephrasing your question.';
                } else {
                    errorMessage = errorData.message || `Server error (${response.status})`;
                    detailedInfo = errorData.error || `HTTP ${response.status}: ${errorMessage}`;
                }
                } catch (parseError) {
                    console.error("Error parsing error response:", parseError);
                    detailedInfo = `HTTP ${response.status}: Unable to parse error details`;
                }
                
                return { error: errorMessage, errorType, detailedInfo };
            }

            const responseData = await response.json();
            
            // Server automatically refreshes access token if it expired
            // Store the new access token (refresh token remains unchanged)
            if (responseData.newAccessToken) {
                await chrome.storage.local.set({ accessToken: responseData.newAccessToken });
                console.log('✅ Access token auto-refreshed by server and stored');
            }
            
            return responseData.text;
        } catch (error) {
            console.error("Error querying:", error);
            let errorMessage = 'Network error. Please check your connection and try again.';
            let errorType = 'network';
            let detailedInfo = 'Failed to connect to the service. This could be due to network issues or service downtime.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to the service. Please try again.';
                detailedInfo = 'Network connection failed. Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
                detailedInfo = 'The request took too long to complete. This may be due to high server load.';
            } else {
                detailedInfo = error.message || 'An unexpected error occurred during the request.';
            }
            
            return { error: errorMessage, errorType, detailedInfo };
        }
    } catch (error) {
        console.error("Error in queryRequest:", error);
        return { 
            error: 'An unexpected error occurred.', 
            errorType: 'general',
            detailedInfo: error.message || 'Failed to process the request.'
        };
    } finally {
        // Ensure we always unblock requests even if something unexpected happens
        unblockRequests();
    }
}// Helper function to get custom API configuration
async function getCustomAPIConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get([
            'useCustomAPI',
            'aiProvider',
            'customEndpoint',
            'customAPIKey',
            'customModelName'
        ], (result) => {
            resolve({
                useCustomAPI: result.useCustomAPI || false,
                aiProvider: result.aiProvider || 'openai',
                customEndpoint: result.customEndpoint || '',
                apiKey: result.customAPIKey || '',
                modelName: result.customModelName || ''
            });
        });
    });
}

// Function to query custom AI API
async function queryCustomAPI(text, isMCQ, isMultipleChoice, config) {
    const { aiProvider, customEndpoint, apiKey, modelName } = config;
    
    // Construct the prompt based on query type
    let prompt = text;
    if (isMCQ) {
        if (isMultipleChoice) {
            prompt += "\nIMPORTANT: This is a MULTIPLE CHOICE question where MULTIPLE options can be correct. Analyze the question carefully and provide ALL correct options.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C and A and C are correct: 'A. [text of option A], C. [text of option C]'\n- If options are 1, 2, 3 and 1 and 3 are correct: '1. [text of option 1], 3. [text of option 3]'\n- If only one option is correct, provide just that one: 'B. [text of option B]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the correct option(s) in the exact format shown above, separated by commas if multiple.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
        } else {
            prompt += "\nIMPORTANT: This is a SINGLE CHOICE question where ONLY ONE option is correct. Analyze the question carefully and provide the single correct option.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C: 'A. [text of option A]' or 'C. [text of option C]'\n- If options are 1, 2, 3: '1. [text of option 1]' or '3. [text of option 3]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the single correct answer in the exact format shown above.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
        }
    }
    
    try {
        let apiUrl, requestBody, headers;
        
        // Configure API call based on provider
        switch (aiProvider) {
            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestBody = {
                    model: modelName || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                };
                break;
                
            case 'anthropic':
                apiUrl = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                };
                requestBody = {
                    model: modelName || 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;
                
            case 'google':
                const googleModel = modelName || 'gemini-2.5-flash';
                apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`;
                headers = {
                    'Content-Type': 'application/json'
                };
                requestBody = {
                    contents: [{ parts: [{ text: prompt }] }]
                };
                break;
                
            case 'deepseek':
                apiUrl = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestBody = {
                    model: modelName || 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                };
                break;
                
            case 'custom':
                if (!customEndpoint) {
                    return {
                        error: 'Custom endpoint not configured',
                        errorType: 'config',
                        detailedInfo: 'Please configure a custom API endpoint in the extension settings.'
                    };
                }
                apiUrl = customEndpoint;
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestBody = {
                    model: modelName || 'default',
                    messages: [{ role: 'user', content: prompt }]
                };
                break;
                
            default:
                return {
                    error: 'Unknown AI provider',
                    errorType: 'config',
                    detailedInfo: 'The selected AI provider is not supported.'
                };
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                error: `API request failed: ${response.status}`,
                errorType: 'api',
                detailedInfo: errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`
            };
        }
        
        const data = await response.json();
        
        // Extract response based on provider
        let responseText;
        switch (aiProvider) {
            case 'openai':
            case 'deepseek':
                responseText = data.choices?.[0]?.message?.content;
                break;
                
            case 'anthropic':
                responseText = data.content?.[0]?.text;
                break;
                
            case 'google':
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                break;
                
            case 'custom':
                // Try common response formats
                responseText = data.choices?.[0]?.message?.content || 
                              data.content?.[0]?.text || 
                              data.response || 
                              data.text;
                break;
        }
        
        if (!responseText) {
            return {
                error: 'Invalid API response format',
                errorType: 'parse',
                detailedInfo: 'Could not extract response text from API response.'
            };
        }
        
        return responseText;
        
    } catch (error) {
        return {
            error: 'Network or API error',
            errorType: 'network',
            detailedInfo: error.message || 'Failed to connect to the custom AI API. Please check your configuration.'
        };
    }
}


const API_BASE_URL = 'https://api.neopass.tech';
// Listen for messages from Chrome runtime for ChatBot
// Helper function to get tokens from chrome storage
async function getTokens() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['accessToken', 'refreshToken', 'isPro'], resolve);
    });
}

// Helper function to make authenticated request
async function makeAuthenticatedRequest(url, method, token, body = null) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const options = {
        method,
        headers,
        ...(body && {
            body: JSON.stringify(body)
        })
    };

    return fetch(url, options);
}

// Listen for test custom API message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "testCustomAPI") {
        (async () => {
            try {
                const config = message.config;
                const testPrompt = "Hello, this is a test message. Please respond with 'API connection successful!' if you receive this.";
                
                const result = await queryCustomAPI(testPrompt, false, false, config);
                
                if (typeof result === 'string') {
                    sendResponse({
                        success: true,
                        message: 'API connection successful!'
                    });
                } else {
                    sendResponse({
                        success: false,
                        error: result.detailedInfo || result.error
                    });
                }
            } catch (error) {
                sendResponse({
                    success: false,
                    error: error.message || 'Unknown error occurred'
                });
            }
        })();
        return true; // Keep the message channel open
    }
});

// Listen for messages from Chrome runtime for ChatBot
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "processChatMessage") {
        // Use async/await properly with Promise
        (async () => {
            try {
                await handleChatMessage(message, sender);
                sendResponse({
                    success: true
                });
            } catch (error) {
                console.error('Chat processing error:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        })();
        return true; // Keep the message channel open
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
        (async () => {
            try {
                // Format prompt based on question type
                let queryText;
                if (request.isCoding) {
                    if (request.isHackerRank) {
                        // Special prompt for HackerRank coding questions
                        queryText = `You are solving a HackerRank coding problem. Provide ONLY the complete solution code that can be directly run.

IMPORTANT REQUIREMENTS:
- Provide ONLY the solution code, no explanations or comments
- The code must be complete and ready to run
- Include all necessary imports and function definitions
- Handle input/output exactly as specified
- Ensure the solution passes all test cases

${request.question}

Respond with ONLY the ${request.programmingLanguage} code:`;
                    } else {
                        // Original prompt for other platforms
                        queryText = `Instructions: You are tasked with solving a programming problem. Respond strictly with the solution code in the required programming language. 
                            Ensure the code: Meets the requirements outlined in the problem statement.
                            Stricly Passes all test cases, including edge cases and boundary conditions.
                            Always get the input from the users.` +
                            `Question:\n${request.question}\n\n` +
                            (request.programmingLanguage ? `Solve Striclty Using This Programing Language:\n${request.programmingLanguage}` : '') +
                        (request.inputFormat ? `Input Format:\n${request.inputFormat}\n\n` : '') +
                        (request.outputFormat ? `Output Format:\n${request.outputFormat}\n\n` : '') +
                        (request.testCases ? `Test Cases:\n${request.testCases}` : '');
                    }
                } else {
                    // MCQ handling with support for multiple choice
                    queryText = request.code ?
                        `${request.question.trim()}\nCode:\n${request.code.trim()}\nOptions:\n${request.options.trim()}` :
                        `${request.question.trim()}\nOptions:\n${request.options.trim()}`;
                }

                // Add console logging for the prompt
                console.log('Sending prompt to API:', {
                    type: request.isCoding ? 'Coding Question' : 'MCQ',
                    prompt: queryText,
                    length: queryText.length
                });                // Send query and handle response
                const response = await queryRequest(queryText, request.isMCQ, request.isMultipleChoice, sender.tab.id);
                
                // Check if response is successful (string) or contains error
                if (response && typeof response === 'string') {
                    // Success case
                    console.log('AI Response received:', {
                        type: request.isCoding ? 'Coding Question' : 'MCQ',
                        isHackerRank: request.isHackerRank,
                        isMultipleChoice: request.isMultipleChoice,
                        response: response,
                        responseLength: response.length
                    });
                    
                    handleQueryResponseForIamNeoExamly(response, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice);
                    sendResponse({
                        success: true,
                        response,
                        status: 'success'
                    });
                } else if (response && response.error) {
                    // Error case - handle the error through the response handler
                    handleQueryResponseForIamNeoExamly(response, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice);
                    sendResponse({
                        error: response.error,
                        status: 'error',
                        errorType: response.errorType
                    });
                } else {
                    // Fallback case
                    console.error('No response received from AI service');
                    handleQueryResponseForIamNeoExamly(null, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice);
                    sendResponse({
                        error: 'No response from query service',
                        status: 'error',
                        errorType: 'general'
                    });
                }

            } catch (error) {
                console.error("Query processing error:", error);
                
                // Show a generic error toast only if the error wasn't already handled by queryRequest
                showToast(sender.tab.id, 'An unexpected error occurred. Please try again.', true, 'The request failed due to an unexpected error. This may be temporary.');
                
                sendResponse({
                    error: error.message,
                    status: 'error',
                    details: error.toString()
                });
            }
        })();

        return true; // Keep message channel open for async response
    }
});

async function handleChatMessage(message, sender) {
    try {
        // Check if user has custom API configured
        const customAPIConfig = await getCustomAPIConfig();
        
        if (customAPIConfig.useCustomAPI && customAPIConfig.apiKey) {
            // Use custom API for chat
            const chatPrompt = message.context 
                ? `Context: ${message.context}\n\nUser: ${message.message}\n\nPlease provide a helpful response.`
                : message.message;
                
            const result = await queryCustomAPI(chatPrompt, false, false, customAPIConfig);
            
            if (typeof result === 'string') {
                sendChatResponse(sender.tab.id, result);
            } else {
                sendChatErrorResponse(sender.tab.id, result.error || 'Failed to get response from custom API');
            }
            return;
        }
        
        // Check if user is logged in
        const {
            accessToken,
            refreshToken,
            isPro
        } = await getTokens();

        // If not logged in and no custom API configured, require custom API
        if (!accessToken || !refreshToken) {
            sendChatErrorResponse(sender.tab.id, "Please configure your custom API key in Settings or login with Pro to use our proxy-server.");
            return;
        }

        // Always use Pro endpoint
        const chatEndpoint = `${API_BASE_URL}/api/pro-chat`;

        const requestBody = {
            message: message.message,
            context: message.context,
            refreshToken: refreshToken  // Send refresh token for server-side auto-refresh
        };

        // Include image if present
        if (message.image) {
            requestBody.image = message.image;
        }

        let response = await makeAuthenticatedRequest(
            chatEndpoint,
            "POST",
            accessToken,
            requestBody
        );

        // Server automatically handles token refresh if access token expired
        // If auth fails, it means refresh token is also invalid/expired
        if (!response.ok && (response.status === 401 || response.status === 403)) {
            // Check if this is an auth error vs Pro subscription error
            try {
                const errorData = await response.json();
                if (errorData.message && errorData.message.includes('subscription')) {
                    // This is a Pro subscription issue, not an auth issue
                    sendChatErrorResponse(sender.tab.id, "Your Pro subscription is required or has expired. Please upgrade or renew.");
                    return;
                }
            } catch (e) {
                // Couldn't parse error, assume auth failure
            }
            
            // Authentication failed - clear tokens
            chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']);
            sendChatErrorResponse(sender.tab.id, "Session expired. Please log in again.");
            return;
        }

        // Handle different error scenarios with specific user messages
        if (!response.ok) {
            let errorMessage = "Sorry, I encountered an error processing your message.";
            
            try {
                const errorData = await response.json();
                
                if (response.status === 429) {
                    if (errorData.error && errorData.error.includes('Token limit exceeded')) {
                        errorMessage = "Token limit exceeded. Please upgrade or wait for your limit to reset.";
                        if (errorData.details) {
                            errorMessage += ` (Used: ${errorData.details.used}/${errorData.details.limit})`;
                        }
                    } else if (errorData.message && errorData.message.includes('Daily request limit exceeded')) {
                        errorMessage = "You've reached your daily chat limit. Please try again tomorrow.";
                    } else if (errorData.message && errorData.message.includes('wait for your previous request')) {
                        errorMessage = "Please wait for your previous message to be processed before sending another.";
                    } else {
                        errorMessage = "Too many requests. Please wait a moment before trying again.";
                    }
                } else if (response.status === 403) {
                    // Check if this is a Pro subscription expiration
                    if ((errorData.error && (errorData.error.includes('Pro subscription') || errorData.error.includes('active Pro subscription') || errorData.error.includes('subscription') || errorData.error.includes('expired'))) ||
                        (errorData.message && (errorData.message.includes('subscription') || errorData.message.includes('expired')))) {
                        errorMessage = "Your Pro subscription is required or has expired. Please upgrade or renew your Pro subscription to continue using this service.";
                        
                        // Auto-logout user when subscription expires
                        chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username', 'isPro', 'loginTimestamp']);
                        console.log('🔒 Auto-logout: Pro subscription expired');
                    } else if (errorData.message && errorData.message.includes('star')) {
                        errorMessage = "Please star the repository to use the chat feature.";
                    } else {
                        errorMessage = "Access denied. Please check your account status or try logging in again.";
                    }
                } else if (response.status === 500) {
                    errorMessage = "The chat service is temporarily unavailable. Please try again in a moment.";
                } else if (response.status === 400) {
                    errorMessage = "Your message couldn't be processed. Try rephrasing or shortening it.";
                } else {
                    errorMessage = errorData.message || `Service error (${response.status}). Please try again.`;
                }
            } catch (parseError) {
                console.error("Error parsing chat error response:", parseError);
                errorMessage = `Chat service error (${response.status}). Please try again later.`;
            }
            
            // Send error message with proper error role
            sendChatErrorResponse(sender.tab.id, errorMessage);
            return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
            // Server automatically refreshes access token if it expired
            // Store the new access token (refresh token remains unchanged)
            if (data.newAccessToken) {
                await chrome.storage.local.set({ accessToken: data.newAccessToken });
                console.log('✅ Access token auto-refreshed during chat request and stored');
            }
            
            sendChatResponse(sender.tab.id, data.response);
        } else {
            const errorMessage = data.error || "Failed to get a response. Please try again.";
            sendChatErrorResponse(sender.tab.id, `Sorry, ${errorMessage}`);
        }
    } catch (error) {
        console.error("Chat processing error:", error);
        
        let errorMessage = "Sorry, I encountered an error processing your message.";
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = "Unable to connect to the chat service. Please check your connection and try again.";
        } else if (error.message.includes('timeout')) {
            errorMessage = "The request timed out. Please try again.";
        } else {
            errorMessage = "Sorry, I encountered an unexpected error. Please try again or log in again if the issue persists.";
        }
        
        sendChatErrorResponse(sender.tab.id, errorMessage);
    }
}

// Helper function to send chat responses
function sendChatResponse(tabId, content) {
    chrome.tabs.sendMessage(tabId, {
        action: "updateChatHistory",
        role: "assistant",
        content: content
    });
}

// Helper function to send chat error responses (prevents errors from being added to context)
function sendChatErrorResponse(tabId, content) {
    chrome.tabs.sendMessage(tabId, {
        action: "updateChatHistory",
        role: "error",
        content: content
    });
}

// ========================================
// NOTE: Token refresh is now handled automatically by the server
// ========================================
// The server's authenticateTokenWithRefresh middleware automatically:
// 1. Detects when access token expires
// 2. Generates a new access token (keeps same refresh token)
// 3. Returns newAccessToken in the response
// 4. Client stores the new access token
//
// Old client-side refresh logic has been removed as it's no longer needed
// ========================================

async function copyToClipboard(text, tabId) {
    try {
        // Use modern Clipboard API with fallback
        await chrome.scripting.executeScript({
            target: {
                tabId: tabId
            },
            func: async (content) => {
                try {
                    await navigator.clipboard.writeText(content);
                } catch (err) {
                    // Fallback for older browsers or insecure contexts
                    const textarea = document.createElement('textarea');
                    textarea.textContent = content;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
            },
            args: [text]
        });
        return true;
    } catch (err) {
        console.error('Failed to copy text:', err);
        return false;
    }
}

function copyToClipboard(text) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: {
                    tabId: tabs[0].id
                },
                func: async function(content) {
                    try {
                        await navigator.clipboard.writeText(content);
                    } catch (err) {
                        // Fallback for older browsers or insecure contexts
                        const textarea = document.createElement('textarea');
                        textarea.textContent = content;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    }
                },
                args: [text]
            });
        }
    });
}

async function checkStealthMode() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['stealth'], (result) => {
            resolve(result.stealth === true);
        });
    });
}

// Define opacity levels for toast messages
const opacityLevels = {
    high: 1.0,
    medium: 0.5,
    low: 0.2
};

// Default opacity level
let currentOpacityLevel = "high";

// Track active toast element ID
let activeToastId = null;

// Function to remove any existing toast
function removeExistingToast(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function() {
            // Remove all possible toast types
            const toastSelectors = [
                '#neopass-active-toast',
                '#stealth-mode-toast',
                '.neopass-update-toast',
                '[id*="toast"]',
                '[class*="toast"]'
            ];
            
            toastSelectors.forEach(selector => {
                const existingToasts = document.querySelectorAll(selector);
                existingToasts.forEach(toast => {
                    if (toast && toast.parentNode) {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(10px) translateX(-50%)';
                        setTimeout(() => {
                            if (toast.parentNode) {
                                toast.remove();
                            }
                        }, 100);
                    }
                });
            });
        }
    });
}

// Function to toggle and store toast opacity level
async function toggleToastOpacity() {
    // Rotate through opacity levels
    switch (currentOpacityLevel) {
        case "high":
            currentOpacityLevel = "medium";
            break;
        case "medium":
            currentOpacityLevel = "low";
            break;
        case "low":
            currentOpacityLevel = "high";
            break;
        default:
            currentOpacityLevel = "high";
    }

    // Store the new opacity level
    await chrome.storage.local.set({
        'toastOpacityLevel': currentOpacityLevel
    });

    // Show feedback toast with current opacity level
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        if (tabs[0]) {
            showOpacityLevelToast(tabs[0].id, `Toast opacity set to: ${currentOpacityLevel}`);
        }
    });

    return currentOpacityLevel;
}

// Get the current toast opacity value
async function getToastOpacity() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            if (result.toastOpacityLevel) {
                currentOpacityLevel = result.toastOpacityLevel;
            }
            resolve(opacityLevels[currentOpacityLevel] || 1.0);
        });
    });
}

// Show a toast with the current opacity level
function showOpacityLevelToast(tabId, message) {
    // Remove any existing toast first
    removeExistingToast(tabId);
    
    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, opacityLevel) {
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-active-toast'; // Add ID for tracking
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(15, 15, 20, 0.95)';
            toast.style.color = '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacityLevel;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '320px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
            
            // Create message container with icon
            const messageContainer = document.createElement('div');
            messageContainer.style.display = 'flex';
            messageContainer.style.alignItems = 'center';
            messageContainer.style.gap = '10px';
            messageContainer.style.flexGrow = '1';
            
            // Settings icon (blue indicator dot)
            const settingsIcon = document.createElement('span');
            settingsIcon.style.display = 'inline-block';
            settingsIcon.style.width = '8px';
            settingsIcon.style.height = '8px';
            settingsIcon.style.backgroundColor = '#64b5f6';
            settingsIcon.style.borderRadius = '50%';
            settingsIcon.style.boxShadow = '0 0 4px rgba(100, 181, 246, 0.6)';
            
            // Message text
            const messageText = document.createElement('span');
            messageText.textContent = msg;
            messageText.style.fontSize = '14px';
            messageText.style.fontWeight = '500';
            messageText.style.lineHeight = '1.4';
            messageText.style.wordBreak = 'break-word';
            
            messageContainer.appendChild(settingsIcon);
            messageContainer.appendChild(messageText);
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.marginLeft = '8px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';
            
            // Create opacity indicator using text badges
            const opacityIndicator = document.createElement('div');
            opacityIndicator.style.marginTop = '10px';
            opacityIndicator.style.width = '100%';
            opacityIndicator.style.display = 'flex';
            opacityIndicator.style.alignItems = 'center';
            opacityIndicator.style.justifyContent = 'space-between';
            opacityIndicator.style.gap = '8px';
            
            // Helper function to create opacity badge
            function createOpacityBadge(level, text, isActive) {
                const badge = document.createElement('div');
                badge.textContent = text;
                badge.style.fontSize = '11px';
                badge.style.padding = '3px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontWeight = isActive ? '600' : '400';
                
                if (isActive) {
                    badge.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    badge.style.color = 'white';
                } else {
                    badge.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    badge.style.color = 'rgba(255, 255, 255, 0.5)';
                }
                
                return badge;
            }
            
            // Add opacity level indicators
            const lowBadge = createOpacityBadge('low', 'Low', opacityLevel <= 0.2);
            const mediumBadge = createOpacityBadge('medium', 'Medium', opacityLevel > 0.2 && opacityLevel < 1.0);
            const highBadge = createOpacityBadge('high', 'High', opacityLevel >= 1.0);
            
            opacityIndicator.appendChild(lowBadge);
            opacityIndicator.appendChild(mediumBadge);
            opacityIndicator.appendChild(highBadge);
            
            // Event listeners
            closeBtn.onmouseover = function() {
                closeBtn.style.color = '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onclick = function() {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };
            
            // Assemble the toast
            headerContainer.appendChild(messageContainer);
            headerContainer.appendChild(closeBtn);
            
            toast.appendChild(headerContainer);
            toast.appendChild(opacityIndicator);
            
            document.body.appendChild(toast);
            
            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);
            
            // Auto-hide toast after a delay
            let hideTimeoutId = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },
        args: [message, opacityLevels[currentOpacityLevel]]
    });
}

// Update existing showToast function to use the current opacity level
async function showToast(tabId, message, isError = false, detailedInfo = '') {
    const opacity = await getToastOpacity();
    
    // Set default detailed info if not provided
    if (!detailedInfo) {
        if (isError) {
            detailedInfo = 'Possible causes:\n• Network connection issues\n• Server timeout\n• Authorization issues\n• Extension needs to be updated';
        } else {
            detailedInfo = 'Operation completed successfully.';
        }
    }

    // Remove any existing toast first
    await removeExistingToast(tabId);

    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, isError, opacity, detailedInfo) {
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-active-toast'; // Add ID for tracking
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = isError ? 'rgba(40, 10, 10, 0.95)' : 'rgba(15, 15, 20, 0.95)';
            toast.style.color = isError ? '#ff6b6b' : '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacity;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '320px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = isError ? '1px solid rgba(255, 107, 107, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'flex-start';
            
            // Create message container
            const messageContainer = document.createElement('div');
            messageContainer.style.flexGrow = '1';
            messageContainer.style.marginRight = '12px';
            
            // Add indicator dot
            const indicatorDot = document.createElement('span');
            indicatorDot.style.display = 'inline-block';
            indicatorDot.style.width = '8px';
            indicatorDot.style.height = '8px';
            indicatorDot.style.backgroundColor = isError ? '#ff6b6b' : '#4ade80';
            indicatorDot.style.borderRadius = '50%';
            indicatorDot.style.marginRight = '8px';
            indicatorDot.style.boxShadow = isError ? '0 0 4px rgba(255, 107, 107, 0.6)' : '0 0 4px rgba(74, 222, 128, 0.6)';
            
            // Add message text
            const messageText = document.createElement('span');
            messageText.textContent = msg;
            messageText.style.fontSize = '14px';
            messageText.style.fontWeight = '500';
            messageText.style.lineHeight = '1.4';
            messageText.style.wordBreak = 'break-word';
            
            // Combine dot and text
            const messageContent = document.createElement('div');
            messageContent.style.display = 'flex';
            messageContent.style.alignItems = 'center';
            messageContent.appendChild(indicatorDot);
            messageContent.appendChild(messageText);
            
            messageContainer.appendChild(messageContent);
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.alignItems = 'center';
            buttonsContainer.style.marginLeft = '8px';
            
            // Info button
            const infoBtn = document.createElement('button');
            infoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            infoBtn.title = 'Show more information';
            infoBtn.style.background = 'none';
            infoBtn.style.border = 'none';
            infoBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            infoBtn.style.cursor = 'pointer';
            infoBtn.style.padding = '2px';
            infoBtn.style.marginRight = '6px';
            infoBtn.style.borderRadius = '4px';
            infoBtn.style.lineHeight = '0';
            infoBtn.style.transition = 'all 0.2s';
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';

            // Detailed info container (initially hidden)
            const detailedInfoContainer = document.createElement('div');
            detailedInfoContainer.style.marginTop = '12px';
            detailedInfoContainer.style.padding = '10px 12px';
            detailedInfoContainer.style.backgroundColor = isError ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            detailedInfoContainer.style.borderRadius = '6px';
            detailedInfoContainer.style.fontSize = '13px';
            detailedInfoContainer.style.display = 'none';
            detailedInfoContainer.style.maxHeight = '120px';
            detailedInfoContainer.style.overflow = 'auto';
            detailedInfoContainer.style.lineHeight = '1.4';
            detailedInfoContainer.style.color = isError ? 'rgba(255, 107, 107, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            detailedInfoContainer.textContent = detailedInfo;

            // Add event listeners
            let expanded = false;
            let hideTimeoutId = null;
            
            infoBtn.onmouseover = function() {
                infoBtn.style.color = isError ? '#ff6b6b' : '#ffffff';
                infoBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            infoBtn.onmouseout = function() {
                infoBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                infoBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onmouseover = function() {
                closeBtn.style.color = isError ? '#ff6b6b' : '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            infoBtn.onclick = function() {
                expanded = !expanded;
                detailedInfoContainer.style.display = expanded ? 'block' : 'none';
                infoBtn.innerHTML = expanded ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                
                // Clear the auto-hide timeout when info is expanded
                if (expanded) {
                    if (hideTimeoutId) {
                        clearTimeout(hideTimeoutId);
                        hideTimeoutId = null;
                    }
                } else {
                    // Restart the auto-hide timer when info is collapsed
                    hideTimeoutId = setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(10px) translateX(-50%)';
                        setTimeout(() => toast.remove(), 300);
                    }, 5000);
                }
            };
            
            closeBtn.onclick = function() {
                // Clear any existing timeout
                if (hideTimeoutId) {
                    clearTimeout(hideTimeoutId);
                    hideTimeoutId = null;
                }
                
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };

            // Assemble the toast
            buttonsContainer.appendChild(infoBtn);
            buttonsContainer.appendChild(closeBtn);
            headerContainer.appendChild(messageContainer);
            headerContainer.appendChild(buttonsContainer);
            
            toast.appendChild(headerContainer);
            toast.appendChild(detailedInfoContainer);
            
            document.body.appendChild(toast);

            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);

            // Set initial auto-hide timeout
            hideTimeoutId = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },
        args: [message, isError, opacity, detailedInfo]
    });
}

// Show stealth mode toast notification
async function showStealthToast(tabId, message, stealthEnabled) {
    const opacity = await getToastOpacity();
    
    // Remove any existing toast first
    await removeExistingToast(tabId);

    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, stealthEnabled, opacity) {
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-active-toast'; // Use same ID for tracking
            
            // Set colors based on stealth mode state
            const textColor = stealthEnabled ? '#4ade80' : '#ff6b6b';
            
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(15, 15, 20, 0.95)';
            toast.style.color = '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacity;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '480px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
            
            // Create message container with icon
            const messageContainer = document.createElement('div');
            messageContainer.style.display = 'flex';
            messageContainer.style.alignItems = 'center';
            messageContainer.style.gap = '10px';
            messageContainer.style.flexGrow = '1';
            messageContainer.style.marginRight = '12px';
            
            // Add indicator dot
            const indicatorDot = document.createElement('span');
            indicatorDot.style.display = 'inline-block';
            indicatorDot.style.width = '8px';
            indicatorDot.style.height = '8px';
            indicatorDot.style.backgroundColor = textColor;
            indicatorDot.style.borderRadius = '50%';
            indicatorDot.style.boxShadow = `0 0 4px ${stealthEnabled ? 'rgba(74, 222, 128, 0.6)' : 'rgba(255, 107, 107, 0.6)'}`;
            
            // Message text
            const messageText = document.createElement('span');
            messageText.innerHTML = msg.replace(/\n/g, '<br>');
            messageText.style.fontSize = '14px';
            messageText.style.fontWeight = '500';
            messageText.style.lineHeight = '1.4';
            messageText.style.wordBreak = 'break-word';
            messageText.style.color = textColor;
            messageText.style.textAlign = 'center';
            messageText.style.flex = '1';
            
            messageContainer.appendChild(indicatorDot);
            messageContainer.appendChild(messageText);
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';
            
            // Event listeners
            closeBtn.onmouseover = function() {
                closeBtn.style.color = '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onclick = function() {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };
            
            // Assemble the toast
            headerContainer.appendChild(messageContainer);
            headerContainer.appendChild(closeBtn);
            
            toast.appendChild(headerContainer);
            
            document.body.appendChild(toast);

            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },
        args: [message, stealthEnabled, opacity]
    });

    // Update storage with new stealth mode state
    chrome.storage.local.set({ stealth: stealthEnabled });
}

// Add toast opacity toggle message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleToastOpacity') {
        toggleToastOpacity()
            .then(newLevel => {
                sendResponse({
                    success: true,
                    level: newLevel
                });
            })
            .catch(error => {
                console.error("Error toggling opacity:", error);
                sendResponse({
                    success: false,
                    error: error.toString()
                });
            });
        return true; // Keep the message channel open for async response
    }

});

// Initialize opacity level from storage on startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['toastOpacityLevel'], (result) => {
        if (result.toastOpacityLevel) {
            currentOpacityLevel = result.toastOpacityLevel;
        }
    });
});

// Event listeners
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        tabDetails = tab;
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        tabDetails = tab;
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
    }
    chrome.tabs.query({
        active: true,
        windowId: windowId
    }, (tabs) => {
        if (tabs.length > 0) {
            tabDetails = tabs[0];
        }
    });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    currentKey = message.key;
    if (message.action === "pageReloaded" || message.action === "windowFocus") {} else if (message.action === "openNewTab") {
        openNewMinimizedWindowWithUrl(message.url);
    }
    if (message.action === 'showToast') {
        showToast(sender.tab.id, message.message, message.isError);
    }
    if (message.action === 'showStealthToast') {
        showStealthToast(sender.tab.id, message.message, message.stealthEnabled);
    }
    if (message.action === 'showMCQToast') {
        showMCQToast(sender.tab.id, message.message);
    }
});

// Add storage change listener for remote logout
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // Check if refreshToken was removed (remote logout)
        if (changes.refreshToken && changes.refreshToken.newValue === undefined) {
            // Clear all auth data
            chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username']);

            // Notify active tabs about logout
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                            action: 'remoteLogout'
                        })
                        .catch(() => {}); // Ignore errors for inactive tabs
                });
            });
        }
    }
});

// Always-active integration
const log = (...args) => chrome.storage.local.get({
    log: false
}, prefs => prefs.log && console.log(...args));

const activate = () => {
    if (activate.busy) {
        return;
    }
    activate.busy = true;

    chrome.storage.local.get({
        enabled: true
    }, async prefs => {
        try {
            await chrome.scripting.unregisterContentScripts();

            if (prefs.enabled) {
                const props = {
                    'matches': ['*://*/*'],
                    'allFrames': true,
                    'matchOriginAsFallback': true,
                    'runAt': 'document_start'
                };
                await chrome.scripting.registerContentScripts([{
                    ...props,
                    'id': 'main',
                    'js': ['data/inject/main.js'],
                    'world': 'MAIN'
                }, {
                    ...props,
                    'id': 'isolated',
                    'js': ['data/inject/isolated.js'],
                    'world': 'ISOLATED'
                }]);
            }
        } catch (e) {
            chrome.action.setBadgeBackgroundColor({
                color: '#b16464'
            });
            chrome.action.setBadgeText({
                text: 'E'
            });
            chrome.action.setTitle({
                title: 'Blocker Registration Failed: ' + e.message
            });
            console.error('Blocker Registration Failed', e);
        }
        activate.busy = false;
    });
};

chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);
chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled) {
        activate();
    }
});

// Add new message listener for snippet processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'processSnippets') {
        const {
            snippets
        } = message;

        if (!snippets.header && !snippets.footer) {
            showToast(sender.tab.id, 'No snippets found', true);
            return;
        }

        const combinedText = `// Header Snippet\n${snippets.header}\n\n// Footer Snippet\n${snippets.footer}`;

        // Use existing copyToClipboard function
        copyToClipboard(combinedText);
        showToast(sender.tab.id, 'Snippets copied to clipboard');
    }
});

// Add new message listener for coding question extraction
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractCodingQuestion') {
        const {
            data
        } = message;

        // Format the extracted data
        const formattedText = `Programming Language:
${data.programmingLanguage}

Question:
${data.question}

Input Format:
${data.inputFormat}

Output Format:
${data.outputFormat}

Sample Test Cases:
${data.testCases}`;

        // Copy to clipboard and show notification
        copyToClipboard(formattedText);
        showToast(sender.tab.id, 'Coding question details copied to clipboard');
    }
});

// Add new message listener for reset context (clear chat history)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'resetContext') {
        // Log the context reset for debugging
        console.log('Chat context reset requested from tab:', sender.tab?.id);
        
        // Optionally, you could clear any stored conversation context here
        // For now, just acknowledge the reset
        if (sendResponse) {
            sendResponse({ success: true, message: 'Context reset' });
        }
    }
});

// Session expiration handling
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Function to check if session is expired and logout if needed
// Strict enforcement of 24 hour timeout regardless of activity
async function checkAndHandleSessionExpiration() {
    try {
        const data = await chrome.storage.local.get(['loggedIn', 'loginTimestamp']);

        if (data.loggedIn && data.loginTimestamp) {
            const currentTime = Date.now();
            if (currentTime - data.loginTimestamp > SESSION_DURATION) {
                console.log('24-hour session timeout reached, logging out user');

                // Clear all auth data and custom API keys
                await chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username', 'loginTimestamp', 'stealth', 'useCustomAPI', 'aiProvider', 'customEndpoint', 'customAPIKey', 'customModelName']);

                // Refresh all tabs to apply logout state
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        // First notify tabs about session expiration
                        try {
                            chrome.tabs.sendMessage(tab.id, {
                                    action: 'sessionExpired'
                                })
                                .catch(() => {}); // Ignore errors for tabs that can't receive messages
                        } catch (err) {
                            // Ignore errors
                        }

                        // Then refresh all tabs
                        try {
                            chrome.tabs.reload(tab.id);
                        } catch (err) {
                            // Ignore errors if tab can't be reloaded
                        }
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error checking session expiration:', error);
    }
}

// Set up alarm for periodic session checks - check frequently to ensure timely logout
chrome.alarms.create('sessionExpirationCheck', {
    periodInMinutes: 5 // Check every 5 minutes to ensure timely logout
});

// Listen for alarm and perform session check
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'sessionExpirationCheck') {
        checkAndHandleSessionExpiration();
    }
    // ...existing alarm handlers...
});

// Also check on startup and when installed
chrome.runtime.onStartup.addListener(() => {
    checkAndHandleSessionExpiration();
});

chrome.runtime.onInstalled.addListener(() => {
    checkAndHandleSessionExpiration();
});

// Check session expiration whenever extension is used
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check session on various message types to ensure frequent validation
    if (message.action) {
        checkAndHandleSessionExpiration();
    }

    return true; // Keep the message channel open for async response
});

// Also add listener for session expired actions from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sessionExpired') {
        // Show notification that session has expired after 24 hours
        showToast(sender.tab.id, 'Your session has expired after 24 hours. Please log in again.', true);
        sendResponse({
            success: true
        });
    }
    return true; // Keep the message channel open for async response
});

// NPTEL Integration
function findAnswer(query) {
    const normalizedQuery = normalizeText(query); // Normalize the query
    const bestAnswers = []; // Array to store the best answers
    let smallestDistance = Infinity; // Track the smallest distance

    for (const item of dataset) {
        const normalizedQuestion = normalizeText(item.question); // Normalize the question
        const distance = levenshteinDistance(normalizedQuery, normalizedQuestion);

        // If the distance is within the threshold
        const threshold = 15; // Adjust this value based on your needs
        if (distance <= threshold) {
            if (distance < smallestDistance) {
                smallestDistance = distance; // Update smallest distance
                bestAnswers.length = 0; // Clear previous answers
                bestAnswers.push(item.answer); // Store the new best answer
            } else if (distance === smallestDistance) {
                bestAnswers.push(item.answer); // Add to the list of best answers
            }
        }
    }

    return bestAnswers.length > 0 ? bestAnswers : null; // Return the best answers or null if none found
}

// Function to calculate the Levenshtein distance
function levenshteinDistance(s1, s2) {
    const dp = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) {
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                dp[i][j] = j; // Deletions
            } else if (j === 0) {
                dp[i][j] = i; // Additions
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // Deletion
                    dp[i][j - 1] + 1, // Insertion
                    dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1) // Substitution
                );
            }
        }
    }
    return dp[s1.length][s2.length];
}

// Normalization function to clean up the text
function normalizeText(text) {
    return text
        .toLowerCase() // Convert to lowercase
        .replace(/[-]/g, ' ') // Replace dashes with spaces
        .replace(/[^\w\s]/g, '') // Remove all non-word characters (except whitespace)
        .trim(); // Trim leading and trailing spaces
}

// Load NPTEL dataset from JSON file
let dataset = [];
async function loadNptelDataset() {
    try {
        const response = await fetch(chrome.runtime.getURL('data/nptel.json'));
        dataset = await response.json();
        console.log(`NPTEL dataset loaded: ${dataset.length} questions`);
    } catch (error) {
        console.error('Failed to load NPTEL dataset:', error);
    }
}

// Load dataset on initialization
loadNptelDataset();

// Update showMCQToast to use the current opacity level and include info button
async function showMCQToast(tabId, message, detailedInfo = '') {
    const opacity = await getToastOpacity();
    
    // Set default detailed info if not provided
    if (!detailedInfo) {
        detailedInfo = 'This is the answer to the MCQ question based on analysis of the question content. If you received an incorrect answer, please try rephrasing your question or providing more context.';
    }

    // Remove any existing toast first
    await removeExistingToast(tabId);

    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, opacity, detailedInfo) {
            // Check if this is "Not an MCQ" response
            const isNotMCQ = msg.toLowerCase().includes("not an mcq");
            
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-active-toast'; // Add ID for tracking
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(15, 15, 20, 0.95)';
            toast.style.color = '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacity;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '400px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
            
            // Create answer container with formatted answer
            const answerContainer = document.createElement('div');
            answerContainer.style.display = 'flex';
            answerContainer.style.alignItems = 'center';
            answerContainer.style.flexGrow = '1';
            
            if (!isNotMCQ) {
                // Parse the message to separate option identifier from answer text
                let optionIdentifier, optionAnswer;
                
                // Handle different format patterns like "A. answer", "1. answer", "A answer", "1 answer"
                const match = msg.match(/^([A-Za-z0-9]+)\.?\s+(.+)$/);
                
                if (match) {
                    optionIdentifier = match[1].trim();
                    optionAnswer = match[2].trim();
                } else {
                    // Fallback if the pattern doesn't match
                    const parts = msg.split(' ');
                    optionIdentifier = parts[0].replace('.', '');
                    optionAnswer = parts.slice(1).join(' ');
                }
                
                // Determine if option is letter or number based
                const isLetter = /^[A-Za-z]$/.test(optionIdentifier);
                const optionColor = isLetter ? '#4285f4' : '#f4b400'; // Blue for letters, Yellow/Gold for numbers
                
                // Option indicator dot
                const optionDot = document.createElement('div');
                optionDot.style.width = '22px';
                optionDot.style.height = '22px';
                optionDot.style.backgroundColor = optionColor;
                optionDot.style.color = 'white';
                optionDot.style.borderRadius = '50%';
                optionDot.style.display = 'flex';
                optionDot.style.alignItems = 'center';
                optionDot.style.justifyContent = 'center';
                optionDot.style.marginRight = '10px';
                optionDot.style.fontWeight = 'bold';
                optionDot.style.fontSize = '12px';
                optionDot.style.boxShadow = `0 2px 4px ${optionColor}66`;
                optionDot.textContent = optionIdentifier.toUpperCase();
                
                // Answer text
                const answerText = document.createElement('span');
                answerText.textContent = optionAnswer;
                answerText.style.fontSize = '14px';
                answerText.style.fontWeight = '500';
                
                answerContainer.appendChild(optionDot);
                answerContainer.appendChild(answerText);
            } else {
                // For "Not an MCQ" response - no icon, just show the text
                const messageText = document.createElement('span');
                messageText.textContent = msg;
                messageText.style.fontSize = '14px';
                messageText.style.fontWeight = '500';
                
                answerContainer.appendChild(messageText);
            }
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.alignItems = 'center';
            buttonsContainer.style.marginLeft = '10px';
            
            // Info button
            const infoBtn = document.createElement('button');
            infoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            infoBtn.title = 'Show more information';
            infoBtn.style.background = 'none';
            infoBtn.style.border = 'none';
            infoBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            infoBtn.style.cursor = 'pointer';
            infoBtn.style.padding = '2px';
            infoBtn.style.marginRight = '6px';
            infoBtn.style.borderRadius = '4px';
            infoBtn.style.lineHeight = '0';
            infoBtn.style.transition = 'all 0.2s';
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';
            
            // Detailed info container (initially hidden)
            const detailedInfoContainer = document.createElement('div');
            detailedInfoContainer.style.marginTop = '12px';
            detailedInfoContainer.style.padding = '10px 12px';
            detailedInfoContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            detailedInfoContainer.style.borderRadius = '6px';
            detailedInfoContainer.style.fontSize = '13px';
            detailedInfoContainer.style.display = 'none';
            detailedInfoContainer.style.maxHeight = '120px';
            detailedInfoContainer.style.overflow = 'auto';
            detailedInfoContainer.style.lineHeight = '1.4';
            detailedInfoContainer.style.color = 'rgba(255, 255, 255, 0.9)';
            detailedInfoContainer.textContent = isNotMCQ ? 
                'The selected text does not appear to be a multiple-choice question. Please try selecting a valid MCQ.' : 
                detailedInfo;
            
            // Add event listeners
            let expanded = false;
            let hideTimeoutId = null;
            
            infoBtn.onmouseover = function() {
                infoBtn.style.color = '#ffffff';
                infoBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            infoBtn.onmouseout = function() {
                infoBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                infoBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onmouseover = function() {
                closeBtn.style.color = '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            infoBtn.onclick = function() {
                expanded = !expanded;
                detailedInfoContainer.style.display = expanded ? 'block' : 'none';
                infoBtn.innerHTML = expanded ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                
                // Clear the auto-hide timeout when info is expanded
                if (expanded) {
                    if (hideTimeoutId) {
                        clearTimeout(hideTimeoutId);
                        hideTimeoutId = null;
                    }
                } else {
                    // Restart the auto-hide timer when info is collapsed
                    hideTimeoutId = setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(10px) translateX(-50%)';
                        setTimeout(() => toast.remove(), 300);
                    }, 5000);
                }
            };
            
            closeBtn.onclick = function() {
                // Clear any existing timeout
                if (hideTimeoutId) {
                    clearTimeout(hideTimeoutId);
                    hideTimeoutId = null;
                }
                
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };
            
            // Assemble the toast
            buttonsContainer.appendChild(infoBtn);
            buttonsContainer.appendChild(closeBtn);
            headerContainer.appendChild(answerContainer);
            headerContainer.appendChild(buttonsContainer);
            
            toast.appendChild(headerContainer);
            toast.appendChild(detailedInfoContainer);
            
            document.body.appendChild(toast);
            
            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);

            // Set initial auto-hide timeout
            hideTimeoutId = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },
        args: [message, opacity, detailedInfo]
    });
}

// Update showNPTELToast to use the current opacity level and include info button
async function showNPTELToast(tabId, message, isError = false, detailedInfo = '') {
    const opacity = await getToastOpacity();
    
    // Set default detailed info if not provided
    if (!detailedInfo) {
        if (isError) {
            detailedInfo = 'Possible issues with NPTEL search:\n• The question may not be in our database\n• Try selecting only the exact question text\n• The question might be newly added to NPTEL';
        } else {
            detailedInfo = 'This answer was found by matching your question with the NPTEL question database. The confidence level depends on how closely your selected text matches a known question.';
        }
    }

    // Remove any existing toast first
    await removeExistingToast(tabId);

    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, isError, opacity, detailedInfo) {
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-active-toast'; // Add ID for tracking
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = isError ? 'rgba(40, 10, 10, 0.95)' : 'rgba(15, 15, 20, 0.95)';
            toast.style.color = isError ? '#ff6b6b' : '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacity;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '320px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = isError ? '1px solid rgba(255, 107, 107, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'flex-start';
            
            // Create message container
            const messageContainer = document.createElement('div');
            messageContainer.style.flexGrow = '1';
            messageContainer.style.marginRight = '12px';
            
            // Add indicator dot
            const indicatorDot = document.createElement('span');
            indicatorDot.style.display = 'inline-block';
            indicatorDot.style.width = '8px';
            indicatorDot.style.height = '8px';
            indicatorDot.style.backgroundColor = isError ? '#ff6b6b' : '#4ade80';
            indicatorDot.style.borderRadius = '50%';
            indicatorDot.style.marginRight = '8px';
            indicatorDot.style.boxShadow = isError ? '0 0 4px rgba(255, 107, 107, 0.6)' : '0 0 4px rgba(74, 222, 128, 0.6)';
            
            // Add message text
            const messageText = document.createElement('span');
            messageText.innerHTML = msg.replace(/\n/g, '<br>'); // Use innerHTML to handle newlines
            messageText.style.fontSize = '14px';
            messageText.style.fontWeight = '500';
            messageText.style.lineHeight = '1.4';
            messageText.style.wordBreak = 'break-word';
            
            // Combine dot and text
            const messageContent = document.createElement('div');
            messageContent.style.display = 'flex';
            messageContent.style.alignItems = 'center';
            messageContent.appendChild(indicatorDot);
            messageContent.appendChild(messageText);
            
            messageContainer.appendChild(messageContent);
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.alignItems = 'center';
            buttonsContainer.style.marginLeft = '8px';
            
            // Info button
            const infoBtn = document.createElement('button');
            infoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            infoBtn.title = 'Show more information';
            infoBtn.style.background = 'none';
            infoBtn.style.border = 'none';
            infoBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            infoBtn.style.cursor = 'pointer';
            infoBtn.style.padding = '2px';
            infoBtn.style.marginRight = '6px';
            infoBtn.style.borderRadius = '4px';
            infoBtn.style.lineHeight = '0';
            infoBtn.style.transition = 'all 0.2s';
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';

            // Detailed info container (initially hidden)
            const detailedInfoContainer = document.createElement('div');
            detailedInfoContainer.style.marginTop = '12px';
            detailedInfoContainer.style.padding = '10px 12px';
            detailedInfoContainer.style.backgroundColor = isError ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            detailedInfoContainer.style.borderRadius = '6px';
            detailedInfoContainer.style.fontSize = '13px';
            detailedInfoContainer.style.display = 'none';
            detailedInfoContainer.style.maxHeight = '120px';
            detailedInfoContainer.style.overflow = 'auto';
            detailedInfoContainer.style.lineHeight = '1.4';
            detailedInfoContainer.style.color = isError ? 'rgba(255, 107, 107, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            detailedInfoContainer.textContent = detailedInfo;

            // Add event listeners
            let expanded = false;
            let hideTimeoutId = null;
            
            infoBtn.onmouseover = function() {
                infoBtn.style.color = isError ? '#ff6b6b' : '#ffffff';
                infoBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            infoBtn.onmouseout = function() {
                infoBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                infoBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onmouseover = function() {
                closeBtn.style.color = isError ? '#ff6b6b' : '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = isError ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            infoBtn.onclick = function() {
                expanded = !expanded;
                detailedInfoContainer.style.display = expanded ? 'block' : 'none';
                infoBtn.innerHTML = expanded ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
                
                // Clear the auto-hide timeout when info is expanded
                if (expanded) {
                    if (hideTimeoutId) {
                        clearTimeout(hideTimeoutId);
                        hideTimeoutId = null;
                    }
                } else {
                    // Restart the auto-hide timer when info is collapsed
                    hideTimeoutId = setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(10px) translateX(-50%)';
                        setTimeout(() => toast.remove(), 300);
                    }, 5000);
                }
            };
            
            closeBtn.onclick = function() {
                // Clear any existing timeout
                if (hideTimeoutId) {
                    clearTimeout(hideTimeoutId);
                    hideTimeoutId = null;
                }
                
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };

            // Assemble the toast
            buttonsContainer.appendChild(infoBtn);
            buttonsContainer.appendChild(closeBtn);
            headerContainer.appendChild(messageContainer);
            headerContainer.appendChild(buttonsContainer);
            
            toast.appendChild(headerContainer);
            toast.appendChild(detailedInfoContainer);
            
            document.body.appendChild(toast);

            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);

            // Set initial auto-hide timeout
            hideTimeoutId = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },
        args: [message, isError, opacity, detailedInfo]
    });
}
// Show a spinner toast while AI query is being processed
async function showSpinnerToast(tabId, message = 'Processing your request...') {
    const opacity = await getToastOpacity();
    
    // Remove any existing toast first
    await removeExistingToast(tabId);

    chrome.scripting.executeScript({
        target: {
            tabId: tabId
        },
        func: function(msg, opacity) {
            // Create toast container
            const toast = document.createElement('div');
            toast.id = 'neopass-spinner-toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = 'rgba(15, 15, 20, 0.95)';
            toast.style.color = '#f8f9fa';
            toast.style.padding = '14px 16px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.opacity = opacity;
            toast.style.transition = 'all 0.3s ease';
            toast.style.maxWidth = '320px';
            toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            toast.style.backdropFilter = 'blur(10px)';
            toast.style.WebkitBackdropFilter = 'blur(10px)';
            
            // Create header container
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
            
            // Create message container with spinner
            const messageContainer = document.createElement('div');
            messageContainer.style.display = 'flex';
            messageContainer.style.alignItems = 'center';
            messageContainer.style.gap = '10px';
            messageContainer.style.flexGrow = '1';
            
            // Spinner indicator (pulsing dot)
            const spinnerDot = document.createElement('span');
            spinnerDot.style.display = 'inline-block';
            spinnerDot.style.width = '8px';
            spinnerDot.style.height = '8px';
            spinnerDot.style.backgroundColor = '#64b5f6';
            spinnerDot.style.borderRadius = '50%';
            spinnerDot.style.boxShadow = '0 0 4px rgba(100, 181, 246, 0.6)';
            spinnerDot.style.animation = 'pulse 1.5s ease-in-out infinite';
            
            // Message text
            const messageText = document.createElement('span');
            messageText.textContent = msg;
            messageText.style.fontSize = '14px';
            messageText.style.fontWeight = '500';
            messageText.style.lineHeight = '1.4';
            messageText.style.wordBreak = 'break-word';
            
            messageContainer.appendChild(spinnerDot);
            messageContainer.appendChild(messageText);
            
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.title = 'Close';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.padding = '2px';
            closeBtn.style.marginLeft = '8px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.lineHeight = '0';
            closeBtn.style.transition = 'all 0.2s';
            
            // Add CSS animation keyframes
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { 
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% { 
                        opacity: 0.5;
                        transform: scale(1.2);
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Event listeners
            closeBtn.onmouseover = function() {
                closeBtn.style.color = '#ffffff';
                closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            closeBtn.onmouseout = function() {
                closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            closeBtn.onclick = function() {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) translateX(-50%)';
                setTimeout(() => toast.remove(), 300);
            };
            
            // Assemble and append
            headerContainer.appendChild(messageContainer);
            headerContainer.appendChild(closeBtn);
            toast.appendChild(headerContainer);
            
            document.body.appendChild(toast);
            
            // Add entrance animation
            toast.style.transform = 'translateY(10px) translateX(-50%)';
            setTimeout(() => {
                toast.style.transform = 'translateY(0) translateX(-50%)';
            }, 10);
        },
        args: [message, opacity]
    });
}
