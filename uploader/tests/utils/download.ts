import axios from "axios";

export async function download(url: string) {
    const res = await axios.get(url)
    return res.data
}
