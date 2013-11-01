$(function() {

    $('#my-grid').grrr({
        url: "demo.json",
        columns: [
            {
                id: "name.prefix",
                title: "Prefix",
                minWidth: 50,
                required: false,
                filterOptions: {placeholder: 'Custom Placeholder'}
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
                required: false,
                format: function(data, rowData) {
                    return rowData['name.first'] + ' "' + data + '" ' + rowData['name.last'];
                }
            }
        ],
        header: {
            pagination: true,  // default: false
            title: 'Grid Title',
            buttons: [
                {
                    icon: {
                        src: 'images/icon_funnel.png',
                        attributes: {
                            class: ['class1','class2'],
                            'data-stuff': 'something-here'
                        }
                    },
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
        onSelect: function (target) {
            console.log(target);
        }
    });
});
