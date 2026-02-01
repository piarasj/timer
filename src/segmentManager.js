/**
 * Segment Manager Module
 * Coordinates segment scheduling and timer execution
 * Bridges the gap between URL parsing and TimerCore execution
 */

export class SegmentManager {
  constructor(eventBus) {
    console.log('SegmentManager: Constructor called');
    this.eventBus = eventBus;
    this.segments = [];
    this.currentSegmentIndex = 0;
    this.isActive = false;
    this.scheduleStarted = false;
    this.userPaused = false; // Flag to prevent auto-restart when user explicitly stops
    this.segmentActivated = []; // Track which segments have already been activated
    this.tickInterval = null;
    this.autoStartTimeout = null; // Track pending auto-start timeout
    this.timerRunning = false; // Track if timer is currently running
    
    console.log('SegmentManager: Binding events...');
    this.bindEvents();
    console.log('SegmentManager: Constructor complete');
  }
  
  bindEvents() {
    console.log('SegmentManager: bindEvents called');
    // Listen for configuration ready from URL parser or UI
    this.eventBus.on('config:ready', (config) => {
      console.log('SegmentManager: Received config:ready event', config);
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
    
    // Track timer state
    this.eventBus.on('timer:started', (data) => {
      this.timerRunning = true;
    });
    
    this.eventBus.on('timer:stopped', () => {
      this.timerRunning = false;
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
        // All segments from URL should be auto-start scheduled timers
        // They specify explicit times, so they should auto-start at those times
        return {
          startTime: segment.time,
          durationMinutes: segment.duration,
          durationSec: segment.duration * 60,
          mode: segment.mode || 'down',
          countDown: (segment.mode || 'down') === 'down',
          manualStart: false, // URL segments are always scheduled (auto-start)
          autoStart: segment.time // Auto-start at specified time
        };
      });
    } else if (config.segmentDuration) {
      // Single timer configuration - convert to segment format
      const startTime = config.urlStartTime || config.autoStart || '00:00';
      
      // Respect the manualStart flag from URLParser for single timers
      // If it's explicitly marked as manual (s=m,time,duration), treat as manual
      // If it's explicitly marked as auto (s=a,time,duration), treat as scheduled
      const isExplicitlyManual = config.manualStart === true;
      const hasAutoStart = config.autoStart !== null && config.autoStart !== undefined;
      
      this.segments = [{
        startTime: startTime,
        durationMinutes: Math.round(config.segmentDuration / 60),
        durationSec: config.segmentDuration,
        mode: config.countDown === false ? 'up' : 'down',
        countDown: config.countDown !== false,
        autoStart: hasAutoStart ? config.autoStart : null,
        manualStart: isExplicitlyManual || !hasAutoStart // Manual if explicitly marked OR no auto-start
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
    this.userPaused = false; // Clear user pause flag on new config
    this.segmentActivated = new Array(this.segments.length).fill(false); // Track activation status
    
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
    console.log('SegmentManager: Starting scheduler');
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    // Check every second for segment activation
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
    
    console.log('SegmentManager: Scheduler interval set, calling initial tick');
    // Initial tick
    this.tick();
  }
  
  /**
   * Scheduler tick - check if any segment should be activated
   */
  tick() {
    if (this.segments.length === 0) return;
    
    // Don't auto-start if user has explicitly paused
    if (this.userPaused) {
      console.log('SegmentManager: Tick blocked - user has paused timer');
      return;
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    // Check for auto-start segments
    if (!this.isActive && this.currentSegmentIndex < this.segments.length) {
      const segment = this.segments[this.currentSegmentIndex];
      
      console.log(`SegmentManager: Tick - checking segment ${this.currentSegmentIndex}, time ${now.getHours()}:${now.getMinutes()}:${currentSeconds}, manualStart=${segment.manualStart}, activated=${this.segmentActivated[this.currentSegmentIndex]}`);
      
      // Skip manual start segments in auto-scheduler
      if (segment.manualStart) {
        console.log('SegmentManager: Skipping manual start segment');
        return;
      }
      
      // Skip if user has paused (redundant check for safety)
      if (this.userPaused) return;
      
      // Skip if this segment has already been activated once
      if (this.segmentActivated[this.currentSegmentIndex]) {
        console.log('SegmentManager: Segment already activated - waiting for user action');
        return;
      }
      
      const segmentStartTime = this.parseTime(segment.startTime);
      
      console.log(`SegmentManager: Comparing currentTime=${currentTime} >= segmentStartTime=${segmentStartTime}`);
      
      // Check if it's time to start this segment
      if (currentTime >= segmentStartTime) {
        // Check for mid-session join
        const segmentEndTime = segmentStartTime + segment.durationMinutes;
        
        console.log(`SegmentManager: Time reached! Checking if currentTime=${currentTime} < segmentEndTime=${segmentEndTime}`);
        
        if (currentTime < segmentEndTime) {
          // Start mid-session or on-time
          const elapsedMinutes = currentTime - segmentStartTime;
          console.log(`SegmentManager: Starting segment with elapsedMinutes=${elapsedMinutes}`);
          this.activateSegment(this.currentSegmentIndex, elapsedMinutes);
        } else {
          // Segment already finished, move to next
          console.log('SegmentManager: Segment already finished, moving to next');
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
    console.log('SegmentManager: Manual start requested, isActive:', this.isActive, 'userPaused:', this.userPaused);
    
    // Clear user pause flag when manually starting
    this.userPaused = false;
    
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
    
    // Mark this segment as activated to prevent re-activation
    this.segmentActivated[segmentIndex] = true;
    
    let configForTimer;
    
    // Check if this is a manual start segment (from presets or manual timer creation)
    // Scheduled URL segments should always use the scheduled timer path
    if (segment.manualStart) {
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
      this.autoStartTimeout = setTimeout(() => {
        this.autoStartTimeout = null;
        this.eventBus.emit('timer:start', false);
      }, 100);
    } else if (!segment.manualStart && segment.autoStart) {
      // Scheduled auto-start timer - store timeout so it can be canceled
      this.autoStartTimeout = setTimeout(() => {
        this.autoStartTimeout = null;
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
    this.userPaused = false; // Clear pause flag on natural completion
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
    console.log('SegmentManager: User stop requested');
    this.isActive = false;
    this.userPaused = true; // Set flag to prevent auto-restart
    
    // Cancel any pending auto-start timeout to prevent immediate restart
    if (this.autoStartTimeout) {
      clearTimeout(this.autoStartTimeout);
      this.autoStartTimeout = null;
      console.log('SegmentManager: Canceled pending auto-start timeout');
    }
    
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
