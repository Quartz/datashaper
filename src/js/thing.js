// NPM modules
var _ = require('lodash');
var Clipboard = require('clipboard');
var renderers = require('./renderers');

var $html = null;
var $body = null;
var $uploadSection = null;
var $csvInput = null;
var $pasteInput = null;
var $columnSection = null;
var $columns = null;
var $columnWarnings = null;
var $aggSection = null;
var $aggReason = null;
var $aggSelect = null;
var $optionsSection = null;
var $sortSelect = null;
var $divideSelect = null;
var $decimalSelect = null;
var $preview = null;
var $pivottable = null;
var $copytable = null;

var columnTemplate = _.template('\
		<tr class="column">\
				<td class="name"><%= columnName %></td>\
				<td class="rows"><input type="radio" name="><%= columnName %>" value="labels" /></td>\
				<td class="columns"><input type="radio" name="><%= columnName %>" value="categories" /></td>\
				<td class="values"><input type="radio" name="><%= columnName %>" value="values" /></td>\
				<td><input type="radio" name="><%= columnName %>" value="ignore" /></td>\
		</tr>');

// Global state
var tableData = null;
var columnNames = null;
var columnUses = null;
var columnUniques = null;
var aggregationRequired = null;
var aggregationReason = null;
var labelColumn = null;
var categoryColumn = null;
var valueColumns = [];
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
	$pasteInput = $('#upload textarea');

	$columnSection = $('#columns');
	$columns = $('#columns tbody');
	$columnWarnings = $('#columns .warnings')

	$aggSection = $('#aggregation');
	$aggReason = $('#aggregation .reason');
	$aggSelect = $('#aggregation select');

	$optionsSection = $('#options');
	$sortSelect = $('#options select#sort');
	$divideSelect = $('#options select#divide')
	$decimalSelect = $('#options select#decimal')

	$outputSection = $('#output')

	$preview = $('#preview')
	$pivottable = $('#pivottable');
	$copytable = $('#copytable');

	$html.on('dragover', onDrag);
	$html.on('dragend', onDragEnd);
	$html.on('dragexit', onDragEnd);
	$html.on('dragleave', onDragEnd);
	$html.on('drop', onDrop);
	$csvInput.bind('change', onCSVChange);
	$pasteInput.on('input onpropertychange', onPasteChange);
	$aggSelect.bind('change', onAggSelectChange);
	$sortSelect.bind('change', onSortSelectChange);
	$divideSelect.bind('change', onDivideSelectChange);
	$decimalSelect.bind('change', onDecimalSelectChange);

	var clipboard = new Clipboard('#copy', {
		text: function(trigger) {
			return pivot(true);
		}
	});

	clipboard.on('success', function(e) {
		alert('Copied!');
	});

	clipboard.on('error', function(e) {
		alert('Error copying!');
	});

	$uploadSection.show();
}

/*
 * When CSV file input changes.
 */
function onCSVChange(e) {
	$pasteInput.val('');
	parse(e.target.files[0]);
}

/*
 * When paste field changes.
 */
function onPasteChange(e) {
	parse($(this).val());
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
	columnUniques = new Array(columnNames.length);

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
	$optionsSection.show();
	$preview.show();
}

/*
 * Column use selected.
 */
function onColumnUseChange(e) {
	labelColumn = null;
	categoryColumn = null;
	valueColumns = [];

	$columnWarnings.empty();

	_.each(columnNames, function(columnName, i) {
		var use = $columns.find('input:checked').eq(i).val();

		if (use == 'labels') {
			if (labelColumn) {
				$columnWarnings.append($('<p>🚨 You may only have one "Rows"! 🚨</p>'));
			}

			labelColumn = columnName;
		} else if (use == 'categories') {
			if (categoryColumn) {
				$columnWarnings.append($('<p>🚨 You may only have one "Columns"! 🚨</p>'));
			}

			categoryColumn = columnName;
		} else if (use == 'values') {
			valueColumns.push(columnName);
		}
	});

	if (labelColumn === null) {
		$columnWarnings.append($('<p>🚨 You must select a "Rows" column! 🚨</p>'));
		return;
	}

	if (valueColumns.length == 0) {
		$columnWarnings.append($('<p>🚨 You must select at least one "Values" column! 🚨</p>'));
		return;
	}

	if (valueColumns.length > 1 && categoryColumn) {
		$columnWarnings.append($('<p>🚨 You may not select multiple "Values" and "Columns" at the same time! 🚨</p>'));
		return;
	}

	aggregationRequired = false;

	if (categoryColumn && labelColumn) {
		aggregationRequired = true;
		aggregationReason = 'Because you selected both "Rows" and "Columns", you will need to decide how to summarize your your values.';
	} else if (categoryColumn && !isColumnUnique(categoryColumn)) {
		aggregationRequired = true;
		aggregationReason = 'Because the "Columns" you selected contains repeating values, you will need to decide how to summarize them.';
	} else if (labelColumn && !isColumnUnique(labelColumn)) {
		aggregationRequired = true;
		aggregationReason = 'Because the "Rows" you selected contains repeating values, you will need to decide how to summarize them.';
	}

	if (aggregationRequired) {
		$aggReason.text(aggregationReason);
		$aggSection.show();
	} else {
		$aggSection.hide();
	}

	// Unique category columns (transposition)
	if (categoryColumn && isColumnUnique(categoryColumn)) {
		// Bypass user aggregation selection and just use first value
		aggregationRequired = true;
		agg = 'first';
	}

	pivot(false);
}

/*
 * Determine if a column is unique.
 */
function isColumnUnique(columnName) {
	var columnIndex = columnNames.indexOf(columnName);
	var uniques = new Set();

	if (columnUniques[columnIndex] !== undefined) {
		uniques = columnUniques[columnIndex];
	} else {
		for (var i = 1; i < tableData.length; i++) {
			uniques.add(tableData[i][columnIndex]);
		}

		columnUniques[columnIndex] = uniques;
	}

	return uniques.size === (tableData.length - 1);
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

	pivot(false);
}

/*
 * Execute pivot.
 */
function pivot(toClipboard) {
	var thousandsSep =  ',';
	var renderer = renderers.previewRenderer;
	var $el = $pivottable;

	if (toClipboard) {
		thousandsSep = '';
		renderer = renderers.atlasTSVRenderer;
		$el = $copytable;
	}

	var numberFormat = $.pivotUtilities.numberFormat;
	var precFormat = numberFormat({
		scaler: 1 / divideBy,
		digitsAfterDecimal: decimalPrec,
		thousandsSep: thousandsSep
	});

	var aggregator = $.pivotUtilities.aggregatorTemplates[agg](precFormat)([valueColumns[0]]);

	if (aggregationRequired) {
		log('Using pivottable pivot implementation.');

		var pivotOptions = {
			rows: labelColumn ? [labelColumn] : null,
			cols: categoryColumn ? [categoryColumn] : [],
			aggregator: aggregator,
			renderer: renderer,
			rendererOptions: {
				'valueColumn': valueColumns[0],
				'sortOrder': sortOrder,
				'valuesOnly': categoryColumn ? false : true
			}
		}

		log('pivotOptions:');
		log(pivotOptions);

		$el.pivot(tableData, pivotOptions);
	} else {
		log('Using mocked pivot implementation.');

		var labelColumnIndex = columnNames.indexOf(labelColumn);
		var rowAttrs = [labelColumn];
		var colAttrs = valueColumns;
		var rowKeys = _.map(_.map(tableData, labelColumnIndex), function(d) {
			return [d];
		}).slice(1);
		var colKeys = _.map(valueColumns, function(d) {
			return [d];
		});

		log('renderOptions');
		log({
			'rowAttrs': rowAttrs,
			'colAttrs': colAttrs,
			'rowKeys': rowKeys,
			'colKeys': colKeys
		});

		// This rather horrifying hack bypasses the pivot method by passing
		// a mocked data structure directly to the renderer.
		$el.html(renderer({
			rowAttrs: [labelColumn],
			colAttrs: valueColumns,
			getRowKeys: function() {
				return rowKeys;
			},
			getColKeys: function() {
				return colKeys;
			},
			getAggregator: function(rowKey, colKey) {
				var rowIndex = rowKeys.indexOf(rowKey);
				var columnIndex = columnNames.indexOf(colKey[0]);

				return {
					value: function() {
						return tableData[rowIndex + 1][columnIndex];
					},
					format: precFormat
				}
			}
		}, {
			valuesOnly: true
		}));
	}

	if (toClipboard) {
		return $el.find('textarea').val();
	}
}

function log(msg) {
	console.log(msg);
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
