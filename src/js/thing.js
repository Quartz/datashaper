var _ = require('lodash');

var $html = null;
var $body = null;
var $csvInput = null;
var $output = null;

/*
 * On page load.
 */
function init() {
  $html = $('html');
  $body = $('body');
  $csvInput = $('#csv input');
  $output = $('#output');

  $html.on('dragover', onDrag);
  $html.on('dragend', onDragEnd);
  $html.on('dragexit', onDragEnd);
  $html.on('dragleave', onDragEnd);
  $html.on('drop', onDrop);
  $csvInput.bind('change', onCSVChange);
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
  parseAndPivot(e.originalEvent.dataTransfer.files[0]);
}

/*
 * Process file upload.
 */
function parse(f) {
  $($output).html('<p align="center" style="color:grey;">(processing...)</p>')

  Papa.parse(f, {
    skipEmptyLines: true,
    complete: pivot
    error: function(e) {
      alert(e)
    },
  });
}

/*
 * Execute pivot.
 */
function pivot(parseResult) {
  $($output).pivotUI(parseResult.data, {
    renderers: {
      'Table': $.pivotUtilities.renderers['Table'],
      'Atlas CSV': atlasCSVRenderer
    },
  }, true);
}

/*
 * pivottable CSV renderer
 */
function atlasCSVRenderer(pivotData, opts) {
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
        row.push('');
      }
    })

    result.push(row);
  });

  var text = '';

  _.each(result, function(r) {
    text += r.join('\t') + '\n';
  });

  return $("<textarea>").text(text).css({
    width: ($(window).width() / 2) + "px",
    height: ($(window).height() / 2) + "px"
  });
}

// Bind on-load handler
$(document).ready(function() {
  init();
});
