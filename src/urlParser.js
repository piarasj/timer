/**
 * URL Parser Module
 * Handles URL parameters, custom schemes, and URL generation
 */

export class URLParser {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.timerSegments = [];
    this.currentParams = null;
  }
  
  /**
   * Parse URL parameters and return configuration
   */
  parseUrlParameters(url = window.location.href) {
    const urlObj = new URL(url);
    const urlParams = new URLSearchParams(urlObj.search);
    
    // Handle PWA protocol handler (sessiontimer:// URLs passed via protocol_handlers)
    const sessiontimerUrl = urlParams.get('sessiontimer_url');
    if (sessiontimerUrl) {
      try {
        const decodedUrl = decodeURIComponent(sessiontimerUrl);
        const customUrlObj = new URL(decodedUrl);
        return this.parseCustomScheme(customUrlObj);
      } catch (e) {
        console.error('Error parsing PWA protocol handler URL:', e);
      }
    }
    
    // Handle custom sessiontimer:// scheme
    if (urlObj.protocol === 'sessiontimer:') {
      return this.parseCustomScheme(urlObj);
    }
    
    // Handle legacy single timer format
    const sParam = urlParams.get('s');
    const modeParam = urlParams.get('mode');
    
    if (sParam) {
      return this.parseSingleTimer(sParam, modeParam);
    }
    
    // Handle multiple segments format
    const segmentsParam = urlParams.get('segments');
    if (segmentsParam) {
      return this.parseMultipleSegments(segmentsParam);
    }
    
    // Check for popup/floating window mode
    const viewParam = urlParams.get('view');
    if (viewParam === 'popup') {
      this.openFloatingWindow(urlObj.href.replace('?view=popup&', '?').replace('?view=popup', ''));
      return null; // Don't configure timer in parent window
    }
    
    return null;
  }
  
  /**
   * Parse custom sessiontimer:// scheme URLs
   */
  parseCustomScheme(urlObj) {
    // sessiontimer://timer?s=a,14:30,40&mode=down
    // sessiontimer://segments?data=09:00,30,up|10:30,45,down
    
    const path = urlObj.pathname || urlObj.hostname;
    const params = new URLSearchParams(urlObj.search);
    
    if (path === 'timer' || path === '') {
      const sParam = params.get('s');
      const modeParam = params.get('mode');
      if (sParam) {
        return this.parseSingleTimer(sParam, modeParam);
      }
    }
    
    if (path === 'segments') {
      const segmentsData = params.get('data');
      if (segmentsData) {
        return this.parseMultipleSegments(segmentsData);
      }
    }
    
    return null;
  }
  
  /**
   * Parse single timer format: s=a,14:30,40&mode=down
   */
  parseSingleTimer(sParam, modeParam) {
    const parts = sParam.split(',');
    const autoStart = parts[0] === 'a';
    const manualStart = parts[0] === 'm';
    
    let countDown = true;
    if (modeParam === 'up') {
      countDown = false;
    }
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (parts.length > 1 && timeRegex.test(parts[1])) {
      const providedTime = parts[1];
      
      if (parts.length > 2 && !isNaN(parts[2])) {
        const durationMinutes = parseInt(parts[2], 10);
        const urlDuration = durationMinutes * 60;
        
        let urlStartTime;
        if (countDown) {
          // Count down: provided time is END time
          const [endH, endM] = providedTime.split(':').map(Number);
          const endTimeMs = new Date().setHours(endH, endM, 0, 0);
          const startTimeMs = endTimeMs - (urlDuration * 1000);
          const startTime = new Date(startTimeMs);
          urlStartTime = `${String(startTime.getHours()).padStart(2,'0')}:${String(startTime.getMinutes()).padStart(2,'0')}`;
        } else {
          // Count up: provided time is START time
          urlStartTime = providedTime;
        }
        
        const config = {
          segmentDuration: urlDuration,
          countDown: countDown,
          autoStart: (autoStart && !manualStart) ? urlStartTime : null,
          manualStart: manualStart,
          urlStartTime: urlStartTime,
          urlDuration: urlDuration,
          originalTime: providedTime
        };
        
        this.currentParams = config;
        return config;
      }
    }
    
    return null;
  }
  
  /**
   * Parse multiple segments format: segments=09:00,30,up|10:30,45,down
   */
  parseMultipleSegments(segmentsParam) {
    try {
      console.log('parseMultipleSegments - Raw param:', segmentsParam);
      
      // Handle double URL encoding that might come from the macOS helper
      let decodedParam = segmentsParam;
      try {
        decodedParam = decodeURIComponent(segmentsParam);
        console.log('parseMultipleSegments - First decode:', decodedParam);
        
        // If still URL encoded, decode again
        if (decodedParam.includes('%')) {
          decodedParam = decodeURIComponent(decodedParam);
          console.log('parseMultipleSegments - Second decode:', decodedParam);
        }
      } catch (e) {
        console.warn('URL decoding failed, using raw param');
        decodedParam = segmentsParam;
      }
      
      const segmentStrings = decodedParam.split('|');
      console.log('parseMultipleSegments - Split segments:', segmentStrings);
      
      this.timerSegments = segmentStrings.map((segStr, index) => {
        const [time, duration, mode] = segStr.split(',');
        console.log(`Segment ${index}:`, { time, duration, mode });
        
        // Validate the parsed values
        if (!time || !duration || isNaN(parseInt(duration))) {
          console.error(`Invalid segment ${index}:`, { time, duration, mode });
          return null;
        }
        
        return {
          time: time.trim(),
          duration: parseInt(duration),
          mode: (mode || 'down').trim()
        };
      }).filter(segment => segment !== null); // Remove invalid segments
      
      // Sort segments by time
      this.timerSegments.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      console.log('parseMultipleSegments - Final segments:', this.timerSegments);
      
      return {
        segments: this.timerSegments,
        isMultipleSegments: true
      };
    } catch (error) {
      console.error('Error parsing segments from URL:', error, 'Raw param:', segmentsParam);
      return null;
    }
  }
  
  /**
   * Generate URLs for current configuration
   */
  generateUrls(segments = this.timerSegments) {
    const baseUrl = window.location.origin + window.location.pathname;
    const urls = {};
    
    if (segments.length === 0) {
      return {
        webUrl: 'Configure segments to generate URLs',
        customScheme: 'Configure segments to generate URLs'
      };
    }
    
    if (segments.length === 1) {
      // Single segment URLs
      const segment = segments[0];
      urls.webUrl = `${baseUrl}?s=a,${segment.time},${segment.duration}&mode=${segment.mode}`;
      urls.customScheme = `sessiontimer://timer?s=a,${segment.time},${segment.duration}&mode=${segment.mode}`;
    } else {
      // Multiple segment URLs
      const segmentParams = segments.map(s => `${s.time},${s.duration},${s.mode}`).join('|');
      urls.webUrl = `${baseUrl}?segments=${encodeURIComponent(segmentParams)}`;
      urls.customScheme = `sessiontimer://segments?data=${encodeURIComponent(segmentParams)}`;
    }
    
    // Add floating window variants
    urls.floatingWindow = urls.webUrl + (urls.webUrl.includes('?') ? '&' : '?') + 'view=popup';
    
    return urls;
  }
  
  /**
   * Open floating/popup window
   */
  openFloatingWindow(url) {
    const features = [
      'toolbar=0',
      'location=0',
      'status=0',
      'menubar=0',
      'scrollbars=0',
      'resizable=1',
      'width=250',
      'height=250',
      'left=100',
      'top=100'
    ].join(',');
    
    const popup = window.open(url, 'SessionTimer', features);
    
    if (popup) {
      popup.focus();
      this.eventBus.emit('popup:opened', { window: popup, url });
    } else {
      this.eventBus.emit('popup:blocked', { url });
    }
    
    return popup;
  }
  
  /**
   * Generate Fantastical URL for calendar integration
   */
  generateFantasticalUrl(segments, title = 'Session Timer') {
    // Create a simple text format that Fantastical can parse
    const events = segments.map(segment => {
      const startTime = segment.time;
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + segment.duration);
      
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      return `${title} (${segment.mode === 'up' ? 'Count Up' : 'Count Down'}) from ${startTime} to ${endTime}`;
    }).join('\n');
    
    return `x-fantastical2://parse?text=${encodeURIComponent(events)}`;
  }
  
  /**
   * Get current timer segments
   */
  getSegments() {
    return [...this.timerSegments];
  }
  
  /**
   * Set timer segments
   */
  setSegments(segments) {
    this.timerSegments = [...segments];
    this.eventBus.emit('segments:updated', this.timerSegments);
  }
  
  /**
   * Add a segment
   */
  addSegment(segment) {
    this.timerSegments.push(segment);
    this.sortSegments();
    this.eventBus.emit('segments:updated', this.timerSegments);
  }
  
  /**
   * Remove a segment
   */
  removeSegment(index) {
    this.timerSegments.splice(index, 1);
    this.eventBus.emit('segments:updated', this.timerSegments);
  }
  
  /**
   * Clear all segments
   */
  clearSegments() {
    this.timerSegments = [];
    this.eventBus.emit('segments:updated', this.timerSegments);
  }
  
  /**
   * Sort segments by time
   */
  sortSegments() {
    this.timerSegments.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  }
}
