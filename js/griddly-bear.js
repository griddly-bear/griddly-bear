(function($) {

$.widget('gb.grrr', {

    options: {
        columns: null,
        exportable: false,
        footer: null,
        header: null,
        order: null,
        onRowClick: function(){

        },
        rowsPerPage: 10,
        rowsPerPageOptions: [10],
        sort: null,
        url: null
    },

    // widget methods
    _create: function() {
        // put creation code here
        this._createHeader();
        this._createTable();
        this._createFooter();

        this._super();
    },
    _init: function() {
        this._super('_init');
    },

    // private methods
    _createFooter: function() {
        this.element.append('<div></div>');
    },
    _createHeader: function() {
        this.element.append('<div></div>');
    },
    _createTable: function() {
        var table = $('<table />');
        var thead = $('<thead />');
        var tbody = $('<tbody />');

        // create header row
        var headTr = $('<tr />');
        for (var column in this.options.columns) {
            var th = $('<th />');
            th.attr('data-id', column.id);

            if (column.required) {
                th.attr('data-required', 'true');
            }

            if (column.primary) {
                th.attr('data-primary', 'true');
            }

            if (column.hidden) {
                th.addClass('hidden');
            }

            var style = '';
            if (column.minWidth) {
                style = style + 'min-width:' + column.minWidth + 'px; ';
            }

            th.attr('style', style);
            th.html(column.title);
            headTr.append(th);
        }

        thead.append(headTr);
        table.append(thead);

        table.append(tbody);

        this.element.append(table);
    },
    _drawRows: function() {

    },
    _getRows: function() {

    },

    // public methods
    getRowData: function() {

    },
    getSelectedRow: function() {

    },
    reloadGrid: function() {

    }

});

})(jQuery);
