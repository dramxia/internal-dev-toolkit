#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
static NSString *resultPath;
@interface Fixture : NSObject <NSApplicationDelegate, WKScriptMessageHandler, WKURLSchemeHandler>
@property(strong) NSWindow *window;
@property(strong) WKWebView *web;
@end
@implementation Fixture
- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  WKWebViewConfiguration *config = [WKWebViewConfiguration new];
  [config setURLSchemeHandler:self forURLScheme:@"app"];
  [config.userContentController addScriptMessageHandler:self name:@"sent"];
  self.web = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 600, 360) configuration:config];
  self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(180, 200, 600, 360) styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable) backing:NSBackingStoreBuffered defer:NO];
  self.window.title = @"组件任务发送测试";
  self.window.contentView = self.web;
  [self.window makeKeyAndOrderFront:nil];
  [NSApp activateIgnoringOtherApps:YES];
  [self.web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"app://-/index.html"]]];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 30 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{ [NSApp terminate:nil]; });
}
- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)task {
  NSString *html = @"<!doctype html><meta charset='utf-8'><title>发送测试</title><style>body{font:16px system-ui;padding:24px}textarea{display:block;width:500px;height:150px}button{padding:12px;margin-top:12px}</style><h1>独立发送测试窗口</h1><div><textarea id='draft' aria-label='Task' autofocus>本次草稿</textarea><button aria-label='Send' onclick='window.webkit.messageHandlers.sent.postMessage(document.getElementById(\"draft\").value)'>Send</button></div>";
  NSData *data = [html dataUsingEncoding:NSUTF8StringEncoding];
  [task didReceiveResponse:[[NSURLResponse alloc] initWithURL:task.request.URL MIMEType:@"text/html" expectedContentLength:data.length textEncodingName:@"UTF-8"]];
  [task didReceiveData:data]; [task didFinish];
}
- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)task {}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
  NSData *data = [NSJSONSerialization dataWithJSONObject:@{@"sent": message.body} options:0 error:nil];
  [data writeToFile:resultPath atomically:YES];
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), dispatch_get_main_queue(), ^{ [NSApp terminate:nil]; });
}
@end
int main(int argc, const char *argv[]) { @autoreleasepool {
  if (argc != 2) return 2;
  resultPath = [NSString stringWithUTF8String:argv[1]];
  NSApplication *app = [NSApplication sharedApplication];
  [app setActivationPolicy:NSApplicationActivationPolicyRegular];
  Fixture *delegate = [Fixture new]; app.delegate = delegate; [app run];
} return 0; }
