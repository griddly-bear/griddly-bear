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

        this._getRows()

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
        this.element.append('<table><tbody></tbody></table>');
    },
    _drawRows: function(data) {
        var self = this;
        var columns = [];
        var tableBody = $('tbody', this.element);

        tableBody.html('');

        $('thead th', this.element).each(function() {
            columns.push(this.attr('data-id'));
        });

        $.each(data.rows, function(index, row){
            var lastRow = $('tbody tr', self.element).last();

            tableBody.append('<tr></tr>');

            $.each(columns, function(index, column) {
                lastRow.append('<td>' + row[column] + '</td>');
            });

        });
    },
    _getRows: function() {
        var self = this;
        var query = {};

        if (this.options.url === null) {
            throw "url is null";
        }

        $.getJSON(this.options.url, query, function(data) {
            self._drawRows(data);
        });
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
