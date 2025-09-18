# Prime Player Tweaks

A Chromium based extension that enhances the Amazon Prime Video viewing experience by removing visual distractions, adding advanced keyboard controls, and improving the overall player interface.
I got the idea because Netflix's player ui looks so clean...

## 🚀 Features

### 🎨 Visual Enhancements
- **Hide Hover Overlays**: Remove dark gradient overlays and hover effects for a cleaner viewing experience
- **Hide X-Ray Quick View**: Independently control X-Ray information overlays that appear during playback
- **Improved Caption Display**: Enhanced subtitle positioning and container handling

### ⌨️ Advanced Keyboard Controls
- **Enhanced Seeking**: Precise video navigation with multiple time intervals
- **Fullscreen Toggle**: Quick fullscreen access
- **Skip Controls**: Fast forward and backward navigation
- **Custom Key Bindings**: Alternative keys for comfortable navigation

## 📋 Keyboard Shortcuts

| Action | Keys | Description |
|--------|------|-------------|
| Toggle Fullscreen | `F` | Enter/exit fullscreen mode |
| Skip Back 10s | `J` or `←` | Jump backward 10 seconds |
| Skip Forward 10s | `L` or `→` | Jump forward 10 seconds |
| Seek Back/Forward 3s | `Shift` + `←` or `→` | Precise 3-second navigation |
| Seek Back/Forward 60s | `Alt` + `←` or `→` | Quick 60-second jumps |

## 🎯 Compatibility

- **Browser**: Chromium based (Manifest V3)
- **Websites**: 
  - `*.amazon.com/gp/video/*`
  - `*.primevideo.com/*`

## 🔧 Technical Details

### Architecture
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Content Scripts**: Injected into Prime Video pages
- **Permissions**: `activeTab`, `storage`
- **Host Permissions**: Amazon domains only

### Features Implementation
- **CSS Injection**: Custom styles for overlay hiding
- **Event Interception**: Advanced keyboard handling
- **DOM Manipulation**: Player container detection and modification
- **Settings Persistence**: Chrome storage API integration

