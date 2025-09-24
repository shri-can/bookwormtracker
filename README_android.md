# 📱 BookwormTracker - Android Installation Guide

Run BookwormTracker locally on your Android device using Termux. **100% private, offline, no cloud required.**

## 🚀 Quick Start

### Step 1: Install Termux
1. **Download Termux from F-Droid** (not Google Play - F-Droid has the full version)
   - Go to [f-droid.org](https://f-droid.org)
   - Search for "Termux"
   - Install the official Termux app

### Step 2: Get the App
**Option A: Download ZIP**
1. Download the project ZIP file to your phone
2. Extract it to your Downloads folder
3. Open Termux and run:
   ```bash
   cd ~/storage/downloads/BookwormTracker-main
   ```

**Option B: Git Clone (if you have internet)**
```bash
cd ~/storage/downloads
git clone https://github.com/yourusername/BookwormTracker.git
cd BookwormTracker
```

### Step 3: Install Dependencies
```bash
bash android/termux_install.sh
```

### Step 4: Run the App
**Option A: Quick Start (recommended)**
```bash
bash android/quick_start.sh
```

**Option B: Manual Start**
```bash
bash android/run_local.sh
```

**Option C: Using npm directly**
```bash
npm run android
```

### Step 5: Open in Browser
- Open Chrome on your Android device
- Go to: `http://127.0.0.1:5000`
- Start tracking your reading! 📚

## 🔧 Advanced Usage

### Keep Screen Awake During Reading
```bash
termux-wake-lock
```
To unlock later:
```bash
termux-wake-unlock
```

### Make Scripts Executable (if needed)
```bash
chmod +x android/*.sh
```

### View Your Data
Your reading data is saved locally at:
```
./data/store.json
```

### Stop the Server
Press `Ctrl+C` in Termux to stop the server.

## 📁 File Structure
```
BookwormTracker/
├── android/
│   ├── termux_install.sh    # Installation script
│   ├── run_local.sh         # Run script
│   ├── quick_start.sh       # One-click start (recommended)
│   └── verify_setup.sh      # Verify installation
├── data/
│   └── store.json           # Your reading data (created after first run)
└── README_android.md        # This file
```

## 🛠️ Troubleshooting

### Permission Errors
```bash
chmod +x android/*.sh
```

### Port Already in Use
The script automatically handles port conflicts. If you get errors:
```bash
# Kill any process using port 5000
pkill -f "node.*5000"
# Then run again
bash android/run_local.sh
```

### Build Errors
If the build fails:
```bash
# Clear npm cache
npm cache clean --force
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Storage Issues
If you can't access files:
```bash
# Grant storage permission
termux-setup-storage
# Then try again
```

## 🔒 Privacy & Security

- ✅ **100% Local**: No internet required after installation
- ✅ **No Cloud**: Your data never leaves your device
- ✅ **Private**: All reading data stored locally in `./data/store.json`
- ✅ **Offline**: Works completely offline
- ✅ **Secure**: No external connections or data sharing

## 📊 Features

- 📚 **Book Management**: Add, edit, and organize your books
- ⏱️ **Session Tracking**: Track reading sessions with timer
- 📈 **Progress Monitoring**: Visual progress bars and statistics
- 📝 **Notes & Quotes**: Capture insights and favorite quotes
- 🎯 **Reading Goals**: Set and track reading targets
- 📱 **Mobile Optimized**: Perfect for phone reading

## 💡 Tips

1. **Long Reading Sessions**: Use `termux-wake-lock` to prevent screen sleep
2. **Backup Data**: Copy `./data/store.json` to cloud storage for backup
3. **Multiple Books**: Switch between books easily with the book switcher
4. **Quick Actions**: Use the quick action buttons for notes and quotes
5. **Session History**: View detailed reading statistics in the Session History tab

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Ensure you're using Termux from F-Droid (not Google Play)
3. Make sure all scripts are executable: `chmod +x android/*.sh`
4. Try restarting Termux and running the installation again

---

**Happy Reading! 📖✨**
