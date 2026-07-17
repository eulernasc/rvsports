// Cole aqui a configuração do seu aplicativo Web do Firebase.
// Enquanto estes valores não forem preenchidos, o site funciona em MODO DEMONSTRAÇÃO
// usando o localStorage do navegador.
export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  databaseURL: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

// Usado somente no modo demonstração.
export const DEMO_ADMIN_EMAIL = "admin@rvsports.com";
export const DEMO_ADMIN_PASSWORD = "123456";

export const firebaseIsConfigured = Object.entries(firebaseConfig)
  .filter(([key]) => ["apiKey", "authDomain", "databaseURL", "projectId", "appId"].includes(key))
  .every(([, value]) => typeof value === "string" && value.trim() && !value.includes("COLE_AQUI"));
