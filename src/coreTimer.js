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
    
    this.eventBus.emit('timer:stopped');
  }
  
  // Auto-start checker - to be called by interval
  checkAutoStart(settings) {
    if (!settings?.autoStart || this.running || this.autostartDone) return false;
    
    const [H, M] = settings.autoStart.split(':').map(Number);
    const now = new Date();
    
    // Handle mid-session join for URL parameters
    if (this.urlStartTime && this.urlDuration) {
      const startMs = new Date().setHours(H, M, 0, 0);
      const currentMs = now.getTime();
      const endMs = startMs + (this.urlDuration * 1000);
      
      if (currentMs >= startMs && currentMs < endMs) {
        const elapsedMs = currentMs - startMs;
        this.segmentStartMs = currentMs - elapsedMs;
        this.autostartDone = true;
        this.running = true;
        
        this.eventBus.emit('timer:started-mid-session', {
          elapsed: Math.floor(elapsedMs / 1000)
        });
        return true;
      }
    }
    
    // Standard exact time match
    if (now.getHours() === H && now.getMinutes() === M) {
      this.autostartDone = true;
      this.startSegmentNow(false);
      return true;
    }
    
    return false;
  }
  
  // Drawing functions
  minuteAngleAt(date) {
    const m = date.getMinutes();
    const s = date.getSeconds() + date.getMilliseconds() / 1000;
    return ((m + s / 60) * (Math.PI / 30)) - Math.PI / 2;
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
    
    // Progress color based on remaining time
    const remaining = this.segmentDurationSec - clamped;
    let progColor = '#22c55e';
    if (remaining <= 300) progColor = '#ef4444';
    else if (remaining <= 600) progColor = '#f59e0b';
    
    // Progress arc
    ctx.beginPath();
    ctx.arc(cx, cy, animatedRadius, coloredStartAngle, coloredEndAngle, false);
    ctx.strokeStyle = progColor;
    ctx.lineWidth = animatedLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Handle segment completion
    if (clamped >= this.segmentDurationSec) {
      if (this.manualRun) {
        this.stopSegment();
      } else {
        this.startSegmentNow(false);
      }
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
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h12 = (now.getHours() % 12) + m / 60;
    
    // Hour hand
    this.drawSvgStyleHourHand(ctx, cx, cy, r, h12, animProgress);
    
    // Minute hand
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
    
    // Second hand
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
    
    // Center pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 16 * animProgress, 0, Math.PI * 2);
    ctx.fillStyle = '#FDDA0D';
    ctx.fill();
  }
  
  draw() {
    if (!this.animationId) return;
    
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
   * Set transparent mode for floating window
   */
  setTransparentMode(enabled) {
    this.transparentMode = enabled;
    if (enabled) {
      // Recreate context with alpha enabled for transparency
      this.ctx = this.canvas.getContext('2d', { alpha: true });
    }
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
