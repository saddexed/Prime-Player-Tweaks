# Prime Player Tweaks

A Chromium based extension that enhances the Amazon Prime Video viewing experience by removing visual distractions, adding advanced keyboard controls, and improving the overall player interface.
I got the idea because Netflix's player ui looks so clean...

## 🚀 Features

### 🎨 Visual Enhancements
- **Hide Hover Overlays**: Remove dark gradient overlays and hover effects for a cleaner viewing experience
- **Hide X-Ray Quick View**: Independently control X-Ray information overlays that appear during playback
- **Force Quality**: Automatically request the highest available video quality for optimal viewing experience
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

### forceQuality

- for now it actively requests quality upgrades. Initial loading quality of the video is still variable but it autoupgrades within 10 seconds to highest possible quality. 

## 🛠️ Installation

1. **Download the Extension**: Clone or download the repository to your local machine.
2. **Enable Developer Mode**: Open your Chromium-based browser and navigate to `chrome://extensions/`. Enable "Developer mode" in the top-right corner.
3. **Load Unpacked Extension**: Click "Load unpacked" and select the folder containing the extension files.
4. **Verify Installation**: Ensure the extension appears in your list of installed extensions and is enabled.

## 🧩 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, feel free to:

1. Fork the repository.
2. Create a new branch for your changes.
3. Submit a pull request with a detailed description of your changes.

## 📄 TODO
You tell me cro, I just did this for fun


### 🙂 Brought to you by-  
One banana milkshake, the pressure of my Unity game dev exam and Claude Sonnet 4 (I was NOT about to find how video requests work)
