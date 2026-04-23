// OAuth providers — Apple, Google, Facebook.
// Chaque verifier prend un token client et renvoie { providerId, email?, name? }
// une fois vérifié cryptographiquement auprès du provider.
//
// Config via env vars :
//   APPLE_CLIENT_ID  — bundle ID iOS (com.omar.touti)
//   GOOGLE_CLIENT_ID — OAuth 2.0 client ID (iOS + Android + Web)
//   FACEBOOK_APP_ID  — App ID Meta
//
// Si l'env var n'est pas définie, on renvoie "not_configured" — l'endpoint
// serveur répond 501 pour que le client affiche "bientôt disponible".

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface OAuthProfile {
  provider: "apple" | "google" | "facebook";
  providerId: string;   // sub du JWT / user.id côté provider
  email?: string;
  name?: string;
}

export class OAuthNotConfigured extends Error {
  constructor(public provider: string) {
    super(`${provider} OAuth not configured on server`);
  }
}

// ─── Apple ───────────────────────────────────────────────────────

const appleKeys = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  rateLimit: true,
});

export async function verifyApple(identityToken: string): Promise<OAuthProfile> {
  const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
  if (!APPLE_CLIENT_ID) throw new OAuthNotConfigured("apple");

  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === "string") throw new Error("Invalid Apple token");
  const kid = decoded.header.kid;
  if (!kid) throw new Error("Missing kid in Apple token");

  const key = await appleKeys.getSigningKey(kid);
  const pubKey = key.getPublicKey();

  const payload = jwt.verify(identityToken, pubKey, {
    issuer: "https://appleid.apple.com",
    audience: APPLE_CLIENT_ID,
    algorithms: ["RS256"],
  }) as any;

  return {
    provider: "apple",
    providerId: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

// ─── Google ──────────────────────────────────────────────────────

const googleKeys = jwksClient({
  jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
  cache: true,
  rateLimit: true,
});

export async function verifyGoogle(idToken: string): Promise<OAuthProfile> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) throw new OAuthNotConfigured("google");

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string") throw new Error("Invalid Google token");
  const kid = decoded.header.kid;
  if (!kid) throw new Error("Missing kid");

  const key = await googleKeys.getSigningKey(kid);
  const pubKey = key.getPublicKey();

  const payload = jwt.verify(idToken, pubKey, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: GOOGLE_CLIENT_ID,
    algorithms: ["RS256"],
  }) as any;

  return {
    provider: "google",
    providerId: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

// ─── Facebook ────────────────────────────────────────────────────
// Facebook n'utilise pas de JWT signé : on valide le token côté Graph API
// avec notre app secret.

export async function verifyFacebook(accessToken: string): Promise<OAuthProfile> {
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) throw new OAuthNotConfigured("facebook");

  // 1) Vérifier la validité du token + qu'il appartient à notre app
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  const debugRes = await fetch(debugUrl);
  if (!debugRes.ok) throw new Error("Facebook debug_token failed");
  const debugData = await debugRes.json() as any;
  if (!debugData.data?.is_valid) throw new Error("Facebook token invalid");
  if (debugData.data.app_id !== FACEBOOK_APP_ID) throw new Error("Facebook token for wrong app");

  // 2) Récupérer le profil
  const meUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`;
  const meRes = await fetch(meUrl);
  if (!meRes.ok) throw new Error("Facebook me fetch failed");
  const me = await meRes.json() as any;

  return {
    provider: "facebook",
    providerId: me.id,
    email: me.email,
    name: me.name,
  };
}
