// src/app/api/iot/stream/route.ts
import { NextRequest } from 'next/server';
import mqtt from 'mqtt';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import * as crypto from 'crypto';

const AWS_CONFIG = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-east-1_hWdkRwqlP',
  clientId: process.env.NEXT_PUBLIC_CLIENT_ID || '2s9e6hdscshv3a7si9k3asul5o',
  identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || 'us-east-1:f991098b-1a9a-4271-bfe9-af85c2571fd5',
  iotEndpoint: process.env.NEXT_PUBLIC_IOT_ENDPOINT || 'a2k7890trgtkfx-ats.iot.us-east-1.amazonaws.com',
  topic: process.env.NEXT_PUBLIC_IOT_TOPIC || 'industrial/plc/data',
  username: 'tiemporeal',
  password: '@Ad12962108',
};

function sha256(data: string | Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac(Buffer.from('AWS4' + key, 'utf-8'), dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

async function getSignedUrl(endpoint: string, region: string, creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }): Promise<string> {
  const datetime = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const date = datetime.slice(0, 8);
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${date}/${region}/iotdevicegateway/aws4_request`;

  const params: Record<string, string> = {
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${creds.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': datetime,
    'X-Amz-SignedHeaders': 'host',
  };

  if (creds.sessionToken) {
    params['X-Amz-Security-Token'] = creds.sessionToken;
  }

  const canonicalQuery = new URLSearchParams(params).toString().replace(/\+/g, '%20');
  const canonicalHeaders = `host:${endpoint}\n`;
  const payloadHash = sha256('').toString('hex');
  const canonicalRequest = `GET\n/mqtt\n${canonicalQuery}\n${canonicalHeaders}\nhost\n${payloadHash}`;
  const requestHash = sha256(canonicalRequest).toString('hex');
  const stringToSign = `${algorithm}\n${datetime}\n${credentialScope}\n${requestHash}`;
  const signingKey = getSignatureKey(creds.secretAccessKey, date, region, 'iotdevicegateway');
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const signedQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return `wss://${endpoint}/mqtt?${signedQuery}`;
}

// Singleton para la conexión MQTT
let mqttClient: mqtt.MqttClient | null = null;
let isConnecting = false;

async function getMqttClient() {
  if (mqttClient && mqttClient.connected) {
    return mqttClient;
  }

  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getMqttClient();
  }

  isConnecting = true;

  try {
    console.log('Obteniendo credenciales...');

    // 1. Autenticación Cognito
    const cognitoClient = new CognitoIdentityProviderClient({
      region: AWS_CONFIG.region,
    });

    const authResponse = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: AWS_CONFIG.clientId,
        AuthParameters: {
          USERNAME: AWS_CONFIG.username,
          PASSWORD: AWS_CONFIG.password,
        },
      })
    );

    const idToken = authResponse.AuthenticationResult?.IdToken;
    if (!idToken) throw new Error('No ID token');

    // 2. Credenciales temporales
    const providerName = `cognito-idp.${AWS_CONFIG.region}.amazonaws.com/${AWS_CONFIG.userPoolId}`;
    const credentialsProvider = fromCognitoIdentityPool({
      identityPoolId: AWS_CONFIG.identityPoolId,
      clientConfig: { region: AWS_CONFIG.region },
      logins: { [providerName]: idToken },
    });

    const creds = await credentialsProvider();

    if (!creds.accessKeyId || !creds.secretAccessKey) {
      throw new Error('Credenciales incompletas');
    }

    // 3. Generar URL firmada
    const signedUrl = await getSignedUrl(AWS_CONFIG.iotEndpoint, AWS_CONFIG.region, {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    });

    // 4. Conectar con mqtt.js
    mqttClient = mqtt.connect(signedUrl, {
      clientId: `dashboard-backend-${Date.now()}`,
      keepalive: 60,
      reconnectPeriod: 1000,
      protocol: 'wss',
      clean: true,
    });

    await new Promise((resolve, reject) => {
      mqttClient!.on('connect', () => {
        console.log('✅ Conectado a IoT Core vía WebSocket');
        resolve(null);
      });
      mqttClient!.on('error', (err: Error) => {
        console.error('❌ Error MQTT:', err);
        reject(err);
      });
    });

    mqttClient.on('disconnect', () => {
      console.warn('⚠️ Desconectado');
      mqttClient = null;
    });

    isConnecting = false;
    return mqttClient;

  } catch (error) {
    console.error('❌ Error conectando MQTT:', error);
    isConnecting = false;
    mqttClient = null;
    throw error;
  }
}

// SSE API Route
export async function GET(request: NextRequest) {
  console.log('📡 Nueva conexión SSE solicitada');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = await getMqttClient();

        // Suscribirse
        client.subscribe(AWS_CONFIG.topic, { qos: 0 }, (err: Error | null) => {
          if (err) {
            console.error('❌ Error suscripción:', err);
          } else {
            console.log('✅ Suscrito a:', AWS_CONFIG.topic);
          }
        });

        // Forward mensajes
        const messageHandler = (topic: string, message: Buffer) => {
          const data = `data: ${message.toString()}\n\n`;
          controller.enqueue(encoder.encode(data));
          console.log('📨 Mensaje enviado al cliente');
        };

        client.on('message', messageHandler);

        // Mensaje inicial
        const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(initialMessage));

        // Heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        // Cleanup al cerrar conexión
        request.signal.addEventListener('abort', () => {
          console.log('🔌 Cliente desconectado');
          client.removeListener('message', messageHandler);
          clearInterval(heartbeatInterval);
          controller.close();
        });

      } catch (error) {
        console.error('❌ Error en SSE:', error);
        const errorMessage = `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}