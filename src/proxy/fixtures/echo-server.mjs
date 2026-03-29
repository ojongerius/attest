/**
 * Mock MCP server for testing: reads JSON-RPC requests from stdin,
 * replies with a result echoing the params.
 */
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
	try {
		const msg = JSON.parse(line);
		if (msg.method && msg.id !== undefined) {
			const response = {
				jsonrpc: "2.0",
				id: msg.id,
				result: { echo: msg.params },
			};
			process.stdout.write(`${JSON.stringify(response)}\n`);
		}
	} catch {
		// Ignore parse errors
	}
});
