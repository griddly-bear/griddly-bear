(function($) {

$.widget('gb.grrr', {

    options: {
        columns: null,
        exportable: false,
        filters: {},
        footer: null,
        header: null,
        onRowClick: function(){

        },
        rowsPerPage: 10,
        rowsPerPageOptions: [10],
        sort: {},
        url: null
    },

    state: {
        page: 1,
        rows: 0,
        totalPages: 0,
        filtersOn: false
    },

    // widget methods
    _create: function() {
        // put creation code here
        this._createHeader();
        this._createTable();
        this._createFooter();

        this._createEvents();

        this._getRows()

        this._super();
    },
    _init: function() {
        this._super('_init');
    },
    _setOption: function(key, value) {
        this._super(key, value);

        if (key == 'filters') {
            this.state.page = 1;
            this._getRows();
        }
    },

    // private methods
    _createEvents: function() {
        var self = this;

        $(this.element).on('click', 'div.gb-pagination a.gb-next', function(e) {
            e.preventDefault();
            self.nextPage();
        }).on('click', 'div.gb-pagination a.gb-previous', function(e) {
            e.preventDefault();
            self.previousPage();
        }).on('click', 'div.gb-pagination a.gb-page', function(e) {
            var page = parseInt($(this).attr('data-page'));
            e.preventDefault();
            self.goToPage(page);
        }).on('change', 'input.filter', function() {
            var filters = self.options.filters;
            filters[$(this).attr('data-id')] = $(this).val();

            self.option('filters', filters);
        });
    },
    _createFooter: function() {
        var footer = $('<div />').attr('class', 'gb-footer');

        if (this.state.totalPages > 1) {
            footer.append(this._createPagination());
        }

        this.element.append(footer);
    },
    _createHeader: function() {
        this.element.append('<div></div>');
    },
    _createPagination: function() {
        var self = this;
        // Remove any existing paginator:
        $('div.gb-footer div.gb-pagination', this.element).remove();

        if (this.state.totalPages <= 1) {
            return;
        }

        var pagination = $('<div/>').attr('class', 'gb-pagination');
        var ul = $('<ul />');

        var el = $('<li />');

        if (this.state.page > 1) {
            var a = $('<a/>').attr({
                href: '#',
                class: 'gb-previous',
                title: 'Previous Page'
            }).text('< Previous');

            el.append(a);
        } else {
            el.text('< Previous');
        }

        ul.append(el);

        var start = Math.max(1, self.state.page - 2);
        var end = Math.min(this.state.totalPages, self.state.page + 2);

        for (var i = start; i <= end; i++) {
            el = $('<li />');

            if (i == self.state.page) {
                el.attr('class', 'gb-current').text(i);
            } else {
                var a = $('<a/>').attr({
                    href: '#',
                    class: 'gb-page',
                    title: 'Page ' + i,
                    "data-page": i
                }).text(i);
                el.append(a);
            }

            ul.append(el);
        }

        el = $('<li/>');
        if (this.state.page < this.state.totalPages) {
            var a = $('<a/>').attr({
                href: '#',
                class: 'gb-next',
                title: 'Next Page'
            }).text('Next >');

            el.append(a);
        } else {
            el.text('Next >');
        }
        ul.append(el);

        pagination.append(ul);

        return pagination;
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
            th.html(
                '<span class="gb-title">' + column.title + '</span>' +
                '<input type="text" class="filter hidden" name="filter[]" data-id="' + column.id + '" />'
            );
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

        $('div.gb-footer', this.element).append(this._createPagination());
    },
    _getRows: function() {
        var self = this;
        var params = {
            filters: {},
            page: this.state.page,
            rowsPerPage: this.options.rowsPerPage,
            sort: {}
        };

        if (this.options.url === null) {
            throw "grrr, dude you got no url";
        }

        var columnIds = [];
        $.each(this.options.columns, function(index, column) {
            columnIds.push(column.id);
        });

        $.each(this.options.sort, function(sortColumn, order) {
            if ($.inArray(sortColumn, columnIds) > -1 && typeof order === 'string'
            && (order === 'ASC' || order === 'DESC')) {
                params['sort'][sortColumn] = order;
            }
        });

        $.each(this.options.filters, function(filterColumn, filter) {
            if ($.inArray(filterColumn, columnIds) > -1
            && (typeof filter === 'string' || typeof filter === 'number' || typeof filter === 'boolean')) {
                params['filters'][filterColumn] = filter;
            }
        });

        var getData = {params: JSON.stringify(params)};
        $.getJSON(this.options.url, getData, function(data) {
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

    },
    nextPage: function() {
        if (this.state.page < this.state.totalPages) {
            this.state.page++;
            this._getRows();
        }
    },
    previousPage: function() {
        if (this.state.page > 1) {
            this.state.page--;
            this._getRows();
        }
    },
    goToPage: function(page) {
        if (page > this.state.totalPages) {
            this.state.page = this.state.totalPages;
        } else if (page < 1) {
            this.state.page = 1;
        } else {
            this.state.page = page;
        }

        this._getRows();
    },
    toggleFilters: function()
    {
        this.state.filtersOn = !this.state.filtersOn;

        if (this.state.filtersOn) {
            $('input.filter', this.element).show();
        } else {
            $('input.filter', this.element).hide();
        }
    }

});

})(jQuery);
