$(function() {

    $('#my-grid').grrr({
        url: "demo.json",
        alternatingRows: true,
        columns: [
            {
                id: "name.first",
                title: "First Name",
                primary: true
            },
            {
                id: "name.last",
                title: "Last Name"
            }
        ]
    });
});
