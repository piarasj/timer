/**
 * Segment Manager Module
 * Coordinates segment scheduling and timer execution
 * Bridges the gap between URL parsing and TimerCore execution
 */

export class SegmentManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.segments = [];
    this.currentSegmentIndex = 0;
    this.isActive = false;
    this.scheduleStarted = false;
    this.tickInterval = null;
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Listen for configuration ready from URL parser or UI
    this.eventBus.on('config:ready', (config) => {
      this.loadConfig(config);
    });
    
    // Listen for manual timer control
    this.eventBus.on('timer:start', (isManual) => {
      this.handleManualStart(isManual);
    });
    
    this.eventBus.on('timer:stop', () => {
      this.handleStop();
    });
    
    // Listen for segment completion from timer core
    this.eventBus.on('segment:completed', (segmentInfo) => {
      this.handleSegmentCompleted();
    });
  }
  
  /**
   * Load configuration from URL parser or presets
   * @param {Object} config - Configuration object
   */
  loadConfig(config) {
    console.log('SegmentManager: Loading config', config);
    
    if (config.segments && config.segments.length > 0) {
      // Multi-segment configuration
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      this.segments = config.segments.map(segment => {
        // Detect if this is a preset (time matches current time) vs a scheduled timer
        const isPresetTimer = segment.time === currentTime;
        
        return {
          startTime: segment.time,
          durationMinutes: segment.duration,
          durationSec: segment.duration * 60,
          mode: segment.mode || 'down',
          countDown: (segment.mode || 'down') === 'down',
          manualStart: isPresetTimer, // Mark presets as manual start
          autoStart: !isPresetTimer ? segment.time : null // Only auto-start for scheduled timers
        };
      });
    } else if (config.segmentDuration) {
      // Single timer configuration - convert to segment format
      const startTime = config.urlStartTime || config.autoStart || '00:00';
      this.segments = [{
        startTime: startTime,
        durationMinutes: Math.round(config.segmentDuration / 60),
        durationSec: config.segmentDuration,
        mode: config.countDown === false ? 'up' : 'down',
        countDown: config.countDown !== false,
        autoStart: config.autoStart,
        manualStart: config.manualStart
      }];
    } else {
      // No configuration - create default segment
      this.segments = [{
        startTime: '00:00',
        durationMinutes: 40,
        durationSec: 2400,
        mode: 'down',
        countDown: true,
        manualStart: true
      }];
    }
    
    console.log('SegmentManager: Configured segments:', this.segments);
    
    // Reset state
    this.currentSegmentIndex = 0;
    this.isActive = false;
    this.scheduleStarted = false;
    
    // Start the scheduler
    this.startScheduler();
    
    // Notify that configuration is ready
    this.eventBus.emit('segments:configured', {
      segments: this.segments,
      totalSegments: this.segments.length
    });
  }
  
  /**
   * Start the scheduler that checks for segment activation
   */
  startScheduler() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    // Check every second for segment activation
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
    
    // Initial tick
    this.tick();
  }
  
  /**
   * Scheduler tick - check if any segment should be activated
   */
  tick() {
    if (this.segments.length === 0) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Check for auto-start segments
    if (!this.isActive && this.currentSegmentIndex < this.segments.length) {
      const segment = this.segments[this.currentSegmentIndex];
      
      // Skip manual start segments in auto-scheduler
      if (segment.manualStart) return;
      
      const segmentStartTime = this.parseTime(segment.startTime);
      
      // Check if it's time to start this segment
      if (currentTime >= segmentStartTime) {
        // Check for mid-session join
        const segmentEndTime = segmentStartTime + segment.durationMinutes;
        
        if (currentTime < segmentEndTime) {
          // Start mid-session
          const elapsedMinutes = currentTime - segmentStartTime;
          this.activateSegment(this.currentSegmentIndex, elapsedMinutes);
        } else {
          // Segment already finished, move to next
          this.currentSegmentIndex++;
          this.tick(); // Immediately check next segment
        }
      }
    }
  }
  
  /**
   * Parse time string to minutes since midnight
   * @param {string} timeStr - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Handle manual start/stop button press
   * @param {boolean} isManual - Whether this is a manual start
   */
  handleManualStart(isManual) {
    console.log('SegmentManager: Manual start requested, isActive:', this.isActive);
    
    // If timer is currently running, ignore the start request
    // Let the TimerCore handle the actual stop via the normal flow
    if (this.isActive) {
      console.log('SegmentManager: Timer already active, ignoring start request');
      return;
    }
    
    if (this.currentSegmentIndex >= this.segments.length) {
      // No more segments, create a manual timer
      this.createManualTimer();
      return;
    }
    
    // Start current segment manually
    this.activateSegment(this.currentSegmentIndex, 0);
  }
  
  /**
   * Create a manual timer when no segments are configured
   */
  createManualTimer() {
    const segment = {
      startTime: new Date().toTimeString().substr(0, 5),
      durationSec: 2400, // 40 minutes default
      durationMinutes: 40,
      mode: 'down',
      countDown: true,
      manualStart: true
    };
    
    this.segments = [segment];
    this.currentSegmentIndex = 0;
    this.activateSegment(0, 0);
  }
  
  /**
   * Activate a specific segment
   * @param {number} segmentIndex - Index of segment to activate
   * @param {number} elapsedMinutes - Minutes already elapsed (for mid-session join)
   */
  activateSegment(segmentIndex, elapsedMinutes = 0) {
    if (segmentIndex >= this.segments.length) {
      this.eventBus.emit('schedule:completed');
      return;
    }
    
    const segment = this.segments[segmentIndex];
    console.log(`SegmentManager: Activating segment ${segmentIndex}:`, segment, `Elapsed: ${elapsedMinutes} minutes`);
    
    this.isActive = true;
    this.scheduleStarted = true;
    
    // For manual timers or presets, we want to start "now" not at a scheduled time
    // This fixes the issue where presets were trying to use scheduled times instead of immediate start
    const isManualOrPresetStart = segment.manualStart || elapsedMinutes === 0;
    
    let configForTimer;
    
    if (isManualOrPresetStart) {
      // Manual/preset start: simple duration-based timer starting now
      configForTimer = {
        segmentDuration: segment.durationSec,
        countDown: segment.countDown,
        autoStart: null, // Don't use scheduled auto-start for manual timers
        manualStart: true
      };
    } else {
      // Scheduled timer with specific start/end times (from URL parameters)
      if (segment.mode === 'down') {
        // Countdown mode: calculate when to start based on end time and duration
        const endTime = this.parseTime(segment.startTime);
        const startTime = endTime - segment.durationMinutes;
        
        // Convert back to time string
        const startHours = Math.floor((startTime + (elapsedMinutes || 0)) / 60) % 24;
        const startMinutes = (startTime + (elapsedMinutes || 0)) % 60;
        const startTimeStr = `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
        
        configForTimer = {
          segmentDuration: segment.durationSec - (elapsedMinutes * 60),
          countDown: true,
          autoStart: startTimeStr,
          urlStartTime: startTimeStr,
          urlDuration: segment.durationSec - (elapsedMinutes * 60)
        };
      } else {
        // Count up mode: start time is the specified time
        const startTime = this.parseTime(segment.startTime);
        const startHours = Math.floor((startTime + (elapsedMinutes || 0)) / 60) % 24;
        const startMinutes = (startTime + (elapsedMinutes || 0)) % 60;
        const startTimeStr = `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
        
        configForTimer = {
          segmentDuration: segment.durationSec - (elapsedMinutes * 60),
          countDown: false,
          autoStart: startTimeStr,
          urlStartTime: startTimeStr,
          urlDuration: segment.durationSec - (elapsedMinutes * 60)
        };
      }
    }
    
    console.log('SegmentManager: Timer configuration:', configForTimer);
    
    // Configure the timer core
    this.eventBus.emit('timer:configure', configForTimer);
    
    // For manual/preset timers, we don't auto-start here - let the user control when to start
    // Only auto-start for scheduled timers or mid-session joins
    if (elapsedMinutes > 0) {
      // Mid-session join - start immediately
      setTimeout(() => {
        this.eventBus.emit('timer:start', false);
      }, 100);
    } else if (!segment.manualStart && segment.autoStart) {
      // Scheduled auto-start timer
      setTimeout(() => {
        this.eventBus.emit('timer:start', false);
      }, 100);
    }
    // For manual/preset timers, don't auto-start - wait for user gesture/button
    
    // Emit segment activation event
    this.eventBus.emit('segment:active', {
      index: segmentIndex,
      segment: segment,
      elapsedMinutes: elapsedMinutes,
      totalSegments: this.segments.length
    });
  }
  
  /**
   * Handle segment completion
   */
  handleSegmentCompleted() {
    console.log(`SegmentManager: Segment ${this.currentSegmentIndex} completed`);
    
    this.isActive = false;
    this.currentSegmentIndex++;
    
    // Check if there are more segments
    if (this.currentSegmentIndex < this.segments.length) {
      // Move to next segment
      setTimeout(() => {
        this.tick(); // Check if next segment should start immediately
      }, 1000);
    } else {
      // All segments completed
      this.eventBus.emit('schedule:completed');
      console.log('SegmentManager: All segments completed');
    }
  }
  
  /**
   * Handle stop button press
   */
  handleStop() {
    this.isActive = false;
    // Don't advance segment index - user can resume same segment
  }
  
  /**
   * Get current state
   */
  getCurrentState() {
    return {
      segments: this.segments,
      currentSegmentIndex: this.currentSegmentIndex,
      isActive: this.isActive,
      scheduleStarted: this.scheduleStarted,
      hasMoreSegments: this.currentSegmentIndex < this.segments.length
    };
  }
  
  /**
   * Reset the segment manager
   */
  reset() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    this.segments = [];
    this.currentSegmentIndex = 0;
    this.isActive = false;
    this.scheduleStarted = false;
  }
  
  /**
   * Stop the scheduler
   */
  destroy() {
    this.reset();
  }
}
