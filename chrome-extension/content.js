function getCourseName() {
    try {
        // Find the div with data-purpose='lead-title'
        const titleElement = document.querySelector('[data-purpose="lead-title"]');
        if (titleElement) {
            return titleElement.textContent.trim();
        }
        return null;
    } catch (error) {
        console.error('Error getting course name:', error);
        return null;
    }
}
