// src/app/api/iot/stream/route.ts
import { NextRequest } from 'next/server';
import { mqtt, io, iot, auth } from 'aws-iot-device-sdk-v2';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

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

// Singleton para mantener una sola conexión MQTT
let mqttConnection: mqtt.MqttClientConnection | null = null;
let isConnecting = false;

async function getIoTConnection() {
  if (mqttConnection) {
    return mqttConnection;
  }

  if (isConnecting) {
    // Esperar a que termine la conexión en curso
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getIoTConnection();
  }

  isConnecting = true;

  try {
    console.log('🔄 Obteniendo ID Token...');
    
    // 1. Obtener ID Token
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

    console.log('✅ ID Token obtenido');

    // 2. Obtener credenciales AWS
    const providerName = `cognito-idp.${AWS_CONFIG.region}.amazonaws.com/${AWS_CONFIG.userPoolId}`;
    const credentialsProvider = fromCognitoIdentityPool({
      identityPoolId: AWS_CONFIG.identityPoolId,
      clientConfig: { region: AWS_CONFIG.region },
      logins: {
        [providerName]: idToken,
      },
    });

    const creds = await credentialsProvider();
    console.log('✅ Credenciales AWS obtenidas');

    // 3. Configurar conexión MQTT
    const clientBootstrap = new io.ClientBootstrap();
    
    const credProvider = auth.AwsCredentialsProvider.newStatic(
      creds.accessKeyId,
      creds.secretAccessKey,
      creds.sessionToken
    );

    const configBuilder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
      region: AWS_CONFIG.region,
      credentials_provider: credProvider,
    });

    const config = configBuilder
      .with_clean_session(true)
      .with_client_id(`dashboard-backend-${Date.now()}`)
      .with_endpoint(AWS_CONFIG.iotEndpoint)
      .with_keep_alive_seconds(60)
      .build();

    const client = new mqtt.MqttClient(clientBootstrap);
    mqttConnection = client.new_connection(config);

    // Eventos de conexión
    mqttConnection.on('error', (error) => {
      console.error('❌ Error MQTT:', error);
      mqttConnection = null;
    });

    mqttConnection.on('disconnect', () => {
      console.warn('⚠️ Desconectado');
      mqttConnection = null;
    });

    // 4. Conectar
    await mqttConnection.connect();
    console.log('✅ Conectado a IoT Core');

    isConnecting = false;
    return mqttConnection;

  } catch (error) {
    console.error('❌ Error conectando:', error);
    isConnecting = false;
    mqttConnection = null;
    throw error;
  }
}

// API Route con Server-Sent Events (SSE)
export async function GET(request: NextRequest) {
  console.log('📡 Nueva conexión SSE solicitada');

  const encoder = new TextEncoder();

  // Configurar SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Obtener conexión MQTT
        const connection = await getIoTConnection();

        // Suscribirse al topic
        await connection.subscribe(
          AWS_CONFIG.topic,
          mqtt.QoS.AtMostOnce,
          (topic: string, payload: ArrayBuffer) => {
            try {
              const decoder = new TextDecoder('utf-8');
              const messageStr = decoder.decode(payload);
              
              // Enviar mensaje al cliente vía SSE
              const data = `data: ${messageStr}\n\n`;
              controller.enqueue(encoder.encode(data));
              
              console.log('📨 Mensaje enviado al cliente');
            } catch (error) {
              console.error('❌ Error procesando mensaje:', error);
            }
          }
        );

        console.log('✅ Suscrito a topic:', AWS_CONFIG.topic);

        // Enviar mensaje inicial de conexión
        const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(initialMessage));

        // Heartbeat cada 30 segundos para mantener conexión viva
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