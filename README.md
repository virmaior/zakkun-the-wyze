# zakkun-the-wyze

This project has scripts that I've been using to automate video archiving on my wyze v3 camera. 

My wife and I bought a Wyze v3 to figure out what our flying squirrel (Zaccheus) is doing at night and just to keep records of him. The starlight sensor and night vision combined are some awesome features, but the ability to playback video in the application is limited. Moreover, without subscribing, you're limited to rather short clips.

# Project Goal

On its simplest level my goal is to automate the process of archiving footage by putting as many steps as possible into automation.

# Prerequisites

This assumes you either have [wyzeHacks](https://github.com/HclX/WyzeHacks) and have started up boa for file download
*or* 
You have installed github.com/gtxaspec/wz_mini_hacks on your camera and have an authroized_key


# Current Features

As of 2022-05-22, I've got the following:
* Script to download from Wyze V3's SD card to a computer (za-toru.sh ) for either wyze_hacks or wz_mini_hacks
* Produce screenshots and display the screenshots in HTML pages to identify activity (za-miru.sh )
* Identify and label video parts with activity (open in Brave, mark using clicking , dynamic cropping using percentages, then copy the "generate ranges" output to a string and send to za-horu.sh )
* Aggreggate continguous 1 minute clips that have activity using ffmpeg based on the file from za-miru (za-horu.sh )
* support for multiple cameras (it assumes their ip addresses are 101 , cam=2 is 102 , cam=3 is 103 ...
* display marked video form multiple cameras in an expandable bottom timeline so that footage can be lined up.
* support for cron style hourly running



(とる means "to take" in Japanese and can refer both to (a) taking a picture　撮る, (b) taking an object　取る, and (c) taking food 採る ; みる means "to see" or "to watch"; ほる means "to bury" 掘る. These are all very good activities for a flying squirrel)

# Parameters

for za-toru.sh and za-miru.sh  
1. d=20210708  - d sets the date in question
2. s=0 - s sets the start hour
3. e=12  e sets the end hour
4. cam= sets the camera number (if not specificed assume 1)

for za-toru.sh 
1. cron = run for the previous hour
2. m = add za-miru for the same hour
3. scp = will tell the system that you are using **wz_mini_hacks** and what subnet inside of 192.168 you are using for your cameras.

for za-miru.sh
1. capcount = set the number of screen captures per minute 
2. skipcap = skip doing the screen captures
3. skiphtml = skip making html pages to show the screen captures

for za-horu.sh
1. sudo zsh za-horu.sh d=20210724 i="h:23;c:1>s:00;e:06;l:feeding;c:1,s:18;e:29;l:hammock_left;c:1,s:47;e:59;l:hammock_left;c:1V h:23;c:3>s:00;e:06;l:feeding;c:3,s:18;e:29;l:hammock_left;c:3,s:47;e:59;l:hammock_left;c:3V h:23;c:4>s:00;e:06;l:feeding;c:4,s:19;e:29;l:hammock_left;c:4,s:48;e:59;l:hammock_left;c:4V "
2. d=20210715 - specify the date (not required)

the input parameter internally splits into two based on >

First part:
1. h = hour
2. c = camera

Second part:
1. s=start minute
2. e=end minute
3. l=label
4. c=camera

# Video Identification and Screenshot Browser (za-miru.sh)


Different attempts (za-cap9.sh ):
1. watch the video in accelerated form --> *Still takes quite a bit of time*
2. use DVRscan (See for instance https://askubuntu.com/questions/422341/how-can-i-detect-motion-in-a-long-mostly-dull-video ) --> *Processing the video (at least on my computer) was about on par with real time and I had to (a) check the video afterwards anyway to make sure the motion was relevant and (b) patch together motion sections again to have it in mkv.
3. making screenshots using ffmpeg and scrolling through them myself. --> *Making the screenshots seems to be somewhat time-consuming as well (10x real time on my computer), but visually inspecting the screenshots seems to be the fastest way to decide content.
4. zacaps7.sh - screenshots accomplished much more quickly by using ffmpeg and picking neareast iframes (for 3 screenshots, this works out to near 00 , 20, and 40).
5. zacaps8.sh - uses map funciton to call ffmpeg only 1x per file
6. za-cap9.sh - same as 8 but with some ability to change number of screenshots
7. integrated functionality into za-miru.sh (no more separate za-cap9.sh)


za-horu.sh now takes the output from the HTML page selections and use that to make the aggregate clips.

# Future Project

Another idea would be to compare the images from the screenshots and use that to speed up the process. Assume that change beneath a threshold is noise and only show items with higher change. But at least for our videos, I haven't seen a good tool that can detect Zaccheus very well.



# General Limitations

I provide no warranty of any kind. My expertise in bash scripting is rather poor, and I haven't tested this on any systems but my own.
