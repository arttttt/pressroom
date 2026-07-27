import { describe, expect, it } from "vitest";
import { frame, Frames } from "./native-messaging.js";

describe("framing a message", () => {
	it("puts the length in front, in bytes and little-endian", () => {
		const framed = frame({ command: "bw-status" });
		const body = JSON.stringify({ command: "bw-status" });
		expect(framed.readUInt32LE(0)).toBe(Buffer.byteLength(body, "utf8"));
		expect(framed.subarray(4).toString("utf8")).toBe(body);
	});

	it("counts bytes rather than characters", () => {
		// The one that desynchronises the whole stream: a name in Cyrillic is
		// longer on the wire than it is on the screen, and everything after a
		// short count is read from the middle of the message before it.
		const framed = frame({ applicationName: "Пресс" });
		expect(framed.readUInt32LE(0)).toBe(framed.byteLength - 4);
		expect(framed.readUInt32LE(0)).toBeGreaterThan(JSON.stringify({ applicationName: "Пресс" }).length);
	});
});

describe("reading messages back out of a stream", () => {
	it("reads one that arrives whole", () => {
		expect(new Frames().push(frame({ a: 1 }))).toEqual([{ a: 1 }]);
	});

	it("waits for one that arrives in pieces", () => {
		const frames = new Frames();
		const whole = frame({ messageId: "x", payload: { status: true } });
		// Split inside the length prefix itself, the case a naive reader misses.
		expect(frames.push(whole.subarray(0, 2))).toEqual([]);
		expect(frames.push(whole.subarray(2, 9))).toEqual([]);
		expect(frames.push(whole.subarray(9))).toEqual([{ messageId: "x", payload: { status: true } }]);
	});

	it("reads several that arrive together, in order", () => {
		const frames = new Frames();
		const together = Buffer.concat([frame({ n: 1 }), frame({ n: 2 }), frame({ n: 3 })]);
		expect(frames.push(together)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
	});

	it("keeps the beginning of the next one for later", () => {
		const frames = new Frames();
		const first = frame({ n: 1 });
		const second = frame({ n: 2 });
		expect(frames.push(Buffer.concat([first, second.subarray(0, 3)]))).toEqual([{ n: 1 }]);
		expect(frames.push(second.subarray(3))).toEqual([{ n: 2 }]);
	});

	it("keeps a multi-byte character whole across a split", () => {
		const frames = new Frames();
		const whole = frame({ name: "Хабр" });
		const middle = Math.floor(whole.byteLength / 2);
		frames.push(whole.subarray(0, middle));
		expect(frames.push(whole.subarray(middle))).toEqual([{ name: "Хабр" }]);
	});

	it("says so when the other end is not speaking this at all", () => {
		expect(() => new Frames().push(frame("}not json{".slice(0)) )).not.toThrow();
		const bogus = Buffer.alloc(4 + 3);
		bogus.writeUInt32LE(3, 0);
		bogus.write("abc", 4);
		expect(() => new Frames().push(bogus)).toThrow();
	});
});
