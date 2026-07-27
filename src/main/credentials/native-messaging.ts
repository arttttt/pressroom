/**
 * Chrome's native messaging framing, which is how anything talks to a native
 * application a browser would have launched: a little-endian unsigned 32-bit
 * length, then that many bytes of JSON.
 *
 * The length is in **bytes**, not characters. A message carrying anything
 * outside ASCII is longer on the wire than it looks, and getting that wrong
 * desynchronises the stream — every message after it is read from the middle
 * of the one before.
 */

export function frame(message: unknown): Buffer {
	const body = Buffer.from(JSON.stringify(message), "utf8");
	const length = Buffer.alloc(4);
	length.writeUInt32LE(body.byteLength, 0);
	return Buffer.concat([length, body]);
}

/**
 * Reassembles messages from a stream that knows nothing about them.
 *
 * A pipe delivers whatever it happens to have: half a message, three of them
 * at once, a length prefix split across two chunks. Everything that arrives is
 * kept until it is a whole message, and only whole messages come back out.
 */
export class Frames {
	#waiting = Buffer.alloc(0);

	/** Every complete message the new bytes finished off, in order. */
	push(chunk: Buffer): readonly unknown[] {
		this.#waiting = Buffer.concat([this.#waiting, chunk]);
		const done: unknown[] = [];
		for (;;) {
			if (this.#waiting.byteLength < 4) return done;
			const length = this.#waiting.readUInt32LE(0);
			if (this.#waiting.byteLength < 4 + length) return done;
			const body = this.#waiting.subarray(4, 4 + length).toString("utf8");
			this.#waiting = this.#waiting.subarray(4 + length);
			// A message that is not JSON is the other end being something else
			// entirely, and reading on from there is guesswork.
			done.push(JSON.parse(body));
		}
	}
}
