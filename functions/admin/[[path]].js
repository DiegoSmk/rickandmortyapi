import { ensureAdminSession } from "../_lib/admin-auth";

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

export async function onRequest(context) {
  const auth = ensureAdminSession(context.request, context.env, "viewer");

  if (!auth.ok) {
    const title = auth.status === 401 ? "Authentication Required" : "Access Denied";
    const message = auth.status === 401
      ? "This admin area is protected by Cloudflare Access. Authenticate first."
      : "Your identity is authenticated, but it is not authorized for this admin area.";

    return html(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            body { margin: 0; font-family: Outfit, sans-serif; background: #081018; color: #ecf3ef; display: grid; min-height: 100vh; place-items: center; }
            main { max-width: 640px; padding: 32px; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; background: rgba(255,255,255,0.04); }
            h1 { margin: 0 0 12px; font-family: "Space Grotesk", sans-serif; }
            p { color: #b8c7c0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <main>
            <h1>${title}</h1>
            <p>${message}</p>
          </main>
        </body>
      </html>
    `, auth.status);
  }

  if (context.env.ASSETS?.fetch) {
    return context.env.ASSETS.fetch(context.request);
  }

  return html("Admin assets binding is missing.", 500);
}
