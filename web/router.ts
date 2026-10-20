import { createRouter, createWebHistory } from "vue-router";
import Admin from "./pages/Admin.vue";
import Browse from "./pages/Browse.vue";
import CreatePost from "./pages/CreatePost.vue";
import Feed from "./pages/Feed.vue";
import Category from "./pages/Category.vue";
import Login from "./pages/Login.vue";
import Nominations from "./pages/Nominations.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Browse },
    { path: "/login", component: Login },
    { path: "/groups/:id", component: Feed },
    { path: "/groups/:id/post", component: CreatePost },
    { path: "/nominations", component: Nominations },
    { path: "/nominations/:id", component: Category },
    { path: "/admin", component: Admin },
  ],
});
