# Third-Party Notices

Drift Map source code is released under the GNU General Public License v3.0. Drift Map also uses and, in some distributions, embeds third-party software and assets. Those components remain governed by their respective licenses; the GPLv3 license for Drift Map does not replace their original copyright notices or license terms.

This document records the principal components identified in the project and the macOS standalone. The complete inventory of the libraries packaged with the hand tracker ships with the tracker itself (see below).

## Cycling '74 Max Runtime

- Project: [Max](https://cycling74.com/products/max)
- License: Cycling '74 proprietary runtime license
- Use in Drift Map: runtime included in the exported Max standalone

The Max runtime is redistributed with the Max-derived standalone under the redistribution terms of the Cycling '74 license agreement.

## FluCoMa

- Project: [Fluid Corpus Manipulation](https://github.com/flucoma/flucoma-max)
- License: BSD 3-Clause
- Use in Drift Map: interactive machine learning and buffer/list utilities
- Bundled helper external version metadata: 1.0.9

The editable project requires the complete FluCoMa Max package for `fluid.mlpregressor~`.

## Grainflow

- Project: [Grainflow](https://github.com/composingcap/grainflow)
- License: MIT
- Bundled external version: 2.1.2
- Use in Drift Map: granular synthesis, waveform display, and stereo panning

## GestureCap OSC hand tracker

- Project: [GestureCap OSC](https://github.com/mikaelmolliex/gesturecap-osc), by Mikaël Molliex
- Version used: [`v0.2.0`](https://github.com/mikaelmolliex/gesturecap-osc/releases/tag/v0.2.0) (commit `a72e451`)
- License: **GPL-3.0-or-later** (GestureCap OSC releases up to `v0.1.0` were MIT)
- Use in Drift Map:
  - the packaged tracker, from the release asset `gesturecap-tracker-macos-arm64.zip` (SHA-256 `d0d9259ad22536aa9385d57764ecb5d59ec493654a09852678c483a6b77b3663`), placed in `tracker/doublehand_mp/` (in the standalone: `Contents/Resources/tracker/doublehand_mp/`);
  - the launcher `max/drift-map.0/code/run_mediapipe.js` and the hand view `max/drift-map.0/code/mediapipe_handdraw.js`, copied unchanged from the same tag.

GestureCap OSC builds on earlier free software:

| Project | Authors | License |
| --- | --- | --- |
| [GestureCap](https://github.com/m2b3/gesturecap), Google Summer of Code 2024, INCF | Louis Martinez | GPL-3.0 |
| [GestureCap 2025](https://github.com/m2b3/gesturecap2025), Google Summer of Code 2025, INCF | Deepansh Goel; Shiv Patil (webcam input) | no license file published |

The packaged tracker carries its own `LICENSE`, `THIRD_PARTY_NOTICES.md` and `licenses/` folder (full license texts). Its principal components:

| Component | Version | License | Use |
| --- | --- | --- | --- |
| [Python](https://www.python.org/) | 3.10.12 | PSF-2.0 | embedded runtime |
| [PyInstaller](https://pyinstaller.org/) bootloader | 6.21.0 | GPL-2.0-or-later with the bootloader exception | starts the packaged program |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | 0.10.14 | Apache-2.0 | hand-landmark detection |
| Hand landmarker model | float16 | Apache-2.0 | the trained hand model |
| [OpenCV](https://opencv.org/), as [opencv-python-headless](https://github.com/opencv/opencv-python) | 4.13.0.92 | Apache-2.0 (OpenCV); MIT (packaging scripts) | camera capture and image processing |
| [FFmpeg](https://ffmpeg.org/), inside OpenCV | 7.1.1 | GPL-3.0-or-later as built | OpenCV's video back end |
| x264, x265, Rubber Band, vid.stab, libpostproc, inside OpenCV | bundled | GPL-2.0-or-later | FFmpeg dependencies |
| [NumPy](https://numpy.org/) | 2.2.6 | BSD-3-Clause | numerical arrays |
| [protobuf](https://github.com/protocolbuffers/protobuf) | 4.25.9 | BSD-3-Clause | MediaPipe data structures |
| [python-osc](https://github.com/attwad/python-osc) | 1.10.2 | Unlicense | sends the OSC messages to Max |

About 80 further libraries inside OpenCV (codecs, image formats, fonts, TLS and others) keep their own LGPL, BSD, MIT, Apache-2.0 or other licenses; they are listed in the tracker's `licenses/opencv/LICENSE-3RD-PARTY.txt`.

The FFmpeg build inside `opencv-python-headless` 4.13.0.92 records that it was configured with `--enable-gpl --enable-version3`, x264 and x265; it is therefore GPL-3.0-or-later, and so is the packaged tracker as a whole. GPL-3.0 is compatible with Drift Map's GPL-3.0.

Corresponding source:

- GestureCap OSC: its repository at tag [`v0.2.0`](https://github.com/mikaelmolliex/gesturecap-osc/tree/v0.2.0).
- FFmpeg 7.1.1: the source archive `ffmpeg-7.1.1.tar.xz` attached to the [GestureCap OSC v0.2.0 release](https://github.com/mikaelmolliex/gesturecap-osc/releases/tag/v0.2.0), also at [ffmpeg.org](https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz).
- OpenCV and its bundled libraries: [opencv-python 4.13.0.92](https://github.com/opencv/opencv-python/tree/92).
- Each other component: its official repository, at the version listed.

The previous Drift Map release (`v0.1.0-alpha.1`) shipped an earlier build of this tracker, with the dependency versions recorded in that release's notices.

## Iconoir

- Project: [Iconoir](https://iconoir.com/)
- License: MIT
- Use in Drift Map: interface icons

## Demonstration audio

The factory WAV files included with Drift Map were generated by Mikaël Molliex using Suno while subscribed to a paid plan. They are included as demonstration material. This provenance statement does not alter the licenses of the software components listed above.
