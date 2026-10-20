import { createRouter, createWebHistory } from "vue-router";
import Admin from "./pages/Admin.vue";
import Browse from "./pages/Browse.vue";
import CreatePost from "./pages/CreatePost.vue";
import Feed from "./pages/Feed.vue";
import Login from "./pages/Login.vue";
import MyPosts from "./pages/MyPosts.vue";
import Archive from "./pages/Archive.vue";
import ArchiveSeason from "./pages/ArchiveSeason.vue";
import FutureGalleries from "./pages/FutureGalleries.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Browse },
    { path: "/login", component: Login },
    { path: "/groups/:id", component: Feed },
    { path: "/groups/:id/post", component: CreatePost },
    { path: "/nominations", component: FutureGalleries },
    { path: "/archive", component: Archive },
    { path: "/archive/:group/:season", component: ArchiveSeason },
    { path: "/me", component: MyPosts },
    { path: "/admin", component: Admin },
  ],
});
