# zakkun-the-wyze

This project has scripts that I've been using to automate video archiving on my wyze v3 camera. 

My wife and I bought a Wyze v3 to figure out what our flying squirrel (Zaccheus) is doing at night and just to keep records of him. The starlight sensor and night vision combined are some awesome features, but the ability to playback video in the application is dismal. Moreover, without subscribing, you're limited to rather short clips. (I haven't used the app in years because I look at the JPEG feeds on page).

# Project Goal

On its simplest level my goal is to automate the process of archiving footage by putting as many steps as possible into automation.

# Prerequisites

This assumes you either have github.com/gtxaspec/wz_mini_hacks on your camera (it originally worked with have [wyzeHacks](https://github.com/HclX/WyzeHacks) and boa for file download ). It would also work with FTP access of any sort.

# Current Features

As of 2024-10-19, I've got the following:
* Script to download from Wyze V3's SD card to a computer (za-toru.sh ) for either wyze_hacks or wz_mini_hacks
* Produce screenshots and display the screenshots in HTML pages to identify activity (za-miru.sh )
* Identify and label video parts with activity (open in Brave, mark using clicking , dynamic cropping using percentages, then copy the "generate ranges" output to a string and send to za-horu.sh )
* Aggreggate continguous 1 minute clips that have activity using ffmpeg based on the file from za-miru (za-horu.sh )
* support for multiple cameras (it assumes their ip addresses are 101 , cam=2 is 102 , cam=3 is 103 ...
* display marked video form multiple cameras in an expandable bottom timeline so that footage can be lined up.
* support for cron style hourly running
* added code to send the minutes you want to the server (rather than copy/paste) and the cron (za-harau.sh ) to download it.


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


# Video Identification and Screenshot Browser (za-miru.sh)


Different attempts (za-cap9.sh ):
1. watch the video in accelerated form --> *Still takes quite a bit of time*
2. use DVRscan (See for instance https://askubuntu.com/questions/422341/how-can-i-detect-motion-in-a-long-mostly-dull-video ) --> *Processing the video (at least on my computer) was about on par with real time and I had to (a) check the video afterwards anyway to make sure the motion was relevant and (b) patch together motion sections again to have it in mkv.
3. making screenshots using ffmpeg and scrolling through them myself. --> *Making the screenshots seems to be somewhat time-consuming as well (10x real time on my computer), but visually inspecting the screenshots seems to be the fastest way to decide content.
4. zacaps7.sh - screenshots accomplished much more quickly by using ffmpeg and picking neareast iframes (for 3 screenshots, this works out to near 00 , 20, and 40).
5. zacaps8.sh - uses map funciton to call ffmpeg only 1x per file
6. za-cap9.sh - same as 8 but with some ability to change number of screenshots
7. integrated functionality into za-miru.sh (no more separate za-cap9.sh)


# Aggregating / Saving the Videos
for za-horu.sh
1. sudo zsh za-horu.sh  i="h:00;c:3>d:20241011;h:00;c:3;s:00;e:00;l:emk_lava,d:20241011;h:00;c:3;s:02;e:03;l:emk_lava_branch,d:20241011;h:00;c:3;s:08;e:08;l:emk_lava,d:20241011;h:00;c:3;s:14;e:14;l:emk_topshelf_ladder,d:20241011;h:00;c:3;s:16;e:17;l:emk_lava,d:20241011;h:00;c:3;s:19;e:19;l:emk_ladder,d:20241011;h:00;c:3;s:21;e:21;l:emk_what,d:20241011;h:00;c:3;s:23;e:26;l:emk_topshelf,d:20241011;h:00;c:3;s:47;e:48;l:emk_ladderVh:00;c:5>d:20241011;h:00;c:5;s:00;e:14;l:emk_pouch,d:20241011;h:00;c:5;s:16;e:16;l:emk_ledge,d:20241011;h:00;c:5;s:18;e:21;l:emk_pouch,d:20241011;h:00;c:5;s:28;e:30;l:emk_pouch_ledge,d:20241011;h:00;c:5;s:34;e:37;l:emk_pouch,d:20241011;h:00;c:5;s:45;e:53;l:emk_pouch_hammock,d:20241011;h:00;c:5;s:59;e:59;l:emk_pouchVh:00;c:7>d:20241011;h:00;c:7;s:02;e:03;l:emk_garigari,d:20241011;h:00;c:7;s:05;e:06;l:emk_topdowel,d:20241011;h:00;c:7;s:14;e:16;l:emk_what,d:20241011;h:00;c:7;s:18;e:20;l:emk_wall,d:20241011;h:00;c:7;s:22;e:31;l:emk_ladder_wallV"


(in prior code a separate d= option was used on the main line). This has been switched to using it INSIDE of the entries -- allowing spanning of multiple days.

the input parameter internally splits into two based on >

First part:
1. h = hour
2. c = camera

Second part:
1. d=date
2. h=hour
3. s=start minute
4. e=end minute
5. l=label
6. c=camera


za-horu.sh takes the output from the HTML page selections and use that to make the aggregate clips.

It is now colorized and shows a bit of feedback.

# cgi-bin/za-horu.cgi

This can create a file in `/var/www/html/tmp` that ends in .tmp and contains the data from za-miru.sh

# za-harau.sh

This will take all of the `/var/www/html/tmp` files and run them through za-horu.sh . After it runs a file, it will change the extension to .done

# za-status.sh and /cgi-bin/za-status.cgi

This will provide information about how many days still need to be processed, digested, etc. (this is colorized in both HTML and command line).

# test-cams.sh

Wyze cameras often lose the date/time and configs or reboot . This checks to make sure all the cameras think it is the same time and are recording (requires functionality in wz_mini_hacks)

# Cgi-bin and Debian / Raspbian 

The default directory is not able to run cgi-bin code in these distributions. Instead, the cgi-bin files need to go to `/usr/lib/cgi-bin`


# Future Project

Another idea would be to compare the images from the screenshots and use that to speed up the process. Assume that change beneath a threshold is noise and only show items with higher change. But at least for our videos, I haven't seen a good tool that can detect Zaccheus very well. (I still don't have a good method for rapidly comparing the screenshots -- I guess the most basic idea would be (a) reduce color palette , (b) reduce image size, look for differences that way, (c) have a threshold).
 

# General Limitations

I provide no warranty of any kind. My expertise in bash scripting is rather poor, and I haven't tested this on any systems but my own.
