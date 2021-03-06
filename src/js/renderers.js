var _ = require('lodash');

/*
 * Render HTML preview table.
 * This is a modified version of pivottable's default renderer.
 */
function previewRenderer(pivotData, opts) {
    opts = $.extend({}, opts);

    var colAttrs = pivotData.colAttrs;
    var rowAttrs = pivotData.rowAttrs;
    var colKeys = pivotData.getColKeys();

    var result = document.createElement("table");
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");

    // Label column header
    var th = document.createElement("th");
    th.className = 'rows';
    th.textContent = rowAttrs[0] || '';
    tr.appendChild(th);

    // Category column headers
    if (colAttrs.length > 0) {
        // NB: only a single column/category group is supported
        _.each(colKeys, function(colKey, i) {
            th = document.createElement("th");
            th.className = opts.valuesOnly ? 'values' : 'columns';
            th.textContent = colKey;

            tr.appendChild(th);
        })
    // Value column header
    } else {
        th = document.createElement("th");
        th.className = 'values';
        th.textContent = opts.valueColumn || '';

        tr.appendChild(th);
    }

    thead.appendChild(tr);
    result.appendChild(thead);

    var rows = getSortedRows(pivotData, opts.sortOrder);
    var tbody = document.createElement("tbody");

    // Data rows
    _.each(rows, function(row, i) {
        tr = document.createElement('tr');

        _.each(row, function(d, j) {
            var elType = 'td';
            var className = 'values';

            if (rowAttrs && j == 0) {
                elType = 'th';
                className = 'rows';
            }

            td = document.createElement(elType);
            td.className = className;
            td.textContent = d;

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    result.appendChild(tbody);

    return result;
}

/*
 * pivottable TSV renderer customized for Atlas.
 */
function atlasTSVRenderer(pivotData, opts) {
	var colKeys = pivotData.getColKeys();
    var rowAttrs = pivotData.rowAttrs;

	if (colKeys.length == 0) {
		colKeys.push([]);
	}

	var header = [];

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

    var rows = getSortedRows(pivotData, opts.sortOrder);

	var text = header.join('\t') + '\n';

	_.each(rows, function(row) {
		text += row.join('\t') + '\n';
	});

	return $("<textarea>").text(text);
}

/*
 * Convert pivotData to a sorted list of row data.
 */
function getSortedRows(pivotData, sortOrder) {
    var rows = [];
    var rowKeys = pivotData.getRowKeys();
    var colKeys = pivotData.getColKeys();

    if (rowKeys.length == 0) {
		rowKeys.push([]);
	}

    if (colKeys.length == 0) {
		colKeys.push([]);
	}

    _.each(rowKeys, function(rowKey) {
        // NB: Only a single row-key is supported.
        var row = [rowKey[0]];

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

    return rows;
}

/*
 * Compare function for table data.
 */
function columnSorter(columnIndex, reverse) {
	return function(a, b) {
		if (a[columnIndex] < b[columnIndex]) {
			return reverse ? 1 : -1;
		} else if (a[columnIndex] > b[columnIndex]) {
			return reverse ? -1 : 1;
		}

		return 0;
	}
}

module.exports = {
    'previewRenderer': previewRenderer,
    'atlasTSVRenderer': atlasTSVRenderer
}
