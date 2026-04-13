function parsePath(context) {
  const raw = context.params?.path;

  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (typeof raw === "string" && raw.length > 0) {
    return raw.split("/").filter(Boolean);
  }

  return [];
}

export async function onRequestGet(context) {
  if (!context.env.CHARACTER_IMAGES?.get) {
    return new Response("Character image bucket is not configured.", { status: 404 });
  }

  const path = parsePath(context);
  const requestedName = path[0];

  if (!requestedName) {
    return new Response("Not found.", { status: 404 });
  }

  const key = `characters/${requestedName}`;
  const object = await context.env.CHARACTER_IMAGES.get(key);

  if (!object) {
    return new Response("Not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=31536000, immutable");

  return new Response(object.body, {
    headers
  });
}
