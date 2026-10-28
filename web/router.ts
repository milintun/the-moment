import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import Admin from "./pages/Admin.vue";
import Archive from "./pages/Archive.vue";
import ArchiveGallery from "./pages/ArchiveGallery.vue";
import ArchiveSeason from "./pages/ArchiveSeason.vue";
import Auth from "./pages/Auth.vue";
import Entrance from "./pages/Entrance.vue";
import FutureGalleries from "./pages/FutureGalleries.vue";
import Home from "./pages/Home.vue";
import PostPage from "./pages/PostPage.vue";
import View from "./pages/View.vue";

// Exported so tests can mount pages on their own in-memory router.
export const routes: RouteRecordRaw[] = [
  { path: "/", component: Entrance },
  { path: "/auth", component: Auth },
  { path: "/home", component: Home },
  { path: "/home/admin/:section?", component: Admin }, // section: new (default), schedules, or people
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
