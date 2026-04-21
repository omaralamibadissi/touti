"""
Génère 8 effets sonores procéduraux pour Touti.
Sortie : WAV 16-bit mono 44.1 kHz dans mobile/assets/sounds/
"""
import numpy as np
from scipy.io.wavfile import write
import os

SR = 44100  # sample rate
DIR = "/Users/oab/Desktop/touti-game/mobile/assets/sounds"


def t_array(duration):
    return np.linspace(0, duration, int(SR * duration), endpoint=False)


def sine(freq, duration, amplitude=0.5):
    t = t_array(duration)
    return amplitude * np.sin(2 * np.pi * freq * t)


def envelope(signal, attack=0.01, release=0.05):
    """Applique un enveloppe ADSR simple."""
    n = len(signal)
    atk = int(attack * SR)
    rel = int(release * SR)
    env = np.ones(n)
    if atk > 0:
        env[:atk] = np.linspace(0, 1, atk)
    if rel > 0 and rel < n:
        env[-rel:] = np.linspace(1, 0, rel)
    return signal * env


def save(name, signal):
    # Normalise et convertit en int16
    signal = signal / (np.max(np.abs(signal)) + 1e-9) * 0.8
    signal = (signal * 32767).astype(np.int16)
    path = os.path.join(DIR, name)
    write(path, SR, signal)
    print(f"  {name} ({len(signal)/SR:.2f}s, {os.path.getsize(path)//1024} KB)")


# 1. DEAL — woosh rapide (bruit blanc filtré, descendant)
def snd_deal():
    duration = 0.25
    noise = np.random.uniform(-1, 1, int(SR * duration))
    # Filtre passe-bas descendant (simulé via moyenne mobile qui grandit)
    window = np.linspace(4, 30, len(noise)).astype(int)
    out = np.zeros_like(noise)
    cumsum = np.cumsum(noise)
    for i in range(len(noise)):
        w = window[i]
        if i >= w:
            out[i] = (cumsum[i] - cumsum[i - w]) / w
    return envelope(out * 0.6, attack=0.02, release=0.15)


# 2. CARD-PLAY — tap sec (burst très court)
def snd_card_play():
    duration = 0.06
    t = t_array(duration)
    # Un "snap" avec fondamentale qui descend vite
    pitch = 800 * np.exp(-t * 30)
    signal = np.sin(2 * np.pi * pitch * t) * np.exp(-t * 25)
    return envelope(signal * 0.6, attack=0.001, release=0.03)


# 3. TRICK-WIN — petit arpège montant C-E-G
def snd_trick_win():
    notes = [523.25, 659.25, 783.99]  # C5, E5, G5
    out = np.zeros(0)
    for i, f in enumerate(notes):
        dur = 0.12 if i < len(notes) - 1 else 0.3
        s = sine(f, dur, 0.4) + sine(f * 2, dur, 0.15)
        s = envelope(s, 0.005, 0.1 if i < len(notes) - 1 else 0.25)
        out = np.concatenate([out, s])
    return out


# 4. ROUND-END — accord majeur triomphal plus long
def snd_round_end():
    duration = 0.8
    t = t_array(duration)
    # C E G triade simultanée
    signal = (
        np.sin(2 * np.pi * 523.25 * t) * 0.3 +
        np.sin(2 * np.pi * 659.25 * t) * 0.25 +
        np.sin(2 * np.pi * 783.99 * t) * 0.25 +
        np.sin(2 * np.pi * 1046.50 * t) * 0.15  # C6 harmonique
    )
    # Vibrato léger
    vibrato = 1 + 0.02 * np.sin(2 * np.pi * 5 * t)
    signal = signal * vibrato
    return envelope(signal, 0.02, 0.35)


# 5. GAME-WIN — arpège triomphant ascendant + final
def snd_game_win():
    notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]  # C5 E5 G5 C6 E6
    out = np.zeros(0)
    for i, f in enumerate(notes):
        dur = 0.12 if i < len(notes) - 1 else 0.5
        s = sine(f, dur, 0.35) + sine(f * 2, dur, 0.15) + sine(f * 0.5, dur, 0.1)
        s = envelope(s, 0.005, 0.08 if i < len(notes) - 1 else 0.4)
        out = np.concatenate([out, s])
    return out


# 6. GAME-LOSE — descente en mineur
def snd_game_lose():
    notes = [523.25, 466.16, 392.00, 329.63]  # C5 Bb4 G4 E4 (descending)
    out = np.zeros(0)
    for i, f in enumerate(notes):
        dur = 0.15 if i < len(notes) - 1 else 0.5
        s = sine(f, dur, 0.4)
        s = envelope(s, 0.01, 0.1 if i < len(notes) - 1 else 0.4)
        out = np.concatenate([out, s])
    return out


# 7. BID — pop doux
def snd_bid():
    duration = 0.12
    t = t_array(duration)
    pitch = 600 + 200 * np.exp(-t * 15)
    signal = np.sin(2 * np.pi * pitch * t) * 0.4
    return envelope(signal, 0.005, 0.08)


# 8. TAP-ILLEGAL — buzz dissonant court
def snd_tap_illegal():
    duration = 0.18
    t = t_array(duration)
    # Deux fréquences proches pour créer du battement désagréable
    signal = (
        np.sin(2 * np.pi * 220 * t) +
        np.sin(2 * np.pi * 235 * t)
    ) * 0.3
    # Modulation en "tremolo"
    tremolo = 1 + 0.6 * np.sin(2 * np.pi * 25 * t)
    signal = signal * tremolo
    return envelope(signal, 0.005, 0.06)


os.makedirs(DIR, exist_ok=True)
print(f"Génération dans {DIR} :")

# Supprime les anciens fichiers de sons (pas le README)
for f in os.listdir(DIR):
    if f.endswith((".wav", ".mp3")):
        os.remove(os.path.join(DIR, f))

save("deal.wav", snd_deal())
save("card-play.wav", snd_card_play())
save("trick-win.wav", snd_trick_win())
save("round-end.wav", snd_round_end())
save("game-win.wav", snd_game_win())
save("game-lose.wav", snd_game_lose())
save("bid.wav", snd_bid())
save("tap-illegal.wav", snd_tap_illegal())

print("\nDone.")
total = sum(os.path.getsize(os.path.join(DIR, f)) for f in os.listdir(DIR) if f.endswith(".wav"))
print(f"Total: {total // 1024} KB")
