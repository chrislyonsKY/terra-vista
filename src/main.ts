import { ThreeApp } from "@/ThreeApp";
import { GridModule } from "@/modules/GridModule";
import { LightingModule } from "@/modules/LightingModule";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app container element");
}

const app = new ThreeApp(container);
app.addModule(new LightingModule());
app.addModule(new GridModule());
app.start();
