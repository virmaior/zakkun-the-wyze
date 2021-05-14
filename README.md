# zakkun-the-wyze

This project has scripts that I've been using to automate video archiving on my wyze v3 camera. 

My wife and I bought a Wyze v3 to figure out what our flying squirrel (Zaccheus) is doing at night and just to keep records of him. The starlight sensor and night vision combined are some awesome features, but the ability to playback video in the application is limited. Moreover, without subscribing, you're limited to rather short clips.

#Goal
On its simplest level my goal is to automate the process of archiving footage by putting as many steps as possible into automation.


#Roadmap Features
The features that I'm looking for are:
* Automatically connect to Wyze
* Automatically download from SD card to a computer
* Identify video parts with activity
* Aggreggate continguous 1 minute clips that have activity


#Current Status 

As of 2021-05-14, I've got the following:
* Automatically connect to Wyze (using https://github.com/HclX/WyzeHacks/  and nc I can turn on the webserver)
* Automatically download from SD card to a computer (implemented in za-toru.sh)
* Identify video parts with activity (I've not gotten the automation down here. See below)
* Aggreggate continguous 1 minute clips that have activity (implemented in za-horu.sh)


#Video Identification
Different attempts:
1. watch the video in accelerated form --> *Still takes quite a bit of time*
2. use DVRscan (See for instance https://askubuntu.com/questions/422341/how-can-i-detect-motion-in-a-long-mostly-dull-video ) --> *Processing the video (at least on my computer) was about on par with real time and I had to (a) check the video afterwards anyway to make sure the motion was relevant and (b) patch together motion sections again to have it in mkv.
3. making screenshots using ffmpeg and scrolling through them myself. --> *Making the screenshots seems to be somewhat time-consuming as well (10x real time on my computer), but visually inspecting the screenshots seems to be the fastest way to decide content.



