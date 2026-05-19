// Custom Ctrl+C override functionality - Prevents default copy on divs
(function () {
	"use strict";

	// Create an invisible textarea for our controlled copy operations
	const invisibleTextarea = document.createElement("textarea");
	invisibleTextarea.id = "neopass-invisible-copy";
	invisibleTextarea.style.position = "fixed";
	invisibleTextarea.style.opacity = "0";
	invisibleTextarea.style.pointerEvents = "none";
	invisibleTextarea.style.left = "-9999px";
	invisibleTextarea.style.top = "-9999px";
	invisibleTextarea.style.width = "1px";
	invisibleTextarea.style.height = "1px";
	invisibleTextarea.style.border = "none";
	invisibleTextarea.style.outline = "none";
	invisibleTextarea.style.resize = "none";
	invisibleTextarea.style.overflow = "hidden";
	document.body.appendChild(invisibleTextarea);

	// Store the last copied text in a global variable for paste operations
	window.neoPassClipboard = "";

	// Flag to track when we're performing a custom copy operation
	let isCustomCopying = false;

	// Override navigator.clipboard.writeText to use our custom copy AND store in clipboard
	const originalWriteText = navigator.clipboard.writeText;
	navigator.clipboard.writeText = async function (text) {
		console.log(
			"[CopyOverride] Intercepted clipboard writeText:",
			text.substring(0, 100),
		);
		window.neoPassClipboard = text; // Store for later paste

		try {
			// Try to use the original writeText first for compatibility
			await originalWriteText.call(navigator.clipboard, text);
			console.log("[CopyOverride] Successfully wrote to native clipboard");
		} catch (err) {
			console.log(
				"[CopyOverride] Native clipboard write failed, using custom copy:",
				err,
			);
			await customCopy(text);
		}

		console.log(
			"[CopyOverride] Stored in neoPassClipboard, length:",
			text.length,
		);
		return Promise.resolve();
	};

	// Override document.execCommand to use our custom copy method
	const originalExecCommand = document.execCommand;
	document.execCommand = function (command, showUI, value) {
		if (command === "copy") {
			const activeElement = document.activeElement;
			console.log("Intercepted execCommand copy, using custom copy");
			const text = activeElement.value || activeElement.textContent;
			if (text) {
				return customCopy(text);
			}
		}
		return originalExecCommand.call(this, command, showUI, value);
	};

	// Function to perform custom copy operation
	async function customCopy(selectedText) {
		if (!selectedText) return false;

		try {
			// Set flag to prevent blocking our own copy
			isCustomCopying = true;

			// Store in our global clipboard variable
			window.neoPassClipboard = selectedText;

			// Try to write to native clipboard first
			try {
				await originalWriteText.call(navigator.clipboard, selectedText);
				console.log("[CopyOverride] Wrote to native clipboard via writeText");
			} catch (clipErr) {
				console.log(
					"[CopyOverride] writeText failed, using execCommand:",
					clipErr,
				);
			}

			invisibleTextarea.value = selectedText;
			invisibleTextarea.select();
			invisibleTextarea.setSelectionRange(0, selectedText.length);

			const success = originalExecCommand.call(document, "copy");
			console.log(
				"Text copied using invisible textarea:",
				success,
				"Stored in neoPassClipboard",
			);

			// Clear the textarea
			invisibleTextarea.value = "";
			invisibleTextarea.blur();

			// Reset flag after a longer delay to allow all copy events to complete
			setTimeout(() => {
				isCustomCopying = false;
			}, 300);

			return success;
		} catch (err) {
			console.error("Copy using invisible textarea failed:", err);
			isCustomCopying = false;
			return false;
		}
	}

	// Function to get selected text
	function getSelectedText() {
		const selection = window.getSelection();
		return selection.toString().trim();
	}

	// Function removed - login check no longer required

	// REMOVED: Block ALL copy events at the earliest phase

	// Handle context menu copy
	document.addEventListener(
		"contextmenu",
		function (event) {
			const selectedText = getSelectedText();
			if (selectedText) {
				window.neoPassSelectedText = selectedText;
				window.neoPassClipboard = selectedText; // Also store in main clipboard
			}
		},
		true,
	);

	// Log clipboard status for debugging
	window.getNeoPassClipboard = function () {
		console.log(
			"[CopyOverride] Current neoPassClipboard:",
			window.neoPassClipboard,
		);
		return window.neoPassClipboard;
	};
})();
