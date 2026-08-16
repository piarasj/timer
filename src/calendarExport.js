/**
 * Calendar Export Module
 * Handles ICS generation and calendar integration
 */

export class CalendarExport {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }
  
  /**
   * Wrap a web URL in iCab Mobile's x-callback-url "open" action, so tapping
   * it launches iCab Mobile directly instead of Safari. Unlike a plain
   * https:// link - which iOS always opens in Safari, even if the URL
   * matches an installed home-screen web app - a custom scheme like
   * x-icabmobile:// is dispatched by iOS straight to the app that
   * registered it, the same mechanism used by sessiontimer:// via the
   * macOS helper. fullscreen=yes requests iCab's own reduced-chrome
   * display; destination=currentTab avoids it landing in a background tab
   * that's invisible in a locked-down/kiosk view. The nested URL is
   * percent-encoded as a single opaque value, per the standard nested-URL
   * x-callback-url convention (see https://www.icab.de/blog-archive/2012/07/01/icab-mobile-6-0-supports-x-callback-url/).
   * Requires iCab Mobile to be installed - if it isn't, tapping this link
   * does nothing (same failure mode as any unregistered custom scheme).
   */
  generateICabUrl(sessionUrl) {
    return `x-icabmobile://x-callback-url/open?url=${encodeURIComponent(sessionUrl)}&destination=currentTab&fullscreen=yes`;
  }

  /**
   * Generate ICS (iCalendar) content for segments
   */
  generateICS(segments, title = 'Session Timer', sessionUrl = null) {
    const now = new Date();
    const uid = `sessiontimer-${Date.now()}`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Session Timer//Session Timer 2.5.14//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    segments.forEach((segment, index) => {
      const [hours, minutes] = segment.time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + segment.duration);

      const eventTitle = `Session ${index + 1}`;
      let description = `Session Timer: ${segment.mode === 'up' ? 'Count Up' : 'Count Down'} timer for ${segment.duration} minutes`;
      if (sessionUrl) {
        // \n is the ICS-escaped newline for TEXT values (RFC 5545) - keeps this
        // as a single logical DESCRIPTION line while still rendering as line
        // breaks in calendar apps. iCab goes FIRST: confirmed working
        // (kiosk mode, screen stays awake, one tap, no chrome) for
        // time-sensitive use like running a live consultation, where a
        // "More..." tap to reveal a second link is exactly the on-the-spot
        // fumbling this exists to avoid. The plain web link is still
        // included as a fallback for anyone without iCab installed, just
        // no longer first.
        const icabUrl = this.generateICabUrl(sessionUrl);
        description += `\\n\\nOpen in iCab Mobile (fullscreen, stays awake):\\n${icabUrl}` +
          `\\n\\nOr open this session in Session Timer:\\n${sessionUrl}`;
      }

      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${uid}-${index}@sessiontimer.local`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${description}`
      ];

      if (sessionUrl) {
        // Standard VEVENT URL property - most calendar apps (Apple Calendar,
        // Outlook, Google Calendar) render this as a clickable link on the
        // event, separate from the DESCRIPTION copy above.
        eventLines.push(`URL:${sessionUrl}`);
      }

      eventLines.push(
        `CATEGORIES:PRODUCTIVITY,TIMER`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );

      icsContent.push(...eventLines);
    });

    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  /**
   * Download ICS file
   */
  downloadICS(segments, filename = 'session-timer.ics', sessionUrl = null) {
    const icsContent = this.generateICS(segments, 'Session Timer', sessionUrl);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    this.eventBus.emit('calendar:downloaded', { filename, segments: segments.length });
  }

  /**
   * Copy ICS content to clipboard
   */
  async copyICSToClipboard(segments, sessionUrl = null) {
    const icsContent = this.generateICS(segments, 'Session Timer', sessionUrl);
    
    try {
      await navigator.clipboard.writeText(icsContent);
      this.eventBus.emit('calendar:copied', { segments: segments.length });
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = icsContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      this.eventBus.emit('calendar:copied', { segments: segments.length, fallback: true });
      return true;
    }
  }
  
  /**
   * Generate Fantastical URL and open it
   * Uses x-fantastical3:// format with proper parameters
   */
  openInFantastical(segments, title = 'Session Timer') {
    // Generate individual Fantastical URLs for each segment
    const fantasticalUrls = segments.map(segment => {
      const startTime = segment.time;
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + segment.duration);
      
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      const eventTitle = `${segment.duration}min ${segment.mode === 'up' ? 'Count Up' : 'Count Down'} Timer`;
      const sessiontimerUrl = this.generateSessionTimerUrl(segment);
      
      // Create Fantastical URL with title, note containing sessiontimer:// URL
      const params = new URLSearchParams({
        s: eventTitle,
        n: sessiontimerUrl
      });
      
      return `x-fantastical3://parse?${params.toString()}`;
    });
    
    // Open the first segment in Fantastical (could be enhanced to handle multiple)
    const firstUrl = fantasticalUrls[0];
    window.location.href = firstUrl;
    
    this.eventBus.emit('calendar:fantastical', { segments: segments.length, url: firstUrl });
    
    return fantasticalUrls;
  }
  
  /**
   * Generate sessiontimer:// URL for a single segment
   */
  generateSessionTimerUrl(segment) {
    const params = new URLSearchParams({
      s: `a,${segment.time},${segment.duration}`,
      mode: segment.mode
    });
    
    return `sessiontimer://timer?${params.toString()}`;
  }
  
  /**
   * Generate data URL for ICS content (for sharing)
   */
  generateDataUrl(segments) {
    const icsContent = this.generateICS(segments);
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  }
  
  /**
   * Generate preview text for calendar events
   */
  generatePreview(segments, title = 'Session Timer') {
    if (segments.length === 0) {
      return 'No segments configured';
    }
    
    const events = segments.map((segment, index) => {
      const [hours, minutes] = segment.time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + segment.duration);
      
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      const mode = segment.mode === 'up' ? 'Count Up' : 'Count Down';
      return `${index + 1}. ${segment.time} - ${endTime}: ${title} (${mode}, ${segment.duration}min)`;
    });
    
    return events.join('\n');
  }
}
