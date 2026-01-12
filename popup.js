document.addEventListener('DOMContentLoaded', function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    
    const statusMessage = document.getElementById('statusMessage');
    const mainContent = document.getElementById('mainContent');
    const errorElement = document.getElementById('error');
    const logoutButton = document.getElementById('logoutButton');
    const toastOpacityToggle = document.getElementById('toastOpacityToggle');
    const opacityLevelDisplay = document.getElementById('opacityLevel');
    const uninstallButton = document.getElementById('uninstallButton');
    const apiKeyInput = document.getElementById('apiKey');
    const customEndpointInput = document.getElementById('customEndpoint');
    const modelNameInput = document.getElementById('modelName');
    
    // Custom API Configuration elements
    const useCustomAPIToggle = document.getElementById('useCustomAPI');
    const customAPIForm = document.getElementById('customAPIForm');
    const aiProviderSelect = document.getElementById('aiProvider');
    const customEndpointDiv = document.getElementById('customEndpointDiv');
    const testAPIConfigButton = document.getElementById('testAPIConfig');
    
    // Login form elements
    const paidUsernameInput = document.getElementById('paidUsername');
    const paidPasswordInput = document.getElementById('paidPassword');
    const paidLoginButton = document.getElementById('paidLoginButton');

    const API_BASE_URL = 'https://api.neopass.tech';
    const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    const CUSTOM_API_STORAGE_KEYS = ['useCustomAPI', 'aiProvider', 'customEndpoint', 'customAPIKey', 'customModelName'];

    // Debounced auto-save function for API configuration
    let saveTimeout;
    function autoSaveAPIConfig() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            // Always get values from settings tab (single source of configuration)
            const apiKey = document.getElementById('apiKey')?.value?.trim();
            const aiProvider = document.getElementById('aiProvider')?.value;
            const customEndpoint = document.getElementById('customEndpoint')?.value?.trim();
            const modelName = document.getElementById('modelName')?.value?.trim();
            const useCustomAPI = document.getElementById('useCustomAPI')?.checked;

            // Check if user is logged in
            const { loggedIn } = await chrome.storage.local.get(['loggedIn']);
            
            // For non-logged-in users, always require custom API
            // For logged-in users, save only if toggle is enabled and API key is provided
            if ((!loggedIn || useCustomAPI) && apiKey) {
                try {
                    await chrome.storage.local.set({
                        useCustomAPI: true,
                        aiProvider: aiProvider,
                        customEndpoint: customEndpoint,
                        customAPIKey: apiKey,
                        customModelName: modelName
                    });
                    console.log('API configuration auto-saved');
                    // Show a subtle success indication
                    showError('API configuration saved', 1500);
                } catch (error) {
                    console.error('Error auto-saving API configuration:', error);
                    showError('Failed to save API configuration', 2000);
                }
            }
        }, 1000); // Save after 1 second of no changes
    }

    // Function to clear chat history when provider changes
    function clearChatHistoryOnProviderChange() {
        try {
            // Send message to all tabs to clear their chat history
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'clearChatHistory',
                            reason: 'providerChange'
                        }).catch(() => {
                            // Ignore errors for tabs that can't receive messages
                        });
                    } catch (error) {
                        // Ignore errors
                    }
                });
            });
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }

    // Function to update all shortcuts based on platform
    function updateShortcutsForPlatform() {
        // Define shortcut mappings
        const shortcutMappings = {
            // Use Control on macOS for these combos, Alt on others
            'Control + Shift + T': isMac ? 'Control + Shift + T' : 'Alt + Shift + T',
            'Control + Shift + H': isMac ? 'Control + Shift + H' : 'Alt + Shift + H',

            // Alt-based combos render as Option on macOS
            'Option + Shift + A': isMac ? 'Option + Shift + A' : 'Alt + Shift + A',
            'Option + Shift + S': isMac ? 'Option + Shift + S' : 'Alt + Shift + S',
            'Option + Shift + M': isMac ? 'Option + Shift + M' : 'Alt + Shift + M',
            'Option + Shift + N': isMac ? 'Option + Shift + N' : 'Alt + Shift + N',
            'Option + Shift + V': isMac ? 'Option + Shift + V' : 'Alt + Shift + V',
            'Option + C': isMac ? 'Option + C' : 'Alt + C',
            'Option + O': isMac ? 'Option + O' : 'Alt + O'
        };

        // Update all shortcut keys
        document.querySelectorAll('.shortcut-key').forEach(element => {
            const currentText = element.textContent.trim();
            if (shortcutMappings[currentText]) {
                element.textContent = shortcutMappings[currentText];
            }
        });

        // Update the opacity shortcut info text
        const opacityShortcutInfo = document.querySelector('.toggle-info');
        if (opacityShortcutInfo && opacityShortcutInfo.textContent.includes('Shortcut:')) {
            opacityShortcutInfo.textContent = `Shortcut: ${isMac ? 'Option + O' : 'Alt + O'}`;
        }
    }

    // Update chat shortcut display based on platform
    const chatShortcutElement = document.getElementById('chatShortcut');
    if (chatShortcutElement) {
        chatShortcutElement.textContent = isMac ? 'Option+C' : 'Alt+C';
    }

    // Tab Functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active class on buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Function to refresh all tabs - important when changing auth state
    function refreshAllTabs() {
        chrome.tabs.query({}, function(tabs) {
            for (let tab of tabs) {
                chrome.tabs.reload(tab.id);
            }
        });
    }

    // Helper Functions
    function showError(message, duration = 5000) {
        errorElement.innerText = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.innerText = '';
            errorElement.classList.add('hidden');
        }, duration);
    }

    function showLoggedInState(username, isPro, accountData) {
        // Update the Pro tab to show account information
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('accountSection').classList.remove('hidden');
        
        // If account data is provided, display it immediately
        if (accountData) {
            displayAccountInfo(accountData);
        } else {
            // Set loading state and fetch account information
            document.getElementById('accountUsername').textContent = 'Loading...';
            document.getElementById('accountSubscription').textContent = 'Loading...';
            document.getElementById('accountTokenUsage').textContent = 'Loading...';
            fetchAccountInfo();
        }
        
        // Update Custom API UI for logged-in users
        const customAPIInfo = document.getElementById('customAPIInfo');
        const customAPIToggleContainer = document.getElementById('customAPIToggleContainer');
        const useCustomAPIToggle = document.getElementById('useCustomAPI');
        const customAPIForm = document.getElementById('customAPIForm');
        
        // Show toggle and update info text
        customAPIToggleContainer.classList.remove('hidden');
        customAPIInfo.textContent = 'Pro users can use proxy server or their API keys';
        
        // Turn off custom API by default for logged-in users (they can use proxy)
        useCustomAPIToggle.checked = false;
        customAPIForm.classList.add('hidden');
        
        // Remove the custom API config from storage when logging in (default to proxy)
        chrome.storage.local.remove(CUSTOM_API_STORAGE_KEYS);
        
        // Update shortcuts based on platform
        updateShortcutsForPlatform();
    }
    
    // Helper function to display account information
    function displayAccountInfo(account) {
        document.getElementById('accountUsername').textContent = account.username;
        document.getElementById('accountSubscription').textContent = 
            account.isPro ? `Pro (${account.subscriptionPlan || 'Active'})` : 'Free';
        
        if (account.isPro) {
            document.getElementById('accountTokenUsage').textContent = 
                `${account.tokensUsed} / ${account.tokenLimit}`;
        } else {
            document.getElementById('accountTokenUsage').textContent = 
                `${account.requestsToday} / ${account.dailyLimit} requests today`;
        }
    }
    
// Function to fetch account information from backend
async function fetchAccountInfo() {
    try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        
        if (!accessToken) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/account`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const data = await response.json();

        // CHECK 1: Handle Expired Subscription or Invalid Token explicitly
        if (!response.ok) {
            // If the backend says the token is invalid or subscription is expired (403 or 401)
            if (response.status === 403 || response.status === 401) {
                if (data.subscriptionExpired || data.message === 'Invalid token' || data.tokenExpired) {
                    console.log('Session invalid or expired, logging out...');
                    logoutUser(); // Force logout
                    showError(data.message || 'Your session has expired. Please login again.', 5000);
                    return;
                }
            }
        }
        
        if (data.success && data.account) {
            // Check if token was auto-refreshed
            if (data.tokenRefreshed && data.accessToken) {
                await chrome.storage.local.set({ accessToken: data.accessToken });
                console.log('✅ Access token auto-refreshed by /api/account');
            }
            
            // CHECK 2: Double check payment status in the successful response body
            // Sometimes status is 200 but account data shows expired
            if (data.account.payment_status === 'expired' || data.account.accountType === 'expired') {
                 console.log('Account status is expired, logging out...');
                 logoutUser();
                 showError('Your subscription has expired.', 5000);
                 return;
            }

            displayAccountInfo(data.account);
        }
    } catch (error) {
        console.error('Error fetching account info:', error);
        // Optional: If network fails completely, you might not want to logout immediately
        // to allow offline usage if that's a feature, otherwise:
        // showError('Failed to validate session');
    }
}

    function showLoggedOutState() {
        // Show login form in Pro tab
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('accountSection').classList.add('hidden');
        
        // Update Custom API UI for non-logged-in users (require custom API)
        const customAPIInfo = document.getElementById('customAPIInfo');
        const customAPIToggleContainer = document.getElementById('customAPIToggleContainer');
        const useCustomAPIToggle = document.getElementById('useCustomAPI');
        const customAPIForm = document.getElementById('customAPIForm');
        
        // Hide toggle (custom API is mandatory)
        customAPIToggleContainer.classList.add('hidden');
        customAPIInfo.textContent = 'Free users must use their own API keys';
        
        // Always show the API form for free users and force custom API on
        useCustomAPIToggle.checked = true;
        customAPIForm.classList.remove('hidden');
        
        // Enable custom API by default for free users
        autoSaveAPIConfig();
    }

    // Modified function to check if session is expired - enforce strict 24 hour timeout
    function checkSessionExpiration() {
        chrome.storage.local.get(['loginTimestamp'], function(data) {
            if (data.loginTimestamp) {
                const currentTime = Date.now();
                if (currentTime - data.loginTimestamp > SESSION_DURATION) {
                    // Session expired, log out the user
                    logoutUser();
                    showError('Your session has expired after 24 hours. Please log in again.', 5000);
                }
            }
        });
    }

    // Function to handle logout - ensure tabs are refreshed
    function logoutUser() {
        const authKeys = ['loggedIn', 'username', 'accessToken', 'refreshToken', 'isPro', 'stealth', 'loginTimestamp'];
        chrome.storage.local.remove([...authKeys, ...CUSTOM_API_STORAGE_KEYS]);
        showLoggedOutState();
        refreshAllTabs(); // Ensure all tabs are refreshed on logout
    }

    // Add storage change listener
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            // Check for remote logout (refreshToken removed) or local logout
            if ((changes.refreshToken && changes.refreshToken.newValue === undefined) ||
                (changes.loggedIn && changes.loggedIn.newValue === false)) {
                showLoggedOutState();
                showError('You have been logged out', 3000);
                
                // Clear any remaining auth data
                chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username', 'isPro', ...CUSTOM_API_STORAGE_KEYS]);
            }
        }
    });

    // Check login status and session expiration on popup open
    chrome.storage.local.get(['loggedIn', 'username', 'loginTimestamp', 'isPro', 'tokenUsage'], function (data) {
        if (data.loggedIn && data.username) {
            // Check if session has expired - strictly enforce 24 hour timeout
            const currentTime = Date.now();
            if (data.loginTimestamp && currentTime - data.loginTimestamp > SESSION_DURATION) {
                logoutUser();
                showError('Your session has expired after 24 hours. Please log in again.', 5000);
            } else {
                showLoggedInState(data.username, data.isPro, data.tokenUsage);
                initializeOpacityLevel(); // Initialize opacity level display
            }
        } else {
            showLoggedOutState();
        }
        
        // Always load free API configuration
        loadAPIConfiguration();
        
        // Initialize opacity level display
        initializeOpacityLevel();
        
        // Update shortcuts based on platform
        updateShortcutsForPlatform();
    });

    // Run a session check when popup opens
    checkSessionExpiration();

    // Username field: press Enter to move to password field
    if (paidUsernameInput && paidPasswordInput) {
        paidUsernameInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                paidPasswordInput.focus();
            }
        });
    }
    
    // Password field: press Enter to submit login
    if (paidPasswordInput && paidLoginButton) {
        paidPasswordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                paidLoginButton.click();
            }
        });
    }

    // Login button handler for Paid tab
    if (paidLoginButton) {
        paidLoginButton.addEventListener('click', async function () {
            const username = document.getElementById('paidUsername').value.trim();
            const password = document.getElementById('paidPassword').value;
        
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }
        
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        password
                    })
                });
        
                const data = await response.json();
        
                if (data.success) {
                    const loginTimestamp = Date.now(); // Record exact login time

                    // Store login timestamp with other user data
                    await chrome.storage.local.set({
                        loggedIn: true,
                        username: username,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        isPro: data.isPro || false, // Store Pro status
                        stealth: false,  // Default to false
                        loginTimestamp: loginTimestamp // Store login timestamp
                    });
        
                    // Display account info immediately from login response
                    showLoggedInState(username, data.isPro, data.account);
                    
                    // Clear password fields
                    document.getElementById('paidUsername').value = '';
                    document.getElementById('paidPassword').value = '';
                    
                    showError('Logged in successfully!', 2000);
                } else {
                    // Handle subscription expiration specifically
                    if (data.subscriptionExpired) {
                        showError(data.message || 'Your subscription has expired. Please renew to continue.', 7000);
                    } else {
                        showError(data.message || 'Login failed');
                    }
                }
        
            } catch (error) {
                console.error('Login error:', error);
                showError('An error occurred during login. Please try again.');
            }
        });
    }
    
    // Logout button handler
    logoutButton.addEventListener('click', async function () {
        try {
            logoutUser(); // Use the new centralized logout function
            showError('Logged out successfully', 3000);
        } catch (error) {
            console.error('Logout error:', error);
            showError('An error occurred during logout. Please try again.');
        }
    });
    
    // Error handling for network issues
    window.addEventListener('offline', () => {
        showError('No internet connection. Please check your network.');
    });

    // Add input validation for paid username (already defined above)
    if (paidUsernameInput) {
        paidUsernameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, ''); // Only allow alphanumeric, underscore, and hyphen
        });
    }

    // Prevent multiple rapid login attempts
    let lastLoginAttempt = 0;
    const LOGIN_COOLDOWN = 2000; // 2 seconds

    if (paidLoginButton) {
        paidLoginButton.addEventListener('click', function() {
            const now = Date.now();
            if (now - lastLoginAttempt < LOGIN_COOLDOWN) {
                showError('Please wait a moment before trying again');
                return;
            }
            lastLoginAttempt = now;
        });
    }

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason === 'install') {
            chrome.storage.local.clear(); // Clear any existing data
            showLoggedOutState();
        }
    });

    // Initialize toast opacity level from storage
    function initializeOpacityLevel() {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            if (result.toastOpacityLevel) {
                opacityLevelDisplay.textContent = capitalizeFirstLetter(result.toastOpacityLevel);
            } else {
                opacityLevelDisplay.textContent = 'High'; // Default value
            }
        });
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Handle toast opacity toggle button click
    if (toastOpacityToggle) {
        toastOpacityToggle.addEventListener('click', function() {
            chrome.runtime.sendMessage({ action: 'toggleToastOpacity' }, (response) => {
                if (response && response.success) {
                    // Update the displayed level
                    opacityLevelDisplay.textContent = capitalizeFirstLetter(response.level);
                    
                    // Show a temporary success message
                    showError(`Toast opacity set to: ${capitalizeFirstLetter(response.level)}`, 2000);
                }
            });
        });
    }

    // Initialize opacity level on load
    initializeOpacityLevel();
    
    // Load saved API configuration (for Free tab - always accessible)
    function loadAPIConfiguration() {
        chrome.storage.local.get([
            'useCustomAPI',
            'aiProvider',
            'customEndpoint',
            'customAPIKey',
            'customModelName'
        ], (result) => {
            if (result.useCustomAPI) {
                useCustomAPIToggle.checked = true;
                customAPIForm.classList.remove('hidden');
            }
            if (result.aiProvider) {
                document.getElementById('aiProvider').value = result.aiProvider;
                // Show custom endpoint field only if provider is 'custom'
                if (result.aiProvider === 'custom') {
                    customEndpointDiv.classList.remove('hidden');
                } else {
                    // Explicitly hide custom endpoint field for other providers
                    customEndpointDiv.classList.add('hidden');
                }
            } else {
                // If no provider is saved, hide custom endpoint field by default
                customEndpointDiv.classList.add('hidden');
            }
            if (result.customEndpoint && customEndpointInput) {
                customEndpointInput.value = result.customEndpoint;
            }
            if (result.customAPIKey && apiKeyInput) {
                apiKeyInput.value = result.customAPIKey;
            }
            if (result.customModelName && modelNameInput) {
                modelNameInput.value = result.customModelName;
            }
        });
    }



    // Toggle custom API form visibility
    if (useCustomAPIToggle) {
        useCustomAPIToggle.addEventListener('change', async function() {
            if (this.checked) {
                customAPIForm.classList.remove('hidden');
                // Auto-save when toggle is enabled
                autoSaveAPIConfig();
            } else {
                customAPIForm.classList.add('hidden');
                // Explicitly remove custom API configuration when toggle is turned off
                await chrome.storage.local.remove(CUSTOM_API_STORAGE_KEYS);
                if (aiProviderSelect) {
                    aiProviderSelect.selectedIndex = 0;
                }
                if (customEndpointDiv) {
                    customEndpointDiv.classList.add('hidden');
                }
                if (apiKeyInput) {
                    apiKeyInput.value = '';
                }
                if (customEndpointInput) {
                    customEndpointInput.value = '';
                }
                if (modelNameInput) {
                    modelNameInput.value = '';
                }
                
                // Clear chat history when disabling custom API
                clearChatHistoryOnProviderChange();
                
                showError('Custom API disabled. Using default proxy.', 2000);
            }
        });
    }

    // Show/hide custom endpoint field based on provider selection
    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customEndpointDiv.classList.remove('hidden');
            } else {
                customEndpointDiv.classList.add('hidden');
            }
            
            // Clear chat history when switching providers
            clearChatHistoryOnProviderChange();
            
            // Auto-save when provider changes
            autoSaveAPIConfig();
        });
    }

    // Add auto-save listeners to API configuration inputs
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', autoSaveAPIConfig);
    }
    if (customEndpointInput) {
        customEndpointInput.addEventListener('input', autoSaveAPIConfig);
    }
    if (modelNameInput) {
        modelNameInput.addEventListener('input', autoSaveAPIConfig);
    }

    // Test API configuration
    if (testAPIConfigButton) {
        testAPIConfigButton.addEventListener('click', async function() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const aiProvider = document.getElementById('aiProvider').value;
            const customEndpoint = document.getElementById('customEndpoint').value.trim();
            const modelName = document.getElementById('modelName').value.trim();

            if (!apiKey) {
                showError('Please enter an API key first', 3000);
                return;
            }

            // Show loading state
            testAPIConfigButton.textContent = 'Testing...';
            testAPIConfigButton.disabled = true;

            try {
                // Send test message to background script
                chrome.runtime.sendMessage({
                    action: 'testCustomAPI',
                    config: {
                        aiProvider: aiProvider,
                        customEndpoint: customEndpoint,
                        apiKey: apiKey,
                        modelName: modelName
                    }
                }, (response) => {
                    testAPIConfigButton.textContent = 'Test Connection';
                    testAPIConfigButton.disabled = false;

                    if (response && response.success) {
                        showError('✓ API connection successful!', 3000);
                    } else {
                        showError('✗ API connection failed: ' + (response?.error || 'Unknown error'), 5000);
                    }
                });
            } catch (error) {
                testAPIConfigButton.textContent = 'Test Connection';
                testAPIConfigButton.disabled = false;
                showError('Error testing API: ' + error.message, 5000);
            }
        });
    }


    
    // Uninstall button event listener
    if (uninstallButton) {
        uninstallButton.addEventListener('click', async () => {
            try {
                // Clear all storage
                await chrome.storage.local.clear();
                
                // Uninstall the extension
                chrome.management.uninstallSelf();
            } catch (error) {
                console.error('Error during uninstall:', error);
                errorElement.textContent = 'Error uninstalling extension';
            }
        });
    }

    // Add event listener for "Go to Settings" link in Pro tab
    const goToSettingsLink = document.getElementById('goToSettingsLink');
    if (goToSettingsLink) {
        goToSettingsLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Switch to Settings tab
            const settingsTab = document.querySelector('[data-tab="settings-tab"]');
            const proTab = document.querySelector('[data-tab="pro-tab"]');
            
            if (settingsTab && proTab) {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Activate Settings tab
                settingsTab.classList.add('active');
                document.getElementById('settings-tab').classList.add('active');
            }
        });
    }

    // Initialize when content is loaded - dropdown functionality removed
    // All shortcuts are now visible by default
});

