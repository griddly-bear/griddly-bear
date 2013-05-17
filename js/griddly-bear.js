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
        lastWidth: 0,  // Compared to the current width to determine expanding or contracting.
        isResizing: false,  // So we don't get race conditions.
        padding: false // How much padding we have on the cells.
    },

    // widget methods
    _create: function() {
        var self = this;
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
        var self = this;

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
                lastRow.append('<td data-id="' + column + '">' + row[column] + '</td>');
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
        self.state.isResizing = true;
        var viewPortWidth = self.element.width();
        var table = self.element.children('table');
        var isVerticalLayout = false;

        var minWidthTotal = self._getMinWidthTotal();

        if (self.state.padding == false) {
            // Get padding and margin of the cells.
            //                       thead              tr                 th
            var firstCellDom = table.children(":first").children(":first").children(":first");
            self.state.padding = (parseInt(firstCellDom.css('padding').replace("px", "")) +
                parseInt(firstCellDom.css('margin').replace("px", ""))) * 2;
        }

        if (viewPortWidth < table.width()) {
            console.log("asdfasdf");
            while (viewPortWidth < table.width()) {
                var foundRemovable = false;
                $.each(this.options.columns.reverse(), function(index, column) {
                    var columnHeader = $('.gb-grid th[data-id="' + column.id + '"]');
                    if (typeof columnHeader.attr("data-required") == 'undefined' && columnHeader.is(":visible")) {
                        console.log(column.title);
                        $('.gb-grid *[data-id="' + column.id + '"]').hide();
                        foundRemovable = true;
                        return false;
                    }
                });
                minWidthTotal = self._getMinWidthTotal();
                if (foundRemovable == false) {
                    isVerticalLayout = true;
                    break;
                } else {
                    console.log("standard");
                }
            }
        } else if (minWidthTotal < table.width()) {
            console.log("ftttfttt");
            var spaceToFill = table.width() - minWidthTotal;
            console.log("sp: " + spaceToFill);
            $.each(this.options.columns, function(index, column) {
                if (!$('.gb-grid th[data-id="' + column.id + '"]').is(":visible") &&
                    (column.minWidth + self.state.padding) < spaceToFill) {
                    $('.gb-grid *[data-id="' + column.id + '"]').show();
                    return false;
                }
            });
            minWidthTotal = self._getMinWidthTotal();
        } else {
            console.log("meow");
            isVerticalLayout = true;
        }
        console.log("vp: " + viewPortWidth);
        console.log("mw: " + minWidthTotal);
        console.log("tw: " + table.width());

        if (isVerticalLayout) {
            self.element.addClass('gb-layout-vertical');
        } else {
            self.element.removeClass('gb-layout-vertical');
        }

        self.state.isResizing = false;
    },

    _getMinWidthTotal: function()
    {
        var self = this;
        var minWidthTotal = 0;
        $.each(this.options.columns, function(index, column) {
            if (self.element.hasClass('gb-layout-vertical')) {
                if (typeof $('.gb-grid th[data-id="' + column.id + '"]').attr("data-required") != 'undefined') {
                    minWidthTotal += (column.minWidth + self.state.padding + 10);
                }
            } else {
                if ($('.gb-grid th[data-id="' + column.id + '"]').is(":visible")) {
                    minWidthTotal += (column.minWidth + self.state.padding + 10);
                }
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
