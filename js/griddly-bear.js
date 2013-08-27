(function($) {

$.widget('gb.grrr', {
    // properties
    clearDiv: '<div class="gb-clear-both"></div>',
    columnDefaults: {
        primary: false,
        hidden: false,
        sortable: true,
        filterable: true
    },
    options: {
        columns: {},
        filters: {},
        footer: null,
        header: null,
        onRowClick: function(){},
        rowsPerPage: 10,
        rowsPerPageOptions: [5,10,15],
        sort: {},
        url: null,
        alternatingRows: true
    },
    state: {
        page: 1,
        rows: 0,
        isResizing: false,  // So we don't get race conditions.
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
            this.reloadGrid();
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

        if (typeof params.icon != 'undefined') {
            var icon = $("<img />").addClass('gb-button-icon');
            if (typeof params.icon == 'string') {
                icon.attr('src', params.icon)
            } else if (typeof params.icon == 'object' && typeof params.icon.src != 'undefined') {
                icon.attr('src', params.icon.src);
            }
            if (typeof params.icon.attributes == 'object') {
                $.each(params.icon.attributes, function(index, value){
                    if (index.toLowerCase() == 'class') {
                        if (typeof value == 'string') {
                            icon.addClass(value);
                        } else {
                            $.each(value, function(index, className){
                                icon.addClass(className);
                            });
                        }
                    } else {
                        icon.attr(index, value);
                    }
                });
            }
            button.append(icon);
        }

        if (params.label != undefined) {
            button.append(params.label);
        }

        if (typeof params.attributes == 'object') {
            $.each(params.attributes, function(index, value){
                if (index.toLowerCase() == 'class') {
                    if (typeof value == 'string') {
                        button.addClass(value);
                    } else {
                        $.each(value, function(index, className){
                            button.addClass(className);
                        });
                    }
                } else {
                    button.attr(index, value);
                }
            });
        }

        return button;
    },
    _createEvents: function() {
        var self = this;

        $(window).resize(function() {
            if (self.state.isResizing == false) {
                self._onResize();
            }
        });

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
        }).on('change', '.gb-pagination select', function() {
            var rowsPerPage = $(this).val();
            $('.gb-pagination select').val(rowsPerPage);
            self.options.rowsPerPage = rowsPerPage;
            self.reloadGrid();
        });

        // Touch events
        var self = this;
        var tbody = $('.gb-grid table tbody');
        var onDown = function(target) {
            clearTimeout(self.downTimer);
            self.cancelClick = false;
            self.downTimer = setTimeout(function() {
                self.cancelClick = true;
                self.selectedRow = target;
                $('.gb-grid table tbody tr').removeClass('gb-row-selected');
                target.addClass('gb-row-selected');
                self._showRowData(target);
            }, 2000);
        };
        var onUp = function(target) {
            clearTimeout(self.downTimer);
            if (self.cancelClick == false) {
                self.selectedRow = target;
                $('.gb-grid table tbody tr').removeClass('gb-row-selected');
                target.addClass('gb-row-selected');
                self._hideRowData();
                self.options.onRowClick(target);
            }
        };
        var el = document.createElement('div');
        el.setAttribute('ongesturestart', 'return;');
        if (typeof el.ongesturestart === "function") {
            $(this.element).on('touchstart', 'tbody tr', function() {
                onDown($(this));
            }).on('touchend', 'tbody tr', function(){
                onUp($(this));
            });
        } else {
            $(this.element).on('mousedown', 'tbody tr', function() {
                onDown($(this));
            }).on('mouseup', 'tbody tr', function(){
                onUp($(this));
            });
        }
    },
    _createFooter: function() {
        if (typeof this.options.footer != 'undefined') {
            if (this.options.footer != null) {
                var self = this;
                var footer = $('<div />').addClass('gb-footer');
                var buttonBox = $("<div />").addClass('gb-button-box');

                if (typeof this.options.footer.buttons != 'undefined') {
                    $.each(this.options.footer.buttons, function(index, value){
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
            }
        }
    },
    _createHeader: function() {
        if (typeof this.options.header != 'undefined') {
            if (this.options.header != null) {
                var self = this;
                var header = $('<div />').addClass('gb-header');
                var buttonBox = $("<div />").addClass('gb-button-box');

                if (typeof this.options.header.buttons != 'undefined') {
                    $.each(this.options.header.buttons, function(index, value){
                        var btn = self._createButton(value);
                        buttonBox.append(btn);
                    });
                }

                if (typeof this.options.header.title != 'undefined') {
                    var title = $('<div />').addClass('gb-head-title').html(this.options.header.title);
                    header.append(title).append(this.clearDiv);
                }

                header.append(buttonBox)
                    .append($("<div />").addClass('gb-pagination'))
                    .append(this.clearDiv)
                    .append($('<div />').addClass('gb-pages'))
                    .append(this.clearDiv);
                this.element.append(header);
            }
        }
    },
    _createPagination: function() {
        var self = this;

        if (this.state.totalPages <= 1) {
            return;
        }

        var pagination = $('<div/>').attr('class', 'gb-pagination');
        var ul = $('<ul />');
        var el = $('<li />');

        var rowsPerPageOptions = $('<select />').addClass('gb-rows-per-page');
        $.each(this.options.rowsPerPageOptions, function(index, value) {
            var rowOption = $('<option />')
                .attr('value', value)
                .text(value);
            if (value == self.options.rowsPerPage) {
                rowOption.attr('selected', true);
            }
            rowsPerPageOptions.append(rowOption);
        });
        pagination.append(rowsPerPageOptions);

        if (this.state.page > 1) {
            var a = $('<a/>').attr({
                href: '#',
                class: 'gb-previous',
                title: 'Previous Page'
            }).text('<');

            el.append(a);
        } else {
            el.text('<');
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
            }).text('>');

            el.append(a);
        } else {
            el.text('>');
        }
        ul.append(el);

        pagination.append(ul);

        var pages = $("<div />")
            .addClass('db-pages-text')
            .html('Page ' + this.state.page + ' of ' + this.state.totalPages);

        if (typeof this.options.footer != 'undefined') {
            if (typeof this.options.footer == 'object' && this.options.footer != null) {
                if (typeof this.options.footer.pagination != 'undefined') {
                    if (this.options.footer.pagination == true) {
                        $('div.gb-footer div.gb-pagination', this.element).before(pagination);
                        $('div.gb-footer div.gb-pagination:last', this.element).remove();
                        $('div.gb-footer div.gb-pages').html('').append(pages);
                    }
                }
            }
        }

        if (typeof this.options.header != 'undefined') {
            if (typeof this.options.header == 'object' && this.options.header != null) {
                if (typeof this.options.header.pagination != 'undefined') {
                    if (this.options.header.pagination == true) {
                        $('div.gb-header div.gb-pagination', this.element).after(pagination.clone());
                        $('div.gb-header div.gb-pagination:first', this.element).remove();
                        $('div.gb-header div.gb-pages').html('').append(pages.clone());
                    }
                }
            }
        }

        return pagination;
    },
    _createTable: function() {
        var self = this;

        var table = $('<table />');
        var thead = $('<thead />');
        var tbody = $('<tbody />');

        this.element.addClass("gb-grid");

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

        this.element.append(
            $('<div/>')
                .addClass('gb-data-floater')
                .addClass('gb-layout-vertical')
                .addClass('gb-hidden')
        );
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
                var label = $('<span />');
                label.addClass('gb-vertical-label').html(self.options.columns[index].title + ": ");
                td
                    .addClass('gb-data-cell')
                    .attr('data-id', column)
                    .append(label)
                    .append(row[column]);
                for (var i in self.options.columns) {
                    if (self.options.columns[i].id == column &&
                        self.options.columns[i].primary != undefined &&
                        self.options.columns[i].primary) {
                        td.attr('data-primary', 'true');
                    }
                    if (self.options.columns[i].id == column &&
                        self.options.columns[i].hidden) {
                        td.addClass('hidden');
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
            self.tableData = data;
            self._drawRows(data);
            self._onResize();
            $('.gb-grid table').css('height', '');
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
        self._hideRowData();
        if (self.element.hasClass('gb-layout-vertical')) {
            minWidthTotal = layoutChangeWidth;
        } else {
            minWidthTotal = self._getMinWidthTotal();
        }
        if (viewPortWidth < table.width()) { // View is shrinking.
            while (viewPortWidth < table.width()) {
                var foundRemovable = false;
                $.each(this.options.columns.reverse(), function(index, column) {
                    var columnHeader = $('.gb-grid table thead th[data-id="' + column.id + '"]');
                    var columnRows = $('.gb-grid table tbody tr td[data-id="' + column.id + '"]');
                    if (columnHeader.hasClass("gb-hidden") == false) {
                        if (typeof columnHeader.attr("data-required") == 'undefined') {
                            foundRemovable = true;
                        } else if (columnHeader.attr("data-required") == 'false') {
                            foundRemovable = true;
                        }
                        if (foundRemovable) {
                            columnHeader.addClass("gb-hidden");
                            columnRows.addClass("gb-hidden");
                            return false; // Break from each loop
                        }
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
                var columnHeader = $('.gb-grid table thead th[data-id="' + column.id + '"]');
                var columnRows = $('.gb-grid table tbody tr td[data-id="' + column.id + '"]');
                if (columnHeader.hasClass("gb-hidden") && column.minWidth < spaceToFill) {
                    columnHeader.removeClass("gb-hidden");
                    columnRows.removeClass("gb-hidden");
                    return false; // Break from each
                }
            });
        } else if (minWidthTotal == layoutChangeWidth && table.width() <= minWidthTotal ) { // View is at minimum.
            isVerticalLayout = true;
        }

        if (isVerticalLayout == true) {
            $.each(this.options.columns, function(index, column) {
                var columnHeader = $('.gb-grid table thead th[data-id="' + column.id + '"]');
                var columnRows = $('.gb-grid table tbody tr td[data-id="' + column.id + '"]');
                if (typeof columnHeader.attr("data-required") == 'undefined') {
                    columnHeader.addClass("gb-hidden");
                    columnRows.addClass("gb-hidden");
                } else if (columnHeader.attr("data-required") == 'false') {
                    columnHeader.addClass("gb-hidden");
                    columnRows.addClass("gb-hidden");
                }
            });
        }
        self.element.toggleClass('gb-layout-vertical', isVerticalLayout);

        self.state.isResizing = false;
    },
    _getLayoutChangeWidth: function()
    {
        var self = this;
        var minWidthTotal = 0;
        $.each(this.options.columns, function(index, column) {
            var columnDom = $('.gb-grid th[data-id="' + column.id + '"]');
            if (typeof columnDom.attr("data-required") != 'undefined') {
                minWidthTotal += column.minWidth + self._getExtraWidth(columnDom);
            }
        });
        return minWidthTotal;
    },
    _getMinWidthTotal: function()
    {
        var self = this;
        var minWidthTotal = 0;
        $.each(this.options.columns, function(index, column) {
            var columnDom = $('.gb-grid th[data-id="' + column.id + '"]');
            if (columnDom.hasClass("gb-hidden") == false) {
                minWidthTotal += column.minWidth + self._getExtraWidth(columnDom);
            }
        });
        return minWidthTotal;
    },
    _getExtraWidth: function(element)
    {
        var width = 0;
        width += parseInt(element.css("padding-left".replace("px", "")));
        width += parseInt(element.css("padding-right").replace("px", ""));
        width += parseInt(element.css("margin-left").replace("px", ""));
        width += parseInt(element.css("margin-right").replace("px", ""));
        width += parseInt(element.css("borderLeftWidth").replace("px", ""));
        width += parseInt(element.css("borderRightWidth").replace("px", ""));
        return width;
    },
    _showRowData: function(target)
    {
        var hasHidden = false;
        $.each(this.options.columns, function(index, column) {
            var columnHeader = $('.gb-grid table thead th[data-id="' + column.id + '"]');
            if (columnHeader.hasClass('gb-hidden')) {
                hasHidden = true;
                return false;
            }
        });
        if (hasHidden) {
            var rowData = target.html();
            var floater = $('.gb-data-floater');
            floater.html(rowData);
            floater.children('td').toggleClass('gb-hidden');
            floater.css('top', target.offset().top + target.height() - 1);
            if (target.hasClass('gb-data-expand')) {
                target.removeClass('gb-data-expand');
            } else {
                $('.gb-grid table tbody tr').removeClass('gb-data-expand');
                target.addClass('gb-data-expand');
            }
            floater.removeClass('gb-hidden');
        }
    },
    _hideRowData: function()
    {
        $('.gb-data-floater').addClass('gb-hidden');
        $('.gb-grid table tbody tr').removeClass('gb-data-expand');
    },
    // public methods
    getRowData: function(id) {
        var self = this;
        if (typeof self.tableData.rows == 'object') {
            var type = typeof id;
            if (type == 'undefined') {
                return self.tableData.rows;
            } else if (type == 'object') {
                // Composite Key
                if (id != null) {
                    // Validate passed keys
                    var keysPassed = 0;
                    var keysNeeded = 0;
                    $.each(id, function(keyField) {
                        $.each(self.options.columns, function(index, column) {
                            if (column.primary == true) {
                                keysNeeded ++;
                            }
                            if(column.id = keyField && column.primary == true) {
                                keysPassed ++;
                            }
                        });
                    });
                    if (keysNeeded != keysPassed) {
                        return null;
                    }
                    var foundRow = null;
                    $.each(self.tableData.rows, function(index, row) {
                        var passed = true;
                        $.each(id, function(keyField, value) {
                            if (row[keyField] != value) {
                                passed = false;
                            }
                        });
                        if(passed) {
                            foundRow = row;
                            return false;
                        }
                    });
                    if (foundRow != null) {
                        return foundRow;
                    }
                } else {
                    return self.tableData.rows;
                }
            } else if (type == 'string' || type == 'number') {
                // Single Key
                var primaryKeyId = null;
                var keysNeeded = 0;
                $.each(self.options.columns, function(index, column) {
                    if(column.primary == true) {
                        keysNeeded ++;
                        primaryKeyId = column.id;
                    }
                });
                if (keysNeeded > 1) {
                    return null;
                }
                if (primaryKeyId != null) {
                    var foundRow = null;
                    $.each(self.tableData.rows, function(index, row) {
                        if(row[primaryKeyId] == id) {
                            foundRow = row;
                            return false;
                        }
                    });
                    if (foundRow != null) {
                        return foundRow;
                    }
                }
            }
        }
        return null;
    },
    getSelectedRow: function() {
        var self = this;
        var index = $('.gb-grid table tbody tr').index(self.selectedRow);
        if (typeof index == 'number') {
            var selectedRow = self.tableData.rows[index];
            if (typeof selectedRow != 'undefined') {
                return selectedRow;
            }
        }
        return null;
    },
    goToPage: function(page) {
        if (page > this.state.totalPages) {
            this.state.page = this.state.totalPages;
        } else if (page < 1) {
            this.state.page = 1;
        } else {
            this.state.page = page;
        }

        this.reloadGrid();
    },
    nextPage: function() {
        if (this.state.page < this.state.totalPages) {
            this.state.page++;
            this.reloadGrid();
        }
    },
    previousPage: function() {
        if (this.state.page > 1) {
            this.state.page--;
            this.reloadGrid();
        }
    },
    reloadGrid: function() {
        var height = $('.gb-grid table').height();
        $('.gb-grid table').css('height', height + 'px');
        $('.gb-grid table tbody').html('<tr><td></td></tr>');
        $('.gb-grid table thead th').removeClass('gb-hidden');
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
