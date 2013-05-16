$(function() {

    $('#my-grid').grrr({
        url: "demo.json",
        columns: [
            {
                id: "name.first",
                title: "First Name"
            },
            {
                id: "name.last",
                title: "Last Name"
            }
        ]
    });
});
