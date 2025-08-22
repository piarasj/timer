import Foundation
import AppKit

class AppDelegate: NSObject, NSApplicationDelegate {
    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            handleURL(url)
        }
    }
    
    func handleURL(_ url: URL) {
        print("Received URL: \(url)")
        
        // Use GitHub Pages URL instead of local file
        let baseURL = "https://piarasj.github.io/timer/timer.html"
        
        // Convert sessiontimer:// URL to HTTPS URL with parameters
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var webURL = baseURL
        
        if let query = components?.query {
            webURL += "?" + query
        }
        
        print("Opening: \(webURL)")
        
        // Open the URL in the default browser
        if let webURLObject = URL(string: webURL) {
            NSWorkspace.shared.open(webURLObject)
        }
    }
}

// Create and run the application
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate

// Process command line arguments if launched with URL
if CommandLine.arguments.count > 1 {
    let urlString = CommandLine.arguments[1]
    if let url = URL(string: urlString) {
        delegate.handleURL(url)
    }
}

// Keep the app running briefly to handle URL events
DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
    NSApp.terminate(nil)
}

app.run()
