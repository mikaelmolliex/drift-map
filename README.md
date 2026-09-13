# Drift Map

Drift Map is an accessible digital musical instrument built in Max/MSP. It explores personalized gesture-to-sound mapping through interactive machine learning: performers choose gestures and sounds that suit their own abilities, create examples, and train a FluCoMa model that drives a Grainflow granular synthesizer in real time.

This repository accompanies the research project **Personalized Gesture-to-Sound Mapping for Accessible Digital Musical Instruments: An Interactive Machine Learning Approach**.

> **Status:** research prototype / pre-release. The source project is available, but the public macOS standalone must still complete Developer ID signing, notarization, and clean-machine validation.

## Signal flow

```text
Camera, gamepad, mouse, MIDI, or OSC
                    ↓
        Gesture routing and calibration
                    ↓
     Personalized FluCoMa mapping model
                    ↓
        Grainflow granular synthesis
```

The bundled MediaPipe tracker processes camera frames locally and sends landmark data to Max over OSC. Camera images are not intentionally uploaded to a cloud service.

## Features

- Personalized gesture-to-sound mapping
- Guided and free interactive-learning workflows
- MediaPipe tracking for up to two hands
- Gamepad, mouse, MIDI, and OSC input
- Local gesture routing and calibration
- FluCoMa-based neural-network mapping
- Grainflow granular synthesis
- Included demonstration sounds and presets

## Supported platform

The currently tested configuration is:

- macOS 11 or later
- Apple Silicon (`arm64`) for the MediaPipe tracker and first standalone pre-release
- Max 9.1.2 for the editable Max project

The included FluCoMa helper externals and Grainflow externals are universal Intel/Apple Silicon binaries, but Intel operation of the complete project is not currently supported because the packaged tracker is Apple Silicon only.

## Downloading the standalone

The standalone will be published as a macOS Apple Silicon pre-release on the [GitHub Releases page](https://github.com/mikaelmolliex/drift-map/releases).

Once a signed and notarized build is available:

1. Download and unzip the macOS release asset.
2. Move `DriftMap.app` to `/Applications`.
3. Open the application and approve macOS camera access when requested.
4. Enable the camera control in Drift Map.
5. Allow approximately 20–30 seconds for the first tracker launch.

The initial standalone launcher expects this exact application name and location:

```text
/Applications/DriftMap.app
```

Max does not need to be installed to use the standalone.

## Running the editable Max project

### Requirements

- Max 9.1.2
- [FluCoMa for Max](https://github.com/flucoma/flucoma-max), including `fluid.mlpregressor~`
- [Grainflow](https://github.com/composingcap/grainflow) 2.1.2
- macOS 11 or later on Apple Silicon when using the included tracker

Install the complete FluCoMa and Grainflow packages through Max's Package Manager or from their official release sources before opening the project. The repository contains selected helper externals, but `fluid.mlpregressor~` is resolved from the installed FluCoMa package.

### Max Project mode — recommended for development

1. Clone or download the complete repository. Keep the entire `tracker/doublehand_mp/` directory intact.
2. Open `max/drift-map.0/drift-map.maxproj` in Max.
3. Select tracker launch mode **2 — Max Project** if it is not already selected.
4. Enable the camera control.

The project launcher resolves the tracker at:

```text
drift-map/
├── tracker/
│   └── doublehand_mp/
│       ├── doublehand_mp
│       └── _internal/
└── max/
    └── drift-map.0/
        ├── drift-map.maxproj
        ├── code/
        └── patchers/
```

Do not move `doublehand_mp` away from its `_internal/` directory.

### Patch-only development mode

Tracker launch mode **0 — Development** uses `run_mediapipe_maxmsp.js`. In this mode, the launcher expects:

```text
max/drift-map.0/dist/doublehand_mp/doublehand_mp
```

Copy the complete `doublehand_mp/` directory to that location before opening `drift-map.maxpat` without its Max Project. The repository itself is organized for the recommended Max Project mode, so this extra copy is not needed when mode 2 is used.

### Standalone build mode

Tracker launch mode **1 — Standalone** uses `run_mediapipe_standalone.js`. Before signing a compiled application, copy the complete tracker directory to:

```text
DriftMap.app/
└── Contents/
    └── Resources/
        └── tracker/
            └── doublehand_mp/
                ├── doublehand_mp
                └── _internal/
```

The tracker must be copied before the final application signature is created. Changing any executable or resource after signing invalidates that signature.

## MediaPipe and OSC

The packaged tracker is derived from the author's [GestureCap OSC](https://github.com/mikaelmolliex/gesturecap-osc) integration. It runs MediaPipe and OpenCV locally and sends hand landmarks to:

```text
127.0.0.1:11111
```

Primary OSC addresses:

```text
/hand/left
/hand/right
```

The Drift Map input panel also supports an alternative OSC pipeline on port `9000`. For the included GestureCap tracker, use port `11111`.

## Troubleshooting

### `Tracker exists: false` or `ENOENT`

Confirm that the complete executable exists at the path expected by the selected launch mode. For the standalone, both the application name and installation location must match `/Applications/DriftMap.app` exactly.

### The tracker opens but no landmarks appear

- Confirm that macOS granted camera access.
- Confirm that Drift Map is receiving GestureCap OSC on port `11111`.
- Wait up to 30 seconds on the first launch.
- Check the Max console for tracker or OSC messages.

### `fluid.mlpregressor~` cannot be found

Install the complete FluCoMa package and restart Max. The editable project does not include a local copy of this external.

### Grainflow objects cannot be found

Install Grainflow 2.1.2 through Max's Package Manager or its official repository, then restart Max.

### Gatekeeper blocks the standalone

Use the signed and notarized GitHub Release asset. Do not replace its signature with an ad-hoc signature. Development exports are not intended for public distribution.

## Repository layout

```text
drift-map/
├── max/drift-map.0/              Max project, patch, scripts, presets, and media
├── tracker/doublehand_mp/        Packaged local MediaPipe tracker
├── docs/                         Release and technical documentation
├── paper/                        Associated publication material
├── LICENSE                       Drift Map source-code license
└── THIRD_PARTY_NOTICES.md        Dependency and asset notices
```

## Audio and visual assets

The included factory audio examples were generated by the project author with Suno while subscribed to a paid plan and are provided as demonstration material for Drift Map.

Interface icons are derived from [Iconoir](https://iconoir.com/). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and asset notices. A complete third-party license inventory must accompany the signed standalone release.

## Credits

Concept, design, and development: **Mikaël Molliex**.

AI-assisted tools supported brainstorming, JavaScript completion, debugging, and documentation. All design decisions and final integration were carried out by the author.

With occasional guidance from Dominic Thibault, Université de Montréal.

## License

Drift Map source code is distributed under the [GNU General Public License v3.0](LICENSE). Third-party components and assets remain subject to their respective licenses and notices.

## Contact

[contact@mikaelmolliex.com](mailto:contact@mikaelmolliex.com)

Suggestions, accessibility feedback, and bug reports are welcome.
