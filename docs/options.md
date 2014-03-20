# Griddly Bear Options

The following options are available for Griddly Bear. They can be defined by declaring them with the grid: 

```js
$('#grid').grrr({
    optionName: 'optionValue'
});
```

| Option        | Default Value           | Description  |
| :------------- | :------------- | :----- |
| [formatRow](#formatrow) ||Allows formatting rows before rendering in the grid |
| [rowsPerPage](#rowsperpage) | 10 | |
| [rowsPerPageOptions](#rowsperpageoptions) | [5,10,15] | |
| [alternatingRows](#alternatingrows) | true | |
| [multiSelect](#multiselect)      | false | Enables the ability to select multiple rows at once |
| [columnSelector](#columnselector)      | false | Adds a button to the footer which displays a column picker dialog |

## formatRow

Allows formatting a row value before it is rendered in the grid. Example: 

```js
$('#grid').grrr({
    formatRow: function(data) {
        data.status = data.status.toUpperCase();
        return data;
    }
});
```

This example will transform the value in `data.status` to all upper case characters, then return the row for rendering.

## rowsPerPage

## rowsPerPageOptions

## alternatingRows

## multiSelect

Values: `true`|`false` 

When enabled, `multiSelect` allows the user to select multiple rows at once via a checkbox that is drawn 
as the first column of the grid: 

```js
$('#grid').grrr({
    multiSelect: true
});
```

When this is enabled, the [getSelectedRow() method](methods.md#getselectedrow) with return an array of all
selected rows, whereas it returns an object of the selected row when `multiSelect` is false.

##columnselector
Values: `true`|`false`

When enabled, it adds a button to the first position on the footer. When the button is clicked, it displays a
popup containing a list of checkboxes with the column title indicating the hidden status. Toggling the checkboxes
toggles the class `hidden` on the table heading and cells in that column.
