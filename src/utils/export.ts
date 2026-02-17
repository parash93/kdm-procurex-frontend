export function downloadCSV<T extends Record<string, any>>(data: T[], filename: string) {
    if (!data.length) {
        alert("No data to export");
        return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName];
                // Handle strings with commas, quotes, or newlines
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`; // Escape quotes
                }
                if (value === null || value === undefined) {
                    return '';
                }
                if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
