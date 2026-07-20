// Configuração do Firebase do projeto RV SPORTS.
// O site usa Firebase Authentication + Realtime Database.
export const firebaseConfig = {
  apiKey: "AIzaSyBa1YSfbpwrlWx6Qada81Wm131_Vx_7tm4",
  authDomain: "rv-sports.firebaseapp.com",
  databaseURL: "https://rv-sports-default-rtdb.firebaseio.com",
  projectId: "rv-sports",
  storageBucket: "rv-sports.firebasestorage.app",
  messagingSenderId: "74383509106",
  appId: "1:74383509106:web:b54cf35b4cdf23535524eb"
};

// Estes dados são usados somente se o Firebase não estiver configurado.
export const DEMO_ADMIN_EMAIL = "admin@rvsports.com";
export const DEMO_ADMIN_PASSWORD = "123456";

export const firebaseIsConfigured = Object.entries(firebaseConfig)
  .filter(([key]) => ["apiKey", "authDomain", "databaseURL", "projectId", "appId"].includes(key))
  .every(([, value]) => typeof value === "string" && value.trim() && !value.includes("COLE_AQUI"));
