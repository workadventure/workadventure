//@ts-nocheck
//library.js
/* The key is to import these files into the file you wish to export as a module. */
console.log("VBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbb")
console.log("VBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbb")
console.log("VBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbb")
console.log("VBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbb")
console.log("VBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbb")

/* Secondly, the getPluginData method we rename as 'iframely' accepts different embedding methods which you can examine in their '/test/main.js' */
/*export function oembed(url, callback){
    getPluginData(url, 'oembed', findWhitelistRecordFor, function(err, data){
        if (err) return callback(err);
        callback(null, data);
    });
}

export function meta(url, callback){
    getPluginData(url, 'meta', findWhitelistRecordFor, function(err, data){
        if (err) return callback(err);
        callback(null, data);
    });
};
*/

export function testIframely(): void {
    (async () => {
        global.CONFIG = await import("iframely/config");
        const getPluginData = await import("iframely/lib/core");
        const findWhitelistRecordFor = await import("iframely/lib/whitelist");

        getPluginData("https://www.youtube.com/watch?v=QH2-TGUlwu4", 'oembed', findWhitelistRecordFor, function(err, data){
            console.log("RESUUUUUUUUULTS");
            console.log(err, data);
        });


    })().catch((err) => {
        console.error(err);
    });
}
