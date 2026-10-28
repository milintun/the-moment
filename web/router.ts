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
  // `title` names the browser tab; pages about a particular gallery name it themselves once
  // they know it (see setTitle).
  { path: "/", component: Entrance },
  { path: "/auth", component: Auth, meta: { title: "log in" } },
  { path: "/home", component: Home, meta: { title: "home" } },
  { path: "/home/admin/:section?", component: Admin, meta: { title: "admin" } }, // section: new (default), schedules, or people
  { path: "/galleries/:id", component: View },
  { path: "/galleries/:id/post", component: PostPage, meta: { title: "post" } },
  { path: "/nominations", component: FutureGalleries, meta: { title: "future galleries" } },
  { path: "/archive", component: Archive, meta: { title: "archive" } },
  { path: "/archive/:group", component: ArchiveGallery, meta: { title: "archive" } },
  { path: "/archive/:group/:season", component: ArchiveSeason, meta: { title: "archive" } },
  // Older addresses.
  { path: "/groups/:id", redirect: (to) => ({ path: `/galleries/${to.params.id}`, hash: to.hash }) },
  { path: "/groups/:id/post", redirect: (to) => `/galleries/${to.params.id}/post` },
  { path: "/login", redirect: "/auth" },
  { path: "/me", redirect: "/home" },
  { path: "/admin", redirect: "/home/admin" },
];

export const router = createRouter({ history: createWebHistory(), routes });

/** Names the browser tab: "<page> · The Moment", or just "The Moment". */
export function setTitle(page?: string) {
  document.title = page ? `${page} · The Moment` : "The Moment";
}
