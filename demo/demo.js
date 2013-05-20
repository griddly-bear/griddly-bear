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
        ],
        header: {
            pagination:true,  // default: false
            title: 'Grid Title',
            buttons: [
                {
                    icon: '/demo/images/icon_funnel.png',
                    title: 'Toggle Filters',
                    label: '',
                    click: function(){
                        $('#my-grid').grrr('toggleFilters');
                    }
                },
                {
                    icon: '/demo/images/table_export.png',
                    title: 'button2',
                    label: '&nbsp;Label',
                    click: function(){
                        alert('clicked header 2');
                    }
                }
            ]
        },
        footer: {
            pagination: true,  // default: true
            buttons: [
                {
                    icon: '/demo/images/icon_funnel.png',
                    title: 'Toggle Filters',
                    label: '',
                    click: function(){
                        $('#my-grid').grrr('toggleFilters');
                    }
                },
                {
                    icon: '/demo/images/table_export.png',
                    title: 'button2',
                    label: '&nbsp;Label',
                    click: function(){
                        alert('clicked footer 2');
                    }
                }
            ]
        }
    });
});
