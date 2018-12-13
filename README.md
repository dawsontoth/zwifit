# Zwifit

Welcome to the cryptically named Zwifit! This NodeJS app joins Zwift with treadmills running iFit®.

**Disclaimer:** I'm not associated with either company. Their trademarks and content are their own.
Heck, they might force me to take this down! But let's enjoy the *run* before they do.

## How This Works

This software connects to your iFit® treadmill over Wi-Fi to observe its speed and incline. It then
broadcasts that information over Bluetooth in a standard protocol that apps like Zwift are able to
understand.

## Minimum Requirements

1. A Wi-Fi connected iFit® treadmill
2. Zwift running on your favorite device
3. A separate laptop or desktop running this software (tested on Mac and Raspbian, your mileage may vary on other OSs). I highly recommend running this on a Raspberry Pi (link below).
4. Know the IP address of your treadmill. (I recommend reserving this IP in your router so it doesn't change.)
5. You need to be minimally comfortable with a command line / terminal. Or have a nerdy friend!

https://www.amazon.com/CanaKit-Raspberry-Premium-Clear-Supply/dp/B07BC7BMHY/ref=sr_1_2_sspa?s=pc&ie=UTF8&qid=1543965340&sr=1-2-spons&keywords=raspberry+pi+3+b%2B&psc=1

## Software Requirements

### Windows

Before you can run this code, you'll need to install a couple different things:

1. NodeJS, specifically version 8: https://nodejs.org/dist/latest-v8.x/node-v8.14.0-x64.msi (The library we use to communicate over Bluetooth doesn't work with the latest versions of NodeJS yet.)
2. Git https://git-scm.com/downloads
3. To install node-gyp, after installing NodeJS, open a command prompt with "Run as administrator", and run the following: `npm install --global --production windows-build-tools`
3. You'll need a compatible bluetooth adapter as well; follow the steps here: https://github.com/noble/node-bluetooth-hci-socket#windows

### Mac OS X

Before you can run this code, you'll need to install a couple different things:

1. NodeJS, specifically version 8: https://nodejs.org/dist/latest-v8.x/node-v8.14.0.pkg (The library we use to communicate over Bluetooth doesn't work with the latest versions of NodeJS yet.)
2. Git: https://git-scm.com/downloads
3. Xcode: https://developer.apple.com/xcode/

### Raspbian (Raspberry Pi)

This software works great on a **Raspberry Pi 3b+** or a **Zero W**. Follow all of these steps on your Pi itself, not on
your laptop or desktop! The easiest way to do this is to plug a monitor, keyboard and mouse in to your
Pi. Or, if you've set up SSH, you can `ssh` in to your Pi to follow these steps (hint: this option is in the configuration UI).

1. `sudo apt-get update`
2. Install the dependencies we need: `sudo apt-get install nodejs npm git bluetooth bluez libbluetooth-dev libudev-dev`
3. Turn off the system Bluetooth daemon so we can control it: `sudo systemctl disable bluetooth` (to reverse this, change `disable` to `enable`)
4. Turn the Bluetooth chip back on: `sudo hciconfig hci0 up`
5. Give NodeJS access to Bluetooth without sudo: ```sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)```

## Getting Started

With the software requirements out of the way, you can run the following commands to get this program, set it up, and run it:

```bash
git clone https://github.com/dawsontoth/zwifit.git
cd zwifit
npm install
node app.js
```

The last command will guide you through connecting to your treadmill. It will save your answers, and
won't ask you in the future. Your answers are saved in the settings.conf file. To change them, simply
edit settings.conf (or delete it and run `node app.js` again).

## Automatic Startup

Do you want this script to run in the background, even when you restart your computer? There are many
ways to accomplish this. Personally, I use a program called PM2.

Run the following to set everything up:

```bash
npm install -g pm2
pm2 startup
pm2 start app.js
pm2 save
```

You can undo this easily:

```bash
pm2 unstartup
```

Or restart, or view logs:

```bash
pm2 restart all
pm2 logs
```

Or update the code and restart:

```bash
git pull
pm2 restart all
```

## Calibration

Zwifit will report your treadmill's exact speed, as measured by the machine itself. You can use the calibration
feature within Zwift to adjust this, just like you would with a footpod.

## Contributing

Pull requests are welcome! Do your best to emulate the code around what you are editing.

## Want a custom solution?

If the above looks scary, and you'd rather pay me to ship you a Raspberry Pi pre-configured for your
treadmill and home Wi-Fi, you can email me dawson-at-tothsolutions-dot-com. Let me know what city and
country you live in so I can estimate shipping costs.

## Thank you!

If this works for you and improves your running experience, please consider donating to the developer
who made this possible.

https://venmo.com/DawsonToth

This will also encourage future improvements. Thanks!
