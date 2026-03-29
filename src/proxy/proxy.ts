import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";

/**
 * A JSON-RPC 2.0 message (request, response, or notification).
 */
export interface JsonRpcMessage {
	jsonrpc: "2.0";
	id?: string | number;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
}

export interface McpProxyEvents {
	"message:client": [message: JsonRpcMessage];
	"message:server": [message: JsonRpcMessage];
	error: [error: Error];
	close: [code: number | null];
}

/**
 * STDIO transport proxy between an MCP client and server.
 *
 * Spawns the MCP server as a child process, forwarding newline-delimited
 * JSON-RPC messages bidirectionally between the client (via provided
 * readable/writable streams) and the server (child process stdin/stdout).
 */
export class McpProxy extends EventEmitter<McpProxyEvents> {
	private child: ChildProcess | undefined;
	private clientReader: ReturnType<typeof createInterface> | undefined;
	private serverReader: ReturnType<typeof createInterface> | undefined;
	private readonly command: string;
	private readonly args: string[];

	constructor(command: string, args: string[] = []) {
		super();
		this.command = command;
		this.args = args;
	}

	/**
	 * Start the proxy: spawn the server and wire up STDIO forwarding.
	 *
	 * @param clientIn  Readable stream from the MCP client (defaults to process.stdin)
	 * @param clientOut Writable stream to the MCP client (defaults to process.stdout)
	 */
	start(
		clientIn: NodeJS.ReadableStream = process.stdin,
		clientOut: NodeJS.WritableStream = process.stdout,
	): void {
		if (this.child) {
			throw new Error("Proxy is already running");
		}

		this.child = spawn(this.command, this.args, {
			stdio: ["pipe", "pipe", "pipe"],
		});

		const serverIn = this.child.stdin;
		const serverOut = this.child.stdout;

		if (!serverIn || !serverOut) {
			throw new Error("Failed to open child process STDIO pipes");
		}

		// Client → Server: read from client, forward to server
		this.clientReader = createInterface({ input: clientIn });
		this.clientReader.on("line", (line) => {
			const message = tryParseJsonRpc(line);
			if (message) {
				this.emit("message:client", message);
			}
			serverIn.write(`${line}\n`);
		});

		// Server → Client: read from server, forward to client
		this.serverReader = createInterface({ input: serverOut });
		this.serverReader.on("line", (line) => {
			const message = tryParseJsonRpc(line);
			if (message) {
				this.emit("message:server", message);
			}
			clientOut.write(`${line}\n`);
		});

		// Error handling
		this.child.on("error", (err) => {
			this.emit("error", err);
		});

		this.child.stderr?.on("data", (data: Buffer) => {
			this.emit("error", new Error(`Server stderr: ${data.toString()}`));
		});

		this.child.on("close", (code) => {
			this.cleanup();
			this.emit("close", code);
		});
	}

	/**
	 * Stop the proxy by killing the child process.
	 */
	stop(): void {
		if (this.child) {
			const child = this.child;
			this.cleanup();
			child.kill();
		}
	}

	private cleanup(): void {
		this.clientReader?.close();
		this.serverReader?.close();
		this.clientReader = undefined;
		this.serverReader = undefined;
		this.child = undefined;
	}

	/**
	 * Whether the proxy is currently running.
	 */
	get running(): boolean {
		return this.child !== undefined;
	}
}

/**
 * Try to parse a line as a JSON-RPC message.
 * Returns undefined for non-JSON or non-JSON-RPC lines.
 */
function tryParseJsonRpc(line: string): JsonRpcMessage | undefined {
	try {
		const parsed: unknown = JSON.parse(line);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			(parsed as JsonRpcMessage).jsonrpc === "2.0"
		) {
			return parsed as JsonRpcMessage;
		}
	} catch {
		// Not valid JSON — skip silently
	}
	return undefined;
}
