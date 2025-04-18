// src/utils/dateTimeUtils.js 

export const formatApiDateTime = (isoString) => {
    if (!isoString) return "Time TBD";
    try {
        const date = new Date(isoString);
        if (isNaN(date)) return "Invalid Date";
        // Example format: "Apr 15, 3:30 PM" (adjust as needed)
        return date.toLocaleString(undefined, {
             month: 'short', day: 'numeric',
             hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date";
    }
};

export const formatDateForApi = (date) => {
    if (!date) return null;
    // Format: YYYY-MM-DD
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};