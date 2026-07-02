import "server-only";
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnectPromise: Promise<typeof mongoose> | undefined;
}

/**
 * Único ponto de conexão com o MongoDB no servidor.
 * readyState === 1 (já conectado) retorna direto — cobre o caso de testes, que conectam
 * via mongoose.connect() diretamente no beforeAll, sem passar por aqui.
 * Fora de testes, cacheia a Promise de conexão em `global` para sobreviver a hot-reload
 * do Next.js em dev e reaproveitar a conexão entre invocações "quentes" na Vercel.
 */
export async function getDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!global._mongooseConnectPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI.");
    }
    global._mongooseConnectPromise = mongoose.connect(uri);
  }
  return global._mongooseConnectPromise;
}
