import { Mime } from "mime";
import otherTypes from "mime/types/other.js";
import standardTypes from "mime/types/standard.js";

/**
 * `mime`, plus the map formats it does not know. Without them, `.tmj`, `.tsj` and `.wam` files are stored and served
 * as `application/octet-stream`, a type that CDNs (Cloudflare...) and reverse proxies do not compress: a 1.2 MB map
 * went over the wire as 1.2 MB instead of 30 KB.
 */
export const mime = new Mime(standardTypes, otherTypes, { "application/json": ["json", "tmj", "tsj", "wam"] });
