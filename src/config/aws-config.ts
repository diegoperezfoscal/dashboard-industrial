// // src/config/aws-config.ts

// function getEnvVar(key: string, defaultValue?: string): string {
//   const value = process.env[key] || defaultValue;
  
//   if (!value) {
//     const error = `Missing required environment variable: ${key}`;
//     console.error(error);
    
//     // En desarrollo, mostrar ayuda
//     if (process.env.NODE_ENV === 'development') {
//       console.error('💡 Asegúrate de que .env.local existe en la raíz del proyecto');
//       console.error('💡 Reinicia el servidor después de crear/modificar .env.local');
//     }
    
//     throw new Error(error);
//   }
  
//   return value;
// }

// // 🔧 Configuración con valores por defecto para desarrollo
// export const AWS_CONFIG = {
//   region: getEnvVar('NEXT_PUBLIC_AWS_REGION', 'us-east-1'),
//   iotEndpoint: getEnvVar('NEXT_PUBLIC_IOT_ENDPOINT', 'a2k7890trgtkfx-ats.iot.us-east-1.amazonaws.com/mqtt'),
//   identityPoolId: getEnvVar('NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID', 'us-east-1:f991098b-1a9a-4271-bfe9-af85c2571fd5'),
//   topic: getEnvVar('NEXT_PUBLIC_IOT_TOPIC', 'industrial/plc/data'),
//   clientId: getEnvVar('NEXT_PUBLIC_CLIENT_ID', '2s9e6hdscshv3a7si9k3asul5o'),
//   userPoolId: getEnvVar('NEXT_PUBLIC_USER_POOL_ID', 'us-east-1_hWdkRwqlP'),
// };

// // Log de verificación (solo en cliente y desarrollo)
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   console.log('🔧 AWS Config cargado:', {
//     region: AWS_CONFIG.region,
//     iotEndpoint: AWS_CONFIG.iotEndpoint,
//     identityPoolId: AWS_CONFIG.identityPoolId,
//     topic: AWS_CONFIG.topic,
//     clientId: AWS_CONFIG.clientId,
//     userPoolId: AWS_CONFIG.userPoolId,
//   });
// }