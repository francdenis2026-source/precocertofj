/**
 * Server route dedicada para upload de foto de produto com barra de progresso.
 *
 * Motivo: `createServerFn` (RPC) não expõe eventos de progresso de upload no
 * cliente. Aqui aceitamos JSON `{ id, filename, mime, size, dataUrl }` via
 * XHR do navegador — o `dataUrl` é uma string base64 grande, então o
 * XHR pode reportar `progress.loaded / total` durante o envio.
 *
 * Auth: exige `Authorization: Bearer <supabase-access-token>` e valida
 * o role `admin` via `has_role`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_BYTES = 1024;

type IncomingBody = {
  id?: unknown;
  filename?: unknown;
  mime?: unknown;
  size?: unknown;
  dataUrl?: unknown;
};

function errorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/catalog-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !publishableKey || !serviceKey) {
          return errorResponse("STORAGE_FAIL", "Configuração do backend ausente", 500);
        }

        // --- Auth: valida bearer + admin -------------------------------------
        const auth = request.headers.get("Authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token) return errorResponse("UNAUTHORIZED", "Token ausente", 401);

        const userClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) {
          return errorResponse("UNAUTHORIZED", "Sessão inválida", 401);
        }
        const userId = userData.user.id;
        const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (roleErr || !isAdmin) {
          return errorResponse("UNAUTHORIZED", "Requer permissão de admin", 403);
        }

        // --- Body ----------------------------------------------------------
        let body: IncomingBody;
        try {
          body = (await request.json()) as IncomingBody;
        } catch {
          return errorResponse("UNKNOWN", "Corpo JSON inválido");
        }
        const id = typeof body.id === "string" ? body.id : "";
        const mime = typeof body.mime === "string" ? body.mime : "";
        const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
        if (!id) return errorResponse("UNKNOWN", "id do produto ausente");
        if (!ACCEPTED.has(mime)) return errorResponse("BAD_MIME", `MIME não suportado (${mime})`);
        if (!dataUrl.startsWith("data:")) {
          return errorResponse("UNKNOWN", "dataUrl inválido");
        }

        const commaIdx = dataUrl.indexOf(",");
        const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : "";
        let bytes: Uint8Array;
        try {
          const bin = atob(base64);
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch {
          return errorResponse("UNKNOWN", "base64 inválido");
        }
        if (bytes.byteLength > MAX_BYTES) return errorResponse("FILE_TOO_BIG", "Acima de 5 MB");
        if (bytes.byteLength < MIN_BYTES) return errorResponse("TOO_SMALL", "Menos de 1 KB");

        // --- Storage upload + update via service role ------------------------
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const ext =
          mime === "image/png"
            ? "png"
            : mime === "image/webp"
              ? "webp"
              : mime === "image/gif"
                ? "gif"
                : "jpg";
        const path = `products/${id}-manual-${Date.now()}.${ext}`;
        const { error: upErr } = await admin.storage.from("logos").upload(path, bytes, {
          contentType: mime,
          upsert: true,
        });

        // Descobre a URL antiga para o audit e para a resposta
        type Row = { image_url: string | null };
        const catTable = admin.from("product_catalog" as never) as unknown as {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              single: () => Promise<{ data: Row | null; error: { message: string } | null }>;
            };
          };
          update: (p: Record<string, unknown>) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
        const audit = admin.from("product_catalog_audit" as never) as unknown as {
          insert: (v: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
        };
        const { data: prev } = await catTable.select("image_url").eq("id", id).single();
        const oldUrl = prev?.image_url ?? null;

        if (upErr) {
          await audit.insert([
            {
              catalog_id: id,
              actor_user_id: userId,
              action: "image_upload_failed",
              field: "image_url",
              old_value: oldUrl,
              new_value: null,
              metadata: { source: "manual", filename: body.filename ?? null, size: bytes.byteLength },
              result: "error",
              error_code: "STORAGE_FAIL",
            },
          ]);
          return errorResponse("STORAGE_FAIL", upErr.message, 502);
        }

        const { data: pub } = admin.storage.from("logos").getPublicUrl(path);
        const imageUrl = pub.publicUrl;

        const { error: updErr } = await catTable
          .update({ image_url: imageUrl, image_source: "manual" })
          .eq("id", id);
        if (updErr) {
          await audit.insert([
            {
              catalog_id: id,
              actor_user_id: userId,
              action: "image_upload_failed",
              field: "image_url",
              old_value: oldUrl,
              new_value: imageUrl,
              metadata: { source: "manual", stage: "db_update" },
              result: "error",
              error_code: "STORAGE_FAIL",
            },
          ]);
          return errorResponse("STORAGE_FAIL", updErr.message, 502);
        }

        await audit.insert([
          {
            catalog_id: id,
            actor_user_id: userId,
            action: "image_upload",
            field: "image_url",
            old_value: oldUrl,
            new_value: imageUrl,
            metadata: {
              source: "manual",
              filename: body.filename ?? null,
              size: bytes.byteLength,
              mime,
            },
            result: "success",
            error_code: null,
          },
        ]);

        return new Response(
          JSON.stringify({ ok: true, imageUrl }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
