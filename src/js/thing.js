// NPM modules
var _ = require('lodash');

var $html = null;
var $body = null;
var $uploadSection = null;
var $csvInput = null;
var $columnSection = null;
var $columns = null;
var $aggSection = null;
var $aggSelect = null;
var $optionsSection = null;
var $sortSelect = null;
var $divideSelect = null;
var $decimalSelect = null;
var $outputSection = null;
var $pivottable = null;

var columnTemplate = _.template('\
		<tr class="column">\
				<td><%= columnName %></td>\
				<td><input type="radio" name="><%= columnName %>" value="labels" /></td>\
				<td><input type="radio" name="><%= columnName %>" value="categories" /></td>\
				<td><input type="radio" name="><%= columnName %>" value="values" /></td>\
				<td><input type="radio" name="><%= columnName %>" value="ignore" /></td>\
		</tr>');

// Global state
var tableData = null;
var columnNames = null;
var columnUses = null;
var labelColumn = null;
var categoryColumn = null;
var valueColumn = null;
var agg = 'sum';
var sortOrder = 'rowAsc';
var divideBy = 1;
var decimalPrec = 2;

/*
 * On page load.
 */
function init() {
	$html = $('html');
	$body = $('body');

	$uploadSection = $('#upload');
	$csvInput = $('#upload input');

	$columnSection = $('#columns');
	$columns = $('#columns tbody');

	$aggSection = $('#aggregation');
	$aggSelect = $('#aggregation select');

	$optionsSection = $('#options');
	$sortSelect = $('#options select#sort');
	$divideSelect = $('#options select#divide')
	$decimalSelect = $('#options select#decimal')

	$outputSection = $('#output')
	$pivottable = $('#pivottable');

	$html.on('dragover', onDrag);
	$html.on('dragend', onDragEnd);
	$html.on('dragexit', onDragEnd);
	$html.on('dragleave', onDragEnd);
	$html.on('drop', onDrop);
	$csvInput.bind('change', onCSVChange);
	$aggSelect.bind('change', onAggSelectChange);
	$sortSelect.bind('change', onSortSelectChange);
	$divideSelect.bind('change', onDivideSelectChange);
	$decimalSelect.bind('change', onDecimalSelectChange);

	$uploadSection.show();
}

/*
 * When CSV file input changes.
 */
function onCSVChange(e) {
	parse(e.target.files[0]);
}

/*
 * Dragging...
 */
function onDrag(e) {
	e.stopPropagation();
	e.preventDefault();
	e.originalEvent.dataTransfer.dropEffect = 'copy';
	$body.addClass('drop-border');
};

/*
 * Drag ended without drop.
 */
function onDragEnd(e) {
	e.stopPropagation();
	e.preventDefault();
	e.originalEvent.dataTransfer.dropEffect = 'copy';
	$body.removeClass('drop-border');
}

/*
 * Dropped!
 */
function onDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	$body.removeClass('drop-border');
	parse(e.originalEvent.dataTransfer.files[0]);
}

/*
 * Process file upload.
 */
function parse(f) {
	$columnSection.hide();
	$columns.html('');
	$outputSection.hide();

	$($pivottable).html('<p align="center" style="color:grey;">(processing...)</p>')

	Papa.parse(f, {
		skipEmptyLines: true,
		complete: onParsed,
		error: function(e) {
			alert(e)
		},
	});
}

/*
 * When uploaded data has been parsed.
 */
function onParsed(parseResult) {
	tableData = parseResult.data;
	columnNames = tableData[0];

	_.each(columnNames, function(columnName, i) {
		var column = columnTemplate({
			'columnName': columnName
		});

		var $column = $(column);
		$columns.append($column);

		var defaultUse = 'ignore';

		if (i == 0) {
			defaultUse = 'labels';
		} else if (i == 1) {
			defaultUse = 'values';
		}

		$column.find('[value="' + defaultUse + '"]').attr('checked', 'checked');
		$column.find('input').on('change', onColumnUseChange)
	});

	// Populate global state
	onColumnUseChange();

	$columnSection.show();
	$aggSection.show();
	$optionsSection.show();
	$outputSection.show();
}

/*
 * Column use selected.
 */
function onColumnUseChange(e) {
	labelColumn = null;
	categoryColumn = null;
	valueColumn = null;

	_.each(columnNames, function(columnName, i) {
		var use = $columns.find('input:checked').eq(i).val();

		if (use == 'labels') {
			if (labelColumn) {
				alert('You may only have one label column!')
				return;
			}

			labelColumn = columnName;
		} else if (use == 'categories') {
			if (categoryColumn) {
				alert('You may only have one category column!')
				return;
			}

			categoryColumn = columnName;
		} else if (use == 'values') {

			if (valueColumn) {
				alert('You may only have one value column!')
				return;
			}
			valueColumn = columnName;
		}
	});

	pivot();
}

/*
 * Select aggregator was changed.
 */
function onAggSelectChange(e) {
	agg = $aggSelect.val();

	pivot();
}

/*
 * Sort order changed.
 */
function onSortSelectChange(e) {
	sortOrder = $sortSelect.val();

	pivot();
}

/*
 * Divisor changed.
 */
function onDivideSelectChange(e) {
	divideBy = parseInt($divideSelect.val());

	pivot();
}

/*
 * Decimal precision changed.
 */
function onDecimalSelectChange(e) {
	decimalPrec = parseInt($decimalSelect.val());
	console.log(decimalPrec);

	pivot();
}

/*
 * Quickly format a number for display.
 */
// function numberFormat(n) {
// 	if (isNaN(n) || !isFinite(n)) {
// 		return '';
// 	}
//
// 	return (n / divideBy).toFixed(decimalPrec);
// }

/*
 * Execute pivot.
 */
function pivot() {
	var numberFormat = $.pivotUtilities.numberFormat;
	var precFormat = numberFormat({
		scaler: 1 / divideBy,
		digitsAfterDecimal: decimalPrec,
		showZero: true
	});

	var aggregator = $.pivotUtilities.aggregatorTemplates[agg](precFormat)([valueColumn]);

	var pivotOptions = {
		rows: [labelColumn],
		cols: categoryColumn ? [categoryColumn] : [],
		aggregator: aggregator,
		renderer: atlasTSVRenderer
	}

	$($pivottable).pivot(tableData, pivotOptions);
}

/*
 * pivottable TSV renderer customized for Atlas.
 */
function atlasTSVRenderer(pivotData, opts) {
	var opts = $.extend(true, {}, opts)

	var rowKeys = pivotData.getRowKeys();

	if (rowKeys.length == 0) {
		rowKeys.push([]);
	}

	var colKeys = pivotData.getColKeys();

	if (colKeys.length == 0) {
		colKeys.push([]);
	}

	var rowAttrs = pivotData.rowAttrs;
	var colAttrs = pivotData.colAttrs;

	var header = [];
	var rows = [];

	_.each(rowAttrs, function(rowAttr) {
		header.push(rowAttr);
	});

	if (colKeys.length == 1 && colKeys[0].length == 0) {
		header.push(pivotData.aggregatorName);
	} else {
		_.each(colKeys, function(colKey) {
			header.push(colKey.join("-"));
		});
	}

	_.each(rowKeys, function(rowKey) {
		var row = [];

		_.each(rowKey, function(r) {
			row.push(r);
		});

		_.each(colKeys, function(colKey) {
			var agg = pivotData.getAggregator(rowKey, colKey);
			var value = agg.value();

			if (value) {
				row.push(agg.format(value));
			} else {
				row.push('null');
			}
		})

		rows.push(row);
	});

	if (sortOrder == 'rowAsc') {
		rows.sort(columnSorter(0, false));
	} else if (sortOrder == 'rowDesc') {
		rows.sort(columnSorter(0, true));
	} else if (sortOrder == 'valueAsc') {
		rows.sort(columnSorter(1, false));
	} else if (sortOrder == 'valueDesc') {
		rows.sort(columnSorter(1, true));
	}

	var text = header.join('\t') + '\n';

	_.each(rows, function(row) {
		text += row.join('\t') + '\n';
	});

	return $("<textarea>").text(text);
}

var columnSorter = function(columnIndex, reverse) {
	return function(a, b) {
		if (a[columnIndex] < b[columnIndex]) {
			return reverse ? 1 : -1;
		} else if (a[columnIndex] > b[columnIndex]) {
			return reverse ? -1 : 1;
		}

		return 0;
	}
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
