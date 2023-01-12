WA.onInit().then(() => {
    initListeners();

});

async function initListeners() {
    let first_website = undefined;
    let second_website = undefined;
    let third_website = undefined;

    WA.room.onEnterLayer('first_website').subscribe(async () => {
        first_website = await WA.ui.website.open({
            allowApi: true,
            url: "http://maps.workadventure.localhost/tests/UIWebsite/index.php",
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

    WA.room.onLeaveLayer('first_website').subscribe(async () => {
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
            margin: {
                top: "5vh",
            }
        });
    });

    WA.room.onLeaveLayer('second_website').subscribe(async () => {
        if (second_website) {
            second_website.close();
        }
    });

    third_website = await WA.ui.website.open({
        url: "https://www.wikipedia.org/",
        position: {
            vertical: "bottom",
            horizontal: "left",
        },
        size: {
            height: "20vh",
            width: "50vw",
        },
        margin: {
            bottom: "5vh",
        }
    });
}
