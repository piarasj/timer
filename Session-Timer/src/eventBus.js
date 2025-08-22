/**
 * Simple Event Bus
 * Lightweight pub/sub system for decoupled module communication
 */

export class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  off(event, callback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
  
  emit(event, data) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`EventBus: Error in event handler for "${event}":`, error);
      }
    });
  }
  
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    this.on(event, onceCallback);
  }
  
  // Debug helper
  listEvents() {
    return Object.keys(this.events).map(event => ({
      event,
      listenerCount: this.events[event].length
    }));
  }
}
