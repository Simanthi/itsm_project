// Basic formatter functions
// It's good practice to make these more robust or use a library like date-fns or moment.js for dates

export const formatDateString = (
  dateStr: string | null | undefined,
  format?: string,
): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try to parse if it's already in YYYY-MM-DD format (e.g. from date picker)
      // and other parts of the system pass it as such.
      // This is a simple attempt, might need more robust parsing
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          if (format === 'YYYY-MM-DD') {
            return newDate.toISOString().split('T')[0];
          }
          return newDate.toLocaleDateString(); // Default locale format
        }
      }
      return 'Invalid date'; // Return if parsing fails
    }

    if (format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }
    // Add more formats if needed
    return date.toLocaleDateString(); // Default to locale date string
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
