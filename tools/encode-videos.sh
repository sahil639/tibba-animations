#!/bin/sh
# Encodes the frames tools/render-basecamp.html and tools/render-bags.html
# leave in tools/out/ into the phone page's videos (assets/video/).
#
#   summits.mp4 / summits-rev.mp4 — the flight across the four summits, and
#     the same backwards (phones can't play a video in reverse smoothly, so
#     going back up the list plays the reversed copy). A keyframe every 6
#     frames, so a jump to any rest is quick to decode.
#   summit-<i>.jpg — each rest as a still: the poster, and what shows when
#     the connection is too slow for the video.
#   bag<b>.mp4 / bag<b>.jpg — each bag's seamless loop, and its still.
set -e
cd "$(dirname "$0")/.."
O=tools/out V=assets/video
X="-c:v libx264 -preset veryslow -pix_fmt yuv420p -movflags +faststart -an"
ffmpeg -loglevel error -y -framerate 30 -i $O/bc-%04d.png $X -crf 27 -g 6 -keyint_min 6 $V/summits.mp4
ffmpeg -loglevel error -y -i $V/summits.mp4 -vf reverse $X -crf 27 -g 6 -keyint_min 6 $V/summits-rev.mp4
node -e '
  const t = require("./tools/out/bc-timeline.json");
  console.log(t.rests.map(r => Math.round(r.t * t.fps - .5)).join(" "));
' | { read a b c d; i=0; for n in $a $b $c $d; do
  ffmpeg -loglevel error -y -i $O/bc-$(printf %04d $n).png -q:v 4 $V/summit-$i.jpg; i=$((i+1)); done; }
for b in 0 1 2; do
  ffmpeg -loglevel error -y -framerate 30 -i $O/bag$b-%04d.png $X -crf 28 $V/bag$b.mp4
  ffmpeg -loglevel error -y -i $O/bag$b-0000.png -q:v 4 $V/bag$b.jpg
done
cp $O/bc-timeline.json $V/summits.json
ls -la $V
