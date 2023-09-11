import fs from "fs/promises";
import path from "path";
import { __dirname } from "./path.ts";

export async function readAvatar(avatar: string): Promise<Buffer> {
    const filePath = path.join(__dirname, `../../public/user_avatar/${avatar}`);
    const buffer = await fs.readFile(filePath);
    return buffer;
}


