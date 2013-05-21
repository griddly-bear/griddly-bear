(function($) {

$.widget('gb.grrr', {

    clearDiv: '<div class="gb-clear-both"></div>',
    columnDefaults: {
        primary: false,
        hidden: false,
        sortable: true,
        filterable: true
    },
    options: {
        columns: {},
        exportable: false,
        filters: {},
        footer: null,
        header: null,
        onRowClick: function(){},
        rowsPerPage: 10,
        rowsPerPageOptions: [10],
        sort: {},
        url: null,
        alternatingRows: true
    },
    state: {
        page: 1,
        rows: 0,
        totalPages: 0,
        filtersOn: false
    },

    // widget methods
    _create: function() {
        this._super();

        // put creation code here
        this._createHeader();
        this._createTable();
        this._createFooter();
        this._createEvents();

        this._getRows();
    },
    _setOption: function(key, value) {
        this._super(key, value);

        if ($.inArray(key, ['filters', 'sort']) !== -1) {
            this.state.page = 1;
            this._getRows();
        }
    },

    // private methods
    _createButton: function(params) {
        if (params.click == undefined || !$.isFunction(params.click)) {
            return false;
        }

        var button = $("<button />")
            .addClass('gb-button')
            .on('click', params.click);

        if (params.title != undefined) {
            button.attr('title', params.title);
        }

        if (params.icon != undefined) {
            button.append($("<img />").attr('src', params.icon).addClass('gb-button-icon'));
        }

        if (params.label != undefined) {
            button.append(params.label);
        }

        return button;
    },
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

        }).on('click', 'th a.gb-column-sort', function(e) {
            e.preventDefault();

            var columnId = $(this).attr('data-id');
            var order = columnId in self.options.sort ?
                (self.options.sort[columnId].toLowerCase() == 'asc' ? 'desc' : 'asc') : 'asc';

            var sort = {};
            sort[columnId] = order;

            self.option('sort', sort);
        }).on('change', 'input.filter', function() {
            var filters = self.options.filters;
            filters[$(this).attr('data-id')] = $(this).val();

            self.option('filters', filters);
        });
    },
    _createFooter: function() {
        var self = this;
        var footer = $('<div />').addClass('gb-footer');
        var buttonBox = $("<div />").addClass('gb-button-box');

        var buttons = this.options.footer.buttons;
        if (buttons != undefined && buttons.length > 0) {
            $.each(buttons, function(index, value){
                var btn = self._createButton(value);
                buttonBox.append(btn);
            });
        }

        footer.append($('<div />').addClass('gb-pages'))
            .append(this.clearDiv)
            .append(buttonBox)
            .append($("<div />").addClass('gb-pagination'))
            .append(this.clearDiv);
        this.element.append(footer);
    },
    _createHeader: function() {
        var self = this;
        var header = $('<div />').addClass('gb-header');
        var buttonBox = $("<div />").addClass('gb-button-box');

        var buttons = this.options.header.buttons;
        if (buttons != undefined && buttons.length > 0) {
            $.each(buttons, function(index, value){
                var btn = self._createButton(value);
                buttonBox.append(btn);
            });
        }

        if (this.options.header.title != undefined) {
            var title = $('<div />').addClass('gb-head-title').html(this.options.header.title);
            header.append(title).append(this.clearDiv);
        }

        header.append(buttonBox)
            .append($("<div />").addClass('gb-pagination'))
            .append(this.clearDiv)
            .append($('<div />').addClass('gb-pages'))
            .append(this.clearDiv);
        this.element.append(header);
    },
    _createPagination: function() {
        var self = this;

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

        var pages = $("<div />")
            .addClass('db-pages-text')
            .html('Page ' + this.state.page + ' of ' + this.state.totalPages);

        if (this.options.footer.pagination == undefined || this.options.footer.pagination) {
            $('div.gb-footer div.gb-pagination', this.element).before(pagination);
            $('div.gb-footer div.gb-pagination:last', this.element).remove();
            $('div.gb-footer div.gb-pages').html('').append(pages);
        }
        if (this.options.header.pagination != undefined && this.options.header.pagination) {
            $('div.gb-header div.gb-pagination', this.element).after(pagination.clone());
            $('div.gb-header div.gb-pagination:first', this.element).remove();
            $('div.gb-header div.gb-pages').html('').append(pages.clone());
        }

        return pagination;
    },
    _createTable: function() {
        var self = this;

        var table = $('<table />');
        var thead = $('<thead />');
        var tbody = $('<tbody />');

        // create header row
        var headTr = $('<tr />');
        headTr.addClass('gb-data-table-header-row');
        $.each(this.options.columns, function(index, column) {
            column = $.extend({}, self.columnDefaults, column);
            var th = $('<th />').attr('data-id', column.id);

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

            if (column.sortable) {
                th.append(
                    $('<a/>').attr({
                        href: '#',
                        class: 'gb-column-sort',
                        "data-id": column.id,
                        "data-sort": 'asc'
                    }).append(
                        $('<span/>').attr('class', 'gb-title').text(column.title)
                    )
                );
            } else {
                th.append(
                    $('<span/>').attr('class', 'gb-title').text(column.title)
                );
            }

            if (column.filterable) {
                th.append(
                    $('<input />').attr({
                        'type': 'text',
                        'name': 'filter[]',
                        'data-id': column.id,
                        'placeholder': 'Search...'
                    }).addClass('filter gb-hidden')
                );
            }

            th.attr({
                style: style,
                "data-id": column.id
            });

            headTr.append(th);
        });

        thead.append(headTr);
        table.append(thead);
        table.append(tbody);
        table.addClass('gb-data-table');

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
            var tr = $('<tr />');
            tr.addClass('gb-data-row')
            if (self.options.alternatingRows && !(index % 2)) {
                tr.addClass('alt');
            }
            tableBody.append(tr);
            var lastRow = $('tbody tr.gb-data-row', self.element).last();

            $.each(columns, function(index, column) {
                var td = $('<td />');
                td.addClass('gb-data-cell').html(row[column]);
                for (var i in self.options.columns) {
                    if (self.options.columns[i].id == column &&
                        self.options.columns[i].primary != undefined &&
                        self.options.columns[i].primary) {
                        td.attr('data-primary', 'true');
                    }
                }
                lastRow.append(td);
            });

        });

        this._createPagination();
    },
    _getRows: function() {
        var self = this;
        var params = {
            columns: [],
            filters: {},
            page: this.state.page,
            rowsPerPage: this.options.rowsPerPage,
            sort: {}
        };

        if (this.options.url === null) {
            throw "grrr, dude you got no url";
        }

        $.each(this.options.columns, function(index, column) {
            params.columns.push(column.id);
        });

        $.each(this.options.sort, function(sortColumn, order) {
            if ($.inArray(sortColumn, params.columns) > -1 && typeof order === 'string'
            && (order.toUpperCase() === 'ASC' || order.toUpperCase() === 'DESC')) {
                params['sort'][sortColumn] = order.toUpperCase();
            }
        });

        $.each(this.options.filters, function(filterColumn, filter) {
            if ($.inArray(filterColumn, params.columns) > -1
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
    reloadGrid: function() {

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
