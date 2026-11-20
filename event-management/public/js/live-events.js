// live-events.js
// Handles browser-based dynamic date formatting, live relative countdowns, and form date guards

(function () {
  function formatRelativeTime(targetDate) {
    const now = new Date();
    const diffMs = targetDate - now;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMs < 0) {
      if (Math.abs(diffHour) < 2) {
        return { label: 'Happening Now', type: 'urgent' };
      }
      return { label: 'Past Event', type: 'past' };
    }

    if (diffHour < 2) {
      const mins = Math.max(1, diffMin);
      return { label: `Starts in ${mins} min${mins === 1 ? '' : 's'}`, type: 'urgent' };
    }

    if (diffDay === 0) {
      const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { label: `Today at ${timeStr}`, type: 'urgent' };
    }

    if (diffDay === 1) {
      const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { label: `Tomorrow at ${timeStr}`, type: 'soon' };
    }

    if (diffDay < 7) {
      const weekday = targetDate.toLocaleDateString([], { weekday: 'short' });
      return { label: `In ${diffDay} days (${weekday})`, type: 'soon' };
    }

    if (diffDay < 30) {
      return { label: `In ${diffDay} days`, type: 'upcoming' };
    }

    const weeks = Math.round(diffDay / 7);
    return { label: `In ~${weeks} week${weeks === 1 ? '' : 's'}`, type: 'upcoming' };
  }

  function updateEventElements() {
    // 1. Update elements with explicit [data-date]
    const dateElements = document.querySelectorAll('[data-date]');
    dateElements.forEach((el) => {
      const raw = el.getAttribute('data-date');
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;

      // Localized date string
      const localFormatted = d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Relative badge
      const relative = formatRelativeTime(d);
      
      const calSvg = '<svg class="inline-cal-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

      el.innerHTML = `
        <span class="local-date-text">${calSvg}${localFormatted}</span>
        <span class="time-status-badge badge-${relative.type}">${relative.label}</span>
      `;
    });

    // 2. Fallback for cards that don't have [data-date] yet
    const eventCards = document.querySelectorAll('.event-card:not([data-live-initialized])');
    eventCards.forEach((card) => {
      card.setAttribute('data-live-initialized', 'true');
      const dateSpan = card.querySelector('.event-info span:first-child');
      if (dateSpan && !dateSpan.hasAttribute('data-date')) {
        const text = dateSpan.textContent.replace(/[^\x20-\x7E]/g, '').trim();
        const d = new Date(text);
        if (!isNaN(d.getTime())) {
          dateSpan.setAttribute('data-date', d.toISOString());
          const localFormatted = d.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const relative = formatRelativeTime(d);
          const calSvg = '<svg class="inline-cal-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
          dateSpan.innerHTML = `
            <span class="local-date-text">${calSvg}${localFormatted}</span>
            <span class="time-status-badge badge-${relative.type}">${relative.label}</span>
          `;
        }
      }
    });
  }

  // Guard date inputs in forms so only current/future dates can be chosen
  function setupFormDateGuards() {
    const now = new Date();
    // format YYYY-MM-DD
    const pad = (n) => String(n).padStart(2, '0');
    const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowDateTime = `${todayDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // For date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach((input) => {
      if (!input.min) input.min = todayDate;
      if (!input.value) {
        // Default to 3 days ahead
        const def = new Date(Date.now() + 3 * 86400000);
        input.value = `${def.getFullYear()}-${pad(def.getMonth() + 1)}-${pad(def.getDate())}`;
      }
    });

    // For datetime-local inputs
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    datetimeInputs.forEach((input) => {
      if (!input.min) input.min = nowDateTime;
      if (!input.value) {
        const def = new Date(Date.now() + 3 * 86400000);
        def.setHours(10, 0, 0, 0);
        input.value = `${def.getFullYear()}-${pad(def.getMonth() + 1)}-${pad(def.getDate())}T${pad(def.getHours())}:${pad(def.getMinutes())}`;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateEventElements();
    setupFormDateGuards();

    // Live update badges and countdowns every 30 seconds
    setInterval(updateEventElements, 30000);
  });
})();
