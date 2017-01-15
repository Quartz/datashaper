var _ = require('lodash');

/*
 * Render HTML preview table.
 * This is a modified version of pivottable's default renderer.
 */
function previewRenderer(pivotData, opts) {
    colAttrs = pivotData.colAttrs;
    rowAttrs = pivotData.rowAttrs;
    rowKeys = pivotData.getRowKeys();
    colKeys = pivotData.getColKeys();

    result = document.createElement("table");
    result.className = "pvtTable";

    // the first few rows are for col headers
    thead = document.createElement("thead");
    tr = document.createElement("tr");

    th = document.createElement("th");
    th.className = "pvtAxisLabel";
    th.textContent = 'TODO (labelColumn)';
    tr.appendChild(th);

    if (colAttrs.length > 0) {
        _.each(colAttrs, function(c, j) {
            _.each(colKeys, function(colKey, i) {
                th = document.createElement("th");
                th.className = "pvtColLabel";
                th.textContent = colKey[j];

                tr.appendChild(th);
            })
        });
    } else {
        th = document.createElement("th");
        th.className = "pvtColLabel";
        th.textContent = 'TODO (valueColumn)';

        tr.appendChild(th);
    }

    thead.appendChild(tr);
    result.appendChild(thead);

    // now the actual data rows, with their row headers and totals
    tbody = document.createElement("tbody");

    _.each(rowKeys, function(rowKey, i) {
        tr = document.createElement("tr");

        _.each(rowKey, function(txt, j) {
            th = document.createElement("th");
            th.className = "pvtRowLabel";
            th.textContent = txt;
            tr.appendChild(th);
        });

        if (colKeys.length > 0) {
            _.each(colKeys, function(colKey, j) {
                aggregator = pivotData.getAggregator(rowKey, colKey);
                val = aggregator.value();
                td = document.createElement("td");
                td.className = "pvtVal row#{i} col#{j}";
                td.textContent = aggregator.format(val);
                td.setAttribute("data-value", val);

                tr.appendChild(td);
            });
        } else {
            totalAggregator = pivotData.getAggregator(rowKey, [])
            val = totalAggregator.value()
            td = document.createElement("td")
            td.className = "pvtTotal rowTotal"
            td.textContent = totalAggregator.format(val)
            td.setAttribute("data-value", val)

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    result.appendChild(tbody);

    result.setAttribute("data-numrows", rowKeys.length);
    result.setAttribute("data-numcols", colKeys.length);

    return result;
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

/*
 * Compare function for table data.
 */
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

module.exports = {
    'previewRenderer': previewRenderer,
    'atlasTSVRenderer': atlasTSVRenderer
}
