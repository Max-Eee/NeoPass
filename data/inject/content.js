window.addEventListener('blur', function() {
    window.focus();
});

// Declare shared isMac variable (this will be the first to run)
window.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
               navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

// Automatically enable text selection on all websites
(function() {
    // Function to enable text selection globally
    function enableTextSelectionGlobally() {
        // Remove CSS rules that disable text selection
        const style = document.createElement('style');
        style.id = 'force-text-selection-style';
        style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            /* Override common classes that disable text selection */
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection,
            .qaas-disable-text-selection *,
            [data-disable-text-selection],
            [data-disable-text-selection] *,
            [unselectable="on"],
            [onselectstart],
            [ondragstart] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
        `;
        
        // Only add if not already present
        if (!document.getElementById('force-text-selection-style')) {
            document.head.appendChild(style);
        }
        
        // Remove specific attributes and classes that disable text selection
        const disabledElements = document.querySelectorAll(`
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection, 
            [data-disable-text-selection],
            [unselectable="on"],
            [onselectstart],
            [ondragstart]
        `);
        
        disabledElements.forEach(element => {
            // Remove classes
            element.classList.remove('no-select', 'noselect', 'unselectable', 'qaas-disable-text-selection');
            
            // Remove attributes
            element.removeAttribute('data-disable-text-selection');
            element.removeAttribute('unselectable');
            element.removeAttribute('onselectstart');
            element.removeAttribute('ondragstart');
            
            // Force styles
            element.style.userSelect = 'text';
            element.style.webkitUserSelect = 'text';
            element.style.mozUserSelect = 'text';
            element.style.msUserSelect = 'text';
            element.style.webkitTouchCallout = 'default';
        });
        
        // Override common event handlers that prevent text selection
        document.onselectstart = null;
        document.ondragstart = null;
        document.oncontextmenu = null;
        
        // Remove event listeners that might interfere with text selection
        const body = document.body;
        if (body) {
            body.onselectstart = null;
            body.ondragstart = null;
        }
    }
    
    // Apply immediately
    enableTextSelectionGlobally();
    
    // Apply when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enableTextSelectionGlobally);
    }
    
    // Re-apply when new content is added (for dynamic websites)
    const observer = new MutationObserver(function(mutations) {
        let shouldReapply = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any added nodes have text selection disabled
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const hasDisabledSelection = node.matches && node.matches(`
                            .no-select, .noselect, .unselectable,
                            .qaas-disable-text-selection,
                            [data-disable-text-selection],
                            [unselectable="on"],
                            [onselectstart],
                            [ondragstart]
                        `);
                        if (hasDisabledSelection || node.querySelector) {
                            shouldReapply = true;
                        }
                    }
                });
            }
        });
        
        if (shouldReapply) {
            enableTextSelectionGlobally();
        }
    });
    
    // Start observing
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();

// Function to convert HTML to readable text with proper formatting
function htmlToText(element) {
    if (!element) return '';
    
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Handle superscripts - convert <sup>text</sup> to ^text
    clone.querySelectorAll('sup').forEach(sup => {
        sup.textContent = '^' + sup.textContent;
    });
    
    // Handle subscripts - convert <sub>text</sub> to _text
    clone.querySelectorAll('sub').forEach(sub => {
        sub.textContent = '_' + sub.textContent;
    });
    
    // Handle line breaks
    clone.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
    });
    
    // Get the text content
    return clone.innerText.trim();
}

// Function to extract the question, code, and options
function extractQuestionCodeAndOptions() {
    // Extracting the question text
    const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
    const questionText = questionElement ? htmlToText(questionElement) : '';

    // Extracting the code
    const codeLines = [];
    const codeElements = document.querySelectorAll('.ace_layer.ace_text-layer .ace_line');

    codeElements.forEach(line => {
        codeLines.push(line.innerText.trim());
    });

    const codeText = codeLines.length > 0 ? codeLines.join('\n') : null; // Set to null if no code is found

    // Extracting options
    const optionsElements = document.querySelectorAll('div[aria-labelledby="each-option"]'); // Update this selector as necessary
    const optionsText = [];
    optionsElements.forEach((option, index) => {
        optionsText.push(`Option ${index + 1}: ${htmlToText(option)}`);
    });

    return {
        question: questionText,
        code: codeText, // This can be null if no code is present
        options: optionsText.join('\n') // Join options with new line characters
    };
}

// Async function to handle question, code, and options extraction
async function handleQuestionExtraction() {
    const { question, code, options } = extractQuestionCodeAndOptions();

    if (!question) {
        return;
    }

    console.log('Question:', question);
    console.log('Code:\n', code ? code : 'No code available');
    console.log('Options:\n', options);

    // Send the extracted data to background.js
    // The clicking will be handled by the clickMCQOption message handler
    chrome.runtime.sendMessage({
        action: 'extractData',
        question: question,
        code: code,
        options: options,
        isMCQ: true
    });
}

// Function to extract coding question details
function extractCodingQuestion() {
    // Extract programming language
    const programmingLanguageElement = document.querySelector('span.inner-text');
    const programmingLanguage = programmingLanguageElement ? programmingLanguageElement.innerText.trim() : 'Programming language not found.';

    // Extract question components
    const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
    const questionText = questionElement ? htmlToText(questionElement) : 'Question not found.';

    const inputFormatElement = document.querySelector('div[aria-labelledby="input-format"]');
    const inputFormatText = inputFormatElement ? htmlToText(inputFormatElement) : '';

    const outputFormatElement = document.querySelector('div[aria-labelledby="output-format"]');
    const outputFormatText = outputFormatElement ? htmlToText(outputFormatElement) : '';

    // Extract sample test cases with robust fallback method
    const testCases = [];
    
    // Try Method 1: Find test case containers with aria-labelledby="each-tc-card"
    let containers = document.querySelectorAll('div[aria-labelledby="each-tc-card"]');
    
    if (containers.length > 0) {
        console.log('[Test Cases] Method 1: Found', containers.length, 'test case containers');
        containers.forEach((container) => {
            const inputPre = container.querySelector('div[aria-labelledby="each-tc-input-container"] pre');
            const outputPre = container.querySelector('div[aria-labelledby="each-tc-output-container"] pre');
            
            if (inputPre && outputPre) {
                testCases.push({
                    input: inputPre.textContent.trim(),
                    output: outputPre.textContent.trim()
                });
            }
        });
    }
    
    // Try Method 2: Find by aria-labelledby="each-tc-container"
    if (testCases.length === 0) {
        console.log('[Test Cases] Method 1 failed. Trying Method 2...');
        containers = document.querySelectorAll('[aria-labelledby="each-tc-container"]');
        
        if (containers.length > 0) {
            console.log('[Test Cases] Method 2: Found', containers.length, 'test case containers');
            containers.forEach((container) => {
                const inputPre = container.querySelector('[aria-labelledby="each-tc-input"]');
                const outputPre = container.querySelector('[aria-labelledby="each-tc-output"]');
                
                if (inputPre && outputPre) {
                    testCases.push({
                        input: inputPre.textContent.trim(),
                        output: outputPre.textContent.trim()
                    });
                }
            });
        }
    }
    
    // Try Method 3: Find pre elements with Input/Output labels
    if (testCases.length === 0) {
        console.log('[Test Cases] Method 2 failed. Trying Method 3...');
        const allPres = document.querySelectorAll('pre');
        const inputs = [];
        const outputs = [];
        
        allPres.forEach(pre => {
            const text = pre.textContent.trim();
            const prevElement = pre.previousElementSibling;
            
            if (prevElement) {
                const labelText = prevElement.textContent.toLowerCase();
                if (labelText.includes('input') && !labelText.includes('output')) {
                    inputs.push(text);
                } else if (labelText.includes('output')) {
                    outputs.push(text);
                }
            }
        });
        
        console.log('[Test Cases] Method 3: Found', inputs.length, 'inputs and', outputs.length, 'outputs');
        
        // Pair inputs and outputs
        for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
            testCases.push({
                input: inputs[i],
                output: outputs[i]
            });
        }
    }
    
    let testCasesText = '';
    if (testCases.length > 0) {
        testCases.forEach((testCase, index) => {
            testCasesText += `Sample Test Case ${index + 1}:\nInput:\n${testCase.input}\nOutput:\n${testCase.output}\n\n`;
        });
        console.log('[Test Cases] Successfully extracted', testCases.length, 'test cases');
    } else {
        console.warn('[Test Cases] All methods failed. No test cases extracted.');
        testCasesText = 'No test cases found. Please check the page structure.';
    }

    // Send data to background.js for querying
    chrome.runtime.sendMessage({
        action: 'extractData',
        programmingLanguage: programmingLanguage,
        question: questionText,
        inputFormat: inputFormatText,
        outputFormat: outputFormatText,
        testCases: testCasesText,
        isCoding: true
    }, async (response) => {
        if (response && response.success && response.response) {
            try {
                // Clean the response
                let cleanedResponse = response.response.trim()
                    .replace(/^```[a-z]*\n/, '')
                    .replace(/\n```$/, '');
                
                console.log('[AI Answer] Cleaned response length:', cleanedResponse.length);
                
                // Copy to clipboard first
                await navigator.clipboard.writeText(cleanedResponse);
                console.log('[AI Answer] Code copied to clipboard');
                
                // Dispatch custom event to page context (where ace is available)
                // This will be handled by exam.js which runs in page context
                window.dispatchEvent(new CustomEvent('NEOPASS_INSERT_CODE', {
                    detail: { code: cleanedResponse }
                }));
                
                console.log('[AI Answer] Dispatched code insertion event to page context');
            } catch (error) {
                console.error("Error processing AI response:", error);
            }
        }
    });
}    

function solveIamneoExamly(){
        // Check if this is a coding question or MCQ
        const codingQuestionElement = document.querySelector('div[aria-labelledby="input-format"]');
        if (codingQuestionElement) {
            extractCodingQuestion();
        } else {
            handleQuestionExtraction();
        }
}
document.addEventListener('keydown', (event) => {
    // Use Option (Alt) key on all platforms
    const modifierKey = event.altKey;
    
    if (modifierKey && event.shiftKey && event.code === 'KeyA') {
        solveIamneoExamly();
    }
});

// Add event listener for Option+O to toggle toast opacity
document.addEventListener('keydown', (event) => {
    // Use Option (Alt) key on all platforms
    const modifierKey = event.altKey;
    
    if (modifierKey && event.code === 'KeyO') {
        chrome.runtime.sendMessage({
            action: 'toggleToastOpacity'
        });
    }
});

// Function to extract code from snippets
function extractSnippets() {
    const headerContainer = Array.from(document.querySelectorAll('div[aria-labelledby="tt-header"]'))
        .find(container => container.innerText.includes('Header Snippet'));
    const footerContainer = Array.from(document.querySelectorAll('div[aria-labelledby="footer"]'))
        .find(container => container.innerText.includes('Footer Snippet'));

    const extractCode = container => {
        if (!container) return '';
        const codeLines = container.querySelectorAll('.ace_line');
        return Array.from(codeLines).map(line => line.textContent).join('\n');
    };

    const snippets = {
        header: extractCode(headerContainer),
        footer: extractCode(footerContainer)
    };

    // Send snippets directly to background.js
    chrome.runtime.sendMessage({
        action: 'processSnippets',
        snippets: snippets
    });
}

// Remove old listener and add new one
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractSnippets') {
        extractSnippets();
    }
    if (message.action === 'solveIamneoExamly') {
        solveIamneoExamly();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateChatHistory") {
        const { role, content } = message;
        
        // Remove loading indicator if it exists
        const loadingMessage = document.getElementById("loading-message");
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        // Add the actual message
        chatHistory.push({
            role: role,
            content: content
        });
        addMessageToChat(content, role);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clickMCQOption') {
        (async () => {
            try {
                // Check if this is HackerRank
                if (request.isHackerRank) {
                    let clicked = false;
                    
                    // Handle multiple choice questions (checkboxes) differently
                    if (request.isMultipleChoice) {
                    console.log('Multiple choice question detected, response:', request.response);
                    
                    // Enhanced parsing for multiple options
                    // Look for patterns like: "1. text, 3. text" or "A. text, C. text" or "1, 3" or "A, C"
                    const optionNumbers = [];
                    
                    // Pattern 1: "1. text, 3. text" or "A. text, C. text"
                    let matches = request.response.match(/([A-Z]|\d+)\.\s*[^,]+/gi);
                    if (matches) {
                        matches.forEach(match => {
                            const num = match.match(/^([A-Z]|\d+)\./);
                            if (num) {
                                let optionIndex;
                                if (isNaN(num[1])) {
                                    // Convert A,B,C to 0,1,2
                                    optionIndex = num[1].charCodeAt(0) - 'A'.charCodeAt(0);
                                } else {
                                    // Convert 1,2,3 to 0,1,2
                                    optionIndex = parseInt(num[1]) - 1;
                                }
                                if (optionIndex >= 0) {
                                    optionNumbers.push(optionIndex);
                                }
                            }
                        });
                    }
                    
                    // Pattern 2: Simple comma-separated numbers or letters: "1, 3, 5" or "A, C, E"
                    if (optionNumbers.length === 0) {
                        const simpleMatches = request.response.match(/(?:^|[,\s])([A-Z]|\d+)(?=[,\s]|$)/gi);
                        if (simpleMatches) {
                            simpleMatches.forEach(match => {
                                const cleaned = match.trim().replace(/^[,\s]+|[,\s]+$/g, '');
                                let optionIndex;
                                if (isNaN(cleaned)) {
                                    // Convert A,B,C to 0,1,2
                                    optionIndex = cleaned.charCodeAt(0) - 'A'.charCodeAt(0);
                                } else {
                                    // Convert 1,2,3 to 0,1,2
                                    optionIndex = parseInt(cleaned) - 1;
                                }
                                if (optionIndex >= 0) {
                                    optionNumbers.push(optionIndex);
                                }
                            });
                        }
                    }
                    
                    // Remove duplicates
                    const uniqueOptionNumbers = [...new Set(optionNumbers)];
                    
                    console.log('Parsed multiple choice options:', uniqueOptionNumbers.map(n => n + 1));
                    
                    // Click all the selected options for multiple choice
                    const checkboxes = document.querySelectorAll('[role="checkbox"]');
                    if (checkboxes.length > 0) {
                        console.log(`Found ${checkboxes.length} checkboxes, will click options:`, uniqueOptionNumbers.map(n => n + 1));
                        
                        // Click options with delay to ensure UI state is properly updated
                        for (let i = 0; i < uniqueOptionNumbers.length; i++) {
                            const optionNumber = uniqueOptionNumbers[i];
                            
                            if (optionNumber >= 0 && optionNumber < checkboxes.length) {
                                const checkbox = checkboxes[optionNumber];
                                
                                // Wait a bit before checking and clicking each option
                                await new Promise(resolve => setTimeout(resolve, 300));
                                
                                // Re-check the current state after delay
                                const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true' || 
                                                         checkbox.getAttribute('data-state') === 'checked' ||
                                                         checkbox.checked === true;
                                
                                console.log(`Option ${optionNumber + 1} current state: ${isCurrentlyChecked ? 'checked' : 'unchecked'}`);
                                
                                // Only click if not already checked
                                if (!isCurrentlyChecked) {
                                    console.log(`Clicking checkbox option ${optionNumber + 1}...`);
                                    
                                    // Try multiple click methods to ensure it works
                                    checkbox.click();
                                    
                                    // Alternative click method - dispatch events directly
                                    checkbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                                    checkbox.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                                    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                    
                                    // Wait a bit more to let the UI update
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    
                                    // Verify the click worked
                                    const newState = checkbox.getAttribute('aria-checked') === 'true' || 
                                                   checkbox.getAttribute('data-state') === 'checked' ||
                                                   checkbox.checked === true;
                                    
                                    if (newState) {
                                        console.log(`✅ HackerRank checkbox option ${optionNumber + 1} clicked successfully`);
                                        clicked = true;
                                    } else {
                                        console.log(`⚠️ HackerRank checkbox option ${optionNumber + 1} click may have failed - retrying...`);
                                        
                                        // Retry once more
                                        checkbox.click();
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                        
                                        const retryState = checkbox.getAttribute('aria-checked') === 'true' || 
                                                         checkbox.getAttribute('data-state') === 'checked' ||
                                                         checkbox.checked === true;
                                        
                                        if (retryState) {
                                            console.log(`✅ HackerRank checkbox option ${optionNumber + 1} clicked successfully on retry`);
                                            clicked = true;
                                        } else {
                                            console.log(`❌ HackerRank checkbox option ${optionNumber + 1} failed to click`);
                                        }
                                    }
                                } else {
                                    console.log(`✅ HackerRank checkbox option ${optionNumber + 1} already selected`);
                                    clicked = true; // Still count as successful
                                }
                            }
                        }
                        
                        // If no options were found, fall back to single option logic
                        if (uniqueOptionNumbers.length === 0) {
                            console.log('No multiple options found, falling back to single option logic');
                            const optionMatch = request.response.match(/(?:options?\s*)?([A-Z]|\d+)\.?/i);
                            if (optionMatch) {
                                let optionNumber;
                                if (isNaN(optionMatch[1])) {
                                    optionNumber = optionMatch[1].charCodeAt(0) - 'A'.charCodeAt(0);
                                } else {
                                    optionNumber = parseInt(optionMatch[1]) - 1;
                                }
                                
                                if (optionNumber >= 0 && optionNumber < checkboxes.length) {
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                    
                                    const checkbox = checkboxes[optionNumber];
                                    const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true' || 
                                                             checkbox.getAttribute('data-state') === 'checked' ||
                                                             checkbox.checked === true;
                                    
                                    if (!isCurrentlyChecked) {
                                        checkbox.click();
                                        console.log(`HackerRank single checkbox option ${optionNumber + 1} clicked as fallback`);
                                        clicked = true;
                                    } else {
                                        console.log(`HackerRank single checkbox option ${optionNumber + 1} already selected`);
                                        clicked = true;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Single choice question - use enhanced logic
                    const optionMatch = request.response.match(/(?:options?\s*)?([A-Z]|\d+)\.?/i);
                    if (optionMatch) {
                        let optionNumber;
                        if (isNaN(optionMatch[1])) {
                            // Handle letter options (A, B, C, etc.)
                            optionNumber = optionMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
                        } else {
                            // Handle number options (1, 2, 3, etc.)
                            optionNumber = parseInt(optionMatch[1]) - 1;
                        }
                        
                        console.log(`Single choice detected, clicking option: ${optionNumber + 1}`);
                        
                        // Add a small delay before clicking
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Try new layout first - check for radio buttons
                        const newLayoutRadios = document.querySelectorAll('[role="radio"]');
                        if (newLayoutRadios.length > optionNumber && optionNumber >= 0) {
                            const radio = newLayoutRadios[optionNumber];
                            
                            // Check if already selected
                            const isCurrentlySelected = radio.getAttribute('aria-checked') === 'true' || 
                                                      radio.getAttribute('data-state') === 'checked' ||
                                                      radio.checked === true;
                            
                            if (!isCurrentlySelected) {
                                radio.click();
                                console.log(`HackerRank new layout radio option ${optionNumber + 1} clicked successfully`);
                                clicked = true;
                            } else {
                                console.log(`HackerRank new layout radio option ${optionNumber + 1} already selected`);
                                clicked = true;
                            }
                        } else {
                            // Try checkboxes if no radio buttons found (fallback for single checkbox)
                            const newLayoutCheckboxes = document.querySelectorAll('[role="checkbox"]');
                            if (newLayoutCheckboxes.length > optionNumber && optionNumber >= 0) {
                                const checkbox = newLayoutCheckboxes[optionNumber];
                                
                                const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true' || 
                                                         checkbox.getAttribute('data-state') === 'checked' ||
                                                         checkbox.checked === true;
                                
                                if (!isCurrentlyChecked) {
                                    checkbox.click();
                                    console.log(`HackerRank new layout checkbox option ${optionNumber + 1} clicked successfully`);
                                    clicked = true;
                                } else {
                                    console.log(`HackerRank new layout checkbox option ${optionNumber + 1} already selected`);
                                    clicked = true;
                                }
                            } else {
                                // Fallback to old layout (radio buttons)
                                const questionContainer = document.querySelector('.grouped-mcq__question');
                                if (questionContainer) {
                                    const radios = questionContainer.querySelectorAll('input[type="radio"]');
                                    if (radios.length > optionNumber && optionNumber >= 0) {
                                        const radio = radios[optionNumber];
                                        
                                        if (!radio.checked) {
                                            radio.click();
                                            console.log(`HackerRank old layout option ${optionNumber + 1} clicked successfully`);
                                            clicked = true;
                                        } else {
                                            console.log(`HackerRank old layout option ${optionNumber + 1} already selected`);
                                            clicked = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (!clicked) {
                    chrome.runtime.sendMessage({
                        action: 'showMCQToast',
                        message: request.response,
                    });
                }
            } else {
                // Original logic for other platforms (Examly)
                const optionMatch = request.response.match(/(?:options?\s*)?(\d+)\.?/i);
                if (optionMatch) {
                    const optionNumber = parseInt(optionMatch[1])-1;
                    // Use exact same selector as Alt+Shift+Q
                    const answerElement = document.querySelector(`#tt-option-${optionNumber} > label > span.checkmark1`);
                    
                    if (answerElement) {
                        answerElement.dispatchEvent(new Event("click", { bubbles: true }));
                        console.log(`Option element ${optionNumber + 1} clicked successfully`);
                    } else {
                        chrome.runtime.sendMessage({
                            action: 'showMCQToast',
                            message: request.response,
                        });
                    }
                } else {
                    chrome.runtime.sendMessage({
                        action: 'showMCQToast',
                        message: request.response,
                    });
                }
            }
        } catch (error) {
            chrome.runtime.sendMessage({
                action: 'showMCQToast',
                message: request.response,
            });
        }
        })();
    }
});

// Function to extract HackerRank MCQ data (updated for new layout)
function extractHackerRankMCQ() {
    const questions = [];
    
    // Try new layout first (2024+ layout)
    const newLayoutQuestions = document.querySelectorAll('.QuestionDetails_container__AIu0X');
    
    if (newLayoutQuestions.length > 0) {
        // New layout processing
        newLayoutQuestions.forEach((container, index) => {
            const questionData = {
                questionNumber: index + 1,
                title: '',
                instruction: '',
                options: [],
                selectedAnswer: null
            };
            
            // Extract question title from new layout
            const titleElement = container.querySelector('.qaas-block-question-title, h2');
            if (titleElement) {
                // Remove bookmark icon and get clean title
                const titleText = titleElement.textContent || titleElement.innerText;
                questionData.title = titleText.replace(/Bookmark question \d+/g, '').trim();
            }
            
            // Extract question instruction/content from new layout
            const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
            if (instructionElement) {
                let instructionText = instructionElement.textContent || instructionElement.innerText;
                instructionText = instructionText.replace(/\s+/g, ' ').trim();
                questionData.instruction = instructionText;
            }
            
            // Look for options in multiple possible containers
            let optionsContainer = container.nextElementSibling;
            let attempts = 0;
            while (optionsContainer && attempts < 5) {
                // Check for both radio buttons and checkboxes
                const hasOptions = optionsContainer.querySelector('[role="checkbox"], [role="radio"], .ui-radio');
                if (hasOptions) {
                    break;
                }
                optionsContainer = optionsContainer.nextElementSibling;
                attempts++;
            }
            
            // Also check for options within the same container or nearby
            if (!optionsContainer || !optionsContainer.querySelector('[role="checkbox"], [role="radio"]')) {
                optionsContainer = container.parentElement?.querySelector('.Control_container__F35yA') ||
                                document.querySelector('.Control_container__F35yA');
            }
            
            if (optionsContainer) {
                // Try radio buttons first (new layout)
                let optionElements = optionsContainer.querySelectorAll('[role="radio"]');
                
                // If no radio buttons, try checkboxes
                if (optionElements.length === 0) {
                    optionElements = optionsContainer.querySelectorAll('[role="checkbox"]');
                }
                
                optionElements.forEach((option, optionIndex) => {
                    const labelId = option.getAttribute('aria-labelledby');
                    const labelElement = labelId ? document.getElementById(labelId) : 
                                      option.closest('.Control_optionList__vIubt, li')?.querySelector('label');
                    
                    if (labelElement) {
                        const optionText = labelElement.textContent.trim();
                        const isChecked = option.getAttribute('aria-checked') === 'true' || 
                                        option.getAttribute('data-state') === 'checked';
                        
                        questionData.options.push({
                            value: option.value || optionIndex.toString(),
                            text: optionText,
                            isSelected: isChecked
                        });
                        
                        if (isChecked) {
                            questionData.selectedAnswer = option.value || optionIndex.toString();
                        }
                    }
                });
            }
            
            // Only add question if it has options (to distinguish from coding questions)
            if (questionData.options.length > 0) {
                questions.push(questionData);
            }
        });
    } else {
        // Fallback to old layout
        const oldLayoutQuestions = document.querySelectorAll('.grouped-mcq__question');
        
        oldLayoutQuestions.forEach((container, index) => {
            const questionData = {
                questionNumber: index + 1,
                title: '',
                instruction: '',
                options: [],
                selectedAnswer: null
            };
            
            // Extract question title from old layout
            const titleElement = container.querySelector('.question-view__title');
            if (titleElement) {
                questionData.title = titleElement.textContent.trim();
            }
            
            // Extract question instruction/content from old layout
            const instructionElement = container.querySelector('.question-view__instruction');
            if (instructionElement) {
                let instructionText = instructionElement.textContent.trim();
                instructionText = instructionText.replace(/\s+/g, ' ').trim();
                questionData.instruction = instructionText;
            }
            
            // Extract options from old layout
            const optionElements = container.querySelectorAll('.ui-radio');
            optionElements.forEach((option, optionIndex) => {
                const labelElement = option.querySelector('.label');
                const inputElement = option.querySelector('input[type="radio"]');
                
                if (labelElement && inputElement) {
                    const optionText = labelElement.textContent.trim();
                    const optionValue = inputElement.value;
                    const isChecked = inputElement.checked;
                    
                    questionData.options.push({
                        value: optionValue,
                        text: optionText,
                        isSelected: isChecked
                    });
                    
                    if (isChecked) {
                        questionData.selectedAnswer = optionValue;
                    }
                }
            });
            
            questions.push(questionData);
        });
    }
    
    return questions;
}

// Function to extract HackerRank coding question (updated for new layout)
function extractHackerRankCoding() {
    const getCleanText = el => el?.innerText?.trim() || "";

    // Try new layout first (2024+ layout)
    let language = "Unknown";
    let title = "No Title Found";
    let instruction = "No Instructions Found";
    let details = "";
    let starterCode = "";

    // Check for new layout language selector
    const newLanguageSelector = document.querySelector('.select-language .css-3d4y2u-singleValue, .select-language .css-x7738g');
    if (newLanguageSelector) {
        language = getCleanText(newLanguageSelector);
    } else {
        // Fallback to old layout
        language = getCleanText(document.querySelector('.select-language .css-x7738g')) || "Unknown";
    }

    // Try new layout question container
    let container = document.querySelector('.QuestionDetails_container__AIu0X');
    if (container) {
        // New layout
        const titleElement = container.querySelector('.qaas-block-question-title, h2');
        if (titleElement) {
            const titleText = titleElement.textContent || titleElement.innerText;
            title = titleText.replace(/Bookmark question \d+/g, '').trim();
        }
        
        const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
        if (instructionElement) {
            instruction = getCleanText(instructionElement);
        }
        
        // Look for details sections in new layout
        const detailsElements = container.querySelectorAll('details');
        if (detailsElements.length > 0) {
            details = Array.from(detailsElements).map(detail => {
                const summary = getCleanText(detail.querySelector('summary'));
                const content = getCleanText(detail.querySelector('.collapsable-details'));
                return `\n${summary}\n${'-'.repeat(summary.length)}\n${content}`;
            }).join('\n');
        }
    } else {
        // Fallback to old layout
        container = document.querySelector('#main-splitpane-left');
        if (container) {
            title = getCleanText(container.querySelector('.question-view__title')) || "No Title Found";
            instruction = getCleanText(container.querySelector('.question-view__instruction')) || "No Instructions Found";
            
            details = Array.from(container.querySelectorAll('details') || []).map(detail => {
                const summary = getCleanText(detail.querySelector('summary'));
                const content = getCleanText(detail.querySelector('.collapsable-details'));
                return `\n${summary}\n${'-'.repeat(summary.length)}\n${content}`;
            }).join('\n');
        }
    }

    // Get starter code from Monaco editor (works for both layouts)
    const codeLines = Array.from(document.querySelectorAll('.view-lines .view-line')).map(line =>
        line.innerText
    ).join('\n').trim();
    
    starterCode = codeLines;

    return {
        language,
        title,
        instruction,
        details,
        starterCode: starterCode
    };
}

// Function to normalize code indentation
function normalizeCodeIndentation(code) {
    if (!code) return code;
    
    const lines = code.split('\n');
    
    // Remove empty lines at the beginning and end
    while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }
    
    if (lines.length === 0) return '';
    
    // Find the minimum indentation (excluding empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim() !== '') {
            const indent = line.match(/^\s*/)[0].length;
            minIndent = Math.min(minIndent, indent);
        }
    }
    
    // Remove the common indentation from all lines
    if (minIndent > 0 && minIndent !== Infinity) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== '') {
                lines[i] = lines[i].substring(minIndent);
            }
        }
    }
    
    return lines.join('\n');
}

// Function to insert code into Monaco editor with proper formatting
async function insertCodeIntoMonacoEditor(text) {
    console.log('insertCodeIntoMonacoEditor called with text length:', text.length);
    
    // Normalize the code indentation first
    const normalizedText = normalizeCodeIndentation(text);
    console.log('Text after normalization:', normalizedText);
    
    // 1. Try to find Monaco editor instance through the global scope
    if (typeof monaco !== 'undefined' && window.monaco) {
        try {
            const editor = window.monaco.editor.getEditors()[0];
            if (editor) {
                console.log('Found Monaco editor instance, setting value directly...');
                editor.setValue(normalizedText);
                editor.focus();
                return true;
            }
        } catch (error) {
            console.log('Monaco API method failed, trying alternative approaches...');
        }
    }
    
    // 2. Try to access Monaco editor through DOM manipulation
    const monacoEditor = document.querySelector('.monaco-editor');
    console.log('Monaco editor DOM element found:', !!monacoEditor);
    
    if (!monacoEditor) {
        console.error("❌ Monaco editor not found.");
        return false;
    }

    try {
        // 3. Focus the editor properly
        const editorTextArea = monacoEditor.querySelector('textarea.inputarea') || 
                              monacoEditor.querySelector('textarea') ||
                              monacoEditor.querySelector('.monaco-editor-background');
        
        if (editorTextArea) {
            console.log('Found Monaco textarea, focusing...');
            editorTextArea.focus();
            editorTextArea.click();
        } else {
            console.log('Monaco textarea not found, clicking editor container...');
            monacoEditor.focus();
            monacoEditor.click();
        }
        
        // 4. Wait a bit for focus to settle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 5. Clear existing content using keyboard shortcuts
        console.log('Clearing existing content...');
        
        // Use Select All (Cmd+A on macOS, Ctrl+A elsewhere)
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'a',
            code: 'KeyA',
            ctrlKey: !window.isMac,
            metaKey: window.isMac,
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use Delete or Backspace to clear
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Delete',
            code: 'Delete',
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 6. Copy normalized text to clipboard
        await navigator.clipboard.writeText(normalizedText);
        console.log('Text copied to clipboard');
        
        // 7. Paste (Cmd+V on macOS, Ctrl+V elsewhere)
        console.log('Pasting content...');
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            ctrlKey: !window.isMac,
            metaKey: window.isMac,
            bubbles: true
        }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 8. Try input event as fallback
        if (editorTextArea) {
            console.log('Trying input event fallback...');
            
            // Set the value directly on the textarea
            editorTextArea.value = normalizedText;
            
            // Trigger input events
            editorTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            editorTextArea.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Try to trigger Monaco's internal update
            editorTextArea.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'End',
                code: 'End',
                bubbles: true
            }));
        }
        
        console.log('✅ Successfully inserted code into Monaco editor');
        return true;
        
    } catch (error) {
        console.error("❌ Error inserting code into Monaco editor:", error);
        
        // Final fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(normalizedText);
            console.log('Fallback: copied normalized text to clipboard');
        } catch (clipboardError) {
            console.error('Clipboard fallback also failed:', clipboardError);
        }
        
        return false;
    }
}

// Function to handle HackerRank extraction (both MCQ and coding, updated for new layout)
function handleHackerRankMCQ() {
    // Check if it's a coding question first (Monaco editor present)
    const monacoEditor = document.querySelector('.monaco-editor, .hr-monaco-editor');
    
    // Check for MCQ options specifically (more precise detection)
    const hasRadioOptions = document.querySelector('[role="radio"], [role="radiogroup"]');
    const hasCheckboxOptions = document.querySelector('[role="checkbox"]');
    const hasOldMcqOptions = document.querySelector('.grouped-mcq__question .ui-radio');
    const hasOptionsControl = document.querySelector('.Control_container__F35yA');
    
    // More precise MCQ detection
    const isMCQ = hasRadioOptions || hasCheckboxOptions || hasOldMcqOptions || 
                  (hasOptionsControl && !monacoEditor);
    
    if (monacoEditor && !isMCQ) {
        // This is definitely a coding question
        const codingData = extractHackerRankCoding();
        
        if (!codingData.instruction || codingData.instruction === "No Instructions Found") {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No HackerRank coding question found.',
                isError: true
            });
            return;
        }

        // Format the question for AI
        const questionText = `
Language: ${codingData.language}

Title: ${codingData.title}

Instructions:
${codingData.instruction}

${codingData.details}

Starter Code:
-------------
${codingData.starterCode}
        `.trim();

        console.log('HackerRank Coding Question:', questionText);

        // Send the extracted data to background.js
        chrome.runtime.sendMessage({
            action: 'extractData',
            programmingLanguage: codingData.language,
            question: questionText,
            inputFormat: codingData.details,
            outputFormat: '',
            testCases: '',
            isHackerRank: true,
            isCoding: true        }, async (response) => {
            console.log('HackerRank coding response received:', response);
            
            if (response && response.success && response.response) {
                try {
                    console.log('Raw AI response:', response.response);
                    
                    // Clean the response more thoroughly
                    let cleanedResponse = response.response.trim();
                    console.log('Response after trim:', cleanedResponse);
                    
                    // Remove code block delimiters if present (more comprehensive)
                    cleanedResponse = cleanedResponse
                        .replace(/^```[a-zA-Z]*\s*\n/, '')     // Remove opening ``` with optional language
                        .replace(/\n\s*```\s*$/, '')          // Remove closing ``` with optional whitespace
                        .replace(/^```[a-zA-Z]*\s*/, '')      // Remove opening ``` without newline
                        .replace(/\s*```\s*$/, '');           // Remove closing ``` without newline
                    
                    // Remove any leading/trailing whitespace after code block removal
                    cleanedResponse = cleanedResponse.trim();
                    
                    console.log('Cleaned response (after removing code blocks):', cleanedResponse);
                    
                    // Insert code into Monaco editor with proper formatting
                    console.log('Attempting to insert code into Monaco editor...');
                    const success = await insertCodeIntoMonacoEditor(cleanedResponse);
                    console.log('Monaco editor insertion result:', success);
                    
                    if (!success) {
                        // If insertion fails, copy to clipboard as fallback
                        console.log('Monaco insertion failed, copying to clipboard as fallback');
                        await navigator.clipboard.writeText(cleanedResponse);
                        chrome.runtime.sendMessage({
                            action: 'showToast',
                            message: 'Copied to clipboard - paste manually',
                            isError: false
                        });
                    } else {
                        console.log('Successfully inserted code into Monaco editor');
                        chrome.runtime.sendMessage({
                            action: 'showToast',
                            message: 'Code inserted successfully',
                            isError: false
                        });
                    }
                } catch (error) {
                    console.error("Error processing coding response:", error);
                    chrome.runtime.sendMessage({
                        action: 'showToast',
                        message: 'Error processing response',
                        isError: true
                    });
                }
            } else {
                console.error('Invalid response received:', response);
            }
        });
        
    } else if (isMCQ) {
        // This is an MCQ question
        const extractedData = extractHackerRankMCQ();
        
        if (extractedData.length === 0) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No HackerRank MCQ questions found.',
                isError: true
            });
            return;
        }

        // Process the first question
        const firstQuestion = extractedData[0];
        
        if (!firstQuestion.instruction && !firstQuestion.title) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No question text found.',
                isError: true
            });
            return;
        }

        if (firstQuestion.options.length === 0) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No options found for MCQ question.',
                isError: true
            });
            return;
        }

        // Format the question and options for AI with explicit instructions
        const questionText = firstQuestion.title ? `${firstQuestion.title}\n${firstQuestion.instruction}` : firstQuestion.instruction;
        const optionsText = firstQuestion.options.map((option, index) => 
            `Option ${index + 1}: ${option.text}`
        ).join('\n');

        // Detect if this is a multiple choice question (checkboxes) or single choice (radio buttons)
        const hasCheckboxes = document.querySelector('[role="checkbox"]');
        const isMultipleChoice = hasCheckboxes && !document.querySelector('[role="radio"]');
        
        // Add explicit instruction for multiple choice questions
        let finalQuestionText = questionText;
        if (isMultipleChoice) {
            finalQuestionText = `[MULTIPLE CHOICE QUESTION - SELECT ALL CORRECT OPTIONS]\n\n${questionText}\n\nIMPORTANT: This question allows multiple correct answers. Please respond with ALL correct option numbers separated by commas (e.g., "Options 1, 3, 5" or "1, 3, 5").`;
        } else {
            finalQuestionText = `[SINGLE CHOICE QUESTION - SELECT ONE OPTION]\n\n${questionText}\n\nIMPORTANT: This question allows only ONE correct answer. Please respond with the single correct option number (e.g., "Option 2" or "2").`;
        }
        
        console.log('HackerRank MCQ Question:', finalQuestionText);
        console.log('Options:\n', optionsText);
        console.log('Question type:', isMultipleChoice ? 'Multiple Choice (checkboxes)' : 'Single Choice (radio buttons)');

        // Send the extracted data to background.js
        chrome.runtime.sendMessage({
            action: 'extractData',
            question: finalQuestionText,  // Use the enhanced question text
            code: null,
            options: optionsText,
            isHackerRank: true,
            isMCQ: true,
            isMultipleChoice: isMultipleChoice  // Add flag for multiple choice questions
        }, (response) => {
            console.log("Response from background:", response);
        });
    } else {
        chrome.runtime.sendMessage({
            action: 'showToast',
            message: 'No HackerRank question found on this page.',
            isError: true
        });
    }
}

// Add event listener for Ctrl+Shift+H (Mac) or Alt+Shift+H (Windows) for HackerRank MCQ extraction
document.addEventListener('keydown', (event) => {
    // Use Ctrl on Mac, Alt on Windows/other platforms
    const modifierKey = window.isMac ? event.ctrlKey : event.altKey;
    
    if (modifierKey && event.shiftKey && event.code === 'KeyH') {
        handleHackerRankMCQ();
    }
});

// Listen for code request from exam.js (Alt+Shift+T)
window.addEventListener('NEOPASS_REQUEST_CODE_TYPED', function(event) {
    const { programmingLanguage, question, inputFormat, outputFormat, testCases } = event.detail;
    
    console.log('[content.js] Received NEOPASS_REQUEST_CODE_TYPED event');
    
    // Send data to background.js for querying
    chrome.runtime.sendMessage({
        action: 'extractData',
        programmingLanguage: programmingLanguage,
        question: question,
        inputFormat: inputFormat,
        outputFormat: outputFormat,
        testCases: testCases,
        isCoding: true
    }, async (response) => {
        if (response && response.success && response.response) {
            try {
                // Clean the response
                let cleanedResponse = response.response.trim()
                    .replace(/^```[a-z]*\n/, '')
                    .replace(/\n```$/, '');
                
                console.log('[content.js] Cleaned AI response length:', cleanedResponse.length);
                
                // Dispatch custom event back to exam.js with the typed code
                window.dispatchEvent(new CustomEvent('NEOPASS_INSERT_CODE_TYPED', {
                    detail: { code: cleanedResponse }
                }));
                
                console.log('[content.js] Dispatched NEOPASS_INSERT_CODE_TYPED event to exam.js');
            } catch (error) {
                console.error("[content.js] Error processing AI response:", error);
            }
        } else {
            console.error("[content.js] Failed to get AI response");
        }
    });
});
