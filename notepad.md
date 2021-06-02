Here are some of the things I looked at:

https://github.com/HclX/WyzeHacks/tree/master/info

https://github.com/HclX/WyzeHacks/issues/114

https://github.com/HclX/WyzeHacks/issues/112


https://trac.ffmpeg.org/wiki/Scaling
https://video.stackexchange.com/questions/23631/how-does-ffprobe-identifies-i-frame-and-idr-when-it-sets-key-frame-1
https://www.bogotobogo.com/FFMpeg/ffmpeg_thumbnails_select_scene_iframe.php

https://stackoverflow.com/questions/26809934/fast-seeking-ffmpeg-multiple-times-for-screenshots

I tried altering the .user_config to see if I could turn night vision on/off directly but it didn't work:
sed -i '0,/nightVision=3/s//nightVision=1/' .user_config
