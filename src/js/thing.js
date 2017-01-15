// NPM modules
var _ = require('lodash');
var renderers = require('./renderers');

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

	$preview = $('#preview')
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
	$preview.show();
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

	pivot(false);
}

/*
 * Select aggregator was changed.
 */
function onAggSelectChange(e) {
	agg = $aggSelect.val();

	pivot(false);
}

/*
 * Sort order changed.
 */
function onSortSelectChange(e) {
	sortOrder = $sortSelect.val();

	pivot(false);
}

/*
 * Divisor changed.
 */
function onDivideSelectChange(e) {
	divideBy = parseInt($divideSelect.val());

	pivot(false);
}

/*
 * Decimal precision changed.
 */
function onDecimalSelectChange(e) {
	decimalPrec = parseInt($decimalSelect.val());
	console.log(decimalPrec);

	pivot(false);
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
function pivot(toClipboard) {
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
		renderer: renderers.previewRenderer
	}

	if (toClipboard) {
		// TODO
		pivotOptions['renderer'] = renderers.atlasTSVRenderer

		return;
	}

	$($pivottable).pivot(tableData, pivotOptions);
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
