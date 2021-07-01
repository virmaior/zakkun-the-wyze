# zakkun-the-wyze

This project has scripts that I've been using to automate video archiving on my wyze v3 camera. 

My wife and I bought a Wyze v3 to figure out what our flying squirrel (Zaccheus) is doing at night and just to keep records of him. The starlight sensor and night vision combined are some awesome features, but the ability to playback video in the application is limited. Moreover, without subscribing, you're limited to rather short clips.

# Project Goal

On its simplest level my goal is to automate the process of archiving footage by putting as many steps as possible into automation.


# Current Features

As of 2021-07-01, I've got the following:
* Script to download from Wyze V3's SD card to a computer (defaults to yesterday but can set the date using a parameter za-toru.sh  vs. za-toru.sh 20210516)
* Produce screenshots and display the screenshots in HTML pages to identify activity (za-miru.sh can set the hour range using parameters s=00 e=23 -- defaults to greedy , can also set the number of screenshots using capcount=5 etc. )
* Identify video parts with activity (open in Brave, mark using clicking , dynamic cropping using percentages, then copy the "generate ranges" output to a string and send to za-horu.sh )
* Aggreggate continguous 1 minute clips that have activity using ffmpeg based on the file from za-miru (za-horu.sh )



(とる means "to take" in Japanese and can refer both to (a) taking a picture　撮る, (b) taking an object　取る, and (c) taking food 採る ; みる means "to see" or "to watch"; ほる means "to bury" 掘る. These are all very good activities for a flying squirrel)

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
