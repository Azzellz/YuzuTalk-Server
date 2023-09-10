import jwt from "jsonwebtoken";
//密钥
export const secret = "Yuzu-uzuY";
//设置token
export function setToken(data: jwt.JwtPayload):Promise<string|undefined> {
    return new Promise((resolve, reject) => {
        jwt.sign(data, secret, { expiresIn: "3d" }, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}
//检查token是否合法
export function checkToken(token:string) {
    return new Promise((resolve, reject) => {
        if (!token) {
            reject("token为空");
        } else {
            //这里要处理bearer头,要分割
            token = token.split(" ")[1] || token;
            jwt.verify(token, secret, (err: any, data: unknown) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        }
    });
}
