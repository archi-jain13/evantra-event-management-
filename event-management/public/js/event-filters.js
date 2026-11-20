// Event Filter System
document.addEventListener('DOMContentLoaded', function() {
    // If the server-side filter form is active, allow native form submission
    if (document.getElementById('filterForm')) {
        return;
    }

    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    const clearFilters = document.getElementById('clearFilters');
    const searchInput = document.getElementById('searchInput');
    const categoryTags = document.querySelectorAll('.category-tag');
    const filterStats = document.getElementById('filterStats');
    const eventGrid = document.getElementById('eventGrid');
    
    let allEvents = [];
    
    // Store all events when page loads
    function initializeEvents() {
        const eventCards = document.querySelectorAll('.event-card');
        allEvents = Array.from(eventCards).map(card => {
            const titleEl = card.querySelector('h2') || card.querySelector('.event-title');
            const title = titleEl ? titleEl.textContent.toLowerCase() : '';

            const descEl = card.querySelector('.event-desc') || card.querySelector('p:not(.fee)');
            const description = descEl ? descEl.textContent.toLowerCase() : '';

            const venueEl = card.querySelector('.venue-text') || card.querySelector('.event-info span:nth-child(2)');
            const venue = venueEl ? venueEl.textContent.toLowerCase() : '';

            const feeEl = card.querySelector('.fee-amount') || card.querySelector('.fee') || card.querySelector('.fee-badge');
            const feeText = feeEl ? feeEl.textContent : '0';
            const fee = parseFloat(feeText.replace(/[^0-9.]/g, '')) || 0;
            
            // Determine category based on title, description, or existing class
            let category = 'other';
            if (card.classList.contains('cat-tech') || title.includes('ai') || title.includes('tech') || title.includes('web') || title.includes('blockchain') || title.includes('cloud')) {
                category = 'technology';
            } else if (card.classList.contains('cat-business') || title.includes('business') || title.includes('marketing') || title.includes('entrepreneur') || title.includes('pitch') || title.includes('startup')) {
                category = 'business';
            } else if (card.classList.contains('cat-creative') || title.includes('photo') || title.includes('creative') || title.includes('art')) {
                category = 'creative';
            } else if (card.classList.contains('cat-wellness') || title.includes('yoga') || title.includes('wellness') || title.includes('health')) {
                category = 'wellness';
            } else if (card.classList.contains('cat-entertainment') || title.includes('gaming') || title.includes('music') || title.includes('festival') || title.includes('comedy')) {
                category = 'entertainment';
            } else if (card.classList.contains('cat-eco') || title.includes('sustainable') || title.includes('environment') || title.includes('eco') || title.includes('food') || title.includes('fair')) {
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
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        const selectedPrice = priceFilter ? priceFilter.value : '';
        const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const activeTag = document.querySelector('.category-tag.active');
        const tagCategory = activeTag ? activeTag.dataset.category : '';
        
        let visibleCount = 0;
        
        allEvents.forEach(event => {
            let visible = true;
            
            // Search text filter
            if (searchQuery) {
                const matchTitle = event.title.includes(searchQuery);
                const matchVenue = event.venue.includes(searchQuery);
                const matchCategory = event.category.includes(searchQuery);
                visible = visible && (matchTitle || matchVenue || matchCategory);
            }

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
                event.element.style.display = 'flex';
                event.element.style.animation = 'fadeIn 0.35s ease-out';
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
        if (!filterStats) return;
        const count = visibleCount !== null ? visibleCount : allEvents.length;
        const total = allEvents.length;
        
        if (count === total) {
            filterStats.textContent = `Showing all ${total} upcoming events`;
        } else {
            filterStats.textContent = `Showing ${count} of ${total} events`;
        }
        
        filterStats.style.background = count === 0 
            ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
            : 'linear-gradient(135deg, #0ea5e9, #3b82f6)';
    }
    
    // Show/hide no results message
    function showNoResultsMessage(show) {
        if (!eventGrid) return;
        let noResultsMsg = document.querySelector('.no-events-message');
        
        if (show && !noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-events-message';
            noResultsMsg.innerHTML = `
                <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
                <h3>No matching events found</h3>
                <p>Try clearing your search terms or picking another category.</p>
            `;
            eventGrid.parentNode.insertBefore(noResultsMsg, eventGrid.nextSibling);
        } else if (!show && noResultsMsg) {
            noResultsMsg.remove();
        }
    }
    
    // Clear all filters
    function clearAllFilters() {
        if (categoryFilter) categoryFilter.value = '';
        if (priceFilter) priceFilter.value = '';
        if (searchInput) searchInput.value = '';
        categoryTags.forEach(tag => tag.classList.remove('active'));
        filterEvents();
        
        if (clearFilters) {
            clearFilters.style.transform = 'scale(0.95)';
            setTimeout(() => {
                clearFilters.style.transform = 'scale(1)';
            }, 150);
        }
    }
    
    // Event listeners
    if (categoryFilter) categoryFilter.addEventListener('change', filterEvents);
    if (priceFilter) priceFilter.addEventListener('change', filterEvents);
    if (clearFilters) clearFilters.addEventListener('click', clearAllFilters);
    if (searchInput) searchInput.addEventListener('input', filterEvents);
    
    // Category tag listeners
    categoryTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const wasActive = this.classList.contains('active');
            categoryTags.forEach(t => t.classList.remove('active'));
            
            if (!wasActive) {
                this.classList.add('active');
                if (categoryFilter) categoryFilter.value = '';
            }
            
            filterEvents();
        });
    });
    
    // Initialize when page loads
    setTimeout(initializeEvents, 100);
});
