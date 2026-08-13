# Drift Map (Max/MSP)

## Status

Research Prototype

## Associated Publication

This repository accompanies the paper:

**Personalized Gesture-to-Sound Mapping for Accessible Digital Musical Instruments: An Interactive Machine Learning Approach**

## Overview

Drift Map is an accessible digital musical instrument implemented in Max/MSP.

The project explores personalized gesture-to-sound mapping through interactive machine learning. Users can associate preferred sounds with gestures selected according to their own abilities and interests. A neural network trained with FluCoMa learns the resulting mapping and controls a granular synthesizer in real time.

The system supports multiple input modalities, including gamepads and MediaPipe-based gesture tracking, and proposes a two-tier interaction model intended to balance accessibility and expressive agency.

## Current Status

This repository currently contains an evolving research prototype.

Documentation and code organization are being progressively improved as development continues.

## Features

- Personalized gesture-to-sound mapping
- Interactive machine learning with FluCoMa
- Granular synthesis with Grainflow~
- Multi-modal input support
- Gamepad control
- MediaPipe gesture tracking
- MIDI and OSC connectivity
- Two-tier interaction model

## Requirements

- Max/MSP 9
- FluCoMa
- Grainflow~

## Dependencies

### FluCoMa
https://github.com/flucoma/flucoma-core

### Grainflow~
https://github.com/composingcap/grainflow


## Contact

contact@mikaelmolliex.com

Suggestions, feedback, and bug reports are welcome.

## License

GNU GPL v3