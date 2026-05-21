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

	// REMOVED: Flag to track when we're performing a custom copy operation

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

	// Keep a reference to the native document.execCommand implementation.
	// Do not override it: callers expect native selection-based copy behavior and a synchronous boolean return value.
	const originalExecCommand = document.execCommand;

	// Function to perform custom copy operation
	async function customCopy(selectedText) {
		if (!selectedText) return false;

		try {
			// REMOVED: Set flag to prevent blocking our own copy

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

			// REMOVED: Reset flag after a longer delay to allow all copy events to complete

			return success;
		} catch (err) {
			console.error("Copy using invisible textarea failed:", err);
			return false;
		}
	}

	// Function to get selected text
	function getSelectedText() {
		const activeElement = document.activeElement;
		if (
			activeElement &&
			(activeElement.tagName === "TEXTAREA" ||
				(activeElement.tagName === "INPUT" &&
					typeof activeElement.selectionStart === "number" &&
					typeof activeElement.selectionEnd === "number"))
		) {
			const value = activeElement.value || "";
			const start = activeElement.selectionStart || 0;
			const end = activeElement.selectionEnd || 0;
			return value.slice(start, end).trim();
		}
		const selection = window.getSelection();
		return selection ? selection.toString().trim() : "";
	}

	function syncNeoPassClipboard() {
		const selectedText = getSelectedText();
		if (selectedText) {
			window.neoPassSelectedText = selectedText;
			window.neoPassClipboard = selectedText;
		}
	}

	// Function removed - login check no longer required

	// REMOVED: Block ALL copy events at the earliest phase

	// Keep fallback clipboard state in sync for browser-native copy operations
	document.addEventListener("copy", syncNeoPassClipboard(), true);

	// Handle context menu copy
	document.addEventListener(
		"contextmenu",
		function (event) {
			syncNeoPassClipboard();
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
