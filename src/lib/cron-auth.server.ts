/**
 * Autenticação de endpoints de cron/webhook interno.
 *
 * Regra: exige o header `x-cron-secret` (ou `?token=`) igual ao secret
 * CRON_SECRET. Falha fechada — se o secret não estiver configurado, o
 * endpoint responde 503 em vez de ficar aberto.
 *
 * NUNCA usar a anon/publishable key como credencial: ela é pública e
 * qualquer pessoa pode extraí-la do bundle do site.
 */
export function requireCronSecret(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "cron secret not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const token =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token");

  if (!token || token !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
