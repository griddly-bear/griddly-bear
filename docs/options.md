# Griddly Bear Options

The following options are available for Griddly Bear. They can be defined by declaring them with the grid: 

```js
$('#grid').grrr({
    optionName: 'optionValue'
});
```

| Option        | Default Value           | Description  |
| :------------- | :------------- | :----- |
| [rowsPerPage](#rowsperpage) | 10 | |
| [rowsPerPageOptions](#rowsperpageoptions) | [5,10,15] | |
| [alternatingRows](#alternatingrows) | true | |
| [multiSelect](#multiselect)      | false | Enables the ability to select multiple rows at once |

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
