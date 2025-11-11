// src/services/iotService.ts
'use client';

import mqtt from "mqtt";
import type { MqttClient } from "mqtt";
import { cognitoService } from "./cognitoService";
import { AWS_CONFIG } from "@/config/aws-config";
import {
  IoTClient,
  AttachPolicyCommand,
  ListAttachedPoliciesCommand,
} from "@aws-sdk/client-iot";
import {
  CognitoIdentityClient,
  GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import { IoTMessage } from "@/types/iot.types";

export class IoTService {
  private client: MqttClient | null = null;
  private readonly IOT_POLICY_NAME = "industrial-iot-lab-dashboard-policy";
  private messageCallback: ((message: IoTMessage) => void) | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  private async getIdentityId(): Promise<string> {
    try {
      const idToken = await cognitoService.fetchIdToken();

      const cognitoClient = new CognitoIdentityClient({
        region: AWS_CONFIG.region,
      });

      const providerName = `cognito-idp.${AWS_CONFIG.region}.amazonaws.com/${AWS_CONFIG.userPoolId}`;

      const getIdResponse = await cognitoClient.send(
        new GetIdCommand({
          IdentityPoolId: AWS_CONFIG.identityPoolId,
          Logins: {
            [providerName]: idToken,
          },
        })
      );

      const identityId = getIdResponse.IdentityId;
      if (!identityId) {
        throw new Error("No se pudo obtener el Identity ID");
      }

      console.log("🆔 Identity ID obtenido:", identityId);
      return identityId;
    } catch (error) {
      console.error("❌ Error obteniendo Identity ID:", error);
      throw error;
    }
  }

  private async attachIoTPolicy(): Promise<void> {
    try {
      const identityId = await this.getIdentityId();
      const credentials = await cognitoService.getCredentials();
      const resolvedCreds = await credentials();

      const iotClient = new IoTClient({
        region: AWS_CONFIG.region,
        credentials: resolvedCreds,
      });

      try {
        const listPoliciesResponse = await iotClient.send(
          new ListAttachedPoliciesCommand({
            target: identityId,
          })
        );

        const isAttached = listPoliciesResponse.policies?.some(
          (p) => p.policyName === this.IOT_POLICY_NAME
        );

        if (isAttached) {
          console.log("✅ Política de IoT ya está adjunta");
          return;
        }

        console.log("📋 Políticas actuales:", listPoliciesResponse.policies);
      } catch (listError) {
        console.log("⚠️ Error verificando políticas:", listError);
      }

      console.log(`🔗 Adjuntando política ${this.IOT_POLICY_NAME} a ${identityId}`);
      await iotClient.send(
        new AttachPolicyCommand({
          policyName: this.IOT_POLICY_NAME,
          target: identityId,
        })
      );

      console.log("✅ Política de IoT adjuntada exitosamente");
    } catch (error) {
      console.error("❌ Error adjuntando política de IoT:", error);
      console.warn("⚠️ Continuando sin adjuntar política automáticamente");
    }
  }

  private async generateSignedUrl(creds: AwsCredentialIdentity): Promise<string> {
    const endpoint = AWS_CONFIG.iotEndpoint;
    const region = AWS_CONFIG.region;

    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = datetime.substring(0, 8);
    
    const credentialScope = `${date}/${region}/iotdevicegateway/aws4_request`;
    const algorithm = 'AWS4-HMAC-SHA256';

    // 🔧 FIX 1: Tipar correctamente el objeto de parámetros
    const params: Record<string, string> = {
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${creds.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': datetime,
      'X-Amz-SignedHeaders': 'host',
    };

    if (creds.sessionToken) {
      params['X-Amz-Security-Token'] = creds.sessionToken;
    }

    const canonicalQuerystring = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const canonicalHeaders = `host:${endpoint}\n`;
    const signedHeaders = 'host';
    
    const canonicalRequest = [
      'GET',
      '/mqtt',
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      await this.sha256(''),
    ].join('\n');

    const stringToSign = [
      algorithm,
      datetime,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = await this.getSignatureKey(
      creds.secretAccessKey,
      date,
      region,
      'iotdevicegateway'
    );

    const signature = await this.hmacHex(signingKey, stringToSign);

    // 🔧 FIX 1: Usar el mismo tipo Record<string, string>
    const finalParams: Record<string, string> = {
      ...params,
      'X-Amz-Signature': signature,
    };

    const queryString = Object.keys(finalParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(finalParams[key])}`)
      .join('&');

    return `wss://${endpoint}/mqtt?${queryString}`;
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 🔧 FIX 2: Convertir Uint8Array a ArrayBuffer compatible
  private async hmac(key: Uint8Array | string, message: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    
    // Crear un nuevo ArrayBuffer para garantizar compatibilidad
    const keyBuffer = new ArrayBuffer(keyData.byteLength);
    const keyView = new Uint8Array(keyBuffer);
    keyView.set(keyData);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(message)
    );
    
    return new Uint8Array(signature);
  }

  private async hmacHex(key: Uint8Array, message: string): Promise<string> {
    const result = await this.hmac(key, message);
    return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<Uint8Array> {
    const kDate = await this.hmac('AWS4' + key, dateStamp);
    const kRegion = await this.hmac(kDate, regionName);
    const kService = await this.hmac(kRegion, serviceName);
    const kSigning = await this.hmac(kService, 'aws4_request');
    return kSigning;
  }

  async connect(onMessage?: (message: IoTMessage) => void): Promise<void> {
    if (this.client?.connected) {
      console.log("✅ Ya conectado a IoT Core");
      if (onMessage) this.messageCallback = onMessage;
      return;
    }

    if (this.isConnecting) {
      console.log("⏳ Conexión ya en progreso...");
      return;
    }

    this.isConnecting = true;

    if (this.client) {
      console.log("🧹 Limpiando cliente anterior...");
      this.client.removeAllListeners();
      this.client.end(true);
      this.client = null;
    }

    try {
      if (onMessage) this.messageCallback = onMessage;

      await this.attachIoTPolicy();

      console.log("🔄 Obteniendo credenciales para conexión...");
      const credentials = await cognitoService.getCredentials();
      const creds = await credentials();

      console.log("✅ Credenciales obtenidas:", {
        accessKeyId: creds.accessKeyId.substring(0, 20) + "...",
        hasSecret: !!creds.secretAccessKey,
        hasToken: !!creds.sessionToken,
      });

      console.log("🔐 Firmando URL con SigV4...");
      const signedUrl = await this.generateSignedUrl(creds);
      console.log("🔗 URL firmada generada (longitud):", signedUrl.length);

      const clientId = `dashboard-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;

      console.log("🔌 Client ID:", clientId);
      console.log("🚀 Iniciando conexión MQTT...");

      this.client = mqtt.connect(signedUrl, {
        clientId,
        clean: true,
        reconnectPeriod: 0,
        connectTimeout: 30000,
        keepalive: 60,
        protocolVersion: 4,
        // 🔧 Agregar opciones de WebSocket
        wsOptions: {
          protocol: 'mqtt',
        },
        transformWsUrl: (url: string) => {
          console.log("📍 Transform WS URL llamado");
          return url;
        },
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error("❌ Error conectando a IoT Core:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // 🔧 FIX 3: Tipar correctamente el stream y los errores
    const stream = this.client.stream as unknown as {
      on(event: 'error', listener: (error: Error) => void): void;
      on(event: 'close', listener: (code: number, reason: string) => void): void;
    };
    
    if (stream) {
      stream.on('error', (error: Error) => {
        console.error("🔴 WebSocket Error:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      });
      
      stream.on('close', (code: number, reason: string) => {
        console.warn("🔴 WebSocket Close:", { 
          code, 
          reason,
          description: this.getCloseCodeDescription(code)
        });
      });
    }

    this.client.on("connect", (connack) => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log("✅ ¡CONEXIÓN MQTT EXITOSA!");
      console.log("📊 CONNACK:", {
        sessionPresent: connack.sessionPresent,
        returnCode: connack.returnCode,
      });

      this.client?.subscribe(AWS_CONFIG.topic, { qos: 0 }, (err, granted) => {
        if (err) {
          console.error("❌ Error al suscribirse:", err);
        } else {
          console.log("📡 Suscrito exitosamente:", granted);
        }
      });
    });

    this.client.on("message", (topic, message) => {
      try {
        const messageStr = message.toString();
        console.log("📨 Mensaje recibido:", topic);
        if (this.messageCallback) {
          const parsedMessage: IoTMessage = JSON.parse(messageStr);
          this.messageCallback(parsedMessage);
        }
      } catch (error) {
        console.error("❌ Error procesando mensaje:", error);
      }
    });

    this.client.on("error", (error) => {
      console.error("❌ Error MQTT:", error);
      this.isConnecting = false;
    });

    this.client.on("close", () => {
      console.warn("⚠️ Conexión MQTT cerrada");
      this.isConnecting = false;
      this.handleReconnect();
    });

    this.client.on("offline", () => {
      console.warn("⚠️ Cliente MQTT offline");
      this.handleReconnect();
    });

    this.client.on("end", () => {
      console.log("🔚 Cliente MQTT finalizado");
      this.isConnecting = false;
    });
  }

  private getCloseCodeDescription(code: number): string {
    const descriptions: Record<number, string> = {
      1000: "Normal closure",
      1001: "Going away",
      1002: "Protocol error",
      1003: "Unsupported data",
      1006: "Abnormal closure (no handshake)",
      1007: "Invalid frame payload data",
      1008: "Policy violation",
      1009: "Message too big",
      1010: "Missing extension",
      1011: "Internal error",
      1015: "TLS handshake failure",
    };
    return descriptions[code] || "Unknown";
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error("❌ Máximo de intentos alcanzado");
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(
      `🔄 Reconectando en ${delay}ms (intento ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`
    );

    setTimeout(async () => {
      try {
        await this.connect(this.messageCallback ?? undefined);
      } catch (error) {
        console.error("❌ Error en reconexión:", error);
      }
    }, delay);
  }

  disconnect(): void {
    if (this.client) {
      console.log("🔌 Desconectando...");
      this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS;
      this.client.removeAllListeners();
      this.client.end(true);
      this.client = null;
      this.messageCallback = null;
      this.isConnecting = false;
    }
  }

  isClientConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

export const iotService = new IoTService();