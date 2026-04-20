# $ bash sthooka.sh 

# Dependencies (Linux)
sudo apt-get install ffmpeg sox

# Given audios such as ./flac/*.flac, convert from flac to wav
for file in ./flac/*.flac
do
  key=$(ffmpeg -i "$file" 2>&1 | sed -ne 's/.*SWAC_TEXT *: //p')                 # print metadata, assign SWAC_TEXT's value to variable.
  iso=$(ffmpeg -i "$file" 2>&1 | sed -ne 's/.*SWAC_LANG *: //p' | tr -d '\r' | xargs)
  [ -z "$iso" ] && iso=mis  # if iso is empty, assign 'mis'.
  ffmpeg -i "$file" -b:a 392k "../wav/cmn-$key.wav";    # ex: cmn-很.mp3 (392k)
  # lame --cbr -b 392 -m m -h --resample 22.05 "$file" "../wav/cmn-$key.wav";    # ex: cmn-很.mp3 (96k cbr)
done

# Given audios such as ./wav/*.wav, create noise profiles
mkdir -p ./noise;
for file in ./wav/*.wav;
do key=$(basename "$file" .wav);
ffmpeg -i "$file" -vn -ss 00:00:00 -t 00:00:00.170 ./noise/noise-"$key"-head.wav ;
ffmpeg -vn -sseof -0.200 -t 0.230 -i "$file" ./noise/noise-"$key"-tail.wav
# sox "$file" ./noise/noise-"$key"-head.wav trim 0 0.300     
# sox "$file"  ./noise/noise-"$key"-tail.wav reverse trim 0 0.200 reverse
done;

# Concat noise samples into single noise sample
ffmpeg -f concat -safe 0 -i <(for f in ./noise/*.wav; do echo "file '$PWD/$f'"; done) -c copy ./noise/noise-audio.wav

# Creates noise profile
sox ./noise/noise-audio.wav -n noiseprof ./noise/noise.prof ;

# Denoise
mkdir -p ./clean0.35;
for file in ./wav/*.wav;do key=$(basename "$file" .wav);
sox "$file" ./clean0.5/"$key".wav noisered ./noise/noise.prof 0.35;
done;

# Rename for Commons

# Upload to Commons
