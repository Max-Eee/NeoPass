if (typeof chrome === "undefined") {}

if (typeof window.isMac === 'undefined') {
    window.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                   navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

(function() {
    chrome.storage.local.get(['stealth'], function(result) {
        if (window.chatOverlayInjected) {
            console.log("Chat overlay script already injected.");
            return;
        }
        window.chatOverlayInjected = true;
        
        const isStealthModeEnabled = result.stealth === true;
        console.log("Initial stealth mode state:", isStealthModeEnabled);


        function loadShowdown() {
            return new Promise((resolve, reject) => {
                if (typeof showdown !== 'undefined') {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('data/lib/showdown.min.js'); // Local path
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        function loadPrism() {
            return new Promise((resolve) => {
                // Create a lightweight inline syntax highlighter to bypass CSP
                window.SimplePrism = {
                    highlightElement: function(codeElement) {
                        const code = codeElement.textContent;
                        const language = codeElement.className.replace('language-', '');
                        
                        // Use a simpler approach to avoid overlapping replacements
                        let highlightedCode = this.simpleHighlight(code, language);
                        codeElement.innerHTML = highlightedCode;
                    },
                    
                    simpleHighlight: function(code, language) {
                        // Escape HTML first
                        let highlighted = code.replace(/&/g, '&amp;')
                                             .replace(/</g, '&lt;')
                                             .replace(/>/g, '&gt;');
                        
                        // Apply basic highlighting based on language
                        if (language === 'python') {
                            highlighted = this.highlightPython(highlighted);
                        } else if (language === 'javascript' || language === 'js') {
                            highlighted = this.highlightJavaScript(highlighted);
                        } else if (language === 'java') {
                            highlighted = this.highlightJava(highlighted);
                        } else if (language === 'css') {
                            highlighted = this.highlightCSS(highlighted);
                        } else if (language === 'html') {
                            highlighted = this.highlightHTML(highlighted);
                        } else if (language === 'sql') {
                            highlighted = this.highlightSQL(highlighted);
                        } else if (language === 'json') {
                            highlighted = this.highlightJSON(highlighted);
                        } else {
                            // Default to javascript-like highlighting
                            highlighted = this.highlightJavaScript(highlighted);
                        }
                        
                        return highlighted;
                    },
                    
                    highlightPython: function(code) {
                        // Use a token-based approach to avoid overlapping
                        let tokens = [];
                        let currentIndex = 0;
                        
                        // First, find all comments
                        let match;
                        const commentRegex = /#.*$/gm;
                        while ((match = commentRegex.exec(code)) !== null) {
                            tokens.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                type: 'comment',
                                content: match[0]
                            });
                        }
                        
                        // Find strings (avoiding those inside comments)
                        const stringRegex = /(['"])((?:\\.|(?!\1)[^\\])*?)\1/g;
                        while ((match = stringRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'string',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find keywords (avoiding those inside comments and strings)
                        const keywordRegex = /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|and|or|not|in|is)\b/g;
                        while ((match = keywordRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'keyword',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find booleans and None
                        const booleanRegex = /\b(True|False|None)\b/g;
                        while ((match = booleanRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'boolean',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find numbers
                        const numberRegex = /\b\d+(\.\d+)?\b/g;
                        while ((match = numberRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'number',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Sort tokens by position
                        tokens.sort((a, b) => a.start - b.start);
                        
                        // Build highlighted code
                        let result = '';
                        let lastIndex = 0;
                        
                        tokens.forEach(token => {
                            // Add unhighlighted text before this token
                            result += code.slice(lastIndex, token.start);
                            // Add highlighted token
                            result += `<span class="${token.type}">${token.content}</span>`;
                            lastIndex = token.end;
                        });
                        
                        // Add remaining text
                        result += code.slice(lastIndex);
                        
                        return result;
                    },
                    
                    buildHighlightedCode: function(code, tokens) {
                        // Sort tokens by their start position
                        tokens.sort((a, b) => a.start - b.start);
                        
                        let result = '';
                        let lastIndex = 0;
                        
                        for (let token of tokens) {
                            // Add text before this token
                            result += code.slice(lastIndex, token.start);
                            
                            // Add the highlighted token
                            result += `<span class="${token.type}">${token.content}</span>`;
                            
                            lastIndex = token.end;
                        }
                        
                        // Add remaining text
                        result += code.slice(lastIndex);
                        
                        return result;
                    },
                    
                    isInsideToken: function(position, tokens) {
                        return tokens.some(token => position >= token.start && position < token.end);
                    },
                    
                    highlightJavaScript: function(code) {
                        let tokens = [];
                        let match;
                        
                        // Find comments first
                        const singleLineCommentRegex = /\/\/.*$/gm;
                        while ((match = singleLineCommentRegex.exec(code)) !== null) {
                            tokens.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                type: 'comment',
                                content: match[0]
                            });
                        }
                        
                        const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
                        while ((match = multiLineCommentRegex.exec(code)) !== null) {
                            tokens.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                type: 'comment',
                                content: match[0]
                            });
                        }
                        
                        // Find strings
                        const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
                        while ((match = stringRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'string',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find keywords
                        const keywordRegex = /\b(function|const|let|var|if|else|for|while|return|import|export|class|extends|new|this|typeof|instanceof)\b/g;
                        while ((match = keywordRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'keyword',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find booleans
                        const booleanRegex = /\b(true|false|null|undefined)\b/g;
                        while ((match = booleanRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'boolean',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find numbers
                        const numberRegex = /\b\d+(\.\d+)?\b/g;
                        while ((match = numberRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'number',
                                    content: match[0]
                                });
                            }
                        }
                        
                        return this.buildHighlightedCode(code, tokens);
                    },
                    
                    highlightJava: function(code) {
                        let tokens = [];
                        let match;
                        
                        // Find comments first
                        const singleLineCommentRegex = /\/\/.*$/gm;
                        while ((match = singleLineCommentRegex.exec(code)) !== null) {
                            tokens.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                type: 'comment',
                                content: match[0]
                            });
                        }
                        
                        const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
                        while ((match = multiLineCommentRegex.exec(code)) !== null) {
                            tokens.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                type: 'comment',
                                content: match[0]
                            });
                        }
                        
                        // Find strings
                        const stringRegex = /(['"])((?:\\.|(?!\1)[^\\])*?)\1/g;
                        while ((match = stringRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'string',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find keywords
                        const keywordRegex = /\b(public|private|protected|static|final|class|interface|extends|implements|if|else|for|while|return|import|package|new|this)\b/g;
                        while ((match = keywordRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'keyword',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find booleans
                        const booleanRegex = /\b(true|false|null)\b/g;
                        while ((match = booleanRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'boolean',
                                    content: match[0]
                                });
                            }
                        }
                        
                        // Find numbers
                        const numberRegex = /\b\d+(\.\d+)?[fFdDlL]?\b/g;
                        while ((match = numberRegex.exec(code)) !== null) {
                            if (!this.isInsideToken(match.index, tokens)) {
                                tokens.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    type: 'number',
                                    content: match[0]
                                });
                            }
                        }
                        
                        return this.buildHighlightedCode(code, tokens);
                    },
                    
                    highlightCSS: function(code) {
                        // Comments first
                        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
                        // Selectors
                        code = code.replace(/([.#][a-zA-Z][a-zA-Z0-9_-]*)/g, '<span class="selector">$1</span>');
                        // Properties
                        code = code.replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="property">$1</span>$2');
                        // Values
                        code = code.replace(/(#[0-9a-fA-F]+)/g, '<span class="value">$1</span>');
                        return code;
                    },
                    
                    highlightHTML: function(code) {
                        // Comments first
                        code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>');
                        // Tags
                        code = code.replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="tag">$1</span>');
                        return code;
                    },
                    
                    highlightSQL: function(code) {
                        // Comments first
                        code = code.replace(/--.*$/gm, '<span class="comment">$&</span>');
                        // Strings
                        code = code.replace(/'[^']*'/g, '<span class="string">$&</span>');
                        // Keywords
                        code = code.replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|PRIMARY|KEY|FOREIGN|NOT|NULL|DEFAULT|AND|OR|ORDER|BY|GROUP|HAVING|LIMIT)\b/gi, '<span class="keyword">$1</span>');
                        // Numbers
                        code = code.replace(/\b\d+(\.\d+)?\b/g, '<span class="number">$&</span>');
                        return code;
                    },
                    
                    highlightJSON: function(code) {
                        // Property keys first (before general strings)
                        code = code.replace(/"([^"]*)"(\s*:)/g, '<span class="property">"$1"</span>$2');
                        // Remaining strings
                        code = code.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');
                        // Booleans and null
                        code = code.replace(/\b(true|false|null)\b/g, '<span class="boolean">$1</span>');
                        // Numbers
                        code = code.replace(/\b\d+(\.\d+)?\b/g, '<span class="number">$&</span>');
                        return code;
                    }
                };
                
                // Add CSS for syntax highlighting with clean default theme
                const style = document.createElement('style');
                style.textContent = `
                    #chat-overlay .keyword { color: #0066CC; font-weight: bold; }
                    #chat-overlay .string { color: #008000; }
                    #chat-overlay .comment { color: #808080; font-style: italic; }
                    #chat-overlay .number { color: #FF6600; }
                    #chat-overlay .boolean { color: #0066CC; font-weight: bold; }
                    #chat-overlay .property { color: #9932CC; }
                    #chat-overlay .selector { color: #008000; font-weight: bold; }
                    #chat-overlay .value { color: #FF6600; }
                    #chat-overlay .tag { color: #0066CC; }
                `;
                document.head.appendChild(style);
                
                resolve();
            });
        }

        // State variables
        let isOverlayVisible = false;
        let chatHistory = [];
        let isDragging = false;
        let isResizing = false;
        let markdownConverter = null; // Will be initialized when showdown loads
        let chatAboutQuestionEnabled = false; // Toggle for chat about question feature
        let extractedQuestion = null; // Store extracted question

        // Drag and resize state
        let dragOffsetX;
        let dragOffsetY;
        let initialWidth;
        let initialHeight;
        let resizeStartX;
        let resizeStartY;

        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        // Question extraction functions
        function detectPlatform() {
            // Check for Examly/IamNeo
            if (document.querySelector('div[aria-labelledby="question-data"]')) {
                return 'examly';
            }
            // Check for HackerRank
            if (document.querySelector('.QuestionDetails_container__AIu0X') || 
                document.querySelector('.monaco-editor') ||
                document.querySelector('.grouped-mcq__question')) {
                return 'hackerrank';
            }
            return null;
        }

        function extractExamlyQuestion() {
            const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
            if (!questionElement) return null;

            const questionText = questionElement.innerText.trim();

            // Check if it's a coding question
            const codingQuestionElement = document.querySelector('div[aria-labelledby="input-format"]');
            
            if (codingQuestionElement) {
                // Coding question
                const programmingLanguageElement = document.querySelector('span.inner-text');
                const programmingLanguage = programmingLanguageElement ? programmingLanguageElement.innerText.trim() : 'Programming language not found.';

                const inputFormatElement = document.querySelector('div[aria-labelledby="input-format"]');
                const inputFormatText = inputFormatElement ? inputFormatElement.innerText.trim() : '';

                const outputFormatElement = document.querySelector('div[aria-labelledby="output-format"]');
                const outputFormatText = outputFormatElement ? outputFormatElement.innerText.trim() : '';

                const sampleTestCaseElements = document.querySelectorAll('div[aria-labelledby="each-tc-card"]');
                let testCasesText = '';
                sampleTestCaseElements.forEach((testCase, index) => {
                    const inputElement = testCase.querySelector('div[aria-labelledby="each-tc-input-container"] pre');
                    const outputElement = testCase.querySelector('div[aria-labelledby="each-tc-output-container"] pre');

                    const inputText = inputElement ? inputElement.innerText.trim() : 'Input not found';
                    const outputText = outputElement ? outputElement.innerText.trim() : 'Output not found';

                    testCasesText += `Sample Test Case ${index + 1}:\nInput:\n${inputText}\nOutput:\n${outputText}\n\n`;
                });

                return {
                    type: 'coding',
                    language: programmingLanguage,
                    question: questionText,
                    inputFormat: inputFormatText,
                    outputFormat: outputFormatText,
                    testCases: testCasesText
                };
            } else {
                // MCQ question
                const codeLines = [];
                const codeElements = document.querySelectorAll('.ace_layer.ace_text-layer .ace_line');
                codeElements.forEach(line => {
                    codeLines.push(line.innerText.trim());
                });
                const codeText = codeLines.length > 0 ? codeLines.join('\n') : null;

                const optionsElements = document.querySelectorAll('div[aria-labelledby="each-option"]');
                const optionsText = [];
                optionsElements.forEach((option, index) => {
                    optionsText.push(`Option ${index + 1}: ${option.innerText.trim()}`);
                });

                return {
                    type: 'mcq',
                    question: questionText,
                    code: codeText,
                    options: optionsText.join('\n')
                };
            }
        }

        function extractHackerRankQuestion() {
            const getCleanText = el => el?.innerText?.trim() || "";

            // Check if it's a coding question (has Monaco editor)
            const monacoEditor = document.querySelector('.monaco-editor, .hr-monaco-editor');
            
            if (monacoEditor) {
                // Coding question
                let language = "Unknown";
                let title = "No Title Found";
                let instruction = "No Instructions Found";
                let details = "";

                const newLanguageSelector = document.querySelector('.select-language .css-3d4y2u-singleValue, .select-language .css-x7738g');
                if (newLanguageSelector) {
                    language = getCleanText(newLanguageSelector);
                } else {
                    language = getCleanText(document.querySelector('.select-language .css-x7738g')) || "Unknown";
                }

                let container = document.querySelector('.QuestionDetails_container__AIu0X');
                if (container) {
                    const titleElement = container.querySelector('.qaas-block-question-title, h2');
                    if (titleElement) {
                        const titleText = titleElement.textContent || titleElement.innerText;
                        title = titleText.replace(/Bookmark question \d+/g, '').trim();
                    }
                    
                    const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
                    if (instructionElement) {
                        instruction = getCleanText(instructionElement);
                    }
                    
                    const detailsElements = container.querySelectorAll('details');
                    if (detailsElements.length > 0) {
                        details = Array.from(detailsElements).map(detail => {
                            const summary = getCleanText(detail.querySelector('summary'));
                            const content = getCleanText(detail.querySelector('.collapsable-details'));
                            return `\n${summary}\n${'-'.repeat(summary.length)}\n${content}`;
                        }).join('\n');
                    }
                } else {
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

                return {
                    type: 'coding',
                    language: language,
                    title: title,
                    instruction: instruction,
                    details: details
                };
            } else {
                // MCQ question
                const newLayoutQuestions = document.querySelectorAll('.QuestionDetails_container__AIu0X');
                
                if (newLayoutQuestions.length > 0) {
                    // New layout
                    const container = newLayoutQuestions[0]; // Get first question
                    let title = '';
                    let instruction = '';
                    let options = [];

                    const titleElement = container.querySelector('.qaas-block-question-title, h2');
                    if (titleElement) {
                        const titleText = titleElement.textContent || titleElement.innerText;
                        title = titleText.replace(/Bookmark question \d+/g, '').trim();
                    }

                    const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
                    if (instructionElement) {
                        instruction = getCleanText(instructionElement);
                    }

                    let optionsContainer = container.nextElementSibling;
                    let attempts = 0;
                    while (optionsContainer && attempts < 5) {
                        const hasOptions = optionsContainer.querySelector('[role="checkbox"], [role="radio"]');
                        if (hasOptions) break;
                        optionsContainer = optionsContainer.nextElementSibling;
                        attempts++;
                    }

                    if (optionsContainer) {
                        let optionElements = optionsContainer.querySelectorAll('[role="radio"]');
                        if (optionElements.length === 0) {
                            optionElements = optionsContainer.querySelectorAll('[role="checkbox"]');
                        }

                        optionElements.forEach((option, index) => {
                            const labelId = option.getAttribute('aria-labelledby');
                            const labelElement = labelId ? document.getElementById(labelId) : 
                                              option.closest('.Control_optionList__vIubt, li')?.querySelector('label');
                            
                            if (labelElement) {
                                options.push(`Option ${index + 1}: ${labelElement.textContent.trim()}`);
                            }
                        });
                    }

                    return {
                        type: 'mcq',
                        title: title,
                        instruction: instruction,
                        options: options.join('\n')
                    };
                } else {
                    // Old layout
                    const oldLayoutQuestion = document.querySelector('.grouped-mcq__question');
                    if (oldLayoutQuestion) {
                        let title = '';
                        let instruction = '';
                        let options = [];

                        const titleElement = oldLayoutQuestion.querySelector('.question-view__title');
                        if (titleElement) {
                            title = titleElement.textContent.trim();
                        }

                        const instructionElement = oldLayoutQuestion.querySelector('.question-view__instruction');
                        if (instructionElement) {
                            instruction = instructionElement.textContent.trim();
                        }

                        const optionElements = oldLayoutQuestion.querySelectorAll('.ui-radio');
                        optionElements.forEach((option, index) => {
                            const labelElement = option.querySelector('.label');
                            if (labelElement) {
                                options.push(`Option ${index + 1}: ${labelElement.textContent.trim()}`);
                            }
                        });

                        return {
                            type: 'mcq',
                            title: title,
                            instruction: instruction,
                            options: options.join('\n')
                        };
                    }
                }
            }

            return null;
        }

        function extractCurrentQuestion() {
            const platform = detectPlatform();
            
            if (platform === 'examly') {
                return extractExamlyQuestion();
            } else if (platform === 'hackerrank') {
                return extractHackerRankQuestion();
            }
            
            return null;
        }

        function formatQuestionForChat(questionData) {
            if (!questionData) return null;

            let formattedQuestion = '';

            if (questionData.type === 'coding') {
                if (questionData.language) {
                    // Examly or HackerRank coding
                    formattedQuestion += `[Coding Question - ${questionData.language}]\n\n`;
                    
                    if (questionData.title) {
                        formattedQuestion += `Title: ${questionData.title}\n\n`;
                    }
                    
                    if (questionData.question) {
                        formattedQuestion += `Question:\n${questionData.question}\n\n`;
                    }
                    
                    if (questionData.instruction) {
                        formattedQuestion += `Instruction:\n${questionData.instruction}\n\n`;
                    }
                    
                    if (questionData.inputFormat) {
                        formattedQuestion += `Input Format:\n${questionData.inputFormat}\n\n`;
                    }
                    
                    if (questionData.outputFormat) {
                        formattedQuestion += `Output Format:\n${questionData.outputFormat}\n\n`;
                    }
                    
                    if (questionData.testCases) {
                        formattedQuestion += `Test Cases:\n${questionData.testCases}\n\n`;
                    }
                    
                    if (questionData.details) {
                        formattedQuestion += `Additional Details:${questionData.details}\n\n`;
                    }
                }
            } else if (questionData.type === 'mcq') {
                formattedQuestion += `[MCQ Question]\n\n`;
                
                if (questionData.title) {
                    formattedQuestion += `Title: ${questionData.title}\n\n`;
                }
                
                if (questionData.question) {
                    formattedQuestion += `Question:\n${questionData.question}\n\n`;
                }
                
                if (questionData.instruction) {
                    formattedQuestion += `${questionData.instruction}\n\n`;
                }
                
                if (questionData.code) {
                    formattedQuestion += `Code:\n${questionData.code}\n\n`;
                }
                
                if (questionData.options) {
                    formattedQuestion += `Options:\n${questionData.options}\n`;
                }
            }

            return formattedQuestion.trim();
        }

        // Create the main chat overlay UI
        function createChatOverlay() {
            // Check if overlay already exists, return if it does
            if (document.getElementById("chat-overlay")) {
                return document.getElementById("chat-overlay");
            }

            const overlay = document.createElement("div");
            overlay.id = "chat-overlay";
            overlay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 380px;
            height: 500px;
            background-color: #fff;
            border: none;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            z-index: 9999;
            display: ${isOverlayVisible ? "flex" : "none"};
            flex-direction: column;
            font-family: 'Poppins', sans-serif;
            overflow: hidden;
            transition: opacity 0.3s ease;
        `;

            // Create header
            const header = document.createElement("div");
            header.style.cssText = `
            padding: 20px !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
            font-weight: 500 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background-color: #fff !important;
            color: #333 !important;
            cursor: move !important;
            font-size: 15px !important;
            letter-spacing: 0.3px !important;
        `;

            header.innerHTML = `
        <span style="display: flex !important; align-items: center !important; gap: 8px !important;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat
        </span>
        <div style="display: flex !important; gap: 12px !important; align-items: center !important;">
            <span 
            id="stealth-mode" 
            role="button"
            tabindex="0"
            style="
                display: inline-block !important;
                font-size: 14px !important; 
                cursor: pointer !important; 
                padding: 6px 12px !important;
                font-family: 'Poppins', sans-serif !important;
                background: white !important;
                border: none !important;
                border-radius: 6px !important;
                color: #333 !important;
                user-select: none !important;
                text-align: center !important;
            "
            >
            Enable Stealth Mode
            </span>
            <span id="close-chat" style="cursor: pointer !important; font-size: 20px !important; line-height: 1 !important;">×</span>
        </div>
        `;

            // Create messages container
            const messagesContainer = document.createElement("div");
            messagesContainer.id = "chat-messages";
            messagesContainer.style.cssText = `
        padding: 20px;
        flex: 1;
        overflow-y: auto;
        background-color: #fafafa;
        color: #333;
        scroll-behavior: smooth;
        white-space: pre-wrap;
        `;

            // Create input area
            const inputArea = document.createElement("div");
            inputArea.style.cssText = `
        padding: 16px 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        background-color: #fff;
        display: flex;
        flex-direction: column;
        gap: 12px;
        `;

            // Create input field with plain text only
            const inputField = document.createElement("div");
            inputField.contentEditable = "plaintext-only"; // Force plain text only
            inputField.placeholder = "Type a message...";
            inputField.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        outline: none;
        background-color: #fff;
        color: #333;
        min-height: 24px;
        max-height: 120px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 400;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        transition: all 0.2s ease;
        overflow-y: auto;
        white-space: pre-wrap;
        -webkit-user-modify: read-write-plaintext-only;
        `;

            // Simple paste event to ensure consistency (optional fallback)
            inputField.addEventListener('paste', function(e) {
                // The plaintext-only attribute should handle this, but as a fallback:
                setTimeout(() => {
                    // Clean any potential HTML that might slip through
                    if (this.children.length > 0) {
                        const text = this.textContent || this.innerText;
                        this.textContent = text;
                    }
                }, 10);
            });

            // Add Enter key handler for sending messages
            inputField.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendButton.click();
                }
            });

            // Create checkbox container for "Chat about question"
            const checkboxContainer = document.createElement("div");
            checkboxContainer.style.cssText = `
        display: none;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        `;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = "chat-about-question-checkbox";
            checkbox.style.cssText = `
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: rgb(60, 84, 114);
        `;

            const checkboxLabel = document.createElement("label");
            checkboxLabel.htmlFor = "chat-about-question-checkbox";
            checkboxLabel.style.cssText = `
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        color: #666;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
        `;

            const questionIcon = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        `;

            checkboxLabel.innerHTML = questionIcon + '<span>Chat about question</span>';

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(checkboxLabel);

            // Store last question hash to detect question changes
            let lastQuestionHash = null;

            // Function to generate a simple hash from question data
            function getQuestionHash(questionData) {
                if (!questionData) return null;
                
                // Create a unique string from the question data
                let hashString = '';
                if (questionData.type) hashString += questionData.type;
                if (questionData.question) hashString += questionData.question;
                if (questionData.title) hashString += questionData.title;
                if (questionData.instruction) hashString += questionData.instruction;
                
                // Simple hash function
                let hash = 0;
                for (let i = 0; i < hashString.length; i++) {
                    const char = hashString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32-bit integer
                }
                return hash;
            }

            // Function to check and update checkbox visibility based on platform detection
            function updateCheckboxVisibility() {
                const platform = detectPlatform();
                if (platform) {
                    // Valid platform detected, show the checkbox
                    checkboxContainer.style.display = 'flex';
                    
                    // If checkbox is enabled, check if question has changed
                    if (chatAboutQuestionEnabled && checkbox.checked) {
                        const currentQuestionData = extractCurrentQuestion();
                        const currentQuestionHash = getQuestionHash(currentQuestionData);
                        
                        // If question hash changed, re-extract the question
                        if (currentQuestionHash !== lastQuestionHash && lastQuestionHash !== null) {
                            if (currentQuestionData) {
                                extractedQuestion = formatQuestionForChat(currentQuestionData);
                                lastQuestionHash = currentQuestionHash;
                                console.log('Question changed and re-extracted for chat');
                                
                                // Clear chat history when question changes
                                clearChatHistoryAndUI('question-switch');
                                
                                // Show notification that question was updated and chat cleared
                                addNotificationMessage('Question updated - Chat cleared');
                            } else {
                                // Question no longer available
                                checkbox.checked = false;
                                chatAboutQuestionEnabled = false;
                                extractedQuestion = null;
                                lastQuestionHash = null;
                                checkboxLabel.style.color = '#666';
                                checkboxLabel.style.fontWeight = '400';
                                addNotificationMessage('Question no longer detected');
                            }
                        }
                    }
                } else {
                    // No valid platform, hide the checkbox and reset state
                    checkboxContainer.style.display = 'none';
                    checkbox.checked = false;
                    chatAboutQuestionEnabled = false;
                    extractedQuestion = null;
                    lastQuestionHash = null;
                    checkboxLabel.style.color = '#666';
                    checkboxLabel.style.fontWeight = '400';
                }
            }

            // Initial check when overlay is created
            updateCheckboxVisibility();

            // Re-check periodically in case user navigates to a different page
            setInterval(updateCheckboxVisibility, 2000);

            // Handle checkbox change
            checkbox.addEventListener('change', function() {
                chatAboutQuestionEnabled = this.checked;
                
                if (chatAboutQuestionEnabled) {
                    // Extract question when enabled
                    const questionData = extractCurrentQuestion();
                    if (questionData) {
                        extractedQuestion = formatQuestionForChat(questionData);
                        lastQuestionHash = getQuestionHash(questionData);
                        console.log('Question extracted for chat:', extractedQuestion);
                        
                        // Update label to show question is attached
                        checkboxLabel.style.color = 'rgb(60, 84, 114)';
                        checkboxLabel.style.fontWeight = '500';
                    } else {
                        // No question found, disable checkbox
                        this.checked = false;
                        chatAboutQuestionEnabled = false;
                        extractedQuestion = null;
                        lastQuestionHash = null;
                        
                        // Show notification
                        addNotificationMessage('No question detected on this page');
                    }
                } else {
                    // Reset styles when disabled
                    checkboxLabel.style.color = '#666';
                    checkboxLabel.style.fontWeight = '400';
                    extractedQuestion = null;
                    lastQuestionHash = null;
                }
            });

            // Create button container
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = `
        display: flex;
        align-items: flex-end;
        gap: 12px;
        `;

            // Create clear button
            const clearButton = document.createElement("button");
            clearButton.id = "clear-chat";
            clearButton.innerHTML = "Clear Chat";
            clearButton.style.cssText = `
        padding: 12px;
        background-color: rgb(60, 84, 114);  /* Changed to match send button color */
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(60, 84, 114, 0.2);  /* Updated shadow color to match */
        font-family: 'Poppins', sans-serif;
        `;

            // Create send button
            const sendButton = document.createElement("button");
            sendButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        `;
            sendButton.style.cssText = `
        padding: 12px;
        background-color: rgb(60, 84, 114);
        color: #fff;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(60, 84, 114, 0.2);
        `;

            // Create resize handle
            const resizeHandle = document.createElement("div");
            resizeHandle.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 12px;
        height: 12px;
        background-color: rgb(60, 84, 114);
        cursor: nw-resize;
        border-radius: 12px 0 12px 0;
        opacity: 0.8;
        `;

            // Add custom scrollbar styles and Prism theme overrides
            const scrollbarStyles = document.createElement("style");
            scrollbarStyles.innerHTML = `
        #chat-overlay ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        #chat-overlay ::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
            transition: background-color 0.2s ease;
        }

        #chat-overlay ::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.3);
        }

        #chat-overlay ::-webkit-scrollbar-track {
            background-color: transparent;
        }

        #chat-overlay [contenteditable]:empty:before {
            content: attr(placeholder);
            color: rgba(0, 0, 0, 0.4);
            font-weight: 300;
        }

        /* Prism theme customizations for chat overlay */
        #chat-overlay pre[class*="language-"] {
            background: #f8f9fa !important;
            border: 1px solid #e1e4e8 !important;
            border-radius: 6px !important;
            margin: 15px 0 !important;
            padding: 12px !important;
            overflow-x: auto !important;
        }

        #chat-overlay code[class*="language-"] {
            background: transparent !important;
            font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', Menlo, monospace !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            color: #24292e !important;
        }

        /* Token colors for better readability */
        #chat-overlay .token.comment,
        #chat-overlay .token.prolog,
        #chat-overlay .token.doctype,
        #chat-overlay .token.cdata {
            color: #6a737d !important;
        }

        #chat-overlay .token.punctuation {
            color: #24292e !important;
        }

        #chat-overlay .token.property,
        #chat-overlay .token.tag,
        #chat-overlay .token.boolean,
        #chat-overlay .token.number,
        #chat-overlay .token.constant,
        #chat-overlay .token.symbol,
        #chat-overlay .token.deleted {
            color: #005cc5 !important;
        }

        #chat-overlay .token.selector,
        #chat-overlay .token.attr-name,
        #chat-overlay .token.string,
        #chat-overlay .token.char,
        #chat-overlay .token.builtin,
        #chat-overlay .token.inserted {
            color: #032f62 !important;
        }

        #chat-overlay .token.operator,
        #chat-overlay .token.entity,
        #chat-overlay .token.url,
        #chat-overlay .language-css .token.string,
        #chat-overlay .style .token.string {
            color: #e36209 !important;
        }

        #chat-overlay .token.atrule,
        #chat-overlay .token.attr-value,
        #chat-overlay .token.keyword {
            color: #d73a49 !important;
        }

        #chat-overlay .token.function,
        #chat-overlay .token.class-name {
            color: #6f42c1 !important;
        }

        #chat-overlay .token.regex,
        #chat-overlay .token.important,
        #chat-overlay .token.variable {
            color: #e36209 !important;
        }

        /* Remove any pseudo-elements that might cause overlay effects */
        #chat-overlay pre[class*="language-"]:before,
        #chat-overlay pre[class*="language-"]:after,
        #chat-overlay code[class*="language-"]:before,
        #chat-overlay code[class*="language-"]:after {
            display: none !important;
        }

        /* Ensure no box-shadow or other effects */
        #chat-overlay pre[class*="language-"] {
            box-shadow: none !important;
            text-shadow: none !important;
        }

        #chat-overlay code[class*="language-"] {
            box-shadow: none !important;
            text-shadow: none !important;
        }
        `;

            // Assemble the components
            buttonContainer.appendChild(inputField);
            buttonContainer.appendChild(clearButton);
            buttonContainer.appendChild(sendButton);
            inputArea.appendChild(checkboxContainer);
            inputArea.appendChild(buttonContainer);
            overlay.appendChild(header);
            overlay.appendChild(messagesContainer);
            overlay.appendChild(inputArea);
            overlay.appendChild(resizeHandle);
            document.body.appendChild(overlay); // Add overlay to DOM first
            document.head.appendChild(scrollbarStyles);

            // Add placeholder behavior after element is in DOM
            inputField.addEventListener('focus', function() {
                if (this.textContent.trim() === '') {
                    this.setAttribute('data-placeholder', 'Type a message...');
                }
            });

            inputField.addEventListener('blur', function() {
                if (this.textContent.trim() === '') {
                    this.removeAttribute('data-placeholder');
                }
            });

            // Add hover effect to clear button
            clearButton.addEventListener('mouseenter', () => {
                clearButton.style.transform = 'translateY(-1px)';
                clearButton.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.3)';
            });

            clearButton.addEventListener('mouseleave', () => {
                clearButton.style.transform = 'translateY(0)';
                clearButton.style.boxShadow = '0 2px 4px rgba(244, 67, 54, 0.2)';
            });

            // Add hover effect to send button
            sendButton.addEventListener('mouseenter', () => {
                sendButton.style.transform = 'translateY(-1px)';
                sendButton.style.boxShadow = '0 4px 8px rgba(60, 84, 114, 0.3)';
            });

            sendButton.addEventListener('mouseleave', () => {
                sendButton.style.transform = 'translateY(0)';
                sendButton.style.boxShadow = '0 2px 4px rgba(60, 84, 114, 0.2)';
            });

            // Add event listeners for dragging
            header.addEventListener("mousedown", (e) => {
                isDragging = true;
                dragOffsetX = e.clientX - overlay.getBoundingClientRect().left;
                dragOffsetY = e.clientY - overlay.getBoundingClientRect().top;
            });

            // Add event listeners for stealth-mode
            // Get the initial state from storage
            chrome.storage.local.get(['stealth'], function(result) {
                // Initialize stealth mode based on storage
                let stealthModeEnabled = result.stealth === true;
                
                // First get the stealth mode button element
                const stealthModeButton = document.getElementById("stealth-mode");
                
                // Update button text on initialization
                if (stealthModeButton) {
                    stealthModeButton.innerText = stealthModeEnabled ? 
                        "Disable Stealth Mode" : "Enable Stealth Mode";
                    
                    // Add event listener for stealth mode toggle
                    stealthModeButton.addEventListener("click", () => {
                        const chatButton = document.getElementById("chat-button");
                        const closeIcon = document.getElementById("close-chat");

                        // Toggle stealth mode state
                        stealthModeEnabled = !stealthModeEnabled;

                        if (stealthModeEnabled) {
                            overlay.style.opacity = "0.15"; // Set lower opacity
                            if (chatButton) {
                                chatButton.style.opacity = "0"; // Hide with opacity instead of display none
                                chatButton.style.pointerEvents = "auto"; // Keep pointer events active
                            }
                            if (closeIcon) closeIcon.style.display = "block"; // Ensure close icon is visible
                            stealthModeButton.innerText = "Disable Stealth Mode"; // Update button text
                            
                            // Show toast notification for stealth mode enabled
                            chrome.runtime.sendMessage({
                                action: 'showStealthToast',
                                message: `Hover over the area where the chat icon is located \nor press ${window.isMac ? 'Option+C' : 'Alt+C'} to access [Chatbot opacity reduced]`,
                                stealthEnabled: true
                            });
                        } else {
                            overlay.style.opacity = "1"; // Reset opacity
                            if (chatButton) {
                                chatButton.style.opacity = "1"; // Show chat button with full opacity
                                chatButton.style.pointerEvents = "auto"; // Ensure pointer events are active
                                chatButton.innerHTML = `
                                <svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <defs>
                                        <filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%">
                                            <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/>
                                            <feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/>
                                            <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/>
                                            <feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/>
                                            <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/>
                                        </filter>
                                        <path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/>
                                    </defs>
                                    <g fill="none" fill-rule="evenodd">
                                        <use fill="#000" filter="url(#a)" xlink:href="#b"/>
                                        <use fill="#fff" stroke="#fff" stroke-width="2" xlink:href="#b"/>
                                    </g>
                                </svg>
                                `; // Reset chat button icon to original Crisp-style icon
                            }
                            stealthModeButton.innerText = "Enable Stealth Mode"; // Update button text
                            
                            // Show toast notification for stealth mode disabled
                            chrome.runtime.sendMessage({
                                action: 'showStealthToast',
                                message: 'Chat icon is now visible',
                                stealthEnabled: false
                            });
                        }
                        
                        // Update storage with new stealth mode state
                        chrome.storage.local.set({ stealth: stealthModeEnabled });
                    });
                }
                
                // Listen for storage changes to update stealth mode state across all tabs
                chrome.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes.stealth && stealthModeButton) {
                        const newStealthMode = changes.stealth.newValue === true;
                        stealthModeEnabled = newStealthMode;
                        
                        // Update button text
                        stealthModeButton.innerText = newStealthMode ? 
                            "Disable Stealth Mode" : "Enable Stealth Mode";
                        
                        // Update overlay opacity
                        if (overlay) {
                            overlay.style.opacity = newStealthMode ? "0.15" : "1";
                        }
                        
                        // Update chat button visibility
                        const chatButton = document.getElementById("chat-button");
                        if (chatButton) {
                            chatButton.style.opacity = newStealthMode ? "0" : "1";
                            chatButton.style.pointerEvents = "auto"; // Keep pointer events active in both states
                            
                            // Reset chat button icon when showing - use original Crisp-style icon
                            if (!newStealthMode) {
                                chatButton.innerHTML = `
                                <svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <defs>
                                        <filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%">
                                            <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/>
                                            <feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/>
                                            <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/>
                                            <feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/>
                                            <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/>
                                        </filter>
                                        <path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/>
                                    </defs>
                                    <g fill="none" fill-rule="evenodd">
                                        <use fill="#000" filter="url(#a)" xlink:href="#b"/>
                                        <use fill="#fff" stroke="#fff" stroke-width="2" xlink:href="#b"/>
                                    </g>
                                </svg>
                                `;
                            }
                        }
                    }
                });
            });

            // Add event listeners for resizing
            // Add minimum size constants at the top with the other state variables
            const MIN_WIDTH = 250; // Minimum width in pixels
            const MIN_HEIGHT = 200; // Minimum height in pixels
            const MAX_WIDTH = window.innerWidth - 40; // Maximum width (leaving 20px padding on each side)
            const MAX_HEIGHT = window.innerHeight - 40; // Maximum height (leaving 20px padding on each side)

            // Replace the resize event listener section with this updated version
            resizeHandle.addEventListener("mousedown", (e) => {
                isResizing = true;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                initialWidth = overlay.offsetWidth;
                initialHeight = overlay.offsetHeight;
                e.stopPropagation(); // Prevent dragging when resizing
            });

            resizeHandle.addEventListener("mouseenter", () => {
                resizeHandle.style.opacity = "1";
            });

            resizeHandle.addEventListener("mouseleave", () => {
                resizeHandle.style.opacity = "0.8";
            });

            // Update the mousemove event listener to include size constraints
            // This should be outside the createChatOverlay function as it's document level

            // Add window resize handler to keep overlay within bounds
            window.addEventListener('resize', () => {
                const overlay = document.getElementById('chat-overlay');
                if (overlay) {
                    const rect = overlay.getBoundingClientRect();

                    // Update maximum constraints
                    const newMaxWidth = window.innerWidth - 40;
                    const newMaxHeight = window.innerHeight - 40;

                    // Adjust size if necessary
                    if (rect.width > newMaxWidth) {
                        overlay.style.width = newMaxWidth + 'px';
                    }
                    if (rect.height > newMaxHeight) {
                        overlay.style.height = newMaxHeight + 'px';
                    }

                    // Keep overlay within viewport
                    if (rect.right > window.innerWidth) {
                        overlay.style.left = (window.innerWidth - rect.width) + "px";
                    }
                    if (rect.bottom > window.innerHeight) {
                        overlay.style.top = (window.innerHeight - rect.height) + "px";
                    }
                }
            });

            // Add button event listeners
            const closeButton = document.getElementById("close-chat");
            if (closeButton) {
                closeButton.addEventListener("click", () => {
                    isOverlayVisible = false;
                    overlay.style.display = "none";
                });
            }

            const clearChatButton = document.getElementById("clear-chat");
            if (clearChatButton) {
                clearChatButton.addEventListener("click", () => {
                    clearChatHistoryAndUI('manual');
                });
            }

            // Handle message sending
            sendButton.addEventListener("click", async () => {
                const message = inputField.innerText.trim();
                if (message) {
                    try {
                        // Clear any error state before sending new message
                        clearErrorState();
                        
                        // Prepare the final message to send
                        let finalMessage = message;
                        
                        // If "Chat about question" is enabled, prepend the question
                        if (chatAboutQuestionEnabled && extractedQuestion) {
                            finalMessage = `Context: Below is the question I'm working on:\n\n${extractedQuestion}\n\n---\n\nMy Question: ${message}`;
                            console.log('Sending message with question context');
                        }
                        
                        chatHistory.push({
                            role: "user",
                            content: message
                        });

                        addMessageToChat(message, "user");
                        inputField.innerText = "";

                        // Add enhanced loading indicator
                        const loadingDiv = addLoadingIndicator();
                        messagesContainer.appendChild(loadingDiv);

                        // Send message and wait for response with timeout
                        const response = await new Promise((resolve, reject) => {
                            let timeoutId;
                            let resolved = false;
                            
                            // Set up timeout (30 seconds)
                            timeoutId = setTimeout(() => {
                                if (!resolved) {
                                    resolved = true;
                                    reject(new Error('Request timed out. Please try again.'));
                                }
                            }, 30000);
                            
                            // Listen for response
                            const messageListener = (message) => {
                                if (message.action === "updateChatHistory" && !resolved) {
                                    resolved = true;
                                    clearTimeout(timeoutId);
                                    chrome.runtime.onMessage.removeListener(messageListener);
                                    resolve(message);
                                }
                            };
                            
                            chrome.runtime.onMessage.addListener(messageListener);
                            
                            // Send the message (with question context if enabled)
                            // Create valid conversation context (filters errors and ensures proper role flow)
                            const validContext = createValidContext(chatHistory);
                            chrome.runtime.sendMessage({
                                action: "processChatMessage",
                                message: finalMessage, // Send the final message with or without question context
                                context: validContext
                            }).catch((error) => {
                                if (!resolved) {
                                    resolved = true;
                                    clearTimeout(timeoutId);
                                    chrome.runtime.onMessage.removeListener(messageListener);
                                    reject(error);
                                }
                            });
                        });
                        
                        // Remove loading indicator
                        const loadingMessage = document.getElementById("loading-message");
                        if (loadingMessage) {
                            loadingMessage.remove();
                        }
                        
                        // The response will be handled by the runtime message listener
                        // No need to add the message here as it will be added via "updateChatHistory"
                    }
                    catch (error) {
                        console.error("Error sending message:", error);
                        
                        // Remove loading indicator if it exists
                        const loadingMessage = document.getElementById("loading-message");
                        if (loadingMessage) {
                            loadingMessage.remove();
                        }
                        
                        // Handle different types of errors with appropriate messages
                        let errorMessage = "I encountered an error processing your message. Please try again.";
                        let isRateLimitError = false;
                        
                        if (error.message) {
                            if (error.message.includes('timeout') || error.message.includes('timed out')) {
                                errorMessage = "The request timed out. The service might be experiencing high load. Please try again in a moment.";
                            } else if (error.message.includes('rate limit') || error.message.includes('Daily request limit')) {
                                errorMessage = "You've reached your daily chat limit. Please try again tomorrow.";
                                isRateLimitError = true;
                            } else if (error.message.includes('Network') || error.message.includes('connection')) {
                                errorMessage = "Unable to connect to the chat service. Please check your internet connection and try again.";
                            } else if (error.message.includes('login') || error.message.includes('authentication')) {
                                errorMessage = "Please log in to use the chat feature. Click the extension icon to log in.";
                            } else {
                                // Use the error message if it's user-friendly
                                errorMessage = error.message;
                            }
                        }
                        
                        // Add error message to chat with special styling
                        addErrorMessageToChat(errorMessage, isRateLimitError);
                    }
                }
            });
            
            addNotificationMessage(`${window.isMac ? 'Option+C' : 'Alt+C'} to toggle`);

            return overlay;
        }

        // Add notification message function
        function addNotificationMessage(message) {
            const messagesContainer = document.getElementById("chat-messages");
            if (!messagesContainer) return;
            
            const messageDiv = document.createElement("div");
            messageDiv.textContent = message;
            messageDiv.style.cssText = `
                margin: 10px 0;
                padding: 10px;
                background-color: #eef;
                border-radius: 8px;
                color: #333;
                font-size: 12px;
                text-align: center;
                border: 1px solid #dde;
                font-family: 'Poppins', sans-serif;
            `;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Create the chat button
        function createChatButton() {
            const button = document.createElement("button");
            button.id = "chat-button";
            button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: #3c5472;
        border: none;
        border-radius: 100%;
        color: #fff;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: none !important;
        `;

            // Use Crisp-style chat bubble icon (decoded from base64)
            button.innerHTML = `
            <svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <defs>
                    <filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%">
                        <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/>
                        <feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/>
                        <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/>
                        <feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/>
                        <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/>
                    </filter>
                    <path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/>
                </defs>
                <g fill="none" fill-rule="evenodd">
                    <use fill="#000" filter="url(#a)" xlink:href="#b"/>
                    <use fill="#fff" stroke="#fff" stroke-width="2" xlink:href="#b"/>
                </g>
            </svg>`;
            document.body.appendChild(button);

            // Add hover effects for stealth mode
            button.addEventListener('mouseenter', () => {
                chrome.storage.local.get(['stealth'], function(result) {
                    const stealthModeEnabled = result.stealth === true;
                    if (stealthModeEnabled) {
                        button.style.opacity = "0.3"; // Show with reduced opacity on hover in stealth mode
                    }
                });
            });

            button.addEventListener('mouseleave', () => {
                chrome.storage.local.get(['stealth'], function(result) {
                    const stealthModeEnabled = result.stealth === true;
                    if (stealthModeEnabled) {
                        button.style.opacity = "0"; // Hide again when not hovering in stealth mode
                    }
                });
            });

            let dragStartX, dragStartY, initialX, initialY;
            let isDraggingButton = false;
            let hasMoved = false;

            // Handle button dragging with improved click detection
            button.addEventListener("mousedown", (e) => {
                isDraggingButton = true;
                hasMoved = false;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                initialX = button.getBoundingClientRect().left;
                initialY = button.getBoundingClientRect().top;
            });

            document.addEventListener("mousemove", (e) => {
                if (isDraggingButton) {
                    const deltaX = e.clientX - dragStartX;
                    const deltaY = e.clientY - dragStartY;

                    // Check if the button has moved more than 5 pixels in any direction
                    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                        hasMoved = true;
                    }

                    const newX = initialX + deltaX;
                    const newY = initialY + deltaY;

                    // Keep button within viewport bounds
                    const maxX = window.innerWidth - button.offsetWidth;
                    const maxY = window.innerHeight - button.offsetHeight;

                    button.style.left = Math.min(Math.max(0, newX), maxX) + "px";
                    button.style.top = Math.min(Math.max(0, newY), maxY) + "px";
                    button.style.bottom = "auto";
                    button.style.right = "auto";
                }
            });

            document.addEventListener("mouseup", () => {
                if (isDraggingButton) {
                    isDraggingButton = false;

                    // Only trigger click if the button hasn't moved
                    if (!hasMoved) {
                        toggleChatOverlay();
                    }
                }
            });

            // Remove double click handler and use single click with movement detection
            button.addEventListener("click", (e) => {
                // Click handling is now managed in the mouseup event
                e.preventDefault();
            });
            
            return button;
        }

        // Helper function to detect programming language from code content
        function detectLanguage(code) {
            const codeText = code.toLowerCase().trim();
            
            // TypeScript detection (check before JavaScript)
            if (codeText.includes('interface ') || codeText.includes('type ') || codeText.includes(': string') ||
                codeText.includes(': number') || codeText.includes(': boolean') || codeText.includes('export interface') ||
                codeText.includes('import type') || codeText.includes('as const') || codeText.includes('enum ')) {
                return 'typescript';
            }
            
            // JSX/TSX detection
            if (codeText.includes('<') && codeText.includes('>') && 
                (codeText.includes('return (') || codeText.includes('jsx') || codeText.includes('tsx') ||
                 codeText.includes('component') || codeText.includes('props'))) {
                return codeText.includes(': ') ? 'tsx' : 'jsx';
            }
            
            // JavaScript detection
            if (codeText.includes('function') || codeText.includes('const ') || codeText.includes('let ') ||
                codeText.includes('var ') || codeText.includes('=>') || codeText.includes('console.log') ||
                codeText.includes('document.') || codeText.includes('window.') || codeText.includes('require(') ||
                codeText.includes('import ') || codeText.includes('export ')) {
                return 'javascript';
            }
            
            // Python detection
            if (codeText.includes('def ') || codeText.includes('import ') || codeText.includes('from ') ||
                codeText.includes('print(') || codeText.includes('if __name__') || codeText.includes('self.') ||
                codeText.includes('class ') || codeText.includes('elif ') || codeText.includes('range(') ||
                codeText.includes('lambda ') || codeText.includes('yield ')) {
                return 'python';
            }
            
            // Java detection
            if (codeText.includes('public class') || codeText.includes('private ') || codeText.includes('public ') ||
                codeText.includes('import java') || codeText.includes('system.out.println') || codeText.includes('string ') ||
                codeText.includes('void main') || codeText.includes('extends ') || codeText.includes('implements ') ||
                codeText.includes('@override') || codeText.includes('new ')) {
                return 'java';
            }
            
            // C# detection
            if (codeText.includes('using system') || codeText.includes('namespace ') || codeText.includes('public static void main') ||
                codeText.includes('console.writeline') || codeText.includes('[attribute]') || codeText.includes('var ')) {
                return 'csharp';
            }
            
            // C++ detection (check before C)
            if (codeText.includes('std::') || codeText.includes('cout <<') || codeText.includes('cin >>') ||
                codeText.includes('#include <iostream>') || codeText.includes('using namespace std') ||
                codeText.includes('class ') || codeText.includes('template<')) {
                return 'cpp';
            }
            
            // C detection
            if (codeText.includes('#include') || codeText.includes('printf(') || codeText.includes('scanf(') ||
                codeText.includes('int main') || codeText.includes('malloc(') || codeText.includes('free(') ||
                codeText.includes('sizeof(')) {
                return 'c';
            }
            
            // PHP detection
            if (codeText.includes('<?php') || codeText.includes('echo ') || codeText.includes('$') ||
                codeText.includes('function ') || codeText.includes('class ') || codeText.includes('->')) {
                return 'php';
            }
            
            // Ruby detection
            if (codeText.includes('def ') || codeText.includes('end') || codeText.includes('puts ') ||
                codeText.includes('require ') || codeText.includes('class ') || codeText.includes('@')) {
                return 'ruby';
            }
            
            // Go detection
            if (codeText.includes('package ') || codeText.includes('func ') || codeText.includes('import (') ||
                codeText.includes('fmt.println') || codeText.includes('go ') || codeText.includes('defer ')) {
                return 'go';
            }
            
            // Rust detection
            if (codeText.includes('fn ') || codeText.includes('let mut') || codeText.includes('println!') ||
                codeText.includes('use ') || codeText.includes('struct ') || codeText.includes('impl ')) {
                return 'rust';
            }
            
            // Swift detection
            if (codeText.includes('import swift') || codeText.includes('var ') || codeText.includes('let ') ||
                codeText.includes('func ') || codeText.includes('class ') || codeText.includes('print(')) {
                return 'swift';
            }
            
            // Kotlin detection
            if (codeText.includes('fun ') || codeText.includes('val ') || codeText.includes('var ') ||
                codeText.includes('class ') || codeText.includes('println(') || codeText.includes('import kotlin')) {
                return 'kotlin';
            }
            
            // HTML detection
            if (codeText.includes('<!doctype') || codeText.includes('<html') || codeText.includes('<head') ||
                codeText.includes('<body') || codeText.includes('<div') || codeText.includes('<span') ||
                codeText.includes('<script') || codeText.includes('<style')) {
                return 'html';
            }
            
            // CSS/SCSS detection
            if (codeText.includes('{') && codeText.includes('}') && (codeText.includes(':') && codeText.includes(';'))) {
                if (codeText.includes('$') || codeText.includes('@mixin') || codeText.includes('@include')) {
                    return 'scss';
                }
                return 'css';
            }
            
            // SQL detection
            if (codeText.includes('select ') || codeText.includes('from ') || codeText.includes('where ') ||
                codeText.includes('insert ') || codeText.includes('update ') || codeText.includes('delete ') ||
                codeText.includes('create table') || codeText.includes('alter table') || codeText.includes('drop table')) {
                return 'sql';
            }
            
            // JSON detection
            if ((codeText.trim().startsWith('{') && codeText.trim().endsWith('}')) ||
                (codeText.trim().startsWith('[') && codeText.trim().endsWith(']'))) {
                try {
                    JSON.parse(code);
                    return 'json';
                } catch (e) {
                    // Not valid JSON, continue with other detections
                }
            }
            
            // YAML detection
            if (codeText.includes('---') || (codeText.includes(':') && !codeText.includes(';') && !codeText.includes('{')) ||
                codeText.includes('- ') || codeText.includes('version:') || codeText.includes('name:')) {
                return 'yaml';
            }
            
            // XML detection
            if (codeText.includes('<?xml') || codeText.includes('<') && codeText.includes('/>') ||
                (codeText.includes('<') && codeText.includes('>') && !codeText.includes('function'))) {
                return 'xml';
            }
            
            // Bash/Shell detection
            if (codeText.includes('#!/bin/bash') || codeText.includes('#!/bin/sh') || 
                codeText.includes('echo ') || codeText.includes('grep ') || codeText.includes('awk ') ||
                codeText.includes('sed ') || codeText.includes('chmod ') || codeText.includes('sudo ') ||
                codeText.includes('ls ') || codeText.includes('cd ') || codeText.includes('mkdir ')) {
                return 'bash';
            }
            
            // Default fallback
            return 'javascript';
        }

        // Add message to chat
        function addMessageToChat(message, role) {
            // Get the chat messages container
            const chatMessagesContainer = document.getElementById("chat-messages");
            if (!chatMessagesContainer) return;
            
            // Create a new message container
            const messageContainer = document.createElement("div");
            messageContainer.style.cssText = `
                margin-bottom: 10px;
                padding: 10px;
                border-radius: 8px;
                max-width: 90%;
                word-wrap: break-word;
            `;
        
            // Style the message differently based on the role (user or assistant)
            if (role === "user") {
                messageContainer.style.backgroundColor = "#dcf8c6";  // Light green for user messages
                messageContainer.style.alignSelf = "flex-end";
                messageContainer.style.paddingLeft = "10px";
            } else {
                messageContainer.style.backgroundColor = "#f1f1f1";  // Light gray for assistant messages
                messageContainer.style.alignSelf = "flex-start";
                messageContainer.style.border = "1px solid #ddd";
                messageContainer.style.paddingLeft = "10px";
            }
        
            try {
                // Convert markdown to HTML using showdown library
                if (typeof showdown !== 'undefined') {
                    // Initialize markdown converter if not already done
                    if (!markdownConverter) {
                        markdownConverter = new showdown.Converter();
                    }
                    const htmlContent = markdownConverter.makeHtml(message);
                    
                    // Create content container and parse markdown
                    const contentContainer = document.createElement("div");
                    contentContainer.innerHTML = htmlContent;
                    
                    // Style code blocks and add copy functionality
                    contentContainer.querySelectorAll("pre code").forEach(codeBlock => {
                        // Detect language from class name first (from markdown ```language)
                        let language = '';
                        const classNames = codeBlock.className.split(' ');
                        for (const className of classNames) {
                            if (className.startsWith('language-')) {
                                language = className.replace('language-', '');
                                break;
                            }
                        }
                        
                        // If no language specified in markdown, use auto-detection
                        if (!language || language === '') {
                            language = detectLanguage(codeBlock.textContent);
                        }
                        
                        // Set the language class for Prism (ensure it's set even if detected)
                        codeBlock.className = `language-${language}`;
                        
                        // Apply SimplePrism highlighting if available
                        if (typeof SimplePrism !== 'undefined') {
                            try {
                                SimplePrism.highlightElement(codeBlock);
                            } catch (error) {
                                console.warn('Failed to highlight code block:', error);
                                // Continue without highlighting
                            }
                        }
                        
                        // Style the parent <pre> element to ensure clean background
                        const preElement = codeBlock.parentNode;
                        if (preElement && preElement.tagName === 'PRE') {
                            preElement.style.cssText = `
                                background: #f8f9fa !important;
                                border: 1px solid #e1e4e8 !important;
                                border-radius: 6px !important;
                                margin: 15px 0 !important;
                                padding: 0 !important;
                                overflow: visible !important;
                                position: relative !important;
                            `;
                        }
                        
                        // Style the code block (let Prism handle syntax colors)
                        codeBlock.style.cssText = `
                            background: transparent !important;
                            border: none !important;
                            border-radius: 0 !important;
                            padding: 12px !important;
                            display: block !important;
                            margin: 0 !important;
                            overflow-x: auto !important;
                            white-space: pre !important;
                            font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', Menlo, monospace !important;
                            font-size: 13px !important;
                            line-height: 1.4 !important;
                        `;
                
                        // Create a wrapper for the code block to handle hover events
                        const codeWrapper = document.createElement("div");
                        codeWrapper.style.cssText = `
                            position: relative;
                            background: transparent;
                            border: none;
                            margin: 0;
                            padding: 0;
                        `;
                        
                        // Move the code block into the wrapper
                        codeBlock.parentNode.insertBefore(codeWrapper, codeBlock);
                        codeWrapper.appendChild(codeBlock);
                
                        // Create copy button with new styling
                        const copyButton = document.createElement("button");
                        copyButton.innerText = "Copy";
                        copyButton.style.cssText = `
                            position: absolute;
                            right: 8px;
                            top: 8px;
                            background-color: rgb(60, 84, 114);
                            color: #fff;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            padding: 6px 12px;
                            font-size: 12px;
                            font-family: 'Poppins', sans-serif;
                            opacity: 0;
                            transition: opacity 0.2s ease;
                            z-index: 10;
                        `;
                
                        // Add hover effects
                        codeWrapper.addEventListener('mouseenter', () => {
                            copyButton.style.opacity = "1";
                        });
                
                        codeWrapper.addEventListener('mouseleave', () => {
                            copyButton.style.opacity = "0";
                        });
                
                        // Add copy functionality
                        copyButton.addEventListener("click", () => {
                            navigator.clipboard.writeText(codeBlock.innerText)
                                .then(() => {
                                    copyButton.innerText = "Copied";
                                    setTimeout(() => {
                                        copyButton.innerText = "Copy";
                                    }, 5000);
                                })
                                .catch(error => {
                                    console.error("Failed to copy: ", error);
                                });
                        });
                
                        // Add the copy button to the wrapper
                        codeWrapper.appendChild(copyButton);
                    });
                    
                    // Add the content to the message container
                    messageContainer.appendChild(contentContainer);
                } else {
                    // Fallback for when showdown is not available
                    messageContainer.textContent = message;
                }
            } catch (error) {
                console.error('Error rendering markdown:', error);
                // Fallback to plain text
                messageContainer.textContent = message;
            }
            
            // Add the message to the chat and scroll to bottom
            chatMessagesContainer.appendChild(messageContainer);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }

        // Function to clear error state and remove error messages from chat history
        function clearErrorState() {
            // Remove error messages from chat history (in case any slipped through)
            chatHistory = chatHistory.filter(msg => msg.role !== "error");
            
            // Optionally clear error messages from UI after successful response
            // This helps provide a cleaner experience when the user resolves their issue
            // We keep them for now to maintain transparency, but you could uncomment below to remove them:
            /*
            const chatMessagesContainer = document.getElementById("chat-messages");
            if (chatMessagesContainer) {
                const errorMessages = chatMessagesContainer.querySelectorAll('[style*="f8d7da"], [style*="fff3cd"]');
                errorMessages.forEach(errorMsg => errorMsg.remove());
            }
            */
        }

        // Function to create valid conversation context for the API
        function createValidContext(chatHistory) {
            // First filter out error messages
            let filteredHistory = chatHistory.filter(msg => msg.role !== "error");
            
            // Ensure valid conversation flow (alternating user/assistant roles)
            let validContext = [];
            let lastRole = null;
            
            for (const message of filteredHistory) {
                // Skip consecutive messages with the same role (except the first)
                if (lastRole === message.role) {
                    // If we have consecutive user messages, skip the earlier one
                    // If we have consecutive assistant messages, skip the earlier one
                    if (validContext.length > 0) {
                        validContext.pop(); // Remove the previous message of the same role
                    }
                }
                
                validContext.push(message);
                lastRole = message.role;
            }
            
            // Ensure the conversation doesn't end with an assistant message if we're about to add a user message
            // The API expects user -> assistant -> user flow
            if (validContext.length > 0 && validContext[validContext.length - 1].role === "assistant") {
                // This is fine, we can add a user message next
            } else if (validContext.length > 0 && validContext[validContext.length - 1].role === "user") {
                // We have a trailing user message, which is fine since we're about to send another user message
                // But we should remove the trailing user message to avoid consecutive user messages
                validContext.pop();
            }
            
            return validContext;
        }

        // Add error message to chat with special styling
        function addErrorMessageToChat(errorMessage, isRateLimitError = false) {
            const chatMessagesContainer = document.getElementById("chat-messages");
            if (!chatMessagesContainer) return;
            
            // Create error message container
            const errorContainer = document.createElement("div");
            errorContainer.style.cssText = `
                margin-bottom: 12px;
                padding: 12px 16px;
                border-radius: 8px;
                max-width: 95%;
                word-wrap: break-word;
                background-color: ${isRateLimitError ? '#fff3cd' : '#f8d7da'};
                border: 1px solid ${isRateLimitError ? '#ffeaa7' : '#f5c6cb'};
                color: ${isRateLimitError ? '#856404' : '#721c24'};
                align-self: flex-start;
                font-family: 'Poppins', sans-serif;
                position: relative;
            `;
            
            // Add error icon and message
            const errorContent = document.createElement("div");
            errorContent.style.cssText = `
                display: flex;
                align-items: flex-start;
                gap: 10px;
            `;
            
            // Error icon
            const errorIcon = document.createElement("div");
            errorIcon.innerHTML = isRateLimitError ? 
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>` :
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            errorIcon.style.cssText = `
                flex-shrink: 0;
                margin-top: 2px;
                opacity: 0.8;
            `;
            
            // Error text
            const errorText = document.createElement("div");
            errorText.style.cssText = `
                flex-grow: 1;
                font-size: 14px;
                line-height: 1.4;
            `;
            errorText.textContent = errorMessage;
            
            // Add retry suggestion for certain errors
            if (!isRateLimitError && !errorMessage.includes('log in')) {
                const retryText = document.createElement("div");
                retryText.style.cssText = `
                    margin-top: 8px;
                    font-size: 12px;
                    opacity: 0.8;
                    font-style: italic;
                `;
                retryText.textContent = "You can try sending your message again.";
                errorText.appendChild(retryText);
            }
            
            errorContent.appendChild(errorIcon);
            errorContent.appendChild(errorText);
            errorContainer.appendChild(errorContent);
            
            // Note: Don't add error messages to chatHistory to prevent them from being sent as context
            // This prevents error states from persisting across requests
            
            // Add to chat and scroll
            chatMessagesContainer.appendChild(errorContainer);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }

        // Add this new loading indicator function
        function addLoadingIndicator() {
            const loadingDiv = document.createElement("div");
            loadingDiv.id = "loading-message";
            loadingDiv.style.cssText = `
        margin-bottom: 16px;
        padding: 14px 16px;
        border-radius: 14px;
        background-color: #fff;
        align-self: flex-start;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
        `;

            // Add typing animation dots
            const dotsContainer = document.createElement("div");
            dotsContainer.style.cssText = `
        display: flex;
        gap: 4px;
        margin-left: 4px;
        `;

            for (let i = 0; i < 3; i++) {
                const dot = document.createElement("div");
                dot.style.cssText = `
            width: 6px;
            height: 6px;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 50%;
            animation: typingAnimation 1.4s infinite;
            animation-delay: ${i * 0.2}s;
        `;
                dotsContainer.appendChild(dot);
            }

            loadingDiv.textContent = "Thinking";
            loadingDiv.appendChild(dotsContainer);

            // Add typing animation keyframes if they don't exist
            if (!document.getElementById('typing-animation-style')) {
                const styleSheet = document.createElement("style");
                styleSheet.id = 'typing-animation-style';
                styleSheet.textContent = `
            @keyframes typingAnimation {
            0%, 20% {
                transform: translateY(0);
                opacity: 0.5;
            }
            50% {
                transform: translateY(-4px);
                opacity: 1;
            }
            80%, 100% {
                transform: translateY(0);
                opacity: 0.5;
            }
            }
        `;
                document.head.appendChild(styleSheet);
            }

            return loadingDiv;
        }

        // Function to toggle chat overlay visibility
        function toggleChatOverlay() {
            isOverlayVisible = !isOverlayVisible;
            let chatOverlay = document.getElementById("chat-overlay");

            if (!chatOverlay) {
                chatOverlay = createChatOverlay(); // Overlay is already appended to body in createChatOverlay
            }

            if (chatOverlay) {
                chatOverlay.style.display = isOverlayVisible ? "flex" : "none";
                
                // Focus on input field when showing overlay
                if (isOverlayVisible) {
                    // Always get the current stealth mode state from storage
                    chrome.storage.local.get(['stealth'], function(result) {
                        const stealthModeEnabled = result.stealth === true;
                        
                        // Apply proper opacity based on latest stealth mode state
                        chatOverlay.style.opacity = stealthModeEnabled ? "0.15" : "1";
                        
                        // Update the stealth mode button text to match the current state
                        const stealthModeButton = document.getElementById("stealth-mode");
                        if (stealthModeButton) {
                            stealthModeButton.innerText = stealthModeEnabled ? 
                                "Disable Stealth Mode" : "Enable Stealth Mode";
                        }
                        
                        // Also update the chat button visibility
                        const chatButton = document.getElementById("chat-button");
                        if (chatButton) {
                            chatButton.style.opacity = stealthModeEnabled ? "0" : "1";
                            chatButton.style.pointerEvents = "auto"; // Keep pointer events active
                        }
                    });
                    
                    // Focus on input field after a short delay to ensure the overlay is visible
                    setTimeout(() => {
                        const inputField = document.querySelector("#chat-overlay div[contenteditable='true']");
                        if (inputField) inputField.focus();
                    }, 100);
                }
            }
        }

        // Function to clear chat history and UI (reusable)
        function clearChatHistoryAndUI(reason = 'manual') {
            try {
                const messagesContainer = document.getElementById("chat-messages");
                if (messagesContainer) {
                    // Clear the chat history array
                    chatHistory = [];
                    
                    // Clear the UI
                    messagesContainer.innerHTML = "";
                    
                    // Clear any error state
                    clearErrorState();
                    
                    // Send message to background script to reset context
                    chrome.runtime.sendMessage({
                        action: "resetContext"
                    });
                    
                    // Add a notification message based on the reason
                    let notificationMessage = "Chat history cleared.";
                    if (reason === 'providerChange') {
                        notificationMessage = "Chat history cleared - switched to new AI provider.";
                    }
                    
                    addNotificationMessage(notificationMessage);
                    console.log(`Chat history cleared (${reason})`);
                }
            } catch (error) {
                console.error('Error clearing chat history:', error);
            }
        }

        // Function to detect and block clashing chat elements
        function blockClashingChatElements() {
            // List of class patterns to block (updated class names)
            const blockedClassPatterns = [
                'cc-1m2mf',     // Old class
                'cc-1qbp0',     // New duplicate chatbot icon
                'cc-1o31k',     // New duplicate chatbot icon child
                'cc-otlyh',     // New duplicate chatbot icon child
                'cc-11f3x',     // New duplicate chatbot icon child
                'cc-1v4wj'      // New duplicate chatbot icon child
            ];
            
            // Function to hide elements matching any of the blocked patterns
            function hideBlockedElements() {
                blockedClassPatterns.forEach(className => {
                    // Match elements with the exact class or classes containing this pattern
                    const selector = `[class*="${className}"]`;
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        // Only hide if it's not part of our chat overlay
                        if (!element.closest('#chat-overlay')) {
                            element.style.display = 'none';
                        }
                    });
                });
            }
            
            // Add observer to continuously check for and block the element
            const observer = new MutationObserver((mutations) => {
                hideBlockedElements();
            });
            
            // Start observing document body for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Also try to block any existing elements immediately
            hideBlockedElements();
            
            // Add CSS to ensure elements with these classes are always hidden
            const styleElement = document.createElement('style');
            const cssRules = blockedClassPatterns.map(className => `
                [class*="${className}"]:not(#chat-overlay):not(#chat-overlay *) {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
            `).join('\n');
            
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
        }

        // Set up document-level event handlers
        document.addEventListener("mousemove", (e) => {
            const overlay = document.getElementById("chat-overlay");
            if (!overlay) return;
            
            if (isDragging) {
                const newLeft = e.clientX - dragOffsetX;
                const newTop = e.clientY - dragOffsetY;

                // Prevent dragging outside viewport
                const maxX = window.innerWidth - overlay.offsetWidth;
                const maxY = window.innerHeight - overlay.offsetHeight;

                overlay.style.left = Math.min(Math.max(0, newLeft), maxX) + "px";
                overlay.style.top = Math.min(Math.max(0, newTop), maxY) + "px";
                overlay.style.bottom = "auto";
                overlay.style.right = "auto";
            }

            if (isResizing) {
                const resizeHandle = overlay.querySelector("div[style*='nw-resize']");
                if (!resizeHandle) return;
                
                const MIN_WIDTH = 250;
                const MIN_HEIGHT = 200;
                const MAX_WIDTH = window.innerWidth - 40;
                const MAX_HEIGHT = window.innerHeight - 40;
                
                const dx = resizeStartX - e.clientX;
                const dy = resizeStartY - e.clientY;

                const newWidth = Math.min(Math.max(MIN_WIDTH, initialWidth + dx), MAX_WIDTH);
                const newHeight = Math.min(Math.max(MIN_HEIGHT, initialHeight + dy), MAX_HEIGHT);

                const rect = overlay.getBoundingClientRect();
                const newLeft = rect.right - newWidth;
                const newTop = rect.bottom - newHeight;

                // Ensure the overlay stays within viewport bounds
                if (newLeft >= 0 && newTop >= 0) {
                    overlay.style.width = newWidth + "px";
                    overlay.style.height = newHeight + "px";
                    overlay.style.left = newLeft + "px";
                    overlay.style.top = newTop + "px";
                }
            }
        });

        // Handle mouse up for drag and resize
        document.addEventListener("mouseup", () => {
            isDragging = false;
            isResizing = false;
        });

        // Add global keyboard event listeners
        document.addEventListener("keydown", (e) => {
            // Use Alt (Option) on all platforms including Mac
            const modifierKey = e.altKey;

            // Toggle chat with Alt/Option + C
            // Use e.code to be layout-independent (Option modifies e.key on macOS)
            if (modifierKey && e.code === "KeyC") {
                e.preventDefault(); // Prevent default browser behavior
                toggleChatOverlay();
            }

            // Close chat with Escape
            if (e.key === "Escape" && isOverlayVisible) {
                isOverlayVisible = false;
                const overlay = document.getElementById("chat-overlay");
                if (overlay) {
                    overlay.style.display = "none";
                }
            }


        });

        // Initialize everything
        async function init() {
            try {
                // Try to load showdown and our inline prism highlighter
                await Promise.all([loadShowdown(), loadPrism()]);
                console.log("Showdown and SimplePrism libraries loaded successfully");
            } catch (error) {
                console.error('Failed to load libraries:', error);
                // Continue even if libraries fail to load
            }
            
            // Block clashing chat elements
            blockClashingChatElements();
            
            // Create the chat button
            const chatButton = createChatButton();

            // Get current stealth mode state
            chrome.storage.local.get(['stealth'], function(result) {
                const stealthModeEnabled = result.stealth === true;
                
                // Hide chat button if stealth mode is enabled
                if (stealthModeEnabled && chatButton) {
                    chatButton.style.opacity = "0"; // Use opacity instead of display none
                    chatButton.style.pointerEvents = "auto"; // Keep pointer events active
                }
                
                // Create the chat overlay initially but keep it hidden
                // This ensures Alt+C (Option+C on Mac) will work right from the start
                try {
                    const overlay = createChatOverlay();
                    
                    // Set overlay opacity based on stealth mode
                    if (stealthModeEnabled && overlay) {
                        overlay.style.opacity = "0.15";
                        
                        // Update stealth mode button text
                        const stealthModeButton = document.getElementById("stealth-mode");
                        if (stealthModeButton) {
                            stealthModeButton.innerText = "Disable Stealth Mode";
                        }
                    }
                } catch (error) {
                    console.error('Error creating chat overlay:', error);
                }
            });
        }
        
        // Start the initialization
        init();

        // Add global storage change listener for stealth mode updates across tabs
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                // Clear error state when database or authentication changes occur
                if (changes.accessToken || changes.refreshToken) {
                    clearErrorState();
                    console.log("Auth state changed, cleared chat error state");
                }
                
                if (changes.stealth) {
                    const newStealthMode = changes.stealth.newValue === true;
                
                    // Update chat button visibility globally
                    const chatButton = document.getElementById("chat-button");
                    if (chatButton) {
                        chatButton.style.opacity = newStealthMode ? "0" : "1";
                        chatButton.style.pointerEvents = "auto"; // Keep pointer events active in both states
                        
                        // Reset chat button icon when showing - use the original Crisp-style icon
                        if (!newStealthMode) {
                            chatButton.innerHTML = `
                            <svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                <defs>
                                    <filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%">
                                        <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/>
                                        <feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/>
                                        <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/>
                                        <feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/>
                                        <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/>
                                    </filter>
                                    <path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/>
                                </defs>
                                <g fill="none" fill-rule="evenodd">
                                    <use fill="#000" filter="url(#a)" xlink:href="#b"/>
                                    <use fill="#fff" stroke="#fff" stroke-width="2" xlink:href="#b"/>
                                </g>
                            </svg>`;
                        }
                    }
                    
                    // Update overlay opacity if it exists
                    const overlay = document.getElementById("chat-overlay");
                    if (overlay) {
                        overlay.style.opacity = newStealthMode ? "0.15" : "1";
                        
                        // Update stealth mode button text if it exists
                        const stealthModeButton = document.getElementById("stealth-mode");
                        if (stealthModeButton) {
                            stealthModeButton.innerText = newStealthMode ? 
                                "Disable Stealth Mode" : "Enable Stealth Mode";
                        }
                    }
                }
            }
        });

        // Listen for messages from Chrome runtime
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === "updateChatHistory") {
                const {
                    role,
                    content
                } = message;
                
                // First remove loading indicator if it exists
                const loadingMessage = document.getElementById("loading-message");
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                
                // Handle error responses from the background script
                if (role === "error" || content.includes("error") || content.includes("failed")) {
                    // Determine if this is a rate limit error
                    const isRateLimitError = content.includes("limit") || content.includes("exceeded") || content.includes("tomorrow");
                    addErrorMessageToChat(content, isRateLimitError);
                } else {
                    // Clear any existing error state on successful response
                    clearErrorState();
                    
                    // Add to chat history for normal responses
                    chatHistory.push({
                        role: role,
                        content: content
                    });
                    
                    // Add the new message
                    addMessageToChat(content, role);
                }
            }
            
            // Handle clear chat history action
            if (message.action === "clearChatHistory") {
                const reason = message.reason || 'external';
                clearChatHistoryAndUI(reason);
                if (sendResponse) {
                    sendResponse({ success: true });
                }
            }
            
            // Handle direct error messages from background script
            if (message.action === "chatError") {
                // Remove loading indicator if it exists
                const loadingMessage = document.getElementById("loading-message");
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                
                const { error, errorType, detailedInfo } = message;
                let errorMessage = error || "An error occurred processing your message.";
                let isRateLimitError = false;
                
                // Enhance error message based on type
                if (errorType === 'rateLimit') {
                    isRateLimitError = true;
                    if (!errorMessage.includes("tomorrow") && !errorMessage.includes("wait")) {
                        errorMessage += " Please try again later.";
                    }
                } else if (errorType === 'auth') {
                    errorMessage = "Please log in to use the chat feature. Click the extension icon to log in.";
                } else if (errorType === 'network') {
                    errorMessage += " Please check your internet connection and try again.";
                } else if (errorType === 'server') {
                    errorMessage += " The service is temporarily unavailable.";
                }
                
                addErrorMessageToChat(errorMessage, isRateLimitError);
            }
        });
    });
})();