// Create this new file at: src/tools/system.ts

/**
 * Gets the current date and time.
 * @returns A formatted string with the current date, time, and day of the week.
 */
export async function getCurrentDateTime(): Promise<string> {
    console.log(`[Tool:getCurrentDateTime] Called.`);
    try {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return `Today is ${formattedDate}. The current time is ${formattedTime}.`;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
        console.error('[Tool:getCurrentDateTime] Error:', errorMessage);
        return `Error getting date and time: ${errorMessage}`;
    }
}