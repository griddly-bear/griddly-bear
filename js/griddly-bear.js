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

    state: {
        page: 1,
        rows: 0,
        totalPages: 1
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
    _buildUrl: function() {
        
    },
    _createFooter: function() {
        this.element.append('<div></div>');
    },
    _createHeader: function() {
        this.element.append('<div></div>');
    },
    _createPagination: function() {

    },
    _createTable: function() {
        var table = $('<table />');
        var thead = $('<thead />');
        var tbody = $('<tbody />');

        // create header row
        var headTr = $('<tr />');
        $.each(this.options.columns, function(index, column) {
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
        });

        thead.append(headTr);
        table.append(thead);

        table.append(tbody);

        this.element.append(table);
    },
    _drawRows: function(data) {
        var self = this;
        var columns = [];
        var tableBody = $('tbody', this.element);

        tableBody.html('');

        $('thead th', this.element).each(function() {
            columns.push($(this).attr('data-id'));
        });

        $.each(data.rows, function(index, row){
            tableBody.append('<tr></tr>');
            var lastRow = $('tbody tr', self.element).last();

            $.each(columns, function(index, column) {
                lastRow.append('<td>' + row[column] + '</td>');
            });

        });
    },
    _getRows: function() {
        var self = this;
        var query = {};

        if (this.options.url === null) {
            throw "grrr, dude you got no url";
        }

        $.getJSON(this.options.url, query, function(data) {
            if (!(typeof data.total === 'number' && data.total % 1 == 0)) {
                throw "grrr, total is not an integer";
            }

            self.state.rows = data.total;
            self.state.totalPages = Math.ceil(self.state.rows / self.options.rowsPerPage);

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
