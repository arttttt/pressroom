import type { Publication } from "../registry/registry.js";

export interface Metrics {
	readonly score: number;
	readonly comments: number;
	/** ISO instant the numbers were read. */
	readonly readAt: string;
}

/**
 * Reads engagement numbers for a publication.
 *
 * Only Hacker News and Reddit expose these without scraping. Habr and
 * HackerNoon show them on the page and in their own dashboards respectively;
 * neither is worth a fragile parser, so those stay unread rather than
 * unreliable.
 */
export interface MetricsSource {
	supports(publication: Publication): boolean;
	read(publication: Publication): Promise<Metrics>;
}
