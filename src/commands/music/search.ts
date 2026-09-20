/**
 * Credits: The OpenUwU Project
 * Owners: @priyanshu @prayag
 * Author:  @bre4d777 and @mooncarli
 * github.com/openUwU/
 */

import {
	ApplicationCommandOptionType,
	type ButtonInteraction,
	ComponentType,
	type InteractionCollector,
	type Message,
	MessageFlags,
} from "discord.js";
import { emoji } from "../../config/emoji.js";
import { Middleware } from "../../middlewares/index.js";
import type { CommandContext } from "../../structures/context/index.js";
import {
	defineCommand,
	type LavaSearchEntry,
	type LavaSearchResult,
	LavaSearchSource,
	type LavaSearchTrack,
	ManagerError,
	type MusicPlayer,
	type QueueTrack,
	SearchSource,
} from "../../types/index.js";
import {
	ActionRow,
	baseSection,
	defContainer,
	emojiSecondaryButton,
	errorContainer,
	primaryButton,
	Separator,
	secondaryButton,
	TextDisplay,
} from "../../utils/components.js";
import {
	filterShortTracks,
	formatDuration,
	formatMinDurationNotice,
} from "../../utils/duration.js";

const RESULTS_PER_PAGE = 5;

type ResultType = "track" | "album" | "artist" | "playlist";
type SearchItem = LavaSearchTrack | LavaSearchEntry;
type ResultMap = Record<ResultType, SearchItem[]>;

interface SearchState {
	results: ResultMap;
	type: ResultType;
	page: number;
	source: LavaSearchSource;
}

const SOURCE_ALIASES: Record<string, LavaSearchSource> = {
	dz: LavaSearchSource.Deezer,
	deezer: LavaSearchSource.Deezer,
	am: LavaSearchSource.AppleMusic,
	apple: LavaSearchSource.AppleMusic,
	applemusic: LavaSearchSource.AppleMusic,
};

const SOURCE_LABEL: Record<LavaSearchSource, string> = {
	[LavaSearchSource.Deezer]: "Deezer",
	[LavaSearchSource.AppleMusic]: "Apple Music",
};

const TYPE_LABEL: Record<ResultType, string> = {
	track: "Tracks",
	album: "Albums",
	artist: "Artists",
	playlist: "Playlists",
};

const RESULT_TYPES: ResultType[] = ["track", "album", "artist", "playlist"];

function isTrackItem(item: SearchItem): item is LavaSearchTrack {
	return "encoded" in item;
}

function buildResultMap(res: LavaSearchResult): ResultMap {
	return {
		track: [...res.tracks],
		album: [...res.albums],
		artist: [...res.artists],
		playlist: [...res.playlists],
	};
}

function truncate(text: string, length: number): string {
	if (!text) return "Unknown";
	return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function sanitizeLinkText(text: string, length: number): string {
	const cleaned = (text ?? "").replace(/[[\]()]/g, "").trim();
	return truncate(cleaned || "Unknown", length);
}

function pageCountOf(size: number): number {
	return Math.max(1, Math.ceil(size / RESULTS_PER_PAGE));
}

function formatTrack(track: LavaSearchTrack): string {
	const title = sanitizeLinkText(track.info.title, 55);
	const author = truncate(track.info.author || "Unknown", 35);
	const duration = track.info.isStream ? "Live" : formatDuration(track.info.length);
	return `**[${title}](${track.info.uri ?? "#"})**\n-# ${emoji.get("artist")} ${author}  \`●\`  ${emoji.get("duration_grey")} ${duration}`;
}

function formatEntry(entry: LavaSearchEntry, type: "album" | "artist" | "playlist"): string {
	const name = sanitizeLinkText(entry.name, 55);
	const url = entry.url ?? "#";
	if (type === "artist") return `**[${name}](${url})**\n-# Artist`;
	const author = truncate(entry.author || "Unknown", 35);
	const count = entry.totalTracks ?? 0;
	return `**[${name}](${url})**\n-# ${emoji.get("artist")} ${author}  \`●\`  ${count} track${count === 1 ? "" : "s"}`;
}

function formatItem(item: SearchItem, type: ResultType): string {
	if (type === "track" && isTrackItem(item)) return formatTrack(item);
	return formatEntry(item as LavaSearchEntry, type as "album" | "artist" | "playlist");
}

async function replyError(
	interaction: ButtonInteraction,
	title: string,
	description: string,
): Promise<void> {
	await interaction.editReply({
		components: [errorContainer(title, description)],
		flags: MessageFlags.IsComponentsV2,
	});
}

function otherSource(source: LavaSearchSource): LavaSearchSource {
	return source === LavaSearchSource.Deezer ? LavaSearchSource.AppleMusic : LavaSearchSource.Deezer;
}

function buildNavRow(
	source: LavaSearchSource,
	page: number,
	pageCount: number,
	allDisabled: boolean,
) {
	const target = otherSource(source);
	const row = ActionRow();
	row.addComponents(
		emojiSecondaryButton("search_prev", emoji.get("left"), allDisabled || page === 0),
		emojiSecondaryButton("search_next", emoji.get("right"), allDisabled || page >= pageCount - 1),
		secondaryButton(`Switch to ${SOURCE_LABEL[target]}`, `search_source_${target}`, allDisabled),
	);
	return row;
}

function buildTypeRow(results: ResultMap, activeType: ResultType, allDisabled: boolean) {
	const typeRow = ActionRow();
	for (const t of RESULT_TYPES) {
		const has = results[t].length > 0;
		typeRow.addComponents(
			t === activeType
				? primaryButton(TYPE_LABEL[t], `search_type_${t}`, allDisabled || !has)
				: secondaryButton(TYPE_LABEL[t], `search_type_${t}`, allDisabled || !has),
		);
	}
	return typeRow;
}

function buildResultsContainer(state: SearchState, allDisabled = false) {
	const { results, source, type, page } = state;
	const container = defContainer();
	container.addTextDisplayComponents(TextDisplay("## Search Results"));
	container.addSeparatorComponents(Separator(true));
	container.addActionRowComponents(buildTypeRow(results, type, allDisabled));
	container.addSeparatorComponents(Separator());

	const items = results[type];
	if (items.length === 0) {
		container.addTextDisplayComponents(TextDisplay(`No ${TYPE_LABEL[type].toLowerCase()} found`));
		container.addSeparatorComponents(Separator());
		container.addActionRowComponents(buildNavRow(source, 0, 1, allDisabled));
		return container;
	}

	const pageCount = pageCountOf(items.length);
	const start = page * RESULTS_PER_PAGE;
	const end = Math.min(start + RESULTS_PER_PAGE, items.length);

	for (let i = start; i < end; i++) {
		const item = items[i];
		if (!item) continue;
		container.addSectionComponents(
			baseSection()
				.addTextDisplayComponents(TextDisplay(formatItem(item, type)))
				.setButtonAccessory(secondaryButton("Add", `search_add_${type}_${i}`, allDisabled)),
		);
	}

	container.addSeparatorComponents(Separator());
	container.addActionRowComponents(buildNavRow(source, page, pageCount, allDisabled));
	container.addTextDisplayComponents(
		TextDisplay(
			`-# ${SOURCE_LABEL[source]}${emoji.get("blank")}Page ${page + 1}/${pageCount}${emoji.get("blank")}${items.length} ${TYPE_LABEL[type].toLowerCase()}`,
		),
	);
	return container;
}

async function handleUnauthorized(interaction: ButtonInteraction) {
	await interaction.reply({
		components: [errorContainer("Not Authorized", "You are not authorized to do this.")],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
	});
}

type Resolution = { tracks: QueueTrack[]; label: string } | { error: string };

function buildRequester(ctx: CommandContext) {
	return { id: ctx.user.id, username: ctx.user.username, displayName: ctx.user.displayName };
}

function resolveTrackItem(ctx: CommandContext, item: LavaSearchTrack): Resolution {
	const requester = buildRequester(ctx);
	return {
		tracks: [
			{
				encoded: item.encoded,
				info: item.info,
				pluginInfo: item.pluginInfo,
				requester,
				addedAt: Date.now(),
			},
		],
		label: item.info.title,
	};
}

async function resolveEntryItem(ctx: CommandContext, entry: LavaSearchEntry): Promise<Resolution> {
	if (!entry.url) return { error: "Cannot load this item." };

	try {
		const result = await ctx.client.music.search(entry.url, SearchSource.Direct);
		if (result.type === "empty" || result.type === "error") {
			return { error: "Could not load this item." };
		}
		const requester = buildRequester(ctx);
		const now = Date.now();
		const tracks = result.tracks.map((t) => ({ ...t, requester, addedAt: now }));
		return { tracks, label: entry.name };
	} catch (err) {
		const reason = err instanceof ManagerError ? err.message : "Could not reach the search node.";
		return { error: reason };
	}
}

async function resolveTracksForItem(
	ctx: CommandContext,
	type: ResultType,
	item: SearchItem,
): Promise<Resolution> {
	if (type === "track" && isTrackItem(item)) return resolveTrackItem(ctx, item);
	return resolveEntryItem(ctx, item as LavaSearchEntry);
}

async function queueTracks(
	interaction: ButtonInteraction,
	player: MusicPlayer,
	tracks: QueueTrack[],
): Promise<boolean> {
	try {
		player.add(tracks);
	} catch {
		await replyError(interaction, "Queue Full", "Could not add these tracks to the queue.");
		return false;
	}

	if (player.currentTrack !== null) return true;

	try {
		await player.play();
		return true;
	} catch {
		await replyError(interaction, "Playback Failed", "Could not start playback.");
		return false;
	}
}

function summaryFor(tracks: QueueTrack[], label: string, removed = 0): string {
	const notice = formatMinDurationNotice(removed);
	const first = tracks[0];
	const base =
		tracks.length === 1 && first
			? `**[${first.info.title}](${first.info.uri})**\n-# ${first.info.author || "Unknown"}`
			: `**${label}**\n-# ${tracks.length} tracks added`;
	return notice ? `${base}\n${notice}` : base;
}

async function addItemToQueue(
	ctx: CommandContext,
	player: MusicPlayer,
	interaction: ButtonInteraction,
	type: ResultType,
	item: SearchItem,
): Promise<void> {
	const resolved = await resolveTracksForItem(ctx, type, item);
	if ("error" in resolved) {
		await replyError(interaction, "Load Failed", resolved.error);
		return;
	}

	const { tracks: candidateTracks, label } = resolved;
	if (!candidateTracks.length) {
		await replyError(interaction, "Load Failed", "No playable tracks were found.");
		return;
	}

	const { kept: tracks, removed } = filterShortTracks(candidateTracks);
	if (!tracks.length) {
		await replyError(
			interaction,
			"Track Too Short",
			"Every matching track is under 45 seconds or a live stream.",
		);
		return;
	}

	if (!(await queueTracks(interaction, player, tracks))) return;

	await interaction.editReply({
		components: [
			defContainer().addTextDisplayComponents(TextDisplay(summaryFor(tracks, label, removed))),
		],
		flags: MessageFlags.IsComponentsV2,
	});
}

async function handleTypeChange(interaction: ButtonInteraction, state: SearchState, id: string) {
	state.type = id.replace("search_type_", "") as ResultType;
	state.page = 0;
	await interaction.update({
		components: [buildResultsContainer(state)],
		flags: MessageFlags.IsComponentsV2,
	});
}

async function handlePageNav(interaction: ButtonInteraction, state: SearchState, id: string) {
	const pageCount = pageCountOf(state.results[state.type].length);
	state.page =
		id === "search_next" ? Math.min(pageCount - 1, state.page + 1) : Math.max(0, state.page - 1);
	await interaction.update({
		components: [buildResultsContainer(state)],
		flags: MessageFlags.IsComponentsV2,
	});
}

async function handleSourceChange(
	ctx: CommandContext,
	player: MusicPlayer,
	message: Message,
	collector: InteractionCollector<ButtonInteraction>,
	state: SearchState,
	id: string,
	query: string,
): Promise<void> {
	const newSource = id.replace("search_source_", "") as LavaSearchSource;
	if (newSource === state.source) return;

	collector.stop("source_switch");
	await runSearch(ctx, player, message, newSource, query);
}

async function handleAddClick(
	ctx: CommandContext,
	player: MusicPlayer,
	interaction: ButtonInteraction,
	state: SearchState,
	id: string,
): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const parts = id.split("_");
	const itemType = parts[2] as ResultType;
	const index = Number.parseInt(parts[3] ?? "", 10);
	const item = state.results[itemType]?.[index];
	if (!item) {
		await replyError(interaction, "Unavailable", "This item is no longer available.");
		return;
	}
	await addItemToQueue(ctx, player, interaction, itemType, item);
}

function attachCollector(
	ctx: CommandContext,
	player: MusicPlayer,
	message: Message,
	state: SearchState,
	query: string,
): void {
	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 300_000,
	});

	collector.on("collect", async (interaction) => {
		if (interaction.user.id !== ctx.member.id) return handleUnauthorized(interaction);

		const id = interaction.customId;
		if (id.startsWith("search_type_")) return handleTypeChange(interaction, state, id);
		if (id === "search_prev" || id === "search_next") return handlePageNav(interaction, state, id);
		if (id.startsWith("search_source_")) {
			return handleSourceChange(ctx, player, message, collector, state, id, query);
		}
		if (id.startsWith("search_add_")) return handleAddClick(ctx, player, interaction, state, id);
	});

	collector.on("end", (_collected, reason) => {
		if (reason === "source_switch") return;
		message
			.edit({
				components: [buildResultsContainer(state, true)],
				flags: MessageFlags.IsComponentsV2,
			})
			.catch(() => {
				// empty because errors are intentionally ignored
			});
	});
}

async function runSearch(
	ctx: CommandContext,
	player: MusicPlayer,
	message: Message,
	source: LavaSearchSource,
	query: string,
): Promise<void> {
	let results: ResultMap;
	try {
		results = buildResultMap(await ctx.client.music.lavaSearch(query, source));
	} catch (err) {
		const reason =
			err instanceof ManagerError ? err.message : "Could not reach the search node. Try again.";
		await message.edit({
			components: [errorContainer("Search Failed", reason)],
			flags: MessageFlags.IsComponentsV2,
		});
		return;
	}

	const hasResults = RESULT_TYPES.some((t) => results[t].length > 0);
	if (!hasResults) {
		await message.edit({
			components: [errorContainer("No Results", `Nothing found for **${truncate(query, 80)}**.`)],
			flags: MessageFlags.IsComponentsV2,
		});
		return;
	}

	const state: SearchState = {
		results,
		source,
		type: RESULT_TYPES.find((t) => results[t].length > 0) ?? "track",
		page: 0,
	};

	await message.edit({
		components: [buildResultsContainer(state)],
		flags: MessageFlags.IsComponentsV2,
	});

	attachCollector(ctx, player, message, state, query);
}

function parseQueryAndSource(ctx: CommandContext): { query: string; source: LavaSearchSource } {
	if (ctx.isSlash()) {
		const query = ctx.options.getString("query", true);
		const source = (ctx.options.getString("source") as LavaSearchSource) || LavaSearchSource.Deezer;
		return { query, source };
	}

	const args = ctx.args;
	const mapped = SOURCE_ALIASES[args[0]?.toLowerCase() ?? ""];
	if (mapped) return { query: args.slice(1).join(" "), source: mapped };
	return { query: args.join(" "), source: LavaSearchSource.Deezer };
}

async function resolvePlayerForSearch(
	ctx: CommandContext,
	voiceChannelId: string,
	message: Message,
): Promise<MusicPlayer | null> {
	const existing = ctx.client.music.getPlayer(ctx.guild.id);
	if (existing) return existing;

	try {
		return await ctx.client.music.createPlayer({
			guildId: ctx.guild.id,
			voiceChannelId,
			textChannelId: ctx.channel.id,
			deaf: true,
		});
	} catch {
		await message.edit({
			components: [errorContainer("Connection Failed", "Could not join your voice channel.")],
			flags: MessageFlags.IsComponentsV2,
		});
		return null;
	}
}

export default defineCommand({
	name: "search",
	aliases: ["find"],
	description: "Search for music on Deezer or Apple Music",
	usage: "search <query>",
	slashUsage: "search <query> [source]",
	category: "music",
	enabledSlash: true,
	slashData: {
		name: "search",
		description: "Search for music on Deezer or Apple Music",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "query",
				description: "Search query",
				required: true,
				autocomplete: false,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "source",
				description: "Search source",
				required: false,
				choices: [
					{ name: "Deezer", value: LavaSearchSource.Deezer },
					{ name: "Apple Music", value: LavaSearchSource.AppleMusic },
				],
			},
		],
	},
	middleware: [
		Middleware.Cooldown(15),
		Middleware.GuildOnly(),
		Middleware.VoiceRequired(),
		Middleware.SameVoiceChannel(),
	],
	async execute(ctx) {
		const { query, source } = parseQueryAndSource(ctx);

		if (!query?.trim()) {
			await ctx.reply({
				components: [errorContainer("Missing Query", "Provide a search query.")],
				flags: MessageFlags.IsComponentsV2,
			});
			return;
		}

		if (/^https?:\/\//i.test(query)) {
			await ctx.reply({
				components: [errorContainer("Links Not Allowed", "Use `/play` to play a link directly.")],
				flags: MessageFlags.IsComponentsV2,
			});
			return;
		}

		const voiceChannelId = ctx.member?.voice?.channel?.id;
		if (!voiceChannelId) {
			await ctx.reply({
				components: [errorContainer("No Voice Channel", "Join a voice channel first.")],
				flags: MessageFlags.IsComponentsV2,
			});
			return;
		}

		const message = await ctx.reply({
			components: [
				defContainer().addTextDisplayComponents(
					TextDisplay(`Searching ${SOURCE_LABEL[source]}...`),
				),
			],
			flags: MessageFlags.IsComponentsV2,
		});

		const player = await resolvePlayerForSearch(ctx, voiceChannelId, message);
		if (!player) return;

		await runSearch(ctx, player, message, source, query);
	},
});
