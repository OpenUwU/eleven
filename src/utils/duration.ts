/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

const MIN_TRACK_DURATION_MS = 45_000;

interface DurationLike {
	info: {
		length: number;
		isStream?: boolean;
	};
}

export function meetsMinDuration(track: DurationLike): boolean {
	if (track.info.isStream) return false;
	return track.info.length >= MIN_TRACK_DURATION_MS;
}

export interface FilterResult<T> {
	kept: T[];
	removed: number;
}

export function filterShortTracks<T extends DurationLike>(tracks: T[]): FilterResult<T> {
	const kept = tracks.filter(meetsMinDuration);
	return { kept, removed: tracks.length - kept.length };
}

export function formatMinDurationNotice(removed: number): string | null {
	if (removed <= 0) return null;
	return `-# ${removed} track${removed === 1 ? "" : "s"} skipped (under 45s or a live stream)`;
}

export function formatDuration(ms: number): string {
	if (!ms || ms < 0) return "Live";
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export { MIN_TRACK_DURATION_MS };
