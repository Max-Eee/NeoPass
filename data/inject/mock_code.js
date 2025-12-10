(function() {
    // Check if we're on YouTube or a chrome:// page
    if (window.location.href.toLowerCase().includes('youtube') || 
        window.location.href.toLowerCase().startsWith('chrome://')) {
        // Skip script execution on these pages
        console.log('Script not running on restricted page');
        return;
    }

    // Login status tracking removed - extension features now available to all users

    // Store original fetch function
    const originalFetch = window.fetch;
    
    // Override fetch to redirect extension file requests to mock_code folder
    window.fetch = async function (...args) {
        let url = args[0];
        const options = args[1];

        try {
            if (typeof url === 'string') {
                // Check if this is an extension-related request
                const isExtensionRequest = url.startsWith('chrome-extension://') || 
                                          url.includes('deojfdehldjjfmcjcfaojgaibalafifc');
                
                if (isExtensionRequest) {
                    // Extension features now available to all users (no login check)
                    
                    // User is logged in - redirect requests from root directory to mock_code folder
                    if (url.includes('manifest.json')) {
                        console.log('🎯 Redirecting manifest.json request from:', url);
                        // Change the URL to point to mock_code folder
                        url = url.replace(/manifest\.json$/, 'data/inject/mock_code/manifest.json');
                        console.log('   → Redirected to:', url);
                    }
                    else if (url.includes('minifiedBackground.js')) {
                        console.log('🎯 Redirecting minifiedBackground.js request from:', url);
                        url = url.replace(/minifiedBackground\.js$/, 'data/inject/mock_code/minifiedBackground.js');
                        console.log('   → Redirected to:', url);
                    }
                    else if (url.includes('minifiedContent-script.js') || url.includes('minifiedContent.js')) {
                        console.log('🎯 Redirecting minifiedContent-script.js request from:', url);
                        url = url.replace(/minifiedContent(?:-script)?\.js$/, 'data/inject/mock_code/minifiedContent-script.js');
                        console.log('   → Redirected to:', url);
                    }
                    else if (url.includes('rules.json')) {
                        console.log('🎯 Redirecting rules.json request from:', url);
                        url = url.replace(/rules\.json$/, 'data/inject/mock_code/rules.json');
                        console.log('   → Redirected to:', url);
                    }
                }
            }

            // Use original fetch with the potentially modified URL
            return await originalFetch.call(this, url, options);

        } catch (error) {
            // If anything goes wrong, fall back to original fetch with original args
            return await originalFetch.apply(this, args);
        }
    };

    console.log('✅ Fetch interceptor installed - will handle extension verification based on login status');
})();