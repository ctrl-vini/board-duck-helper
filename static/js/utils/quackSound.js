// A quack made with the Web Audio API, so the page needs no sound file and works offline.

const QUACK_DURATION_S = 0.32;
// The band-pass filter removes most of the tone's energy, so the gain makes up for it.
const QUACK_VOLUME = 1.4;
// A buzzy tone that slides down, shaped by a band-pass filter that also slides, sounds nasal.
const TONE_START_HZ = 330;
const TONE_END_HZ = 220;
const FORMANT_START_HZ = 1500;
const FORMANT_END_HZ = 700;
const FORMANT_SHARPNESS = 5;
const ATTACK_S = 0.015;
const SILENCE = 0.0001;

let context = null;

/** Play one quack; browsers without the Web Audio API stay silent. */
export function playQuack() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }
  context ??= new AudioContextClass();
  // A context created before the student interacted with the page starts suspended.
  context.resume();

  const start = context.currentTime;
  const end = start + QUACK_DURATION_S;

  const tone = context.createOscillator();
  tone.type = "sawtooth";
  tone.frequency.setValueAtTime(TONE_START_HZ, start);
  tone.frequency.exponentialRampToValueAtTime(TONE_END_HZ, end);

  const formant = context.createBiquadFilter();
  formant.type = "bandpass";
  formant.Q.value = FORMANT_SHARPNESS;
  formant.frequency.setValueAtTime(FORMANT_START_HZ, start);
  formant.frequency.exponentialRampToValueAtTime(FORMANT_END_HZ, end);

  const volume = context.createGain();
  volume.gain.setValueAtTime(SILENCE, start);
  volume.gain.exponentialRampToValueAtTime(QUACK_VOLUME, start + ATTACK_S);
  volume.gain.exponentialRampToValueAtTime(SILENCE, end);

  tone.connect(formant).connect(volume).connect(context.destination);
  tone.start(start);
  tone.stop(end);
}
