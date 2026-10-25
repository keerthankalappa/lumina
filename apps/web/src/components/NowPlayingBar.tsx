import { formatTime, useAudio } from "../audio/AudioProvider";
import { Icon } from "./ui";

export function NowPlayingBar() {
  const { track, status, index, elapsed, total, toggle, skip, stop, setPlayerOpen } = useAudio();
  if (!track) return null;
  const playing = status === "playing";

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-3">
      <div className="sheet mx-auto flex max-w-[1040px] animate-rise items-center gap-3 rounded-full py-2 pl-3 pr-3 sm:gap-4 sm:pr-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container/60 text-secondary ${playing ? "animate-pulse" : ""}`}>
          <Icon name="radio_button_checked" fill />
        </span>
        <button type="button" onClick={() => setPlayerOpen(true)} className="min-w-0 flex-1 text-left">
          <p className="eyebrow truncate text-secondary">
            {playing ? "Now playing" : status === "paused" ? "Paused" : "Session complete"} • Card {index + 1} of {track.lines.length}
          </p>
          <p className="truncate text-label-lg text-on-surface">{track.title}</p>
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous card" onClick={() => skip(-1)} disabled={index === 0} className="hidden rounded-full p-2 hover:bg-surface-container-low sm:block">
            <Icon name="skip_previous" />
          </button>
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white shadow-sage">
            <Icon name={playing ? "pause" : "play_arrow"} fill />
          </button>
          <button type="button" aria-label="Next card" onClick={() => skip(1)} disabled={index >= track.lines.length - 1} className="hidden rounded-full p-2 hover:bg-surface-container-low sm:block">
            <Icon name="skip_next" />
          </button>
        </div>
        <span className="hidden text-label-sm tabular-nums text-on-surface-variant md:block">
          {formatTime(elapsed)} / {formatTime(total)}
        </span>
        <button type="button" onClick={() => setPlayerOpen(true)} className="hidden items-center gap-1.5 rounded-full bg-secondary-container/50 px-3.5 py-2 text-label-md text-on-secondary-container hover:bg-secondary-container md:flex">
          <Icon name="open_in_full" size={16} /> Expand Player
        </button>
        <button type="button" aria-label="Close player" onClick={stop} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low">
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
