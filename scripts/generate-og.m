// Run from the repository root:
// clang -fobjc-arc -framework AppKit -framework CoreText scripts/generate-og.m -o /tmp/terminal-generate-og && /tmp/terminal-generate-og
#import <AppKit/AppKit.h>
#import <CoreText/CoreText.h>

static void drawText(CGContextRef context, NSString *text, NSString *style, CGFloat size, CGFloat centerY, CGFloat shade) {
    NSString *path = [NSString stringWithFormat:@"%@/app/assets/fonts/AB_Terminal-%@.ttf", NSFileManager.defaultManager.currentDirectoryPath, style];
    NSArray *descriptors = CFBridgingRelease(CTFontManagerCreateFontDescriptorsFromURL((__bridge CFURLRef)[NSURL fileURLWithPath:path]));
    NSCAssert(descriptors.count, @"Missing font");
    CTFontRef font = CTFontCreateWithFontDescriptor((__bridge CTFontDescriptorRef)descriptors[0], size, NULL);
    CTLineRef line = CTLineCreateWithAttributedString((__bridge CFAttributedStringRef)[[NSAttributedString alloc] initWithString:text attributes:@{NSFontAttributeName:(__bridge id)font, NSForegroundColorAttributeName:[NSColor colorWithWhite:shade alpha:1]}]);
    CGRect bounds = CTLineGetBoundsWithOptions(line, kCTLineBoundsUseGlyphPathBounds);
    if (bounds.size.width > 1080) {
        CFRelease(line); CFRelease(font);
        font = CTFontCreateWithFontDescriptor((__bridge CTFontDescriptorRef)descriptors[0], size * 1080 / bounds.size.width, NULL);
        line = CTLineCreateWithAttributedString((__bridge CFAttributedStringRef)[[NSAttributedString alloc] initWithString:text attributes:@{NSFontAttributeName:(__bridge id)font, NSForegroundColorAttributeName:[NSColor colorWithWhite:shade alpha:1]}]);
        bounds = CTLineGetBoundsWithOptions(line, kCTLineBoundsUseGlyphPathBounds);
    }
    CGContextSetTextPosition(context, (1200 - bounds.size.width) / 2 - bounds.origin.x, centerY - CGRectGetMidY(bounds));
    CTLineDraw(line, context);
    CFRelease(line); CFRelease(font);
}
int main(void) { @autoreleasepool {
    NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc] initWithBitmapDataPlanes:NULL pixelsWide:1200 pixelsHigh:630 bitsPerSample:8 samplesPerPixel:4 hasAlpha:YES isPlanar:NO colorSpaceName:NSDeviceRGBColorSpace bytesPerRow:0 bitsPerPixel:0];
    NSGraphicsContext *graphics = [NSGraphicsContext graphicsContextWithBitmapImageRep:bitmap];
    [NSGraphicsContext saveGraphicsState];
    NSGraphicsContext.currentContext = graphics;
    CGContextRef context = graphics.CGContext;
    CGContextSetFillColorWithColor(context, NSColor.blackColor.CGColor);
    CGContextFillRect(context, CGRectMake(0, 0, 1200, 630));
    CGContextSetFillColorWithColor(context, [NSColor colorWithWhite:0.15 alpha:1].CGColor);
    for (int x = 28; x < 1200; x += 64) for (int y = 28; y < 630; y += 64) CGContextFillEllipseInRect(context, CGRectMake(x, y, 1, 1));
    drawText(context, @"AB Terminal", @"Bold", 148, 350, 0.84);
    drawText(context, @"typeface by Alex Blohin", @"Regular", 18, 218, 0.54);
    [NSGraphicsContext restoreGraphicsState];
    NSError *error = nil;
    [NSFileManager.defaultManager createDirectoryAtPath:@"public/og" withIntermediateDirectories:YES attributes:nil error:&error];
    if (error) { NSLog(@"%@", error); return 1; }
    NSData *png = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
    if (![png writeToFile:@"public/og/ab-terminal.png" atomically:YES]) return 1;
    puts("Generated public/og/ab-terminal.png (1200 x 630)");
    return 0;
} }
