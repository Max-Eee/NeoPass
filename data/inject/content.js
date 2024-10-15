window.addEventListener('blur', function() {
    window.focus();
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
    if (event.altKey && event.shiftKey && event.code === 'KeyQ') {
        handleQuestionExtraction();
    }
});
