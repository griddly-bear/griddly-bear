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
        for (c in this.option.columns) {
            var th = $('<th />');
            th.attr('data-id', c.id);
            th.html(c.title);
            headTr.append(th);
        }

        thead.append(headTr);
        table.append(thead);

        tbody.append(this._drawRows());
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
