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
var agg = 'sum';

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

	$outputSection = $('#output')
	$pivottable = $('#pivottable');

	$html.on('dragover', onDrag);
	$html.on('dragend', onDragEnd);
	$html.on('dragexit', onDragEnd);
	$html.on('dragleave', onDragEnd);
	$html.on('drop', onDrop);
	$csvInput.bind('change', onCSVChange);
	$aggSelect.bind('change', onAggSelectChange);

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
	$outputSection.show();
}

/*
 * Column use selected.
 */
function onColumnUseChange(e) {
	columnUses = {};

	_.each(columnNames, function(columnName, i) {
		var use = $columns.find('input:checked').eq(i).val();

		columnUses[columnName] = use;
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
 * Execute pivot.
 */
function pivot() {
	var labelColumn = null;
	var categoryColumn = null;
	var valueColumn = null;

	_.each(columnNames, function(columnName) {
		var use = columnUses[columnName];

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

	var pivotOptions = {
		rows: [labelColumn],
		aggregator: $.pivotUtilities.aggregatorTemplates[agg]()([valueColumn]),
		renderer: atlasTSVRenderer
	}

	if (categoryColumn) {
		pivotOptions['cols'] = [categoryColumn];
	}

	$($pivottable).pivot(tableData, pivotOptions);
}

/*
 * pivottable TSV renderer customized for Atlas.
 */
function atlasTSVRenderer(pivotData, opts) {
	var defaults = {
		'localeStrings': {}
	};

	var opts = $.extend(true, {}, defaults, opts)

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

	var result = []
	var row = []

	_.each(rowAttrs, function(rowAttr) {
		row.push(rowAttr);
	});

	if (colKeys.length == 1 && colKeys[0].length == 0) {
		row.push(pivotData.aggregatorName);
	} else {
		_.each(colKeys, function(colKey) {
			row.push(colKey.join("-"));
		});
	}

	result.push(row);

	_.each(rowKeys, function(rowKey) {
		var row = [];

		_.each(rowKey, function(r) {
			row.push(r);
		});

		_.each(colKeys, function(colKey) {
			var agg = pivotData.getAggregator(rowKey, colKey);
			var value = agg.value();

			if (value) {
				row.push(value);
			} else {
				row.push('null');
			}
		})

		result.push(row);
	});

	var text = '';

	_.each(result, function(r) {
		text += r.join('\t') + '\n';
	});

	return $("<textarea>").text(text);
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
