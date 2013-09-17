# Griddly Bear Methods

The following methods are available for Griddly Bear. Methods can be used after creating the grid: 

```js
console.log($('#my-grid').grrr('methodName'));
```

| Method        | Arguments           | Description  |
| :------------- | :------------- | :----- |
| [getRowData](#getrowdata) | rowId | |
| [getSelectedRow](#getselectedrow) | | Get the selected row's or rows' data |
| [goToPage](#gotonextpage) |  | |
| [nextPage](#nextpage) |  |  |
| [previousPage](#previouspage) |  |  |
| [reloadGrid](#reloadgrid) |  |  |
| [toggleFilters](#togglefilters) |  |  |

## getRowData

## getSelectedRow

This method will get the selected row's data as an object, if any row is selected. If the 
[multiSelect](options.md#multiselect) option is `true`, this method will return an array of selected row objects.

```js
var selected = $('#my-grid').grrr('getSelectedRow');
```

## goToPage

## nextPage

## previousPage

## reloadGrid

## toggleFilters
