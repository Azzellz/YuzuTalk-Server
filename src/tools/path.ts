import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
//再esm中获取__dirname全局变量
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
