#!/usr/bin/env swift

import Foundation
import Cocoa

/**
 * SessionTimer URL Scheme Helper
 * 
 * This minimal macOS app registers the sessiontimer:// URL scheme
 * and redirects calls to the web-based timer application.
 * 
 * Usage:
 * sessiontimer://timer?s=a,14:30,40&mode=down
 * -> Opens: https://your-domain.com/timer.html?s=a,14:30,40&mode=down
 * 
 * or for local file:
 * -> Opens: file:///path/to/timer.html?s=a,14:30,40&mode=down
 */

class SessionTimerApp: NSApplication {
    
    // Configure your timer URL here - either local file or hosted
    private let timerBaseURL = "https://piarasj.github.io/timer/timer-v2.html"
    // Alternative for local: "file:///Users/pjackson/Sites/sessionTimer/Session-Timer/timer-v2.html"
    
    override func finishLaunching() {
        super.finishLaunching()
        
        // Register for URL events
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
        
        // Hide from Dock and Menu bar for invisible operation
        setActivationPolicy(.accessory)
        
        print("SessionTimer URL Helper started")
        print("Base URL: \(timerBaseURL)")
    }
    
    @objc func handleURLEvent(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
        guard let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
              let url = URL(string: urlString) else {
            print("Invalid URL received")
            return
        }
        
        print("Received URL: \(urlString)")
        
        // Parse sessiontimer:// URL and convert to web URL
        let webURL = convertToWebURL(url)
        
        print("Opening web URL: \(webURL)")
        
        // Open the converted URL in default browser
        NSWorkspace.shared.open(URL(string: webURL)!)
        
        // Exit after handling the URL
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            NSApplication.shared.terminate(nil)
        }
    }
    
    private func convertToWebURL(_ url: URL) -> String {
        // sessiontimer://timer?s=a,14:30,40&mode=down
        // -> https://domain.com/timer-v2.html?s=a,14:30,40&mode=down
        // sessiontimer://segments?data=... 
        // -> https://domain.com/timer-v2.html?segments=...
        
        let path = url.host ?? url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let query = url.query ?? ""
        
        // Use timer-v2.html for the enhanced version
        var webURL = timerBaseURL.replacingOccurrences(of: "timer.html", with: "timer-v2.html")
        
        // Handle different path types
        if path == "segments" && !query.isEmpty {
            // Convert segments format: sessiontimer://segments?data=... -> ?segments=...
            let segmentsData = query.replacingOccurrences(of: "data=", with: "")
            let separator = webURL.contains("?") ? "&" : "?"
            webURL += "\(separator)segments=\(segmentsData)"
        } else if !query.isEmpty {
            // Standard timer format
            let separator = webURL.contains("?") ? "&" : "?"
            webURL += "\(separator)\(query)"
        }
        
        return webURL
    }
}

// Create and run the application
let app = SessionTimerApp.shared
app.run()
