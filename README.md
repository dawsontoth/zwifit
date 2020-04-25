# Zwifit

Welcome to the cryptically named Zwifit! This NodeJS app joins Zwift with fitness machines (treadmills & indoor bikes) 
running iFit® with Wi-Fi/Bluetooth.

**Disclaimer:** I'm not associated with either company. Their trademarks and content are their own.
Heck, they might force me to take this down! But let's enjoy the *run* before they do.

## How This Works

This software connects to your iFit® treadmill over Wi-Fi/Bluetooth to observe its speed and incline. It then
broadcasts that information over Bluetooth in a standard protocol that apps like Zwift are able to
understand. For indoor bikes power and cadence are also observed and gradient is transmitted to the ifit®
bike as incline. 

## What Fitness Machines Are Compatible?

At the moment it seems hit or miss on which iFit® fitness machines with Wi-Fi/Bluetooth work, but we are building a 
spreadsheet over at the following URL. Look through that. You may also be interested in the TreadSync app, which has 
a similar goal to this project, but runs in a slightly different way (on iOS devices).

http://bit.ly/TS-compat

## Minimum Requirements

1. A Wi-Fi/Bluetooth connected iFit® fitness machines (treadmills & indoor bikes)
2. Zwift running on your favorite device
3. A Raspberry Pi ZeroW or 3B running this software (this software works on versions of Mac OS X before Mojave, but our Bluetooth dependency is presently borked on Mojave -- Windows requires an external Bluetooth LE dongle be properly configured).
4. For Wi-Fi connected treadmills: Know the IP address of your treadmill. (I recommend reserving this IP in your router so it doesn't change.)
5. Indoor bikes are only supported by Bluetooth
6. You need to be minimally comfortable with a command line / terminal. Or have a nerdy friend!

Raspberry Pi Zero W: https://www.amazon.com/CanaKit-Raspberry-Wireless-Complete-Starter/dp/B072N3X39J/ref=sr_1_4?ie=UTF8&qid=1546535245&sr=8-4&keywords=raspberry+pi+zero+w

Note: the above is NOT an affiliate link, I don't get anything from you clicking it. There are loads of other options and configurations for purchasing a Pi. If you're not in the US, you should be able to find a configuration that has a good power supply, a Zero W, and a MicroSD card. Or you could purchase the parts separately!

## Software Requirements

### Raspbian (Raspberry Pi)

This software works great on a **Raspberry Pi 3b+** or a **Raspberry Pi Zero W**. Follow all of these steps on your Pi itself, not on
your laptop or desktop! The easiest way to do this is to plug a monitor, keyboard and mouse in to your
Pi. Or, if you've set up SSH, you can `ssh` in to your Pi to follow these steps (hint: this option is in the configuration UI).

1. `sudo apt-get update`
2. Install the dependencies we need: `sudo apt-get install git bluetooth bluez libbluetooth-dev libudev-dev`
3. Install NodeJS 13.x
    1. For **Raspberry Pi 3b+** run `curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -` and `sudo apt install -y nodejs`
    2. For **Raspberry Pi Zero W** use the [unofficial builds](https://github.com/nodejs/unofficial-builds/), because armv61 is not part of the official builds any more. Download the binaries, run
        * `mkdir /opt`
        * `tar -C /opt -xzvf node-v13.8.0-linux-armv61.tar.gz`
        * `echo "export PATH=\$PATH:/opt/node-v13.8.0-linux-armv6l/bin" >> ~/.bashrc`
        * exit and re-open terminal to activate changes
4. Turn off the system Bluetooth daemon so we can control it: `sudo systemctl disable bluetooth` (to reverse this, change `disable` to `enable`)
5. Turn the Bluetooth chip back on: `sudo hciconfig hci0 up`
6. Give NodeJS access to Bluetooth without sudo: ``sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)``

### Windows

*NOT WELL TESTED!* Before you can run this code, you'll need to install a couple different things:

1. NodeJS, specifically version 8: https://nodejs.org/dist/latest-v8.x/node-v8.14.0-x64.msi (The library we use to communicate over Bluetooth doesn't work with the latest versions of NodeJS yet.)
2. Git https://git-scm.com/downloads
3. To install node-gyp, after installing NodeJS, open a command prompt with "Run as administrator", and run the following: `npm install --global --production windows-build-tools`
3. You'll need a compatible bluetooth adapter as well; follow the steps here: https://github.com/noble/node-bluetooth-hci-socket#windows

### Mac OS X

*DOES NOT WORK ON MOJAVE!* Before you can run this code, you'll need to install a couple different things:

1. NodeJS, specifically version 8: https://nodejs.org/dist/latest-v8.x/node-v8.14.0.pkg (The library we use to communicate over Bluetooth doesn't work with the latest versions of NodeJS yet.)
2. Git: https://git-scm.com/downloads
3. Xcode: https://developer.apple.com/xcode/

## Getting Started

With the software requirements out of the way, you can run the following commands to get this program, set it up, and run it:

```bash
git clone https://github.com/dawsontoth/zwifit.git
cd zwifit
npm install
npm start
```

The last command will guide you through connecting to your fitness machines. It will save your answers, and
won't ask you in the future. Your answers are saved in the settings.conf file. To change them, simply
edit settings.conf (or delete it and run `npm start` again).

## Automatic Startup

### Using PM2

Do you want this script to run in the background, even when you restart your computer? There are many
ways to accomplish this. Personally, I use a program called PM2.

_NOTE: To install this program globally, you can prefix `sudo ` before the `npm install` line below, but it would be far wiser to tweak your installation of NPM so that `sudo` isn't required! Follow the steps in the following article, and you'll be doing your system a favor! https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally You only need to do this once._

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

### Using cron with automatic shutdown

If you use a Raspberry Pi it is crucial to shutdown using

```bash
sudo poweroff
```

to avoid damaging the SD card (google for it to find more information). To perform this action after every workout
in a convenient way there is the run-script `raspberrypi.sh` which can be used.

*Details:* If the environment variable `SHUTDOWN_ONDISCONNECT=1` is set for the Zwifit process then Zwifit stops after
loosing the Wifi/Bluetooth connection what is usually caused by switching off the fitness machines. This situation is
detected by the run-script `raspberrypi.sh` to shutdown your Raspberry Pi properly.

Since the shutdown procedure requires `sudo` it is advisable to start the shell script using the root cron.
The run-script switches to the user `pi` for running Zwifit, so the root user is only used for shutdown.

To run Zwifit on startup edit the crontab by using

```bash
sudo crontab -e
```

and add this line at the end of the file:

```bash
@reboot nohup /home/pi/zwifit/raspberrypi.sh
```
(where you have to replace the path `/home/pi/zwifit` by the installation path of Zwifit at your system)

*Once applied steps for using the system are:*
1. Plug in your Raspberry Pi.
1. Wait until your fitness machines enlights the connection led (or the control page http://raspberrypi.local:1337 is available and the ifit symbol is green) which takes 70 seconds using a Raspberry Pi ZeroW.
1. Do your workouts with Zwift and connect or disconnect to the simulated fitness machine as often you need to.
1. Once you retire simple switch of your fitness machine.
1. About 10 seconds later it is save to plugin off your Raspberry Pi.

## Calibration

For treadmills, Zwifit will report your treadmill's exact speed, as measured by the machine itself. You can use the calibration
feature within Zwift to adjust this, just like you would with a footpod. Alternatively, load up the Zwifit Web UI
and head to the Settings page.

For indoor bikes, Zwifit will report your bikes exact power. Zwift will calculate speed based on your power.

## Control and Monitoring

The app runs a local web server that displays information from your fitness machine, allows changing settings, and allows manual control of speed and incline. This can be used to change the speed and incline of your fitness machine, too. To access this web site, you'll need to know the IP of your Pi, or the hostname, depending on your wireless router. For me, I can access it at http://raspberrypi.local:1337/ You may need to do the full IP, such as http://192.168.0.50:1337/ -- or if you're running this on a laptop, at http://localhost:1337/

If you have a monitor or touch screen connected to your Pi, you can run it in Kiosk mode. It can launch the Zwifit UI automatically. Follow the steps in this article to get started: https://pimylifeup.com/raspberry-pi-kiosk/

## Set the incline according to your current Zwift session

Zwift does not send the current gain of your running session to the treadmill. However, you can use the software [zwifit-incline-tracker](https://github.com/RasPelikan/zwifit-incline-tracker) to achieve this regardless. These automatic updates are only processed if the treadmill is in the active status.

## Contributing

Pull requests are welcome! Do your best to emulate the code around what you are editing.

## Thank you!

If this works for you and improves your running experience, please consider donating to the developer
who made this possible.

https://venmo.com/DawsonToth

This will also encourage future improvements. Thanks!
