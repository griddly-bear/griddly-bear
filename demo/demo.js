$(function() {

    $('#my-grid').grrr({
        url: "demo.json",
        columns: [
            {
                id: "name.id",
                title: "Id",
                minWidth: 25,
                required: true,
                primary: true
            },
            {
                id: "name.prefix",
                title: "Prefix",
                minWidth: 50,
                required: false
            },
            {
                id: "name.first",
                title: "First Name",
                minWidth: 200,
                required: true,
                primary: true
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
                id: "name.alias",
                title: "Alias",
                minWidth: 200,
                required: false
            }
        ],
        header: {
            pagination: true,  // default: false
            title: 'Grid Title',
            buttons: [
                {
                    icon: 'images/icon_funnel.png',
                    title: 'Toggle Filters',
                    label: '',
                    click: function(){
                        $('#my-grid').grrr('toggleFilters');
                    }
                },
                {
                    icon: 'images/table_export.png',
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
                    icon: 'images/icon_funnel.png',
                    title: 'Toggle Filters',
                    label: '',
                    click: function(){
                        $('#my-grid').grrr('toggleFilters');
                    }
                },
                {
                    icon: 'images/table_export.png',
                    title: 'button2',
                    label: '&nbsp;Label',
                    click: function(){
                        alert('clicked footer 2');
                    }
                }
            ]
        },
        onRowClick: function (target) {
            var key = {};
            key["name.id"] = 12;
            key['name.first'] = 'Eric';
            console.log('primary key:');
            console.log(key);
            console.log('row data:');
            console.log($('#my-grid').grrr('getRowData', key));
        }
    });
});
