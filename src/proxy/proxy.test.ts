import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readLine } from "../test-utils/streams.js";
import type { JsonRpcMessage } from "./proxy.js";
import { McpProxy } from "./proxy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ECHO_SERVER = join(__dirname, "fixtures", "echo-server.mjs");

describe("McpProxy", () => {
	let proxy: McpProxy;

	afterEach(() => {
		proxy?.stop();
	});

	it("forwards a request to the server and returns the response", async () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();

		proxy.start(clientIn, clientOut);

		const request: JsonRpcMessage = {
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name: "read_file", arguments: { path: "/tmp/test" } },
		};

		clientIn.write(`${JSON.stringify(request)}\n`);

		const response = await readLine(clientOut);
		const parsed = JSON.parse(response);

		expect(parsed.jsonrpc).toBe("2.0");
		expect(parsed.id).toBe(1);
		expect(parsed.result.echo).toEqual(request.params);
	});

	it("emits message:client event for client messages", async () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();

		const messages: JsonRpcMessage[] = [];
		proxy.on("message:client", (msg) => messages.push(msg));
		proxy.start(clientIn, clientOut);

		const request: JsonRpcMessage = {
			jsonrpc: "2.0",
			id: 1,
			method: "test/method",
			params: {},
		};

		clientIn.write(`${JSON.stringify(request)}\n`);

		// Wait for processing
		await new Promise((r) => setTimeout(r, 50));

		expect(messages).toHaveLength(1);
		expect(messages[0]?.method).toBe("test/method");
	});

	it("emits message:server event for server responses", async () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();

		const messages: JsonRpcMessage[] = [];
		proxy.on("message:server", (msg) => messages.push(msg));
		proxy.start(clientIn, clientOut);

		clientIn.write(
			`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "test", params: {} })}\n`,
		);

		await readLine(clientOut);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.id).toBe(1);
		expect(messages[0]?.result).toBeDefined();
	});

	it("emits close event when server exits", async () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();

		proxy.start(clientIn, clientOut);

		const closePromise = new Promise<number | null>((resolve) => {
			proxy.on("close", (code) => resolve(code));
		});

		proxy.stop();
		const code = await closePromise;

		expect(typeof code === "number" || code === null).toBe(true);
	});

	it("reports running state", () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		expect(proxy.running).toBe(false);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();
		proxy.start(clientIn, clientOut);

		expect(proxy.running).toBe(true);

		proxy.stop();

		expect(proxy.running).toBe(false);
	});

	it("throws if started twice", () => {
		proxy = new McpProxy("node", [ECHO_SERVER]);

		const clientIn = new PassThrough();
		const clientOut = new PassThrough();
		proxy.start(clientIn, clientOut);

		expect(() => proxy.start(clientIn, clientOut)).toThrow("already running");
	});
});
