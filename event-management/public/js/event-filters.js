// Event Filter System
document.addEventListener('DOMContentLoaded', function() {
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    const clearFilters = document.getElementById('clearFilters');
    const categoryTags = document.querySelectorAll('.category-tag');
    const filterStats = document.getElementById('filterStats');
    const eventGrid = document.getElementById('eventGrid');
    
    let allEvents = [];
    
    // Store all events when page loads
    function initializeEvents() {
        const eventCards = document.querySelectorAll('.event-card');
        allEvents = Array.from(eventCards).map(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            const venue = card.querySelector('.event-info span:nth-child(2)').textContent.toLowerCase();
            const feeText = card.querySelector('.fee').textContent;
            const fee = parseFloat(feeText.replace(/[^0-9.]/g, '')) || 0;
            
            // Determine category based on title and description
            let category = 'other';
            if (title.includes('ai') || title.includes('tech') || title.includes('web') || title.includes('blockchain')) {
                category = 'technology';
            } else if (title.includes('business') || title.includes('marketing') || title.includes('entrepreneur')) {
                category = 'business';
            } else if (title.includes('photo') || title.includes('comedy') || title.includes('creative')) {
                category = 'creative';
            } else if (title.includes('yoga') || title.includes('wellness') || title.includes('health')) {
                category = 'wellness';
            } else if (title.includes('gaming') || title.includes('music') || title.includes('festival')) {
                category = 'entertainment';
            } else if (title.includes('sustainable') || title.includes('environment') || title.includes('eco')) {
                category = 'environment';
            }
            
            return {
                element: card,
                title,
                description,
                venue,
                fee,
                category,
                visible: true
            };
        });
        
        updateStats();
    }
    
    // Filter events based on all active filters
    function filterEvents() {
        const selectedCategory = categoryFilter.value;
        const selectedPrice = priceFilter.value;
        const activeTag = document.querySelector('.category-tag.active');
        const tagCategory = activeTag ? activeTag.dataset.category : '';
        
        let visibleCount = 0;
        
        allEvents.forEach(event => {
            let visible = true;
            
            // Category filter (dropdown)
            if (selectedCategory) {
                visible = visible && event.category === selectedCategory;
            }
            
            // Category filter (tags)
            if (tagCategory) {
                visible = visible && event.category === tagCategory;
            }
            
            // Price filter
            if (selectedPrice) {
                switch (selectedPrice) {
                    case 'free':
                        visible = visible && event.fee === 0;
                        break;
                    case 'under-1000':
                        visible = visible && event.fee > 0 && event.fee < 1000;
                        break;
                    case '1000-2000':
                        visible = visible && event.fee >= 1000 && event.fee <= 2000;
                        break;
                    case 'over-2000':
                        visible = visible && event.fee > 2000;
                        break;
                }
            }
            
            // Show/hide event
            if (visible) {
                event.element.style.display = 'block';
                event.element.style.animation = 'fadeIn 0.5s ease-in';
                visibleCount++;
            } else {
                event.element.style.display = 'none';
            }
            
            event.visible = visible;
        });
        
        updateStats(visibleCount);
        showNoResultsMessage(visibleCount === 0);
    }
    
    // Update filter statistics
    function updateStats(visibleCount = null) {
        const count = visibleCount !== null ? visibleCount : allEvents.length;
        const total = allEvents.length;
        
        if (count === total) {
            filterStats.textContent = `Showing all ${total} events`;
        } else {
            filterStats.textContent = `Showing ${count} of ${total} events`;
        }
        
        // Add some visual feedback
        filterStats.style.background = count === 0 
            ? 'linear-gradient(135deg, #ff6b6b, #ee5a52)' 
            : 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    
    // Show/hide no results message
    function showNoResultsMessage(show) {
        let noResultsMsg = document.querySelector('.no-events-message');
        
        if (show && !noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-events-message';
            noResultsMsg.innerHTML = `
                <h3>🔍 No events found</h3>
                    <p>Try adjusting your filters to discover more events.</p>
            `;
            eventGrid.parentNode.insertBefore(noResultsMsg, eventGrid.nextSibling);
        } else if (!show && noResultsMsg) {
            noResultsMsg.remove();
        }
    }
    
    // Clear all filters
    function clearAllFilters() {
        categoryFilter.value = '';
        priceFilter.value = '';
        categoryTags.forEach(tag => tag.classList.remove('active'));
        filterEvents();
        
        // Add visual feedback
        clearFilters.style.transform = 'scale(0.95)';
        setTimeout(() => {
            clearFilters.style.transform = 'scale(1)';
        }, 150);
    }
    
    // Event listeners
    categoryFilter.addEventListener('change', filterEvents);
    priceFilter.addEventListener('change', filterEvents);
    clearFilters.addEventListener('click', clearAllFilters);
    
    // Category tag listeners
    categoryTags.forEach(tag => {
        tag.addEventListener('click', function() {
            // Toggle active state
            const wasActive = this.classList.contains('active');
            categoryTags.forEach(t => t.classList.remove('active'));
            
            if (!wasActive) {
                this.classList.add('active');
                // Clear category dropdown when tag is selected
                categoryFilter.value = '';
            }
            
            filterEvents();
        });
    });
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .event-card {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize when page loads
    setTimeout(initializeEvents, 100); // Small delay to ensure all content is loaded

    // Descriptions are shown on the event details page; no inline expand/collapse needed on the listing
});