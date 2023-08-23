import moment from "moment";

export function getCurrentTime(format = "YYYY-MM-DD HH:mm") {
    return moment(Date.now()).format(format);
}
