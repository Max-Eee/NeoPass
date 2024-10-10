window.addEventListener('blur', function() {
    window.focus();
});
// Function to extract the question, code, and options
// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is for extraction
    if (request.action === 'extractData') {
        const { question, code, options, isMCQ } = request; // Include code in the destructured request

        console.log("Received question:", question);
        console.log("Received code:\n", code ? code : 'No code available'); // Log message if code is not present
        console.log("Received options:\n", options);
        console.log("Is MCQ:", isMCQ);
        
        // Prepare the query text, including code if available
        let queryText = `${question}\nOptions:\n${options}`;
        if (code) {
            queryText = `${question}\nCode:\n${code}\nOptions:\n${options}`;
        }

        // Call the queryRequest function with the extracted data
        queryRequest(queryText, isMCQ)
            .then(response => {
                if (response) {
                    // Handle response by showing the MCQ toast if it's an MCQ
                    handleQueryResponse(response, sender.tab.id, isMCQ);
                } else {
                    showToast(sender.tab.id, 'Error. Try again after 30s.', true);
                }
                // Send response back to content.js, if necessary
                sendResponse({ response });
            })
            .catch(error => {
                console.error("Error querying:", error);
                showToast(sender.tab.id, 'Error. Try again after 30s.', true);
                sendResponse({ error });
            });

        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }
});

// Function to extract the question, code, and options
function extractQuestionCodeAndOptions() {
    // Extracting the question text
    const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
    const questionText = questionElement ? questionElement.innerText.trim() : '';

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
        optionsText.push(`Option ${index + 1}: ${option.innerText.trim()}`);
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
        console.warn('No question found.');
        return;
    }

    console.log('Question:', question);
    console.log('Code:\n', code ? code : 'No code available'); // Log message if code is not present
    console.log('Options:\n', options);

    // Send the extracted data to background.js
    chrome.runtime.sendMessage({
        action: 'extractData', // Specify the action to trigger querying
        question: question,
        code: code, // This can be null
        options: options,
        isMCQ: true
    }, (response) => {
        console.log("Response from background:", response);
    });
}

document.addEventListener('keydown', (event) => {
    if (event.altKey && event.shiftKey && event.code === 'KeyN') {
        handleQuestionExtraction();
    }
});
