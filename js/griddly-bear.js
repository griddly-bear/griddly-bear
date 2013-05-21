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
        totalPages: 1,
        isResizing: false,  // So we don't get race conditions.
    },

    // widget methods
    _create: function() {
        // put creation code here
        this._createHeader();
        this._createTable();
        this._createFooter();

        this._getRows();
        //setTimeout(function() {self._onResize();}, 5000);
        this._super();
    },
    _init: function() {
        this._super('_init');
        this._initGlobalEvents();
    },

    _initGlobalEvents: function() {
        var self = this;
        $(window).resize(function() {
            if (self.state.isResizing == false) {
                self._onResize();
            }
        });
    },

    // private methods
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

        this.element.addClass("gb-grid");

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
                lastRow.append('<td data-id="' + column +
                    '"><span class="gb-vertical-label">' +
                    self.options.columns[index].title + ': </span>' + row[column] + '</td>');
            });
        });
        self._onResize();
    },
    _getRows: function() {
        var self = this;
        var query = {
            page: this.state.page,
            rowsPerPage: this.options.rowsPerPage
        };

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

    _onResize: function() {
        var self = this;
        var viewPortWidth = self.element.width();
        self.state.isResizing = true;  // Prevent multi-resize events on race conditions.
        var table = self.element.children('table');
        var isVerticalLayout = false;
        var layoutChangeWidth = self._getLayoutChangeWidth();
        var minWidthTotal = false;
        if (self.element.hasClass('gb-layout-vertical')) {
            minWidthTotal = layoutChangeWidth;
        } else {
            minWidthTotal = self._getMinWidthTotal();
        }

        if (viewPortWidth < table.width()) { // View is shrinking.
            while (viewPortWidth < table.width()) {
                var foundRemovable = false;
                $.each(this.options.columns.reverse(), function(index, column) {
                    var columnHeader = $('.gb-grid th[data-id="' + column.id + '"]');
                    if (typeof columnHeader.attr("data-required") == 'undefined' &&
                        columnHeader.hasClass("gb-hidden") == false) {
                        $('.gb-grid *[data-id="' + column.id + '"]').addClass("gb-hidden");
                        foundRemovable = true;
                        return false; // Break from each
                    }
                });
                if (foundRemovable == false) { // Nothing to hide? Switch to vertical.
                    isVerticalLayout = true;
                    break;
                }
            }
        } else if (table.width() >= minWidthTotal) { // View is growing.
            var spaceToFill = table.width() - minWidthTotal;
            $.each(this.options.columns, function(index, column) {
                if ($('.gb-grid th[data-id="' + column.id + '"]').hasClass("gb-hidden") &&
                    column.minWidth < spaceToFill) {
                    $('.gb-grid *[data-id="' + column.id + '"]').removeClass("gb-hidden");
                    return false; // Break from each
                }
            });
        } else if (minWidthTotal == layoutChangeWidth && table.width() <= minWidthTotal ) { // View is at minimum.
            isVerticalLayout = true;
        }

        self.element.toggleClass('gb-layout-vertical', isVerticalLayout);

        self.state.isResizing = false;
    },

    _getLayoutChangeWidth: function()
    {
        var minWidthTotal = 0;
        $.each(this.options.columns, function(index, column) {
            if (typeof $('.gb-grid th[data-id="' + column.id + '"]').attr("data-required") != 'undefined') {
                minWidthTotal += column.minWidth;
            }
        });
        return minWidthTotal;
    },

    _getMinWidthTotal: function()
    {
        var minWidthTotal = 0;
        $.each(this.options.columns, function(index, column) {
            if ($('.gb-grid th[data-id="' + column.id + '"]').hasClass("gb-hidden") == false) {
                minWidthTotal += column.minWidth;
            }
        });
        return minWidthTotal;
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
