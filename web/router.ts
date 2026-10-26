import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { ENTERED_KEY } from "./api.ts";
import Admin from "./pages/Admin.vue";
import Archive from "./pages/Archive.vue";
import ArchiveGallery from "./pages/ArchiveGallery.vue";
import ArchiveSeason from "./pages/ArchiveSeason.vue";
import Auth from "./pages/Auth.vue";
import Entrance from "./pages/Entrance.vue";
import FutureGalleries from "./pages/FutureGalleries.vue";
import Home from "./pages/Home.vue";
import Map from "./pages/Map.vue";
import PostPage from "./pages/PostPage.vue";
import View from "./pages/View.vue";

const entered = () => {
  try {
    return localStorage.getItem(ENTERED_KEY) === "yes";
  } catch {
    return false;
  }
};

// Exported so tests can mount pages on their own in-memory router.
export const routes: RouteRecordRaw[] = [
  // Opening the site after entering before goes straight to the map. Only the first page of
  // a visit skips it (that's when `from` matches nothing), so links to the entrance still work.
  { path: "/", component: Entrance, beforeEnter: (_to, from) => (from.matched.length === 0 && entered() ? "/map" : true) },
  { path: "/auth", component: Auth },
  { path: "/map", component: Map },
  { path: "/home", component: Home },
  { path: "/home/admin", component: Admin },
  { path: "/galleries/:id", component: View },
  { path: "/galleries/:id/post", component: PostPage },
  { path: "/nominations", component: FutureGalleries },
  { path: "/archive", component: Archive },
  { path: "/archive/:group", component: ArchiveGallery },
  { path: "/archive/:group/:season", component: ArchiveSeason },
  // Older addresses.
  { path: "/groups/:id", redirect: (to) => ({ path: `/galleries/${to.params.id}`, hash: to.hash }) },
  { path: "/groups/:id/post", redirect: (to) => `/galleries/${to.params.id}/post` },
  { path: "/login", redirect: "/auth" },
  { path: "/me", redirect: "/home" },
  { path: "/admin", redirect: "/home/admin" },
];

export const router = createRouter({ history: createWebHistory(), routes });
