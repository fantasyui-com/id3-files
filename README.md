# id3-files
Employ ID v3 information in renaming of files.

The idea behind this program: focus on *.mp3 only.
Use a central location into which all files are copied.
Simply running: ```id3-files /Users/alice/Downloads``` will copy all of your mp3 into ~/music-db
where it will be arranged by artist||album/album--title

## Dedupe Your MP3 Collection.

The following command will copy files from /Users/alice/music-library into /Users/alice/nodupe
while avoiding creating duplicates. It uses sha fingerprinting and id3 info.

```Bash

$> id3-files --dry-run --use-fingerprinting --music-library ~/nodupe /Users/alice/music-library


```
