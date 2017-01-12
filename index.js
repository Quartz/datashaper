var $html = null;
var $csv = null;

var renderers = {
    'Table': $.pivotUtilities.renderers['Table'],
    'TSV': $.pivotUtilities.export_renderers['TSV Export']
}

function init() {
    // $html = $('html');
    $csv = $('#csv');

    // $html.on('dragover', onDrag);
    // $html.on('dragend', onDragEnd);
    // $html.on('dragexit', onDragEnd);
    // $html.on('dragleave', onDragEnd);
    // $html.on('dropped', onDropped);
    $csv.bind('change', onCSVChange);
}

function onCSVChange(e) {
  parseAndPivot(e.target.files[0]);
}

// var onDrag = function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     e.originalEvent.dataTransfer.dropEffect = 'copy';
//     $('body').removeClass('whiteborder').addClass('greyborder');
// };
//
// var onDragEnd = function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     e.originalEvent.dataTransfer.dropEffect = 'copy';
//     $('body').removeClass('greyborder').addClass('whiteborder');
// };
//
// var onDropped = function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     $('body').removeClass('greyborder').addClass('whiteborder');
//     parseAndPivot(e.originalEvent.dataTransfer.files[0]);
// };

var parseAndPivot = function(f) {
  $('#output').html('<p align="center" style="color:grey;">(processing...)</p>')

  Papa.parse(f, {
    skipEmptyLines: true,
    error: function(e) {
      alert(e)
    },
    complete: function(parsed) {
      $('#output').pivotUI(parsed.data, {
        renderers: renderers,

      }, true);
    }
  });
};

// Bind on-load handler
$(document).ready(function() {
	init();
});
