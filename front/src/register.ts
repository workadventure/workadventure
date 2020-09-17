import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
declare let window:Window;

export function redirectIfToken() {
    const match = window.location.toString().match(/\/register\/(.+)/);
    if (match) {
        Axios.get(`${API_URL}/register/`+match[1]).then((res) => {
                window.location = res.data.loginUrl;
        });
    }
}