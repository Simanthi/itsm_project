// Basic formatter functions
// It's good practice to make these more robust or use a library like date-fns or moment.js for dates

export const formatDate = (
  dateStr: string | null | undefined,
  format?: string,
): string => {
  if (!dateStr) return '';
  try {
    let date = new Date(dateStr); // Changed const to let
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try to parse if it's already in YYYY-MM-DD format (e.g. from date picker)
      // and other parts of the system pass it as such.
      // This is a simple attempt, might need more robust parsing
      const parts = dateStr.split(/[-/]/); // Handle both YYYY-MM-DD and YYYY/MM/DD
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        // Ensure year is reasonable, e.g. 4 digits, to avoid misinterpreting parts
        if (parts[0].length === 4 && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const newDate = new Date(year, month, day); // Creates local date
            if (!isNaN(newDate.getTime())) {
              // If successfully parsed, use this newDate object for formatting
              date = newDate;
            } else {
                 return 'Invalid date'; // Invalid date from parts
            }
        } else {
            return 'Invalid date'; // Parts not in expected YYYY-MM-DD or YYYY/MM/DD
        }
      } else {
        return 'Invalid date'; // Return if parsing fails or not enough parts
      }
    }

    if (format === 'YYYY-MM-DD') {
      // Use local date parts to avoid timezone shift from toISOString()
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Add more formats if needed
    // For full ISO strings like '2023-01-15T10:20:30Z', toLocaleString() is often desired
    // For date-only strings like '2023-01-15', toLocaleDateString() is better.
    // The initial `new Date(dateStr)` might already be local if dateStr has no time/TZ.
    // If dateStr has Z or offset, it's UTC/specific offset.
    // Defaulting to toLocaleDateString for general case if not YYYY-MM-DD
    return date.toLocaleDateString();
  } catch {
    // console.error("Error formatting date:", dateStr, e);
    return 'Invalid date';
  }
};

export const formatCurrency = (
  amount: number | string | undefined | null,
  currencySymbol: string = '$',
): string => {
  if (amount === null || amount === undefined || amount === '') return '';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return 'Invalid amount';

  // Adjust currency formatting as needed, e.g., to locale-specific
  return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Example of a more specific status formatter if needed elsewhere
// export const formatStatus = (status: string): string => {
//   if (!status) return 'N/A';
//   return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
// };
