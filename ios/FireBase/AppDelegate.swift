import UIKit
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    // ⚠️ DİKKAT: app.json dosyanın içindeki "name" değeri neyse buraya onu yazmalısın.
    // Proje adın "FireBase" olduğu için muhtemelen budur. Eğer "main" ise "main" yaz.
    self.moduleName = "FireBase"
    self.dependencyProvider = RCTAppDependencyProvider()

    // Başlangıç parametreleri (Opsiyonel)
    self.initialProps = [:]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      // Metro Bundler'a bağlanır (index.js dosyasını arar)
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      // Release modunda cihazdaki bundle dosyasını kullanır
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
