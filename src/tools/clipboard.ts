interface ClipboardItem {
    content: string;
    timestamp: number;
    type: string;
}

let clipboardHistory: ClipboardItem[] = [];
const maxClipboardItems = 50;

function detectContentType(text: string): string {
    if (text.match(/^https?:\/\//)) return 'url';
    if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) return 'email';
    if (text.match(/^\d+$/)) return 'number';
    if (text.match(/^[A-F0-9]{6}$/i)) return 'color';
    if (text.length > 100) return 'text';
    return 'snippet';
}

export function addToClipboard(text: string): string {
    if (!text || text.trim().length === 0) {
        return "Cannot add empty text to clipboard.";
    }

    const item: ClipboardItem = {
        content: text.substring(0, 500), // Limit length
        timestamp: Date.now(),
        type: detectContentType(text)
    };

    // Remove duplicates
    clipboardHistory = clipboardHistory.filter(h => h.content !== text);

    // Add to beginning
    clipboardHistory.unshift(item);

    // Limit history size
    if (clipboardHistory.length > maxClipboardItems) {
        clipboardHistory = clipboardHistory.slice(0, maxClipboardItems);
    }

    return `Added to clipboard: "${item.content.substring(0, 30)}..."`;
}

export function readClipboardHistory(): string {
    if (clipboardHistory.length === 0) {
        return "Clipboard history is empty.";
    }
    return JSON.stringify(clipboardHistory, null, 2);
}

export function searchClipboard(query: string): string {
    if (!query) {
        return "Please provide a search query for the clipboard.";
    }
    const lowerCaseQuery = query.toLowerCase();
    const matches = clipboardHistory.filter(item =>
        item.content.toLowerCase().includes(lowerCaseQuery)
    );
    if (matches.length === 0) {
        return `No matches found in clipboard for "${query}".`;
    }
    return JSON.stringify(matches, null, 2);
}

export function clearClipboardHistory(): string {
    clipboardHistory = [];
    return "Clipboard history cleared.";
}