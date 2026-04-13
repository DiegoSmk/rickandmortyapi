export async function writeAuditLog(env, entry) {
  if (!env.DB) {
    return;
  }

  await env.DB.prepare(`
    INSERT INTO audit_logs (
      id,
      actor_email,
      actor_role,
      action,
      target_type,
      target_id,
      metadata_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    entry.actorEmail || null,
    entry.actorRole || null,
    entry.action,
    entry.targetType || null,
    entry.targetId || null,
    entry.metadataJson || null,
    new Date().toISOString()
  ).run();
}
