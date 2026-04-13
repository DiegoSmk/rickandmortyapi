function splitList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminSession(request, env) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email")?.trim().toLowerCase() || "";
  const admins = new Set(splitList(env.ADMIN_EMAILS));
  const editors = new Set(splitList(env.ADMIN_EDITOR_EMAILS));
  const viewers = new Set(splitList(env.ADMIN_VIEWER_EMAILS));

  let role = null;

  if (admins.has(email)) {
    role = "admin";
  } else if (editors.has(email)) {
    role = "editor";
  } else if (viewers.has(email)) {
    role = "viewer";
  }

  return {
    accessAuthenticated: Boolean(email),
    email,
    role,
    allowed: Boolean(role)
  };
}

export function ensureAdminSession(request, env, minimumRole = "viewer") {
  const session = getAdminSession(request, env);
  const rank = { viewer: 1, editor: 2, admin: 3 };
  const allowed = session.allowed && rank[session.role] >= rank[minimumRole];

  if (!session.accessAuthenticated) {
    return {
      ok: false,
      status: 401,
      session
    };
  }

  if (!allowed) {
    return {
      ok: false,
      status: 403,
      session
    };
  }

  return {
    ok: true,
    status: 200,
    session
  };
}
