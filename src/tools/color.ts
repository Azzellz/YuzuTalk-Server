//颜色类型枚举
export type colors =
    | "红色"
    | "绿色"
    | "黄色"
    | "蓝色"
    | "品红"
    | "青色"
    | "白色"
    | "灰色"
    | "黑色";

const colorsMap = {
    红色: 31,
    绿色: 32,
    黄色: 33,
    蓝色: 34,
    品红: 35,
    青色: 36,
    白色: 37,
    灰色: 90,
    黑色: 90,
};

export function color(color: colors, content: string): string {
    return `\x1B[${colorsMap[color]}m${content}\x1B[0m`;
}
