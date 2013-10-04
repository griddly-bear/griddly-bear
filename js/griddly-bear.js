(function($) {

    $.widget('gb.grrr', {
        // properties
        columnDefaults: {
            primary: false,
            hidden: false,
            sortable: true,
            filterable: true,
            dataType: null
        },
        options: {
            columns: {},
            filters: {},
            footer: {pagination: true},
            header: null,
            onSelect: function(target){},
            multiSelect: false,
            rowsPerPage: 10,
            rowsPerPageOptions: [5,10,15],
            sort: {},
            url: null,
            alternatingRows: true,
            menuButtonIconClass: "icol-application-view-columns",
            loadComplete: function(){},
            onColumnValueChanged: function(id, value){}
        },
        staticState: {
            mobile: false,
            collapseSize: -1
        },

        // widget methods
        _create: function() {
            this._super();
            this.state = {
                page: 1,
                rows: 0,
                isResizing: false,  // So we don't get race conditions.
                lastResize: Date.now(),
                width: $(window).width(),
                totalPages: 0,
                filtersOn: false,
                selectedRow: null,
                cursor: {
                    origin: null,
                    position: null,
                    tolerance: 10, // px
                    holdWait: 2000 // ms
                }
            };
            // minWidth value required for responsiveness
            for (var i = 0; i < this.options.columns.length; i++) {
                if (typeof this.options.columns[i].minWidth == 'undefined') {
                    this.options.columns[i].minWidth = 100;
                }
            }

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

            this.state.width = $(this.element).width();
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
                var element = 'img';
                if (typeof params.icon.src == 'undefined') {
                    // No source, then using bootstrap
                    element = 'i';
                }
                var icon = $("<" + element + " />").addClass('gb-button-icon');
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
                self.state.width = $(self.element).width();

                if (self.state.isResizing == false) {
                    if (Date.now() > (self.state.lastResize + 500)) {
                        self._onResize();
                    }
                }
            });

            $(this.element).on('click', '.gb-button.menuButton', function() {
                var buttonBox = $(self.element).find(".gb-button-box");
                var actions = buttonBox.find(".gb-button:not(.menuButton)");

                if (!buttonBox.hasClass("open")) {
                    actions.removeClass("hidden");
                    buttonBox.addClass("open");
                } else {
                    actions.addClass("hidden");
                    buttonBox.removeClass("open");
                }
            });

            $(this.element).on('click', 'div.gb-pagination ul li', function(e) {
                e.preventDefault();
                var link = $(this).children('a');
                if (link.hasClass('gb-first')) {
                    self.firstPage();
                } else if (link.hasClass('gb-next')) {
                    self.nextPage();
                } else if (link.hasClass('gb-previous')) {
                    self.previousPage();
                } else if (link.hasClass('gb-last')) {
                    self.lastPage();
                } else if (link.hasClass('gb-page')) {
                    self.goToPage(parseInt(link.attr('data-page')));
                }
            }).on('change', '.gb-pagination select', function() {
                    var rowsPerPage = $(this).val();
                    $(this).children('.gb-pagination select').val(rowsPerPage);
                    self.options.rowsPerPage = rowsPerPage;
                    self.state.page = 1;
                    self.reloadGrid();
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

            // Touch events
            var self = this;
            var tbody = $('table tbody', self.element);
            var el = document.createElement('div');
            el.setAttribute('ongesturestart', 'return;');
            if (typeof el.ongesturestart === "function") { // Is a mobile device
                $(this.element).on('touchstart', 'tbody tr', function(event) {
                    var target = $(this);
                    clearTimeout(self.downTimer);
                    self.state.cursor.origin = {
                        x: event.originalEvent.pageX,
                        y: event.originalEvent.pageY
                    };
                    self.state.cursor.cancelClick = false;
                    self.downTimer = setTimeout(function() {
                        self.state.cursor.cancelClick = true;
                        self._selectRow(target);
                        self._showRowData(target);
                    }, self.state.cursor.holdWait);
                }).on('touchmove', 'tbody tr', function(event){
                        self.state.cursor.position = {
                            x: event.originalEvent.pageX,
                            y: event.originalEvent.pageY
                        };
                    }).on('touchend', 'tbody tr', function(){
                        clearTimeout(self.downTimer);
                        if (self.state.cursor.cancelClick == false) {
                            var isClick = false;
                            if (self.state.cursor.position == null) {
                                isClick = true;
                            } else {
                                var dX = Math.abs(self.state.cursor.position.x - self.state.cursor.origin.x);
                                var dY = Math.abs(self.state.cursor.position.y - self.state.cursor.origin.y);
                                if (dX <= self.state.cursor.tolerance && dY <= self.state.cursor.tolerance) {
                                    isClick = true;
                                }
                            }
                            if (isClick) {
                                self._selectRow($(this));
                                self.options.onSelect(self.getSelectedRow());
                            }
                            self.state.cursor.origin = null;
                            self.state.cursor.position = null;
                        }
                    });
            } else {
                $('table', this.element).attr("oncontextmenu","return false;"); // Disable right click context menu;
                $(this.element).on('dblclick', 'tbody tr', function(){
                    self._selectRow($(this));
                    self.options.onSelect(self.getSelectedRow());
                }).on('click', 'tbody tr', function() {
                        self._selectRow($(this));
                    }).on('mouseup', 'tbody tr', function(event) { // Simulated right click handler.
                        if (event.which === 3) {
                            self._selectRow($(this));
                            self._showRowData(self.state.selectedRow);
                        }
                    });
            }
        },
        _createFooter: function() {
            if (typeof this.options.footer != 'undefined') {
                if (this.options.footer != null) {
                    var cap = this._getCap(this.options.footer);
                    cap.addClass('gb-footer');
                    this.element.append(cap);
                }
            }
        },
        _createHeader: function() {
            if (typeof this.options.header != 'undefined') {
                if (this.options.header != null) {
                    var cap = this._getCap(this.options.header);
                    cap.addClass('gb-header');
                    this.element.append(cap);
                }
            }
        },
        _getCap: function(options) {
            var self = this;
            var cap = $('<div />').addClass('gb-cap');
            var left = $('<div />').addClass('gb-cap-left');
            var mid = $('<div />').addClass('gb-cap-mid');
            var right = $('<div />').addClass('gb-cap-right');
            var buttonBox = $("<div />").addClass('gb-button-box');

            if (typeof options.buttons != 'undefined') {
                $.each(options.buttons, function(index, value){
                    var btn = self._createButton(value);
                    buttonBox.append(btn);
                });

                var menuButtonIcon = $("<i />").addClass("gb-button-icon").addClass(self.options.menuButtonIconClass);
                var menuButton = $("<button />").addClass("gb-button").addClass("menuButton").attr("title","Actions");
                menuButton.append(menuButtonIcon);
                buttonBox.append(menuButton);
            }

            var clearDiv = '<div class="gb-clear-both"></div>';
            if (typeof options.title != 'undefined') {
                var title = $('<div />').addClass('gb-head-title').html(options.title);
                cap.append(title).append(clearDiv);
            }

            cap.append(left);
            cap.append(mid);
            cap.append(right);

            left.append(buttonBox);
            mid.append($('<div />').addClass('gb-pages'));
            right.append($("<div />").addClass('gb-pagination'));

            cap.append(clearDiv);

            return cap;
        },
        _createPagination: function() {
            var self = this;

            $('.gb-pagination', self.element).empty();
            $('.gb-pages', self.element).empty();

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

            if (self.state.totalPages > 1) {
                var tag = 'gb-first';

                if (this.state.page == 1) {
                    tag = 'gb-first-disabled';
                }

                var a = $('<a/>').attr({
                    href: '#',
                    class: tag,
                    title: 'First Page'
                }).text('|<');

                el.append(a);
                ul.append(el);

                el = $('<li />');
                tag = 'gb-previous';

                if (this.state.page == 1) {
                    tag = 'gb-previous-disabled';
                }

                a = $('<a/>').attr({
                    href: '#',
                    class: tag,
                    title: 'Previous Page'
                }).text('<<');

                el.append(a);
                ul.append(el);

                var start = Math.max(1, self.state.page - 2);
                var end = Math.min(this.state.totalPages, (self.state.page + (4-(self.state.page - start))));
                var pages = end - start;

                if (pages < this.state.totalPages) {
                    start = Math.max(1, (start - (4 - pages)));
                }

                for (var i = start; i <= end; i++) {
                    el = $('<li />');

                    if (i == self.state.page) {
                        el.attr('class', 'gb-current').text(i).addClass("page-link");
                    } else {
                        var a = $('<a/>').attr({
                            href: '#',
                            class: 'gb-page',
                            title: 'Page ' + i,
                            "data-page": i
                        }).text(i).addClass("page-link");
                        el.append(a);
                    }

                    ul.append(el);
                }

                el = $('<li/>');
                tag = 'gb-next';

                if(this.state.page == this.state.totalPages) {
                    tag = 'gb-next-disabled';
                }

                a = $('<a/>').attr({
                    href: '#',
                    class: tag,
                    title: 'Next Page'
                }).text('>>');

                el.append(a);
                ul.append(el);

                el = $('<li/>');
                tag = 'gb-last';

                if(this.state.page == this.state.totalPages) {
                    tag = 'gb-last-disabled';
                }

                a = $('<a/>').attr({
                    href: '#',
                    class: tag,
                    title: 'Last Page'
                }).text('>|');

                el.append(a);
                ul.append(el);

                pagination.append(ul);
            }


            if (self.state.rows > self.options.rowsPerPageOptions[0]) {
                pagination.append(rowsPerPageOptions);

                var pages = $("<div />")
                    .addClass('gb-pages-text')
                    .html('Page ' + this.state.page + ' of ' + this.state.totalPages);

                if (typeof this.options.footer != 'undefined') {
                    if (typeof this.options.footer == 'object' && this.options.footer != null) {
                        if (typeof this.options.footer.pagination != 'undefined') {
                            if (this.options.footer.pagination == true) {
                                $('div.gb-footer div.gb-pagination', this.element).before(pagination);
                                $('div.gb-footer div.gb-pagination:last', this.element).remove();
                                $('div.gb-footer div.gb-pages', this.element).html('').append(pages);
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
                                $('div.gb-header div.gb-pages', this.element).html('').append(pages.clone());
                            }
                        }
                    }
                }
            }

            $(this).children('.gb-cap-right').append(pagination);

            var buttonBox = $(self.element).find(".gb-button-box");
            var actions = buttonBox.find(".gb-button:not(.menuButton)");
            var menuButton = buttonBox.find(".gb-button.menuButton");
            var pagination = $(self.element).find(".gb-pagination > ul");

            if (self.staticState.mobile) {
                $(self.element).find(".gb-cap-mid").addClass("mobile");
                $(self.element).find(".gb-pagination").addClass("mobile");

                buttonBox.addClass("mobile");
                actions.addClass("hidden").addClass("mobile");
                menuButton.show();

                pagination.find(".page-link").hide();
                $(self.element).find(".gb-rows-per-page").hide();
            } else {
                $(self.element).find(".gb-cap-mid").removeClass("mobile");
                $(self.element).find(".gb-pagination").removeClass("mobile");
                buttonBox.removeClass("mobile");
                actions.removeClass("hidden").removeClass("mobile");
                menuButton.hide();
                pagination.find(".page-link").show();
                $(self.element).find(".gb-rows-per-page").show();
            }
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

            if (this.options.multiSelect) {
                headTr.append($('<th />').attr('data-selector', 'true'));
            }

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
                    var filter = $('<input />').attr({
                        'type': 'text',
                        'name': 'filter[]',
                        'data-id': column.id,
                        'placeholder': 'Search...'})
                        .addClass('filter');
                    if (self.state.filtersOn == false) {
                        filter.hide();
                    }
                    th.append(filter);
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

            $('thead th', self.element).each(function() {
                if ($(this).attr('data-selector')) {
                    return;
                }
                columns.push($(this).attr('data-id'));
            });

            $.each(data.rows, function(rowIndex, row){
                var tr = $('<tr />');
                tr.addClass('gb-data-row')
                if (self.options.alternatingRows && !(rowIndex % 2)) {
                    tr.addClass('alt');
                }
                tableBody.append(tr);
                var lastRow = $('tbody tr.gb-data-row', self.element).last();

                if (self.options.multiSelect) {
                    var td = $('<td />');
                    var checkbox = $('<input/>').attr({type: 'checkbox', id: rowIndex});
                    td.append(checkbox);
                    lastRow.append(td);
                }

                $.each(columns, function(index, column) {
                    var td = $('<td />');
                    var label = $('<span />');
                    label.addClass('gb-vertical-label').html(self.options.columns[index].title + ": ");
                    td
                        .addClass('gb-data-cell')
                        .attr('data-id', column);
                    switch(self.options.columns[index].dataType) {
                        case 'boolean':
                            var primaryKey = null;
                            var checkbox = $('<div />').addClass('gb-checkbox');
                            var input = $('<input/>').attr({ type: 'checkbox' });

                            if (row[column]) {
                                input.attr('checked', 'checked');
                            }

                            $.each(columns, function(index, column) {
                                if (self.options.columns[index].primary == true) {
                                    primaryKey = row[column];
                                }
                            });

                            input.attr('data-id', column);
                            if (primaryKey != null) {
                                input.attr('name', primaryKey);
                                input.attr('id', primaryKey);
                            } else {
                                input.attr('name', rowIndex);
                                input.attr('id', rowIndex);
                            }

                            input.on('change', function() {
                                self.options.onColumnValueChanged(
                                    primaryKey != null ? primaryKey : rowIndex,
                                    input.prop('checked')
                                );
                            });

                            checkbox.append(input);
                            td.append(checkbox);

                            break;
                        case 'string':
                        default:
                            td
                                .append(label)
                                .append(
                                    self._formatColumnData(
                                        row[column],
                                        row,
                                        self.options.columns[index].format
                                    )
                                );
                    }
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
            this.options.loadComplete();
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
                $('table', self.element).css('height', '');
                $('.gb-filler', self.element).remove();
            });
        },
        _selectRow: function(target) {
            var self = this;
            self._hideRowData();
            self.state.selectedRow = target;
            $('table tbody tr', self.element).removeClass('gb-row-selected');
            self.state.selectedRow.addClass('gb-row-selected');
        },
        _onResize: function() {
            var self = this;
            var viewPortWidth = self.element.width();
            self.state.isResizing = true;  // Prevent multi-resize events on race conditions.
            var table = $('table', this.element);
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
                        var columnHeader = $('table thead th[data-id="' + column.id + '"]', self.element);
                        var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', self.element);
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
                    var columnHeader = $('table thead th[data-id="' + column.id + '"]', self.element);
                    var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', self.element);
                    if (columnHeader.hasClass("gb-hidden") && column.minWidth < spaceToFill) {
                        columnHeader.removeClass("gb-hidden");
                        columnRows.removeClass("gb-hidden");
                        return false; // Break from each
                    }
                });
            } else if (minWidthTotal == layoutChangeWidth && table.width() <= minWidthTotal ) { // View is at minimum.
                isVerticalLayout = true;
            } else {
                // Proceed.
            }

            if (isVerticalLayout == true) {
                $.each(this.options.columns, function(index, column) {
                    var columnHeader = $('table thead th[data-id="' + column.id + '"]', self.element);
                    var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', self.element);
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

            var footerWidth = $(self.element).find(".gb-footer").width();
            var totalWidth = 0;

            $(self.element).find(".gb-footer").children("div:not(.gb-clear-both)").each(function() {
                totalWidth += $(this).width();
            });

            totalWidth = totalWidth * 1.15;

            if (totalWidth > self.staticState.collapseSize) {
                self.staticState.collapseSize = totalWidth;
            }

            if (footerWidth < totalWidth) {
                self.staticState.mobile = true;
            } else if (self.staticState.mobile && footerWidth > self.staticState.collapseSize) {
                self.staticState.mobile = false;
            }

            setTimeout(function() {
                self._createPagination();
            }, 500);

            self.state.isResizing = false;
            self.state.lastResize = Date.now();
        },
        _getLayoutChangeWidth: function()
        {
            var self = this;
            var minWidthTotal = 0;
            $.each(this.options.columns, function(index, column) {
                var columnDom = $('th[data-id="' + column.id + '"]', self.element);
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
                var columnDom = $('th[data-id="' + column.id + '"]', self.element);
                if (columnDom.hasClass("gb-hidden") == false) {
                    minWidthTotal += (typeof column.minWidth != 'undefined') ? column.minWidth : 100 +
                        self._getExtraWidth(columnDom);
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
            var self = this;
            if (target.hasClass('gb-additional-data') == false) {
                self._hideRowData();
                if (target.hasClass('gb-data-expand') == false) {
                    var hasHidden = false;
                    $.each(this.options.columns, function(index, column) {
                        var columnHeader = $('table thead th[data-id="' + column.id + '"]', self.element);
                        if (columnHeader.hasClass('gb-hidden')) {
                            hasHidden = true;
                            return false;
                        }
                    });
                    if (hasHidden) {
                        target.addClass('gb-data-expand');
                        var additionalData = $('<div />')
                            .addClass('gb-data-block')
                            .html(
                                target.html()
                                    .replace(/<td/gi, "<div")
                                    .replace(/<\/td>/gi, "</div>")
                            )
                            .css({
                                width: target.width() + 'px'
                            })
                        additionalData
                            .children('div')
                            .toggleClass('gb-hidden')
                            .removeClass('gb-data-cell')
                            .removeAttr('data-id')
                            .addClass('gb-additional-data-field')
                            .children('span')
                            .removeClass('gb-vertical-label')
                            .addClass('gb-additional-data-field-label');
                        additionalData
                            .children('.gb-hidden')
                            .remove();

                        var additionalRow = $("<tr />")
                            .addClass('gb-additional-data')
                            .addClass('gb-data-row');

                        var isFirstVisible = true;
                        target.children('td').each(function() {
                            var cell = $('<td />');
                            if ($(this).hasClass('gb-hidden')) {
                                cell.addClass('gb-hidden');
                            } else if (isFirstVisible == true) {
                                cell.append(additionalData);
                                isFirstVisible = false;
                            }
                            additionalRow.append(cell);
                        });

                        target.after(additionalRow);
                        additionalRow.css('height', additionalData.outerHeight() + 'px')
                    }
                }
            }
        },
        _hideRowData: function()
        {
            $('.gb-additional-data', this.element).remove();
            $('table tbody tr', this.element).removeClass('gb-data-expand');
        },
        _formatColumnData: function(data, rowData, format)
        {
            if (typeof format == 'undefined') {
                return data;
            }

            if ($.isFunction(format)) {
                return format(data, rowData);
            }

            return data;
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

            if (self.options.multiSelect) {
                var rows = [];
                $.each(
                    $('table tbody tr input[type="checkbox"]:checked', this.element),
                    function (index, box) {
                        var id = $(box).attr('id');
                        var data = self.tableData.rows[id];

                        rows.push(data);
                    }
                );

                return rows;
            } else {
                if (self.state.selectedRow != null) {
                    var index = $('table tbody tr', this.element).index(self.state.selectedRow);
                    if (typeof index == 'number') {
                        var selectedRow = self.tableData.rows[index];
                        if (typeof selectedRow != 'undefined') {
                            return selectedRow;
                        }
                    }
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
        lastPage: function() {
            if (this.state.page < this.state.totalPages) {
                console.log(this.state.totalPages);
                this.state.page = this.state.totalPages;
                this.reloadGrid();
            }
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
        firstPage: function() {
            if (this.state.page > 1) {
                this.state.page = 1;
                this.reloadGrid();
            }
        },
        reloadGrid: function() {
            $('table tbody', this.element).html('<tr class="gb-filler"><td></td></tr>');
            $('table thead th', this.element).removeClass('gb-hidden');
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
