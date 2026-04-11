import { buildApp } from "./app";
import { loadEnv } from "./config/env";

async function start() {
  const env = loadEnv();
  const app = buildApp(env);

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
