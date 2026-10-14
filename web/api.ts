import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import { ref } from "vue";
import type { TheMomentWireHttp } from "../generated/wire.ts";

export const client = createHttpClient<TheMomentWireHttp>({ baseUrl: "/api" });

export const ADMIN = "milin";
export const WING_MIN_PERIOD = 30 * 24 * 60 * 60 * 1000; // a cycle of 30 days or longer makes a wing

// The signed-in username, or null when signed out. Shared by every page.
export const me = ref<string | null>(null);

export async function refreshMe() {
  const result = await client.auth.current({});
  me.value = "error" in result ? null : result.username;
}
