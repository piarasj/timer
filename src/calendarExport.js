/**
 * Calendar Export Module
 * Handles ICS generation and calendar integration
 */

export class CalendarExport {
  constructor(eventBus) {
    this.eventBus = eventBus;
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
      'PRODID:-//Session Timer//Session Timer 2.5.10//EN',
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

      const eventTitle = `${title} - ${segment.mode === 'up' ? 'Count Up' : 'Count Down'} (${segment.duration}min)`;
      let description = `Session Timer: ${segment.mode === 'up' ? 'Count Up' : 'Count Down'} timer for ${segment.duration} minutes`;
      if (sessionUrl) {
        // \n is the ICS-escaped newline for TEXT values (RFC 5545) - keeps this
        // as a single logical DESCRIPTION line while still rendering as line
        // breaks in calendar apps.
        description += `\\n\\nOpen this session in Session Timer:\\n${sessionUrl}`;
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
