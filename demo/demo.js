$(function() {

    $('#my-grid').grrr({
        url: "/demo/data.php",
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


    $('a.toggle-filters').on('click', function(e) {
        e.preventDefault();
        $('#my-grid').grrr('toggleFilters');
    })
});
