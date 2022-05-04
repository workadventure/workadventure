WA.onInit().then(() => {
    initListeners();
});

function initListeners() {
    let first_website = undefined;
    let second_website = undefined;

    WA.room.onEnterLayer('first_website').subscribe(async () => {
        first_website = await WA.ui.website.open({
            url: "http://maps.workadventure.localhost/tests/UIWebsite/index.html",
            position: {
                vertical: "middle",
                horizontal: "middle",
            },
            size: {
                height: "50vh",
                width: "50vw",
            },
        });
    });

    WA.room.onLeaveLayer('first_website').subscribe(() => {
        if (first_website) {
            first_website.close();
        }
    });

    WA.room.onEnterLayer('second_website').subscribe(async () => {
        second_website = await WA.ui.website.open({
            url: "https://www.wikipedia.org/",
            position: {
                vertical: "top",
                horizontal: "right",
            },
            size: {
                height: "20vh",
                width: "50vw",
            },
        });
    });

    WA.room.onLeaveLayer('second_website').subscribe(() => {
        if (second_website) {
            second_website.close();
        }
    });
}
