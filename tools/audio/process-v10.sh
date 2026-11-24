#!/usr/bin/env sh
# Builds assets/audio/m6-v10.mp3 from the raw recording.
# Source: YouTube 1cBZ7SzsyX0 ("Bmw e63 m6 tunnel exhaust sound"), audio extracted with yt-dlp to WAV.
# Usage: sh process-v10.sh <ffmpeg> <source.wav> <out.mp3>
#
# Chain:
#  1. trim 0-13.5 s
#  2. clean-up: repair clipped peaks, remove clicks
#  3. wind: below ~200 Hz the source holds only wind/road rumble (no engine
#     harmonics), so a steep 24 dB/oct high-pass at 140 Hz
#  4. hiss: engine harmonics end near 4.5 kHz, so a 24 dB/oct low-pass at 8 kHz;
#     adaptive FFT denoiser (tracks the noise floor between the harmonics)
#  5. tone: engine body +3 dB at 220 Hz, less mud at 350 Hz, more rasp at 2.6 kHz,
#     light harmonic exciter
#  6. space: tunnel slap echo (no stereo widening: the source is already very
#     wide, widening more breaks phone speakers / mono)
#  7. gentle compression that keeps the rev build-up
#  8. two-pass linear loudness -12 LUFS / -1 dBTP, limiter, fades

FF="$1"
IN="$2"
OUT="$3"

CHAIN="atrim=0:13.5,asetpts=N/SR/TB,\
adeclip,adeclick,\
highpass=f=140:p=2,highpass=f=140:p=2,\
lowpass=f=8000:p=2,lowpass=f=8000:p=2,\
afftdn=nr=20:nf=-35:tn=1,\
equalizer=f=220:t=q:w=0.9:g=3,\
equalizer=f=350:t=q:w=1.1:g=-2.5,\
equalizer=f=2600:t=q:w=1:g=3,\
aexciter=amount=1:drive=5:freq=3000,\
aecho=in_gain=0.85:out_gain=0.9:delays=37|64|101|149:decays=0.26|0.19|0.13|0.08,\
acompressor=threshold=-14dB:ratio=2:attack=25:release=250:makeup=1"

# Pass 1: measure loudness after the chain.
M=$("$FF" -hide_banner -i "$IN" -af "$CHAIN,loudnorm=I=-12:TP=-1:LRA=11:print_format=summary" -f null - 2>&1)
MI=$(echo "$M" | awk '/Input Integrated/{print $3}')
MTP=$(echo "$M" | awk '/Input True Peak/{print $4}')
MLRA=$(echo "$M" | awk '/Input LRA/{print $3}')
MTH=$(echo "$M" | awk '/Input Threshold/{print $3}')
MOFF=$(echo "$M" | awk '/Target Offset/{print $3}')

# Pass 2: linear normalisation (no dynamic squashing), then fades.
"$FF" -v error -y -i "$IN" -af "$CHAIN,\
loudnorm=I=-12:TP=-1:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$MOFF:linear=true,\
alimiter=limit=0.89:attack=5:release=50:level=false,\
afade=t=in:d=0.25,afade=t=out:st=12:d=1.5" \
-ar 44100 -ac 2 -b:a 256k "$OUT"
