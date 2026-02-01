/**
 * Core Timer Module
 * Handles timer state, animation, and drawing logic
 */

export class TimerCore {
  constructor(canvas, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.eventBus = eventBus;
    
    // Timer state
    this.running = false;
    this.manualRun = false;
    this.segmentStartMs = null;
    this.segmentDurationSec = 2400;
    this.autostartDone = false;
    this.countDown = true;
    this.startAnim = null;
    this.currentSegmentIndex = 0;
    
    // Animation state
    this.animationId = null;
    
    // Display state
    this.transparentMode = false;
    
    // Color thresholds (in minutes)
    this.orangeThreshold = 10; // Default: 10 minutes
    this.redThreshold = 3;     // Default: 3 minutes
    
    // Second hand pause behavior
    this.pauseAtTwelve = false; // Feature toggle
    this.pauseDuration = 2000;  // 2 seconds in milliseconds
    this.lastPauseTime = null;  // Track when pause started
    this.pauseActive = false;   // Is currently paused
    this.pauseStartPosition = null; // Position when pause began
    this.inTransition = false;  // Flag to track handoff state
    
    this.initializeCanvas();
    this.bindEvents();
  }
  
  initializeCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  bindEvents() {
    // Listen for external control events
    this.eventBus.on('timer:start', (isManual = true) => {
      this.startSegmentNow(isManual);
    });
    
    this.eventBus.on('timer:stop', () => {
      this.stopSegment();
    });
    
    this.eventBus.on('timer:configure', (config) => {
      this.configure(config);
    });
  }
  
  configure({ segmentDuration, countDown = true, autoStart = null }) {
    this.segmentDurationSec = segmentDuration || 2400;
    this.countDown = countDown;
    this.autoStartTime = autoStart;
    
    this.eventBus.emit('timer:configured', {
      segmentDuration: this.segmentDurationSec,
      countDown: this.countDown,
      autoStart: this.autoStartTime,
      ready: true
    });
  }
  
  startSegmentNow(isManual) {
    this.manualRun = !!isManual;
    this.segmentStartMs = Date.now();
    this.running = true;
    
    const when = new Date(this.segmentStartMs);
    const hh = String(when.getHours()).padStart(2, '0');
    const mm = String(when.getMinutes()).padStart(2, '0');
    
    this.eventBus.emit('timer:started', {
      time: `${hh}:${mm}`,
      manual: isManual
    });
  }
  
  stopSegment() {
    this.running = false;
    this.manualRun = false;
    this.segmentStartMs = null;
    
    // Reset dead second state to prevent flashes
    this.resetDeadSecondState();
    
    this.eventBus.emit('timer:stopped');
  }
  
  // Auto-start functionality has been moved to SegmentManager
  // This method is kept for backward compatibility
  checkAutoStart(settings) {
    console.log('checkAutoStart called but functionality moved to SegmentManager');
    return false;
  }
  
  // Drawing functions
  minuteAngleAt(date) {
    const m = date.getMinutes();
    const s = date.getSeconds() + date.getMilliseconds() / 1000;
    return ((m + s / 60) * (Math.PI / 30)) - Math.PI / 2;
  }
  
  /**
   * Calculate second hand position with simple dead second pause
   * @param {Date} now - Current time
   * @returns {number} - Second hand position (0-60)
   */
  calculateSecondHandPosition(now) {
    const rawSeconds = now.getSeconds() + now.getMilliseconds() / 1000;
    
    // Dead second feature only works when timer is not running (to avoid distractions)
    if (!this.pauseAtTwelve || this.running) {
      return rawSeconds;
    }
    
    const currentTime = now.getTime();
    
    // Check if we're near 12 o'clock (within last 100ms of minute)
    if (rawSeconds >= 59.9 || rawSeconds < 0.05) {
      if (!this.pauseActive) {
        // Start pause
        this.pauseActive = true;
        this.lastPauseTime = currentTime;
      }
      
      // Stay at 12 during pause
      const elapsed = currentTime - this.lastPauseTime;
      if (elapsed < this.pauseDuration) {
        return 0; // Paused at 12
      } else {
        // End pause and reset for next cycle
        this.pauseActive = false;
        this.lastPauseTime = null;
      }
    }
    
    return rawSeconds;
  }
  
  drawTimerArc(ctx, cx, cy, r, animProgress) {
    if (!this.running || this.segmentStartMs == null) return;
    
    const nowMs = Date.now();
    const elapsedSec = Math.max(0, (nowMs - this.segmentStartMs) / 1000);
    const clamped = Math.min(elapsedSec, this.segmentDurationSec);
    
    // Arc geometry
    const startAngle = this.minuteAngleAt(new Date(this.segmentStartMs));
    const span = this.segmentDurationSec * (Math.PI / 1800);
    const endAngle = startAngle + span;
    
    // Calculate arc endpoints based on count mode
    let coloredStartAngle, coloredEndAngle;
    if (this.countDown) {
      coloredStartAngle = startAngle + clamped * (Math.PI / 1800);
      coloredEndAngle = endAngle;
    } else {
      coloredStartAngle = startAngle;
      coloredEndAngle = startAngle + clamped * (Math.PI / 1800);
    }
    
    const animatedRadius = r * 0.88 * animProgress;
    const animatedLineWidth = 22 * animProgress;
    
    // Segment track (grey)
    ctx.beginPath();
    ctx.arc(cx, cy, animatedRadius, startAngle, endAngle, false);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = animatedLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Progress color based on remaining time using user-defined thresholds
    const remainingMin = (this.segmentDurationSec - clamped) / 60;
    let progColor = '#22c55e'; // Green by default
    
    if (remainingMin <= this.redThreshold) {
      progColor = '#ef4444'; // Red
    } else if (remainingMin <= this.orangeThreshold) {
      progColor = '#f59e0b'; // Orange
    }
    
    // Progress arc
    ctx.beginPath();
    ctx.arc(cx, cy, animatedRadius, coloredStartAngle, coloredEndAngle, false);
    ctx.strokeStyle = progColor;
    ctx.lineWidth = animatedLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Handle segment completion
    if (clamped >= this.segmentDurationSec) {
      // Notify about segment completion
      this.eventBus.emit('segment:completed', {
        duration: Math.round(this.segmentDurationSec / 60),
        mode: this.countDown ? 'down' : 'up',
        wasManual: this.manualRun
      });
      
      // Stop the current segment
      this.stopSegment();
    }
  }
  
  drawSvgStyleHourHand(ctx, cx, cy, r, h12, animProgress) {
    const angle = h12 * (Math.PI / 6) - Math.PI / 2;
    const length = r * 0.50 * animProgress;
    const width = 20 * animProgress;
    const radius = width / 2;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    // Main body - pill shape
    ctx.beginPath();
    ctx.roundRect(0, -width / 2, length, width, radius);
    ctx.fillStyle = '#e6e6e6';
    ctx.fill();
    
    // Inner void
    const voidWidth = 8 * animProgress;
    const voidStart = length * 0.63;
    const voidEnd = length * 0.97;
    const voidLength = voidEnd - voidStart;
    const voidRadius = voidWidth / 2;
    
    ctx.beginPath();
    ctx.roundRect(voidStart, -voidWidth / 2, voidLength, voidWidth, voidRadius);
    ctx.fillStyle = this.transparentMode ? 'transparent' : '#000';
    if (this.transparentMode) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  drawHands(ctx, cx, cy, r, now, animProgress) {
    // Calculate second hand position (with optional pause at 12)
    const s = this.calculateSecondHandPosition(now);
    
    // Keep hour and minute hands calm by using real time
    const realSeconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + realSeconds / 60;
    const h12 = (now.getHours() % 12) + m / 60;
    
    // Hour hand (always uses real time)
    this.drawSvgStyleHourHand(ctx, cx, cy, r, h12, animProgress);
    
    // Minute hand (always uses real time)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(m * (Math.PI / 30) - Math.PI / 2) * (r * 0.75 * animProgress),
      cy + Math.sin(m * (Math.PI / 30) - Math.PI / 2) * (r * 0.75 * animProgress)
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10 * animProgress;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Second hand (with dead second pause if enabled)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(s * (Math.PI / 30) - Math.PI / 2) * (r * 0.86 * animProgress),
      cy + Math.sin(s * (Math.PI / 30) - Math.PI / 2) * (r * 0.86 * animProgress)
    );
    ctx.strokeStyle = '#FDDA0D';
    ctx.lineWidth = 3 * animProgress;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Center pivot (always visible)
    ctx.beginPath();
    ctx.arc(cx, cy, 16 * animProgress, 0, Math.PI * 2);
    ctx.fillStyle = '#FDDA0D';
    ctx.fill();
  }
  
  draw() {
    // Ensure canvas is properly sized
    if (!this.canvas.width || !this.canvas.height) {
      this.resizeCanvas();
    }
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Layout
    const size = Math.min(w, h) * 0.9;
    const r = size / 2;
    const cx = w / 2;
    const cy = h / 2;
    
    // Animation progress
    let animProgress = 1;
    if (this.startAnim !== null) {
      let t = Math.min(1, (performance.now() - this.startAnim) / 1500);
      animProgress = t < 1 ? (1 - Math.cos(t * Math.PI)) / 2 : 1;
    }
    
    // Clear the canvas (transparent in popup mode, black otherwise)
    if (this.transparentMode) {
      this.ctx.clearRect(0, 0, w, h);
    } else {
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, w, h);
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = animProgress;
    
    // Reference outline circle
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * animProgress, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.lineWidth = 2 * animProgress;
    this.ctx.stroke();
    
    // Draw timer arc and clock hands
    const now = new Date();
    this.drawTimerArc(this.ctx, cx, cy, r, animProgress);
    this.drawHands(this.ctx, cx, cy, r, now, animProgress);
    
    this.ctx.restore();
    
    this.animationId = requestAnimationFrame(() => this.draw());
  }
  
  startAnimation() {
    this.startAnim = performance.now();
    this.animationId = requestAnimationFrame(() => this.draw());
  }
  
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Reset dead second state to prevent flashes
   */
  resetDeadSecondState() {
    this.pauseActive = false;
    this.lastPauseTime = null;
    this.pauseStartPosition = null;
    this.inTransition = false;
    console.log('Dead second state reset');
  }
  
  /**
   * Set transparent mode for floating window
   */
  setTransparentMode(enabled) {
    this.transparentMode = enabled;
    if (enabled) {
      // Recreate context with alpha enabled for transparency
      this.ctx = this.canvas.getContext('2d', { alpha: true });
    }
  }
  
  /**
   * Set color thresholds for timer display
   * @param {number} orangeMinutes - Minutes remaining to show orange
   * @param {number} redMinutes - Minutes remaining to show red
   */
  setColorThresholds(orangeMinutes, redMinutes) {
    this.orangeThreshold = Math.max(1, orangeMinutes || 10);
    this.redThreshold = Math.max(1, redMinutes || 3);
    
    // Ensure red threshold is not greater than orange threshold
    if (this.redThreshold >= this.orangeThreshold) {
      this.redThreshold = Math.max(1, this.orangeThreshold - 1);
    }
    
    console.log(`Color thresholds updated: orange=${this.orangeThreshold}min, red=${this.redThreshold}min`);
  }
  
  /**
   * Enable or disable the pause-at-12 behavior for the second hand
   * @param {boolean} enabled - Whether to pause at 12 o'clock
   * @param {number} durationMs - Duration of pause in milliseconds (default: 2000)
   */
  setPauseAtTwelve(enabled, durationMs = 2000) {
    this.pauseAtTwelve = !!enabled;
    this.pauseDuration = Math.max(100, durationMs); // Minimum 100ms
    
    // Reset pause state when toggling
    if (!enabled) {
      this.pauseActive = false;
      this.lastPauseTime = null;
      this.pauseStartPosition = null;
    }
    
    console.log(`Pause at 12: ${enabled ? 'enabled' : 'disabled'}${enabled ? ` (${durationMs}ms)` : ''}`);
  }
  
  // Getters for current state
  get isRunning() {
    return this.running;
  }
  
  get currentSettings() {
    return {
      segmentDuration: this.segmentDurationSec,
      countDown: this.countDown,
      running: this.running,
      manualRun: this.manualRun
    };
  }
}
