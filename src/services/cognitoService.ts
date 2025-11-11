import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { AWS_CONFIG } from "@/config/aws-config";

export class CognitoService {
  private credentials?: AwsCredentialIdentityProvider;
  private idToken?: string;
  private tokenExpiry?: number;

  // 🔹 Construye el provider name dinámicamente
  private getProviderName(): string {
    const providerName = `cognito-idp.${AWS_CONFIG.region}.amazonaws.com/${AWS_CONFIG.userPoolId}`;
    console.log("🔑 Provider Name construido:", providerName);
    return providerName;
  }

  // 🔹 Obtiene el token ID desde Cognito
  async fetchIdToken(): Promise<string> {
    const now = Date.now();

    // Si el token existe y no ha expirado, lo reutiliza
    if (this.idToken && this.tokenExpiry && now < this.tokenExpiry) {
      console.log("♻️ Reutilizando token existente");
      return this.idToken;
    }

    console.log("🔄 Generando nuevo ID token desde Cognito...");
    console.log("📍 Region:", AWS_CONFIG.region);
    console.log("🆔 Client ID:", AWS_CONFIG.clientId);

    const client = new CognitoIdentityProviderClient({
      region: AWS_CONFIG.region,
    });

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: AWS_CONFIG.clientId,
      AuthParameters: {
        USERNAME: "tiemporeal",
        PASSWORD: "@Ad12962108",
      },
    });

    try {
      const response = await client.send(command);
      const result = response.AuthenticationResult;

      if (!result?.IdToken || !result.ExpiresIn) {
        throw new Error("No se pudo obtener el ID token de Cognito.");
      }

      // Guardar el token y su tiempo de expiración
      this.idToken = result.IdToken;
      this.tokenExpiry = now + result.ExpiresIn * 1000;

      console.log("✅ ID Token obtenido exitosamente");
      console.log("🕒 Token expira en:", result.ExpiresIn, "segundos");

      // 🔍 DEBUG: Decodificar el token para ver el issuer
      const tokenParts = result.IdToken.split(".");
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log("🎫 Token Issuer (iss):", payload.iss);
      console.log("🎯 Token Audience (aud):", payload.aud);

      return this.idToken;
    } catch (error) {
      console.error("❌ Error obteniendo ID token:", error);
      throw error;
    }
  }

  // 🔹 Obtiene credenciales AWS usando el ID token
  async getCredentials(): Promise<AwsCredentialIdentityProvider> {
    try {
      const idToken = await this.fetchIdToken();
      const providerName = this.getProviderName();

      console.log("🔐 Configurando credenciales con:");
      console.log("  - Identity Pool ID:", AWS_CONFIG.identityPoolId);
      console.log("  - Region:", AWS_CONFIG.region);
      console.log("  - Provider Name:", providerName);
      console.log(
        "  - Token (primeros 50 chars):",
        idToken.substring(0, 50) + "..."
      );

      this.credentials = fromCognitoIdentityPool({
        identityPoolId: AWS_CONFIG.identityPoolId,
        clientConfig: { region: AWS_CONFIG.region },
        logins: {
          [providerName]: idToken,
        },
      });

      // Validar que las credenciales funcionen
      console.log("🔄 Resolviendo credenciales...");
      const resolved = await this.credentials();
      console.log("✅ Credenciales AWS obtenidas:", {
        accessKeyId: resolved.accessKeyId.substring(0, 20) + "...",
        hasSecretKey: !!resolved.secretAccessKey,
        hasSessionToken: !!resolved.sessionToken,
      });

      return this.credentials;
    } catch (error) {
      console.error("❌ Error obteniendo credenciales de Cognito:", error);
      this.credentials = undefined;
      throw error;
    }
  }

  // 🔹 Métodos auxiliares
  async getAccessKeyId(): Promise<string> {
    const creds = await this.getCredentials();
    const resolved = await creds();
    return resolved.accessKeyId;
  }

  async getSecretAccessKey(): Promise<string> {
    const creds = await this.getCredentials();
    const resolved = await creds();
    return resolved.secretAccessKey;
  }

  async getSessionToken(): Promise<string | undefined> {
    const creds = await this.getCredentials();
    const resolved = await creds();
    return resolved.sessionToken;
  }
}

export const cognitoService = new CognitoService();
