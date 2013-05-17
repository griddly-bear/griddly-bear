$(function() {

    $('#my-grid').grrr({
        url: "demo.json",
        columns: [
            {
                id: "name.prefix",
                title: "Prefix",
                minWidth: 100,
                required: false
            },
            {
                id: "name.first",
                title: "First Name",
                minWidth: 200,
                required: true
            },
            {
                id: "name.middle",
                title: "Middle Name",
                minWidth: 200,
                required: false
            },
            {
                id: "name.last",
                title: "Last Name",
                minWidth: 200,
                required: true
            },
            {
                id: "name.suffix",
                title: "Suffix",
                minWidth: 100,
                required: false
            }
        ]
    });
});
