(function($) {

    $.widget('gb.grrr', {
        // properties
        columnDefaults: {
            primary: false,
            hidden: false,
            sortable: true,
            filterable: true,
            internal: false,
            filterOptions: {'placeholder': 'Search...'},
            dataType: null,
            minWidth: 150
        },
        events: {
            columnsResorted: 'columnResorted',
            columnVisibilityChanged: 'columnVisibilityChanged'
        },
        options: {
            columns: [],
            filters: {},
            footer: {pagination: true},
            header: null,
            onSelect: function(target) {},
            onFilter: function(filters) {},
            onDataSuccess: function(response) {},
            onDataFailure: function(response) {},
            multiSelect: false,
            rowsPerPage: 10,
            rowsPerPageOptions: [5,10,15],
            sort: {},
            url: null,
            alternatingRows: true,
            columnSelector: false,
            columnReordering: false,
            menuButtonIconClass: "icol-application-view-columns",
            columnPickerIconClass: "icol-application-view-columns",
            loadComplete: function(rows) {},
            onColumnValueChanged: function(id, value) {},
            formatRow: function(row) {return row},
            getDataOnInitialLoad: true,
            getInitialDataOnSubsequentEventType: null,
            getInitialDataOnSubsequentEventScope: null,
            useHorizontalScroll: false
        },
        staticState: {
            mobile: false,
            touch: false,
            collapseSize: -1
        },

        // widget methods
        _create: function() {
            this._super();
            this.state = {
                page: 1,
                rows: 0,
                isLoading: false, // Prevents race conditions during data-load
                lastLoad: null, // Holds the data object incase canceled
                isResizing: false,  // So we don't get race conditions.
                lastResize: Date.now(),
                width: $(window).width(),
                totalPages: 0,
                filtersOn: false,
                selectedRow: null,
                gridInitialLoad: false,
                primaryGbDataTable: null,
                primaryGbDataTableContainer: null,
                cursor: {
                    position: null,
                    tolerance: 40, // px
                    clickDelay: 500 //ms
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

            if(this.options.getDataOnInitialLoad) {
                this._getRows();
                this.state.gridInitialLoad = true;
            }

            var _this = this;

            if(_this.options.getInitialDataOnSubsequentEventType && _this.options.getInitialDataOnSubsequentEventScope) {
                $(_this.options.getInitialDataOnSubsequentEventScope).on(_this.options.getInitialDataOnSubsequentEventType, function() {
                    if(!_this.state.gridInitialLoad) {
                        _this._getRows();
                        _this.state.gridInitialLoad = true;
                    }
                })
            }
        },
        _setOption: function(key, value) {
            this._super(key, value);

            if ($.inArray(key, ['filters', 'sort']) !== -1) {
                this.state.page = 1;
                this.reloadGrid();
            }

            this.state.width = $(this.element).width();
        },
        _checkIsLoading: function() {
            if (this.state.isLoading) {
                this.state.lastLoad.abort();
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
                    $.each(params.icon.attributes, function(index, value) {
                        if (index.toLowerCase() == 'class') {
                            if (typeof value == 'string') {
                                icon.addClass(value);
                            } else {
                                $.each(value, function(index, className) {
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
                $.each(params.attributes, function(index, value) {
                    if (index.toLowerCase() == 'class') {
                        if (typeof value == 'string') {
                            button.addClass(value);
                        } else {
                            $.each(value, function(index, className) {
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
            var _this = this;

            $(window).resize(function() {
                _this.state.width = $(_this.element).width();

                if (_this.state.isResizing == false) {
                    if (Date.now() > (_this.state.lastResize + 500)) {
                        _this._onResize();
                    }
                }
            });

            //update the options.columns when a column is toggled
            $(this.element).on(this.events.columnVisibilityChanged, function(e, columnIndex) {
                _this._toggleOptionColumns(columnIndex);
            })

            //update the ordering of the options.columns when the UI reorders the table
            $(this.element).on(this.events.columnsResorted, function(e, data) {
                //Reorder the this.options.columns array to match the re-arranged columns
                _this._reorderOptionColumns(data);
            });

            $(this.element).on('click', '.gb-button.menuButton', function() {
                var buttonBox = $(_this.element).find(".gb-button-box");
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
                    _this.firstPage();
                } else if (link.hasClass('gb-next')) {
                    _this.nextPage();
                } else if (link.hasClass('gb-previous')) {
                    _this.previousPage();
                } else if (link.hasClass('gb-last')) {
                    _this.lastPage();
                } else if (link.hasClass('gb-page')) {
                    _this.goToPage(parseInt(link.attr('data-page')));
                }
            }).on('change', '.gb-pagination select', function() {
                var rowsPerPage = $(this).val();
                $(this).children('.gb-pagination select').val(rowsPerPage);
                _this.options.rowsPerPage = rowsPerPage;
                _this.state.page = 1;
                _this.reloadGrid();
            }).on('click', 'th a.gb-column-sort', function(e) {
                e.preventDefault();
                var columnId = $(this).attr('data-id');
                var order = columnId in _this.options.sort ?
                    (_this.options.sort[columnId].toLowerCase() == 'asc' ? 'desc' : 'asc') : 'asc';
                var sort = {};
                sort[columnId] = order;
                _this.option('sort', sort);
            }).on('change', 'input.filter', function() {
                var filters = _this.options.filters;
                filters[$(this).attr('data-id')] = $(this).val();
                _this.option('filters', filters);
            });

            // Touch events
            var _this = this;
            var tbody = $('table tbody', _this.element);

            //Place expressions here that evaluate to a boolean value where "true" means it's a touchscreen
            var touchConditionalsArray = [
                ('ontouchstart' in window),
                (navigator.MaxTouchPoints > 0),
                (navigator.msMaxTouchPoints > 0)
            ];

            //Find if any of the conditions indicating a touchscreen are true
            this.staticState.touch = (touchConditionalsArray.indexOf(true) >= 0);
            if (this.staticState.touch) {
                var taps,
                    x,
                    y,
                    reset = function () {
                        taps = 0;
                        x = NaN;
                        y = NaN;
                    };
                reset();

                $(this.element).on('touchstart', function (e) {
                    var touch = e.originalEvent.changedTouches[0] || {},
                        oldX = x,
                        oldY = y;
                    taps++;

                    x = +touch.pageX || +touch.clientX || +touch.screenX;
                    y = +touch.pageY || +touch.clientY || +touch.screenY;

                    if (Math.abs(oldX - x) < _this.state.cursor.tolerance &&
                        Math.abs(oldY - y) < _this.state.cursor.tolerance) {
                        e.preventDefault();
                        $(e.target).closest('tr').trigger('dblClick');
                    }

                    _this._selectRow($(e.target).closest('tr'));
                    setTimeout(reset, _this.state.cursor.clickDelay);
                })
                .on('touchmove', function(e){
                    _this.state.cursor.position = {
                        x: e.originalEvent.pageX,
                        y: e.originalEvent.pageY
                    };
                    reset();
                })
                .on('dblClick', 'tbody tr', function(e){
                    _this.options.onSelect(_this.getSelectedRow());
                });
            } else {
                $('table', this.element).attr("oncontextmenu","return false;"); // Disable right click context menu;
                $(this.element).on('dblclick', 'tbody tr', function() {
                    _this._selectRow($(this));
                    _this.options.onSelect(_this.getSelectedRow());
                }).on('click', 'tbody tr', function() {
                    _this._selectRow($(this));
                }).on('mouseup', 'tbody tr', function(event) { // Simulated right click handler.
                    if (event.which === 3) {
                        _this._selectRow($(this));
                        _this._showRowData(_this.state.selectedRow);
                    }
                });
            }
        },
        _createFooter: function() {
            if (typeof this.options.footer != 'undefined') {

                if(this.options.columnSelector) {
                    this._createColumnPicker();
                }

                if (this.options.footer != null) {
                    var cap = this._getCap(this.options.footer);
                    cap.addClass('gb-footer');
                    this.element.append(cap);
                }
            }
        },
        _createColumnPicker: function() {
            var _this = this;
            //build the column picker dialog
            this._createColumnPickerDialog();
            //add button to footer
            if(typeof this.options.footer.buttons == "undefined") {
                this.options.footer.buttons = [];
            }
            this.options.footer.buttons.unshift({
                icon: {
                    attributes: {
                        class: [this.options.columnPickerIconClass]
                    }
                },
                title: 'Show/Hide Columns',
                click: function(e) {
                    _this._toggleColumnPickerDialog();
                }
            });
        },
        _createColumnPickerDialog: function() {
            var _this = this;
            this.columnPickerDialog = $('<div></div>')
                .addClass('gb-column-picker')
                .prepend('<div><button>X</button></div>')
                .find('div')
                .css({ float: 'right', paddingTop: '5px' })
                .end()
                .find('button')
                .addClass('btn btn-mini btn-danger')
                .on('click', function() {
                    _this._toggleColumnPickerDialog();
                })
                .end()
                .append('<h4>Select Columns to Display</h4><hr />');

            var popoverContent = $('<ul></ul>');
            $.each(this.options.columns, function(index, column) {
                if (column.internal) {
                    return true;
                }

                var columnSelectCb = $('<input />')
                    .attr({
                        type: "checkbox",
                        id: column.id,
                        class: 'gb-column-picker-cb'
                    })
                    .on('click', function(e) {
                        _this.element.trigger(_this.events.columnVisibilityChanged, [index]);
                        var toggleSelector = 'td[data-id="' + column.id + '"], th[data-id="' + column.id + '"]';
                        $(toggleSelector).toggleClass('hidden');
                    });
                if(!column.hidden) {
                    columnSelectCb.attr('checked', 'checked');
                }

                var label = (typeof column.title == 'undefined' || column.title == '') ? column.id : column.title;
                $('<li><label></label></li>')
                    .addClass('gb-column-picker-li')
                    .find('label')
                    .text(label)
                    .prepend(columnSelectCb)
                    .end()
                    .appendTo(popoverContent);
            });

            popoverContent.appendTo(this.columnPickerDialog);
            this.columnPickerDialog.appendTo(this.element.parent())
                .css({ display: 'none' });
        },
        _toggleOptionColumns: function(index) {
            this.options.columns[index].hidden = !(this.options.columns[index].hidden);
        },
        _toggleColumnPickerDialog: function() {
            this.columnPickerDialog.slideToggle();
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
            var _this = this;
            var cap = $('<div />').addClass('gb-cap');
            var left = $('<div />').addClass('gb-cap-left');
            var mid = $('<div />').addClass('gb-cap-mid');
            var right = $('<div />').addClass('gb-cap-right');
            var buttonBox = $("<div />").addClass('gb-button-box');

            if (typeof options.buttons != 'undefined') {
                $.each(options.buttons, function(index, value) {
                    var btn = _this._createButton(value);
                    buttonBox.append(btn);
                });

                var menuButtonIcon = $("<i />").addClass("gb-button-icon").addClass(_this.options.menuButtonIconClass);
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
            var _this = this;

            $('.gb-pagination', _this.element).empty();
            $('.gb-pages', _this.element).empty();

            var pagination = $('<div/>').attr('class', 'gb-pagination');
            var ul = $('<ul />');
            var el = $('<li />');

            var rowsPerPageOptions = $('<select />').addClass('gb-rows-per-page');
            $.each(this.options.rowsPerPageOptions, function(index, value) {
                var rowOption = $('<option />')
                    .attr('value', value)
                    .text(value);
                if (value == _this.options.rowsPerPage) {
                    rowOption.attr('selected', true);
                }
                rowsPerPageOptions.append(rowOption);
            });

            pagination.append(rowsPerPageOptions);

            if (_this.state.totalPages > 1) {
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

                var start = Math.max(1, _this.state.page - 2);
                var end = Math.min(this.state.totalPages, (_this.state.page + (4-(_this.state.page - start))));
                var pages = end - start;

                if (pages < this.state.totalPages) {
                    start = Math.max(1, (start - (4 - pages)));
                }

                for (var i = start; i <= end; i++) {
                    el = $('<li />');

                    if (i == _this.state.page) {
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

            if (this.state.totalPages > 1) {
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

            var buttonBox = $(_this.element).find(".gb-button-box");
            var actions = buttonBox.find(".gb-button:not(.menuButton)");
            var menuButton = buttonBox.find(".gb-button.menuButton");
            var pagination = $(_this.element).find(".gb-pagination > ul");

            if (_this.staticState.mobile) {
                $(_this.element).find(".gb-cap-mid").addClass("mobile");
                $(_this.element).find(".gb-pagination").addClass("mobile");

                buttonBox.addClass("mobile");
                actions.addClass("hidden").addClass("mobile");
                menuButton.show();

                pagination.find(".page-link").hide();
                $(_this.element).find(".gb-rows-per-page").hide();
            } else {
                $(_this.element).find(".gb-cap-mid").removeClass("mobile");
                $(_this.element).find(".gb-pagination").removeClass("mobile");
                buttonBox.removeClass("mobile");
                actions.removeClass("hidden").removeClass("mobile");
                menuButton.hide();
                pagination.find(".page-link").show();
                $(_this.element).find(".gb-rows-per-page").show();
            }
        },
        _createTable: function() {
            var _this = this;

            var tableContainer = $('<div />');
            var table = $('<table />');
            var thead = $('<thead />');
            var tbody = $('<tbody />');

            this.element.addClass("gb-grid");

            // create header row
            var headTr = $('<tr />');
            headTr.addClass('gb-data-table-header-row');

            if (this.options.multiSelect) {
                headTr.append(
                    $('<th />')
                        .attr('data-selector', 'true')
                        .append(
                            $('<input/>')
                                .attr('type', 'checkbox')
                                .attr('select-all-checkbox', 'true')
                                .on('change', function() {
                                    _this._toggleSelectAll();
                                })
                        )
                );
            }

            $.each(this.options.columns, function(index, column) {
                column = $.extend({}, _this.columnDefaults, column);

                if (column.internal) {
                    return true;
                }

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

                if (typeof column.title == 'undefined' || (typeof column.title != 'undefined' && column.title.length == 0)) {
                    column.title = '\u00A0';
                }

                var title = $('<span/>').attr('class', 'gb-title');
                if (typeof column.shortTitle != 'undefined') {
                    title.html(column.shortTitle).attr('title', column.title);
                } else {
                    title.html(column.title);
                }

                if (column.sortable) {
                    th.append(
                        $('<a/>').attr({
                            href: '#',
                            class: 'gb-column-sort',
                            "data-id": column.id,
                            "data-sort": 'asc'
                        }).append(title)
                    );
                } else {
                    th.append(title);
                }

                if (column.filterable) {
                    var filter = $('<input />').attr({
                        'type': 'text',
                        'name': 'filter[]',
                        'data-id': column.id,
                        'placeholder': column.filterOptions.placeholder})
                        .addClass('filter');
                    if (_this.state.filtersOn == false) {
                        filter.hide();
                    }
                    if (typeof _this.options.filters[column.id] != 'undefined') {
                        filter.val(_this.options.filters[column.id]);
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

            if(this.options.useHorizontalScroll) {
                tableContainer.css({'display':'block', 'width':'100%', 'overflow-x':'scroll'});
            }
            this.state.primaryGbDataTable = table;

            tableContainer.append(table);
            this.state.primaryGbDataTableContainer = tableContainer;

            this.element.empty().append(tableContainer);

            this._applyHeaderSortStyling(this.options.sort);

            if (this.options.columnReordering) {
                this._setReorderableColumns();
            }
        },
        _toggleSelectAll: function() {
            var _this = this;

            if (!_this.options.multiSelect) {
                return;
            }

            var data = _this.tableData;

            if (typeof data.rows != 'undefined') {
                $.each(data.rows, function(rowIndex, row) {
                    if ($('[select-all-checkbox="true"]', _this.element).prop('checked')) {
                        $('#' + rowIndex, _this.element).prop('checked', true);
                    } else {
                        $('#' + rowIndex, _this.element).prop('checked', false);
                    }
                });
            }
        },
        _applyHeaderSortStyling: function(sort) {
            var _this = this;

            $.each(this.options.columns, function(index, column) {
                column = $.extend({}, _this.columnDefaults, column);
                if (column.sortable) {
                    if (sort[column.id] == 'ASC') {
                        $('th[data-id="' + column.id + '"]').addClass('sorting_asc');
                        $('th[data-id="' + column.id + '"]').removeClass('sorting_desc');
                    } else if (sort[column.id] == 'DESC') {
                        $('th[data-id="' + column.id + '"]').addClass('sorting_desc');
                        $('th[data-id="' + column.id + '"]').removeClass('sorting_asc');
                    } else {
                        $('th[data-id="' + column.id + '"]').removeClass('sorting_desc');
                        $('th[data-id="' + column.id + '"]').removeClass('sorting_asc');
                    }
                }
            });
        },
        _setReorderableColumns: function() {
            var _this = this,
                selector = "table.gb-data-table>thead>tr.gb-data-table-header-row"
            this.element.find(selector)
                .sortable({
                    axis: "x",
                    tolerance: "pointer",
                    forceHelperSize: true,
                    items: '> th',
                    cursor: 'pointer',
                    placeholder: 'gb-placeholder',
                    update: function(e, ui) {
                        var idArray = [];
                        _this.element.find(selector + '>th').each(function(index, item) {
                            idArray.push($(item).data('id'))
                        });
                        _this._reorderTableColumns(idArray);
                        _this.element.trigger(_this.events.columnsResorted, [idArray]);
                    }
                });
        },
        _reorderTableColumns: function(orderArray) {
            $.each(orderArray, function(index, columnId){
                $.each($('tr.gb-data-row'), function(i, row){
                    var cellSelector = 'th[data-id="' + columnId + '"], td[data-id="' + columnId + '"]';
                    var cell = $(this).children(cellSelector);
                    cell.detach().appendTo($(this));
                });
            });
        },
        _reorderOptionColumns: function(orderArray) {
            var newColumns = [];
            var _this = this;
            $.each(orderArray, function(index, columnId) {
                var tmpColArr = $.grep(_this.options.columns, function(column, index) {
                    return column.id == columnId
                });
                newColumns[index] = tmpColArr[0];
            });
            this.options.columns = newColumns;
        },
        _drawRows: function(data, sort) {
            var _this = this;
            var columns = [];
            var tableBody = $('tbody', this.element);

            $('thead th', _this.element).each(function() {
                if ($(this).attr('data-selector')) {
                    return;
                }
                columns.push($(this).attr('data-id'));
            });

            if (_this.options.multiSelect) {
                $('[select-all-checkbox="true"]', _this.element).prop('checked', false);
            }

            if (typeof data.rows != 'undefined') {
                $.each(data.rows, function(rowIndex, row) {
                    row = _this.options.formatRow(row);
                    var tr = $('<tr />');
                    tr.addClass('gb-data-row')
                    if (_this.options.alternatingRows && !(rowIndex % 2)) {
                        tr.addClass('alt');
                    }
                    tableBody.append(tr);
                    var lastRow = $('tbody tr.gb-data-row', _this.element).last();

                    if (_this.options.multiSelect) {
                        var td = $('<td />').attr('class', 'gb-data-cell');
                        td.addClass('multiselect-cell');
                        var checkbox = $('<input/>').attr({type: 'checkbox', id: rowIndex});
                        td.append(checkbox);
                        lastRow.append(td);
                    }

                    $.each(columns, function(index, column) {
                        var td = $('<td />');
                        var label = $('<span />');
                        label.addClass('gb-vertical-label').html(_this.options.columns[index].title + ": ");
                        td
                            .addClass('gb-data-cell')
                            .attr('data-id', column);

                        if (_this.options.columns[index].sortable !== false) {
                            if (sort[column]) {
                                td.addClass('sorting');
                            } else {
                                td.removeClass('sorting');
                            }
                        }

                        switch(_this.options.columns[index].dataType) {
                            case 'boolean':
                                var primaryKey = null;
                                var checkbox = $('<div />').addClass('gb-checkbox');
                                var input = $('<input/>').attr({ type: 'checkbox' });

                                if (row[column]) {
                                    input.attr('checked', 'checked');
                                }

                                $.each(columns, function(index, column) {
                                    if (_this.options.columns[index].primary == true) {
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
                                    _this.options.onColumnValueChanged(
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
                                        _this._formatColumnData(
                                            row[column],
                                            row,
                                            _this.options.columns[index].format
                                        )
                                    );
                        }
                        for (var i in _this.options.columns) {
                            if (_this.options.columns[i].id == column &&
                                _this.options.columns[i].primary != undefined &&
                                _this.options.columns[i].primary) {
                                td.attr('data-primary', 'true');
                            }
                            if (_this.options.columns[i].id == column &&
                                _this.options.columns[i].hidden) {
                                td.addClass('hidden');
                            }
                        }
                        lastRow.append(td);
                    });
                });
            }
            this._createPagination();
            this.options.loadComplete(data.rows);
        },
        _getRows: function() {
            var _this = this;
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
                    && (typeof filter === 'string' || typeof filter === 'number'
                    || typeof filter === 'boolean' || typeof filter === 'object')) {
                    params['filters'][filterColumn] = filter;
                }
            });

            var getData = {params: JSON.stringify(params)};

            _this.state.lastLoad = $.ajax({
                url: this.options.url,
                type: 'GET',
                data: getData,
                dataType: 'json',
                beforeSend: function(query) {
                    _this._checkIsLoading(query);
                    _this.state.isLoading = true;
                },
                success: function(data) {
                    if (!(typeof data.total === 'number' && data.total % 1 == 0)) {
                        _this.options.onDataFailure(data);
                    }

                    _this.state.rows = data.total;
                    _this.state.totalPages = Math.ceil(_this.state.rows / _this.options.rowsPerPage);
                    _this.tableData = data;
                    _this._drawRows(data, params['sort']);
                    _this._applyHeaderSortStyling(params['sort']);
                    _this._onResize();
                    $('table', _this.element).css('height', '');
                    $('.gb-filler', _this.element).remove();
                    if (Object.keys(params['filters']).length > 0) {
                        _this.options.onFilter(params['filters']);
                    }
                    _this.options.onDataSuccess(data);
                }
            }).done(function() {
                _this.state.isLoading = false;
            });
        },
        _selectRow: function(target) {
            var _this = this;
            _this._hideRowData();
            _this.state.selectedRow = target;
            $('table tbody tr', _this.element).removeClass('gb-row-selected');
            _this.state.selectedRow.addClass('gb-row-selected');
        },
        _onResize: function() {
            var _this = this;
            var viewPortWidth = _this.element.width();
            _this.state.isResizing = true;  // Prevent multi-resize events on race conditions.
            var table = $('table', this.element);
            var isVerticalLayout = false;
            var layoutChangeWidth = _this._getLayoutChangeWidth();
            var minWidthTotal = false;
            _this._hideRowData();
            if (_this.element.hasClass('gb-layout-vertical')) {
                minWidthTotal = layoutChangeWidth;
            } else {
                minWidthTotal = _this._getMinWidthTotal();
            }

            if (viewPortWidth < table.width() && !_this.options.useHorizontalScroll) { // View is shrinking.
                var executions = 0;
                while (viewPortWidth < table.width() && executions < this.options.columns.length) {
                    var foundRemovable = false;
                    $.each(_this.options.columns.reverse(), function(index, column) {
                        var columnHeader = $('table thead th[data-id="' + column.id + '"]', _this.element);
                        var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', _this.element);
                        if (columnHeader.length && !columnHeader.hasClass("gb-hidden") &&
                            (
                                typeof columnHeader.attr("data-required") == 'undefined' ||
                                    columnHeader.attr("data-required") == null ||
                                    columnHeader.attr("data-required") == 'false' ||
                                    columnHeader.attr("data-required") == false
                                )) {
                            foundRemovable = true;
                            columnHeader.addClass("gb-hidden");
                            columnRows.addClass("gb-hidden");
                            return false; // Break from each loop
                        }
                    });
                    if (foundRemovable == false) { // Nothing to hide? Switch to vertical.
                        isVerticalLayout = true;
                        break;
                    }
                    executions++;
                }
            } else if (table.width() >= minWidthTotal) { // View is growing.
                var spaceToFill = table.width() - minWidthTotal;
                $.each(this.options.columns, function(index, column) {
                    var columnHeader = $('table thead th[data-id="' + column.id + '"]', _this.element);
                    var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', _this.element);
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
                    var columnHeader = $('table thead th[data-id="' + column.id + '"]', _this.element);
                    var columnRows = $('table tbody tr td[data-id="' + column.id + '"]', _this.element);
                    if (typeof columnHeader.attr("data-required") == 'undefined') {
                        columnHeader.addClass("gb-hidden");
                        columnRows.addClass("gb-hidden");
                    } else if (columnHeader.attr("data-required") == 'false') {
                        columnHeader.addClass("gb-hidden");
                        columnRows.addClass("gb-hidden");
                    }
                });
            }
            _this.element.toggleClass('gb-layout-vertical', isVerticalLayout);

            var footerWidth = $(_this.element).find(".gb-footer").width();
            var totalWidth = 0;

            $(_this.element).find(".gb-footer").children("div:not(.gb-clear-both)").each(function() {
                totalWidth += $(this).width();
            });

            totalWidth = totalWidth * 1.15;

            if (totalWidth > _this.staticState.collapseSize) {
                _this.staticState.collapseSize = totalWidth;
            }

            if (footerWidth < totalWidth) {
                _this.staticState.mobile = true;
            } else if (_this.staticState.mobile && footerWidth > _this.staticState.collapseSize) {
                _this.staticState.mobile = false;
            }

            setTimeout(function() {
                _this._createPagination();
            }, 500);

            if (!_this.staticState.mobile && _this.options.useHorizontalScroll) {
                _this.state.primaryGbDataTable.css({'display':'block', 'width':'100%'});
            }

            _this.state.isResizing = false;
            _this.state.lastResize = Date.now();
        },
        _getLayoutChangeWidth: function()
        {
            var _this = this;
            var minWidthTotal = 0;
            $.each(this.options.columns, function(index, column) {
                var columnDom = $('th[data-id="' + column.id + '"]', _this.element);
                if (typeof columnDom.attr("data-required") != 'undefined') {
                    minWidthTotal += column.minWidth + _this._getExtraWidth(columnDom);
                }
            });
            return minWidthTotal;
        },
        _getMinWidthTotal: function()
        {
            var _this = this;
            var minWidthTotal = 0;
            $.each(this.options.columns, function(index, column) {
                var columnDom = $('th[data-id="' + column.id + '"]', _this.element);
                if (columnDom.hasClass("gb-hidden") == false) {
                    minWidthTotal += (typeof column.minWidth != 'undefined') ? column.minWidth : 100 +
                        _this._getExtraWidth(columnDom);
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
            var _this = this;
            if (target.hasClass('gb-additional-data') == false) {
                _this._hideRowData();
                if (target.hasClass('gb-data-expand') == false) {
                    var hasHidden = false;
                    $.each(this.options.columns, function(index, column) {
                        var columnHeader = $('table thead th[data-id="' + column.id + '"]', _this.element);
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
            var _this = this;
            if (typeof _this.tableData.rows == 'object') {
                var type = typeof id;
                if (type == 'undefined') {
                    return _this.tableData.rows;
                } else if (type == 'object') {
                    // Composite Key
                    if (id != null) {
                        // Validate passed keys
                        var keysPassed = 0;
                        var keysNeeded = 0;
                        $.each(id, function(keyField) {
                            $.each(_this.options.columns, function(index, column) {
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
                        $.each(_this.tableData.rows, function(index, row) {
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
                        return _this.tableData.rows;
                    }
                } else if (type == 'string' || type == 'number') {
                    // Single Key
                    var primaryKeyId = null;
                    var keysNeeded = 0;
                    $.each(_this.options.columns, function(index, column) {
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
                        $.each(_this.tableData.rows, function(index, row) {
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
            var _this = this;

            if (_this.state.selectedRow != null) {
                var index = $('table tbody tr', this.element).index(_this.state.selectedRow);
                if (typeof index == 'number') {
                    var selectedRow = _this.tableData.rows[index];
                    if (typeof selectedRow != 'undefined') {
                        return selectedRow;
                    }
                }
            }

            return null;
        },
        getSelectedRows: function() {
            var _this = this;

            if (_this.options.multiSelect) {
                var rows = [];
                $.each(
                    $('table tbody tr input[type="checkbox"]:checked', this.element),
                    function (index, box) {
                        var id = $(box).attr('id');
                        var data = _this.tableData.rows[id];

                        rows.push(data);
                    }
                );

                return rows;
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
        addFilter: function(column)
        {
            this.addFilters([column]);
        },
        addFilters: function(filterArray)
        {
            var filters = this.options.filters;
            $.each(filterArray, function(i, column) {
                if (column.type != "==") {
                    filters[column.column] = {type: column.type, value: column.value };
                } else {
                    //Default is filtered as a "like" query with wildcards on both ends
                    filters[column.column] = column.value;
                }
            });
            this.option('filters', filters);
        },
        clearFilters: function()
        {
            this.option('filters', {});
        },
        toggleFilters: function()
        {
            this.state.filtersOn = !this.state.filtersOn;

            if (this.state.filtersOn) {
                $('input.filter', this.element).show();
            } else {
                $('input.filter', this.element).hide();
            }
        },
        triggerResize: function()
        {
            this._onResize();
        },
        setUrl: function(url)
        {
            this.options.url = url;
        },
        getDataUrl: function ()
        {
            if (this.options.url === null) {
                throw "grrr, dude you got no url";
            }

            var params = {
                columns: [],
                filters: {},
                sort: {}
            };

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
                    && (typeof filter === 'string' || typeof filter === 'number'
                    || typeof filter === 'boolean' || typeof filter === 'object')) {
                    params['filters'][filterColumn] = filter;
                }
            });

            return this.options.url + '?params=' + JSON.stringify(params);
        },
        destroy: function()
        {
            this.element.empty();
            $.Widget.prototype.destroy.call(this);
        }
    });

})(jQuery);
