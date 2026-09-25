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
        
        // Convert sessiontimer:// URL to HTTPS URL with parameters.
        //   sessiontimer://timer?s=...&mode=...  ->  timer.html?s=...&mode=...
        //   sessiontimer://segments?data=...     ->  timer.html?segments=...
        // (timer.html reads `segments=`, not `data=`, so the segments form
        // must be renamed or the page opens with no schedule.)
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if url.host == "segments", var items = components?.queryItems {
            items = items.map { $0.name == "data" ? URLQueryItem(name: "segments", value: $0.value) : $0 }
            components?.queryItems = items
        }
        var webURL = baseURL

        if let query = components?.percentEncodedQuery, !query.isEmpty {
            webURL += "?" + query
        }
        
        print("Opening: \(webURL)")
        
        // Open the URL in the default browser
        if let webURLObject = URL(string: webURL) {
            NSWorkspace.shared.open(webURLObject)
        }

        // Quit shortly after the last URL, rather than a fixed 0.1s after
        // launch (which could quit before a URL-open event arrived).
        scheduleQuit()
    }

    private var quitWork: DispatchWorkItem?

    func scheduleQuit(after seconds: Double = 2.0) {
        quitWork?.cancel()
        let work = DispatchWorkItem { NSApp.terminate(nil) }
        quitWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
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

// Stay open long enough to receive a URL-open event, then quit
// (each handled URL pushes the quit back again).
delegate.scheduleQuit(after: 5.0)

app.run()
