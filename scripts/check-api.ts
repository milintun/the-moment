import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
// TODO: import type { TheMomentWireHttp } from "../generated/wire.ts";

const address = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:3000";
// With --wait, keep trying for 60 seconds. That gives the containers time to start.
const deadline = Date.now() + (process.argv.includes("--wait") ? 60_000 : 0);
// TODO: const client = createHttpClient<TheMomentWireHttp>({ baseUrl: `${address}/api` });

while (true) {
  // TODO: call one cheap read endpoint, e.g. const result = await client.<group>.<endpoint>({});
  const result: { error?: string } = { error: "TODO" };
  if (!("error" in result)) {
    console.log(`The API at ${address} answered.`);
    break;
  }
  if (Date.now() > deadline) {
    console.error(`Could not reach the API at ${address}. The client says ${result.error}.`);
    process.exit(1);
  }
  await Bun.sleep(1000);
}
