declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
}

// Stylesheets are bundled by Vite; importing one only applies it.
declare module "*.css";
