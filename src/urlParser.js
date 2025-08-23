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
    
    // Handle custom sessiontimer:// scheme
    if (urlObj.protocol === 'sessiontimer:') {
      return this.parseCustomScheme(urlObj);
    }
    
    // Check for popup/floating window mode FIRST
    const viewParam = urlParams.get('view');
    if (viewParam === 'popup') {
      // This IS the popup window - parse its configuration and return it
      // Remove the view=popup parameter and parse the rest
      const configUrl = urlObj.href.replace(/[?&]view=popup/, '');
      if (configUrl !== urlObj.href) {
        // Parse the configuration without the popup parameter
        return this.parseUrlParameters(configUrl);
      }
      return null;
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
    // Detect mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window);
    
    if (isMobile) {
      // On mobile, open in new tab instead of popup since popups don't work well
      const newTab = window.open(url, '_blank');
      if (newTab) {
        this.eventBus.emit('popup:opened', { window: newTab, url, isMobile: true });
        return newTab;
      } else {
        this.eventBus.emit('popup:blocked', { url, isMobile: true });
        return null;
      }
    }
    
    // Desktop popup window
    const features = [
      'toolbar=0',
      'location=0',
      'status=0',
      'menubar=0',
      'scrollbars=0',
      'resizable=1',
      'width=280',
      'height=280',
      'left=' + (screen.width - 300),
      'top=100'
    ].join(',');
    
    const popup = window.open(url, 'SessionTimer_' + Date.now(), features);
    
    if (popup) {
      // Ensure the popup has focus
      popup.focus();
      
      // Check if popup actually opened (not blocked)
      setTimeout(() => {
        if (!popup.closed && popup.location) {
          this.eventBus.emit('popup:opened', { window: popup, url, isMobile: false });
        } else {
          this.eventBus.emit('popup:blocked', { url, isMobile: false });
        }
      }, 1000);
      
      return popup;
    } else {
      this.eventBus.emit('popup:blocked', { url, isMobile: false });
      return null;
    }
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
  
  /**
   * Universal parser that accepts multiple input formats
   * @param {string} inputString - The input to parse
   * @returns {Array} Array of normalized segment objects [{time, duration, mode}]
   * @throws {Error} If parsing fails
   */
  parseAny(inputString) {
    if (!inputString || typeof inputString !== 'string') {
      throw new Error('Input must be a non-empty string');
    }
    
    const trimmed = inputString.trim();
    
    try {
      // 1. Try parsing as URL (sessiontimer:// or web URL)
      if (trimmed.startsWith('sessiontimer://') || trimmed.startsWith('http')) {
        const result = this.parseUrlParameters(trimmed);
        if (result && result.segments) {
          return result.segments;
        }
        // Handle single timer URL format
        if (result && !result.segments) {
          // Convert single timer config to segment format
          const segment = {
            time: result.originalTime || result.urlStartTime,
            duration: Math.round(result.segmentDuration / 60),
            mode: result.countDown ? 'down' : 'up'
          };
          return [segment];
        }
      }
      
      // 2. Try parsing as JSON array
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const jsonData = JSON.parse(trimmed);
        if (Array.isArray(jsonData)) {
          return jsonData.map((item, index) => {
            if (!item.time || !item.duration) {
              throw new Error(`Invalid segment at index ${index}: missing time or duration`);
            }
            if (!/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(item.time)) {
              throw new Error(`Invalid time format at index ${index}: ${item.time}`);
            }
            if (isNaN(item.duration) || item.duration < 1 || item.duration > 480) {
              throw new Error(`Invalid duration at index ${index}: ${item.duration}`);
            }
            return {
              time: item.time,
              duration: parseInt(item.duration),
              mode: (item.mode === 'up' || item.mode === 'down') ? item.mode : 'down'
            };
          });
        }
      }
      
      // 3. Try parsing as raw segment string (pipe-separated)
      if (trimmed.includes('|') || trimmed.includes(',')) {
        const result = this.parseMultipleSegments(trimmed);
        if (result && result.segments) {
          return result.segments;
        }
      }
      
      // 4. Try parsing as single segment (comma-separated)
      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        const time = parts[0].trim();
        const duration = parseInt(parts[1]);
        const mode = parts.length > 2 ? parts[2].trim() : 'down';
        
        if (!/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time)) {
          throw new Error(`Invalid time format: ${time}`);
        }
        if (isNaN(duration) || duration < 1 || duration > 480) {
          throw new Error(`Invalid duration: ${duration}`);
        }
        if (mode !== 'up' && mode !== 'down') {
          throw new Error(`Invalid mode: ${mode}. Must be 'up' or 'down'`);
        }
        
        return [{ time, duration, mode }];
      }
      
      throw new Error('Unable to parse input. Supported formats: sessiontimer:// URL, web URL, JSON array, or comma/pipe-separated segments');
      
    } catch (error) {
      if (error.message.includes('JSON')) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw error;
    }
  }
}
