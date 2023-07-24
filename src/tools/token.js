const jwt = require("jsonwebtoken");

const secret = "Yuzu-uzuY";

module.exports = {
    setToken(data) {
        return new Promise((resolve, reject) => {
            jwt.sign(data, secret, { expiresIn: "3d" }, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });
    },
    checkToken(token) {
        return new Promise((resolve, reject) => {
            if (!token) {
                reject("token为空");
            } else {
                //这里要处理bearer头,要分割
                token = token.split(" ")[1] || token;
                jwt.verify(token, secret, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            }
        });
    },
};
