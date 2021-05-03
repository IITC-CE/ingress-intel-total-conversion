window.checkCookieLaw = function () {

    const acceptCookies = window.readCookie('_ncc');
    if (typeof (acceptCookies) !== "undefined") return;

    var NCC_EXPIRE = 60;
    const html = '<p>We use cookies to give you the best possible user experience.</p>' +
        'Read our cookies policy <a href="https://nianticlabs.com/cookies/">here</a> ' +
        'to learn more about our use of cookies, your choices, and how to change your browser settings.'

    dialog({
        title: 'Niantic Cookies Policy',
        html,
        modal: true,
        buttons: [
            {
                text: "Decline",
                id: "cookiedecline",
                click: function () {
                    writeCookie("_ncc", 0, NCC_EXPIRE);
                    $(this).dialog("close");
                },
            },
            {
                text: "Accept",
                click: function () {
                    writeCookie("_ncc", 1, NCC_EXPIRE);
                    $(this).dialog("close");
                },
            }
        ]
    });

    $('#cookiedecline').css("margin-right", "2em");
}
