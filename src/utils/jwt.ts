import * as jose from "jose";

export const EXAMPLE_JWKS_URL =
  "https://static.air3.com/.well-known/example-jwks.json";

export interface JwtPayload {
  partnerId: string;
  scope: string;
  [key: string]: unknown;
}

const signJwt = async ({
  payload,
  privateKeyPem,
}: {
  payload: JwtPayload;
  privateKeyPem: string;
}): Promise<string> => {
  const formattedKey = privateKeyPem.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(formattedKey, "RS256", {
    extractable: true,
  });

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({
      alg: "RS256",
      kid: "6386cb4d-c0de-4629-a412-8dcf6f50f805",
    })
    .setExpirationTime("1h")
    .sign(privateKey);

  return jwt;
};

export const generateJwt = async ({
  partnerId,
  privateKey,
}: {
  partnerId: string;
  privateKey: string;
}): Promise<string | null> => {
  try {
    const jwt = await signJwt({
      payload: getJwtPayload(partnerId),
      privateKeyPem: privateKey,
    });
    return jwt;
  } catch (error) {
    console.error("Error generating JWT:", error);
    return null;
  }
};

export const getJwtPayload = (partnerId: string): JwtPayload => {
  return {
    partnerId,
    scope: "issue verify",
  };
};
