import axios from "axios";

export async function download(url: string): Promise<string> {
    const res = await axios.get<string>(url)
    return res.data
}
