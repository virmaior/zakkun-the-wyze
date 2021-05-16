# zakkun-the-wyze

This project has scripts that I've been using to automate video archiving on my wyze v3 camera. 

My wife and I bought a Wyze v3 to figure out what our flying squirrel (Zaccheus) is doing at night and just to keep records of him. The starlight sensor and night vision combined are some awesome features, but the ability to playback video in the application is limited. Moreover, without subscribing, you're limited to rather short clips.

# Goal

On its simplest level my goal is to automate the process of archiving footage by putting as many steps as possible into automation.


# Roadmap Features

The features that I'm looking for are:
* Automatically connect to Wyze
* Automatically download from SD card to a computer
* Identify video parts with activity
* Aggreggate continguous 1 minute clips that have activity


# Current Status 

As of 2021-05-16, I've got the following:
* Automatically connect to Wyze (using https://github.com/HclX/WyzeHacks/  and nc I can turn on the webserver)
* Automatically download from SD card to a computer (implemented in https://github.com/virmaior/zakkun-the-wyze/blob/main/za-toru.sh)
* Create screenshots at specified intervals (default 3) ((implemented in https://github.com/virmaior/zakkun-the-wyze/blob/main/zacaps7.sh)
* Interface to select segments based on the screen shots and produce a report (implemented via  https://github.com/virmaior/zakkun-the-wyze/blob/main/za-miur.sh and then using a browser to select the segment)
* Aggreggate continguous 1 minute clips that have activity (implemented in https://github.com/virmaior/zakkun-the-wyze/blob/main/za-horu.sh)

(とる means "to take" in Japanese and can refer both to (a) taking a picture　撮る, (b) taking an object　取る, and (c) taking food 採る ; みる means "to see" or "to watch"; ほる means "to bury" 掘る. These are all very good activities for a flying squirrel)

# Video Identification (zacaps7.sh + za-miru.sh)


Different attempts (zacaps7.sh ):
1. watch the video in accelerated form --> *Still takes quite a bit of time*
2. use DVRscan (See for instance https://askubuntu.com/questions/422341/how-can-i-detect-motion-in-a-long-mostly-dull-video ) --> *Processing the video (at least on my computer) was about on par with real time and I had to (a) check the video afterwards anyway to make sure the motion was relevant and (b) patch together motion sections again to have it in mkv.
3. making screenshots using ffmpeg and scrolling through them myself. --> *Making the screenshots seems to be somewhat time-consuming as well (10x real time on my computer), but visually inspecting the screenshots seems to be the fastest way to decide content.
4. screenshots accomplished much more quickly by using ffmpeg and picking neareast iframes (for 3 screenshots, this works out to near 00 , 20, and 40).


My current goal is to improve approach 3 in three ways:
  i.    speed up screenshot taking (final improvement is to use ffmpeg's map function to need only 1 call per source mp4 file).
  ii.   improve screenshot viewing page. Right now there are some dynamic features, but I want to add (a) dynamic cropping and (b) have it produce output that can be used as instructions for za-toru.sh to produce the selected clips
  iii.  modify the aggregation script to accept these parameters

Another idea would be to compare the images from the screenshots and use that to speed up the process. Assume that change beneath a threshold is noise and only show items with higher change. But at least for our videos, I haven't seen a good tool that can detect Zaccheus very well.


# General Limitations

I provide no warranty of any kind. My expertise in bash scripting is rather poor, and I haven't tested this on any systems but my own.
