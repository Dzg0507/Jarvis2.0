"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToClipboard = addToClipboard;
exports.readClipboardHistory = readClipboardHistory;
exports.searchClipboard = searchClipboard;
exports.clearClipboardHistory = clearClipboardHistory;
let clipboardHistory = [];
const maxClipboardItems = 50;
function detectContentType(text) {
    if (text.match(/^https?:\/\//))
        return 'url';
    if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/))
        return 'email';
    if (text.match(/^\d+$/))
        return 'number';
    if (text.match(/^[A-F0-9]{6}$/i))
        return 'color';
    if (text.length > 100)
        return 'text';
    return 'snippet';
}
function addToClipboard(text) {
    if (!text || text.trim().length === 0) {
        return "Cannot add empty text to clipboard.";
    }
    const item = {
        content: text.substring(0, 500),
        timestamp: Date.now(),
        type: detectContentType(text)
    };
    clipboardHistory = clipboardHistory.filter(h => h.content !== text);
    clipboardHistory.unshift(item);
    if (clipboardHistory.length > maxClipboardItems) {
        clipboardHistory = clipboardHistory.slice(0, maxClipboardItems);
    }
    return `Added to clipboard: "${item.content.substring(0, 30)}..."`;
}
function readClipboardHistory() {
    if (clipboardHistory.length === 0) {
        return "Clipboard history is empty.";
    }
    return JSON.stringify(clipboardHistory, null, 2);
}
function searchClipboard(query) {
    if (!query) {
        return "Please provide a search query for the clipboard.";
    }
    const lowerCaseQuery = query.toLowerCase();
    const matches = clipboardHistory.filter(item => item.content.toLowerCase().includes(lowerCaseQuery));
    if (matches.length === 0) {
        return `No matches found in clipboard for "${query}".`;
    }
    return JSON.stringify(matches, null, 2);
}
function clearClipboardHistory() {
    clipboardHistory = [];
    return "Clipboard history cleared.";
}
